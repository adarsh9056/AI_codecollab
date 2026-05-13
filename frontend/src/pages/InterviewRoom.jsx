/**
 * InterviewRoom.jsx — Unified room for Connect-With-Friends + Peer Mode
 * 
 * URL: /dashboard/interview/room/:roomCode
 * Query params:
 *   role  = interviewer | interviewee
 *   mode  = friend | peer
 *   name  = display name override (peer mode)
 * 
 * Layout:
 *   Left   — Question panel (interviewer edits, interviewee reads)
 *   Center — Monaco/CodeMirror IDE
 *   Right  — Test cases + Output
 *   Top    — Room info, timer, roles, controls
 * 
 * ROOT CAUSES FIXED:
 *   1. Old InterviewRoom required DB Interview record — this works without it
 *   2. No question sync existed — now uses question-change socket event
 *   3. No test case system — fully implemented
 *   4. Role switching was REST-only — now socket-driven, instant sync
 *   5. Duplicate socket listeners — all cleaned up in useEffect return
 *   6. Peer mode didn't exist — fully implemented
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import CodeEditor from '../components/CodeEditor';
import QuestionLibrary from '../components/QuestionLibrary';
import VideoPanel from '../components/VideoPanel';
import { api } from '../services/api';
import { getBoilerplate, getInitialCodeState } from '../utils/boilerplate';

const LANGS = [
  { id: 'javascript', label: 'JS' },
  { id: 'python',     label: 'PY' },
  { id: 'cpp',        label: 'C++' },
  { id: 'java',       label: 'Java' },
];

const DEFAULT_QUESTION = `**Two Sum**

Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to target.

**Example:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
\`\`\`

**Constraints:**
- 2 ≤ nums.length ≤ 10⁴
- Each input has exactly one solution`;

export default function InterviewRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  // WebRTC audio state
  const webrtc = useWebRTC(socket, roomCode);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  const initialRole = searchParams.get('role') || 'interviewee';
  const mode = searchParams.get('mode') || 'friend';
  const peerName = searchParams.get('name') || user?.displayName || user?.username || 'You';

  // ── State ─────────────────────────────────────────────────────────────────
  const [myRole, setMyRole] = useState(initialRole); // interviewer | interviewee
  const [participants, setParticipants] = useState([]);
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [joinToast, setJoinToast] = useState(null);
  const [disconnectToast, setDisconnectToast] = useState(null);
  const [questionToast, setQuestionToast] = useState(null);
  const [hintToast, setHintToast] = useState(null);
  const [latestHint, setLatestHint] = useState('');
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [questionDraft, setQuestionDraft] = useState(DEFAULT_QUESTION);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [showQuestionLibrary, setShowQuestionLibrary] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);

  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(() => getBoilerplate('javascript'));
  const codeRef = useRef(code);
  useEffect(() => { codeRef.current = code; }, [code]);
  const codeStateRef = useRef({ javascript: getBoilerplate('javascript'), python: getBoilerplate('python'), cpp: getBoilerplate('cpp'), java: getBoilerplate('java') });
  useEffect(() => {
    codeStateRef.current[language] = code;
  }, [code, language]);

  const [testCases, setTestCases] = useState([
    { id: 1, input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
  ]);
  const [runResults, setRunResults] = useState([]);
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customOutput, setCustomOutput] = useState('');

  const [rightTab, setRightTab] = useState('testcases'); // testcases | output | ai
  const [timer, setTimer] = useState(0); // seconds elapsed
  const [roomReady, setRoomReady] = useState(false);
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunningRemote, setIsRunningRemote] = useState(false);

  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  // ── Audio stream setup ─────────────────────────────────────────────────
  useEffect(() => {
    if (remoteAudioRef.current && webrtc.remoteStream) {
      remoteAudioRef.current.srcObject = webrtc.remoteStream;
    }
    if (remoteVideoRef.current && webrtc.remoteStream) {
      remoteVideoRef.current.srcObject = webrtc.remoteStream;
    }
    if (localVideoRef.current && webrtc.localStream) {
      try { localVideoRef.current.srcObject = webrtc.localStream; } catch (_) { }
    }
  }, [webrtc.remoteStream, webrtc.localStream]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  const formatTimer = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // ── Boilerplate on language change ────────────────────────────────────────
  const handleLanguageChange = useCallback((langId) => {
    setLanguage(langId);
    setCode(codeStateRef.current[langId] || getBoilerplate(langId));
    socketRef.current?.emit('language_change', { roomCode, language: langId });
  }, [roomCode]);

  // ── Socket Setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomCode) return;
    const joinEvent = 'join-friend-room';

    // Wait for socket connection before attempting to join; prevents emits being dropped
    if (joinEvent && !joined) {
      if (!connected) {
        const onConnectThenJoin = () => {
          if (!socket) return;
          socket.emit(joinEvent, { roomCode }, (res) => {
            if (res?.error) {
              console.error('[InterviewRoom] join error:', res.error);
              return;
            }
            setJoined(true);
            setRoomReady(true);
            setMyRole(res.role || initialRole);

            if (res.state) {
              if (res.state.question) {
                setQuestion(res.state.question);
                setQuestionDraft(res.state.question);
              }
              if (res.state.testCases?.length) setTestCases(res.state.testCases);
              if (res.state.language) {
                setLanguage(res.state.language);
                setCode(getBoilerplate(res.state.language));
              }
              if (res.state.codeState?.[res.state.language || 'javascript']) {
                setCode(res.state.codeState[res.state.language || 'javascript']);
              }
            }

            if (res.participants) {
              const others = res.participants.filter(p => {
                const uid = p.user?._id?.toString?.() || p.user;
                return uid !== (user?._id?.toString?.() || socket.userId);
              });
              if (others.length > 0) {
                setPartnerJoined(true);
                setPartnerName(others[0].user?.displayName || others[0].user?.username || 'Partner');
              }
            }
          });
        };
        socket.on('connect', onConnectThenJoin);
        return () => socket.off('connect', onConnectThenJoin);
      }

      // connected === true
      socket.emit(joinEvent, { roomCode }, (res) => {
        if (res?.error) {
          console.error('[InterviewRoom] join error:', res.error);
          return;
        }
        setJoined(true);
        setRoomReady(true);
        setMyRole(res.role || initialRole);

        if (res.state) {
          if (res.state.question) {
            setQuestion(res.state.question);
            setQuestionDraft(res.state.question);
          }
          if (res.state.testCases?.length) setTestCases(res.state.testCases);
          if (res.state.language) {
            setLanguage(res.state.language);
            setCode(res.state.codeState?.[res.state.language || 'javascript'] || getBoilerplate(res.state.language));
          }
          if (res.state.codeState?.[res.state.language || 'javascript']) {
            setCode(res.state.codeState[res.state.language || 'javascript']);
          }
        }

        if (res.participants) {
          const others = res.participants.filter(p => {
            const uid = p.user?._id?.toString?.() || p.user;
            return uid !== (user?._id?.toString?.() || socket.userId);
          });
          if (others.length > 0) {
            setPartnerJoined(true);
            setPartnerName(others[0].user?.displayName || others[0].user?.username || 'Partner');
          }
        }
      });
    } else if (mode === 'peer') {
      // Peer room is pre-joined by matchmaking, but we still resync the current room state
      // so the partner count/question/code state are not missed if the roomUsers event fired early.
      socket.emit(joinEvent, { roomCode }, (res) => {
        if (res?.error) {
          console.error('[InterviewRoom] peer sync error:', res.error);
          return;
        }
        setJoined(true);
        setRoomReady(true);
        setMyRole(res.role || initialRole);

        if (res.state) {
          if (res.state.question) {
            setQuestion(res.state.question);
            setQuestionDraft(res.state.question);
          }
          if (res.state.testCases?.length) setTestCases(res.state.testCases);
          if (res.state.language) {
            setLanguage(res.state.language);
            setCode(res.state.codeState?.[res.state.language || 'javascript'] || getBoilerplate(res.state.language));
          }
          if (res.state.codeState?.[res.state.language || 'javascript']) {
            setCode(res.state.codeState[res.state.language || 'javascript']);
          }
        }

        if (res.participants) {
          const others = res.participants.filter(p => {
            const uid = p.user?._id?.toString?.() || p.user;
            return uid !== (user?._id?.toString?.() || socket.userId);
          });
          if (others.length > 0) {
            setPartnerJoined(true);
            setPartnerName(others[0].user?.displayName || others[0].user?.username || 'Partner');
          }
        }
      });
    }

    // ── Event listeners ───────────────────────────────────────────────────
    const onUserJoined = ({ user: joinedUser, role }) => {
      const name = joinedUser?.displayName || joinedUser?.username || 'A peer';
      setPartnerJoined(true);
      setPartnerName(name);
      setJoinToast(`${name} joined the room`);
      setTimeout(() => setJoinToast(null), 4000);
    };

    const onUserLeft = ({ user: leftUser }) => {
      const name = leftUser?.displayName || leftUser?.username || 'Partner';
      setPartnerJoined(false);
      setDisconnectToast(`${name} left the room`);
      setTimeout(() => setDisconnectToast(null), 5000);
    };

    const onPeerDisconnected = ({ user: u }) => {
      const name = u?.displayName || u?.username || 'Peer';
      setPartnerJoined(false);
      setDisconnectToast(`${name} disconnected`);
      setTimeout(() => setDisconnectToast(null), 5000);
    };

    const onRoomUsers = (users) => {
      setParticipants(users);
      const myId = user?._id?.toString?.() || socket.userId;
      const others = users.filter(p => {
        const uid = p.user?._id?.toString?.() || p.user;
        return uid !== myId;
      });
      if (others.length > 0) {
        setPartnerJoined(true);
        setPartnerName(others[0].user?.displayName || others[0].user?.username || 'Partner');
      }
    };

    const onCodeUpdate = ({ code: newCode, language: lang, senderSocketId }) => {
      if (senderSocketId === socket.id) return;
      codeStateRef.current[lang] = newCode;
      setCode(newCode);
      setLanguage(lang);
    };

    const onProblemChange = async (data) => {
      if (data?.problemId) {
        try {
          const p = await api.get(`/problems/${data.problemId}`);
          setSelectedProblem(p.data);
          if (p.data?.title && p.data?.description) {
            const full = `**${p.data.title}**\n\n${p.data.description}`;
            setQuestion(full);
            setQuestionDraft(full);
          }
        } catch (_) { /* non-fatal */ }
      }

      if (data?.codeState) {
        codeStateRef.current = { ...codeStateRef.current, ...data.codeState };
        const activeLang = data.language || language;
        setCode(data.codeState[activeLang] || data.codeState.javascript || getBoilerplate(activeLang));
      }

      if (data?.language) {
        setLanguage(data.language);
        if (data?.codeState?.[data.language]) {
          setCode(data.codeState[data.language]);
        }
      }
    };

    const onQuestionUpdate = ({ question: q }) => {
      console.log('[socket] question-update received', { q });
      setQuestion(q);
      setQuestionDraft(q);
      setQuestionToast('New question selected');
      setTimeout(() => setQuestionToast(null), 4000);
    };

    const onHintUpdate = ({ hint, by }) => {
      setLatestHint(hint || '');
      setHintToast(hint || 'Hint received');
      setTimeout(() => setHintToast(null), 5000);
      if (by === (user?._id?.toString?.() || socket.userId)) {
        setQuestionToast('Hint sent');
        setTimeout(() => setQuestionToast(null), 2500);
      }
    };

    const onTestcaseUpdate = ({ testCases: tc }) => {
      setTestCases(tc);
    };

    const onRolesUpdated = ({ roles }) => {
      const myId = user?._id?.toString?.() || socket.userId;
      if (roles[myId]) setMyRole(roles[myId]);
    };

    const onRunStatus = ({ running, by }) => {
      if (by !== (user?._id?.toString?.() || socket.userId)) {
        setIsRunningRemote(running);
      }
    };

    const onOutputUpdate = ({ output }) => {
      setCustomOutput(output);
      setRightTab('output');
    };

    const onNewMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
    };

    const onLanguageChange = ({ language: lang }) => {
        setLanguage(lang);
        setCode(codeStateRef.current[lang] || getBoilerplate(lang));
    };

    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('peer-disconnected', onPeerDisconnected);
    socket.on('roomUsers', onRoomUsers);
    socket.on('codeUpdate', onCodeUpdate);
    socket.on('problem_change', onProblemChange);
    socket.on('question-update', onQuestionUpdate);
    socket.on('hint-update', onHintUpdate);
    socket.on('testcase-update', onTestcaseUpdate);
    socket.on('roles-updated', onRolesUpdated);
    socket.on('run-status', onRunStatus);
    socket.on('output-update', onOutputUpdate);
    socket.on('newMessage', onNewMessage);
    socket.on('language_change', onLanguageChange);

    return () => {
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('peer-disconnected', onPeerDisconnected);
      socket.off('roomUsers', onRoomUsers);
      socket.off('codeUpdate', onCodeUpdate);
      socket.off('problem_change', onProblemChange);
      socket.off('question-update', onQuestionUpdate);
      socket.off('hint-update', onHintUpdate);
      socket.off('testcase-update', onTestcaseUpdate);
      socket.off('roles-updated', onRolesUpdated);
      socket.off('run-status', onRunStatus);
      socket.off('output-update', onOutputUpdate);
      socket.off('newMessage', onNewMessage);
      socket.off('language_change', onLanguageChange);
    };
  }, [socket, roomCode, mode, joined, initialRole, user?._id, language]);

  // ── Code change handler ───────────────────────────────────────────────────
  const handleCodeChange = useCallback((newCode) => {
    codeStateRef.current[language] = newCode;
    setCode(newCode);
    if (socketRef.current && roomCode && roomReady) {
      socketRef.current.emit('codeChange', { roomCode, language, code: newCode });
    }
  }, [roomCode, language, roomReady]);

  // ── Question save ─────────────────────────────────────────────────────────
  const handleSaveQuestion = () => {
    setQuestion(questionDraft);
    setIsEditingQuestion(false);
    setSelectedProblem(null);
    socket?.emit('question-change', { roomCode, question: questionDraft }, (ack) => {
      if (!ack || ack.error) console.warn('[question-change] ack error', ack);
      else console.log('[question-change] acked');
    });
  };

  const handleGiveHint = () => {
    if (!isInterviewer) return;
    socket?.emit('give-hint', {
      roomCode,
      code: codeRef.current,
      language,
      question,
    }, (ack) => {
      if (!ack || ack.error) console.warn('[give-hint] ack error', ack);
    });
  };

  // ── Role switch ───────────────────────────────────────────────────────────
  const handleRoleSwitch = () => {
    socket?.emit('role-switch', { roomCode });
    // Optimistic update
    setMyRole(r => r === 'interviewer' ? 'interviewee' : 'interviewer');
  };

  // ── Test cases ────────────────────────────────────────────────────────────
  const addTestCase = () => {
    const updated = [...testCases, { id: Date.now(), input: '', expectedOutput: '' }];
    setTestCases(updated);
    socket?.emit('testcase-change', { roomCode, testCases: updated });
  };

  const updateTestCase = (id, field, value) => {
    const updated = testCases.map(tc => tc.id === id ? { ...tc, [field]: value } : tc);
    setTestCases(updated);
    socket?.emit('testcase-change', { roomCode, testCases: updated });
  };

  const removeTestCase = (id) => {
    const updated = testCases.filter(tc => tc.id !== id);
    setTestCases(updated);
    socket?.emit('testcase-change', { roomCode, testCases: updated });
  };

  // ── Run code ──────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setRunResults([]);
    setRunResult(null);
    setRightTab('output');
    socket?.emit('run-code', { roomCode });

    try {
      if (selectedProblem?._id) {
        const res = await api.post('/run', {
          code,
          language,
          problemId: selectedProblem._id,
        });
        setRunResult(res.data);
        setRunResults(res.data?.tests || []);

        const outputSummary = (res.data?.tests || []).map((r, idx) =>
          `Test ${idx + 1}: ${r.passed ? '✓ PASS' : '✗ FAIL'}\nOutput: ${r.actualOutput || ''}${r.error ? '\nError: ' + r.error : ''}`
        ).join('\n\n');
        socket?.emit('output-update', { roomCode, output: outputSummary });
      } else {
        const results = [];
        for (const tc of testCases) {
          try {
            const res = await api.post('/run', {
              code,
              language,
              stdin: tc.input,
            });
            const output = res.data?.stdout?.trim() || res.data?.output?.trim() || '';
            const expected = tc.expectedOutput?.trim();
            results.push({
              id: tc.id,
              input: tc.input,
              expected,
              output,
              passed: expected ? output === expected : true,
              error: res.data?.error || res.data?.stderr || '',
              time: res.data?.time,
              actualOutput: output,
              expectedOutput: expected || '',
            });
          } catch (err) {
            results.push({
              id: tc.id,
              input: tc.input,
              expected: tc.expectedOutput,
              output: '',
              passed: false,
              error: err?.message || 'Execution failed',
              actualOutput: '',
              expectedOutput: tc.expectedOutput || '',
            });
          }
        }
        setRunResults(results);
        setRunResult({
          status: results.every(r => r.passed) ? 'ac' : 'wa',
          passed: results.filter(r => r.passed).length,
          total: results.length,
          tests: results.map(r => ({
            passed: r.passed,
            actualOutput: r.output || r.error || '',
            expectedOutput: r.expectedOutput || r.expected || '',
            executionTime: r.time || 0,
            isHidden: false,
            error: r.error || '',
          })),
        });

        const outputSummary = results.map(r =>
          `Test ${r.id}: ${r.passed ? '✓ PASS' : '✗ FAIL'}\nInput: ${r.input}\nOutput: ${r.output}${r.error ? '\nError: ' + r.error : ''}`
        ).join('\n\n');
        socket?.emit('output-update', { roomCode, output: outputSummary });
      }
    } catch (err) {
      setRunResults([{ id: 0, error: err.message, passed: false }]);
      setRunResult({ error: err.message, status: 're' });
    } finally {
      setIsRunning(false);
      socket?.emit('run-status', { roomCode, running: false });
    }
  };

  const handleSubmit = async () => {
    if (!selectedProblem?._id) return;
    setIsSubmitting(true);
    setRunResult(null);
    setRightTab('output');
    try {
      const res = await api.post('/submit', {
        code,
        language,
        problemId: selectedProblem._id,
      });
      const result = { ...res.data.result, aiFeedback: res.data.aiFeedback };
      setRunResult(result);
      setRunResults(result.tests || []);
      if (isInterviewer && result.aiFeedback) setRightTab('ai');
      socket?.emit('output-update', {
        roomCode,
        output: `Submitted ${selectedProblem.title || 'problem'} with status ${result.status}`,
      });
    } catch (err) {
      setRunResult({ error: err?.response?.data?.message || err.message, status: 're' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !socket || !roomReady) return;
    socket.emit('sendMessage', { roomCode, message: chatInput.trim() });
    setChatInput('');
  };

  // ── Leave room ────────────────────────────────────────────────────────────
  const handleLeave = () => {
    socket?.emit('leave_room', { roomCode });
    socket?.emit('peer-leave-queue');
    navigate('/dashboard/interview');
  };

  // ── Copy room code ────────────────────────────────────────────────────────
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isInterviewer = myRole === 'interviewer';
  const passedCount = runResults.filter(r => r.passed).length;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">

      {/* ── Toast Notifications ─────────────────────────────────────────── */}
      {joinToast && (
        <div className="fixed top-4 right-4 z-50 bg-teal-500 text-black font-bold px-5 py-3 rounded-xl shadow-2xl text-sm animate-slide-in flex items-center gap-2">
          <span>●</span> {joinToast}
        </div>
      )}
      {disconnectToast && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white font-bold px-5 py-3 rounded-xl shadow-2xl text-sm animate-slide-in flex items-center gap-2">
          <span>○</span> {disconnectToast}
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="flex-none h-12 flex items-center px-4 gap-3 border-b border-white/5 bg-gray-900/50 backdrop-blur">
        {/* Room code */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">
            {mode === 'peer' ? '🎲 PEER' : '👥 FRIEND'}
          </span>
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-300 transition-all"
          >
            <span className="text-indigo-400">{roomCode}</span>
            <span className="text-gray-500">{copied ? '✓' : '⎘'}</span>
          </button>
        </div>

        {/* Connection */}
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-teal-400' : 'bg-red-400 animate-pulse'}`} />

        {/* Partner status */}
        {partnerJoined ? (
          <span className="text-xs text-gray-400">
            <span className="text-teal-400">●</span> {partnerName} is here
          </span>
        ) : (
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <span className="animate-pulse">○</span> Waiting for partner...
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* Audio controls */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/5">
            <button
              onClick={webrtc.isConnected ? webrtc.stopAudio : webrtc.startAudio}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all ${webrtc.isConnected ? 'bg-rose-500/20 text-rose-300' : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30'}`}
              title={webrtc.isConnected ? 'Click to disconnect audio' : 'Click to enable audio'}
            >
              {webrtc.isConnected ? '📞 Stop Audio' : '🎧 Audio'}
            </button>
            {webrtc.isConnected && (
              <button
                onClick={webrtc.toggleMute}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${webrtc.isMuted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-gray-300'}`}
                title={webrtc.isMuted ? 'Click to unmute' : 'Click to mute'}
              >
                {webrtc.isMuted ? '🔇' : '🎤'}
              </button>
            )}
            {/* Video controls */}
            <div className="flex items-center">
              {!webrtc.isCameraOn ? (
                <button
                  onClick={webrtc.startVideo}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600/10 text-blue-300 hover:bg-blue-600/20"
                >
                  🎥 Video
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={webrtc.toggleCamera}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-white/10 text-gray-300"
                    title="Toggle camera"
                  >
                    {webrtc.isCameraOn ? '📷' : '📹'}
                  </button>
                  <button
                    onClick={webrtc.stopAudio}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-300"
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>
            {webrtc.audioError && (
              <span className="text-xs text-red-400 font-semibold" title={webrtc.audioError}>
                ⚠ Audio Error
              </span>
            )}
          </div>

          {isInterviewer && (
            <button
              onClick={handleGiveHint}
              className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all border border-amber-500/20"
              title="Generate and send a live hint to the interviewee"
            >
              💡 Give Hint
            </button>
          )}

          <button
            onClick={() => setIsChatOpen(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all ${isChatOpen ? 'bg-teal-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            💬 Chat {messages.length > 0 && <span className="bg-white/20 px-1.5 rounded-full text-[10px] ml-1">{messages.length}</span>}
          </button>

          {/* Role badge */}
          <div
            onClick={handleRoleSwitch}
            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
              isInterviewer
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                : 'bg-teal-500/10 border-teal-500/30 text-teal-300 hover:bg-teal-500/20'
            }`}
            title="Click to switch roles"
          >
            {isInterviewer ? '🎤 Interviewer' : '💻 Interviewee'}
            <span className="opacity-50 text-[10px]">⇄</span>
          </div>

          {/* Timer */}
          <div className="px-3 py-1 rounded-full bg-white/5 text-xs font-mono text-gray-300">
            ⏱ {formatTimer(timer)}
          </div>

          {/* Lang selector */}
          <div className="flex gap-1">
            {LANGS.map(l => (
              <button
                key={l.id}
                onClick={() => handleLanguageChange(l.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === l.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all"
          >
            Leave
          </button>
        </div>
      </div>

      {/* ── Main Area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Question Panel ─────────────────────────────────────── */}
        <div className="w-80 flex-none flex flex-col border-r border-white/5 bg-gray-900/30 overflow-hidden">
          <div className="flex-none flex items-center justify-between px-4 py-2.5 border-b border-white/5">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Question</span>
            {isInterviewer && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingQuestion(!isEditingQuestion)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {isEditingQuestion ? 'Preview' : 'Edit ✎'}
                </button>
                <button
                  onClick={() => setShowQuestionLibrary(true)}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
                >
                  Choose Question
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {isInterviewer && isEditingQuestion ? (
              <div className="flex flex-col h-full gap-3">
                <textarea
                  value={questionDraft}
                  onChange={e => setQuestionDraft(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white font-mono resize-none focus:outline-none focus:border-indigo-500/50 min-h-[300px]"
                  placeholder="Paste or type the coding question here..."
                />
                <button
                  onClick={handleSaveQuestion}
                  className="py-2 rounded-xl bg-teal-500 text-black text-xs font-black uppercase tracking-widest"
                >
                  Save & Sync
                </button>
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {question || 'No question set yet.'}
                </div>
                {latestHint && (
                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-300 mb-2">Live Hint</div>
                    <p className="text-sm text-amber-100 leading-relaxed whitespace-pre-wrap">{latestHint}</p>
                  </div>
                )}
                {isInterviewer && (
                  <div className="mt-4 p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <p className="text-xs text-purple-400">You are the interviewer. Click "Edit" to set/change the question.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Code Editor ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={code}
              language={language}
              onChange={handleCodeChange}
              readOnly={false}
            />
          </div>

          {/* Run button */}
          <div className="flex-none flex items-center gap-3 px-4 py-2.5 border-t border-white/5 bg-gray-900/50">
            <button
              onClick={handleRun}
              disabled={isRunning || !code.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-black text-xs uppercase tracking-widest disabled:opacity-40 transition-all"
            >
              {isRunning ? (
                <>
                  <span className="animate-spin">◌</span> Running...
                </>
              ) : '▶ Run Code'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedProblem?._id}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase tracking-widest disabled:opacity-40 transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Solution'}
            </button>
            {isRunningRemote && (
              <span className="text-xs text-indigo-400 flex items-center gap-1">
                <span className="animate-pulse">●</span> Partner is running code...
              </span>
            )}
            {(runResult || runResults.length > 0) && (
              <span className={`text-xs font-bold ${passedCount === testCases.length ? 'text-teal-400' : 'text-red-400'}`}>
                {passedCount}/{selectedProblem?._id ? (runResult?.total || testCases.length) : testCases.length} passed
              </span>
            )}
          </div>
        </div>

        {/* ── RIGHT: Test Cases + Output ───────────────────────────────── */}
        <div className="w-72 flex-none flex flex-col border-l border-white/5 bg-gray-900/30 overflow-hidden">
          {/* Tab bar */}
          <div className="flex-none flex border-b border-white/5">
            {['testcases', 'output', ...(isInterviewer ? ['ai'] : [])].map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                  rightTab === tab
                    ? 'text-white border-b-2 border-teal-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'testcases' ? `Test Cases (${testCases.length})` : tab === 'output' ? 'Output' : 'AI Feedback'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {rightTab === 'testcases' ? (
              <>
                {testCases.map((tc, i) => (
                  <div key={tc.id} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                      <span className="text-xs font-bold text-gray-400">Case {i + 1}</span>
                      <button
                        onClick={() => removeTestCase(tc.id)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase">Input</label>
                        <textarea
                          value={tc.input}
                          onChange={e => updateTestCase(tc.id, 'input', e.target.value)}
                          className="w-full mt-1 bg-black/30 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-300 resize-none focus:outline-none focus:border-indigo-500/30 min-h-[50px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase">Expected</label>
                        <input
                          value={tc.expectedOutput}
                          onChange={e => updateTestCase(tc.id, 'expectedOutput', e.target.value)}
                          className="w-full mt-1 bg-black/30 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-indigo-500/30"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addTestCase}
                  className="w-full py-2 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 text-xs font-semibold transition-all"
                >
                  + Add Test Case
                </button>
              </>
            ) : rightTab === 'output' ? (
              <div className="space-y-3">
                {runResult ? (
                  runResult.tests?.length ? runResult.tests.map((r, i) => (
                    <div
                      key={r.id || i}
                      className={`rounded-xl border overflow-hidden ${
                        r.passed
                          ? 'border-teal-500/20 bg-teal-500/5'
                          : 'border-red-500/20 bg-red-500/5'
                      }`}
                    >
                      <div className={`flex items-center gap-2 px-3 py-2 text-xs font-bold ${r.passed ? 'text-teal-400' : 'text-red-400'}`}>
                        {r.passed ? '✓ PASS' : '✗ FAIL'} — Case {i + 1}
                      </div>
                      <div className="px-3 pb-3 space-y-1.5">
                        {r.actualOutput && (
                          <div>
                            <span className="text-[10px] text-gray-600">Output</span>
                            <pre className="text-xs font-mono text-gray-300 mt-0.5 whitespace-pre-wrap">{r.actualOutput}</pre>
                          </div>
                        )}
                        {r.error && (
                          <div>
                            <span className="text-[10px] text-red-500">Error</span>
                            <pre className="text-xs font-mono text-red-400 mt-0.5 whitespace-pre-wrap">{r.error}</pre>
                          </div>
                        )}
                        {r.executionTime && (
                          <p className="text-[10px] text-gray-600">{r.executionTime}ms</p>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-600 text-xs">
                      Run code to see output
                    </div>
                  )
                ) : customOutput ? (
                  <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap">{customOutput}</pre>
                ) : (
                  <div className="text-center py-8 text-gray-600 text-xs">
                    Run code to see output
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {!runResult?.aiFeedback ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-gray-600 text-xs">
                    <span className="text-2xl mb-2">🧠</span>
                    Submit a solution to get AI-powered code analysis.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Time Complexity</div>
                        <div className="text-lg font-bold text-white">{runResult.aiFeedback.timeComplexity || 'N/A'}</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Space Complexity</div>
                        <div className="text-lg font-bold text-white">{runResult.aiFeedback.spaceComplexity || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Quality Score</div>
                      <div className="text-lg font-bold text-white">{runResult.aiFeedback.qualityScore ?? 'N/A'}<span className="text-xs text-gray-500">/100</span></div>
                    </div>
                    {runResult.aiFeedback.patterns?.length > 0 && (
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Detected Patterns</div>
                        <div className="text-xs font-bold text-white">{runResult.aiFeedback.patterns.join(', ')}</div>
                      </div>
                    )}
                    {runResult.aiFeedback.feedbackText && (
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Feedback</div>
                        <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{runResult.aiFeedback.feedbackText}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Hidden audio element for remote audio */}
      <audio ref={remoteAudioRef} autoPlay={true} />

      {/* Draggable / resizable video panels */}
      {webrtc.remoteStream && (
        <VideoPanel
          videoRef={remoteVideoRef}
          initialRight={96}
          initialBottom={120}
          initialWidth={360}
          initialHeight={216}
          className=""
        />
      )}

      {webrtc.isCameraOn && webrtc.localStream && (
        <VideoPanel
          videoRef={localVideoRef}
          initialRight={30}
          initialBottom={30}
          initialWidth={220}
          initialHeight={140}
          className="border-2 border-white/10"
        />
      )}

      {questionToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-indigo-600 text-white font-bold px-5 py-3 rounded-xl shadow-2xl text-sm animate-slide-in">
          {questionToast}
        </div>
      )}

      {hintToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-amber-500 text-black font-bold px-5 py-3 rounded-xl shadow-2xl text-sm animate-slide-in">
          {hintToast}
        </div>
      )}

      {showQuestionLibrary && (
        <QuestionLibrary
          onClose={() => setShowQuestionLibrary(false)}
          onSelect={(problem) => {
            // Set question text to problem description + metadata
            const full = `**${problem.title}**\n\n${problem.description}`;
            setSelectedProblem(problem);
            const starterState = getInitialCodeState(problem, {
              javascript: codeStateRef.current.javascript,
              python: codeStateRef.current.python,
              cpp: codeStateRef.current.cpp,
              java: codeStateRef.current.java,
            });
            codeStateRef.current = starterState;
            setCode(starterState[language] || getBoilerplate(language));
            setQuestion(full);
            setQuestionDraft(full);
            // Sync with server
            socket?.emit('question-change', { roomCode, question: full }, (ack) => {
              if (!ack || ack.error) console.warn('[question-change] select ack', ack);
            });

            // Prepare test cases (public ones only)
            const publicCases = (problem.testCases || []).filter(tc => !tc.hidden).map((tc, idx) => ({ id: Date.now() + idx, input: tc.input, expectedOutput: tc.expectedOutput }));
            if (publicCases.length > 0) {
              setTestCases(publicCases);
              socket?.emit('testcase-change', { roomCode, testCases: publicCases });
            }

            // Keep the code editor aligned with the selected problem's boilerplate in all languages.
            socket?.emit('problem_change', {
              roomCode,
              problemId: problem._id,
              language,
              codeState: starterState,
            });

            setShowQuestionLibrary(false);
          }}
        />
      )}

      {isChatOpen && (
        <div className="fixed top-16 right-4 z-50 w-[340px] h-[480px] rounded-2xl border border-white/10 bg-gray-950 shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
            <h3 className="font-black text-xs uppercase tracking-widest text-teal-500">Live Chat</h3>
            <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="text-center text-gray-600 text-xs py-8">No messages yet. Say hello to your partner!</div>
            ) : messages.map((msg, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{msg.user?.displayName || msg.user?.username || 'Partner'}</span>
                  <span className="text-[10px] text-gray-600">{new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{msg.message}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/10">
            <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50"
              />
              <button type="submit" className="absolute right-2 top-1.5 p-1.5 text-teal-500 hover:bg-teal-500/10 rounded-lg transition-all">
                ➤
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}
