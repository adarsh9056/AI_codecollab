import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import CodeEditor from '../components/CodeEditor';
import { api } from '../services/api';
import { getBoilerplate, getInitialCodeState } from '../utils/boilerplate';
import MainLayout from '../components/MainLayout';
import AIChatbot from '../components/AIChatbot';
import { trackEvent } from '../utils/analytics';

const LANGS = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' }
];

export default function CollabRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  const [room, setRoom] = useState(null);
  const [roomError, setRoomError] = useState(null);

  const [language, setLanguage] = useState('javascript');
  const [localCodeState, setLocalCodeState] = useState({ javascript: '', python: '', cpp: '', java: '' });
  const [remoteCodeState, setRemoteCodeState] = useState({ javascript: '', python: '', cpp: '', java: '' });

  const [problem, setProblem] = useState(null);
  const [problemList, setProblemList] = useState([]);

  const [runResult, setRunResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bottomTab, setBottomTab] = useState('output');

  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [blurPartner, setBlurPartner] = useState(false);

  const [roomReady, setRoomReady] = useState(false);
  const codeSyncRef = useRef(false);
  const remoteAudioRef = useRef(null);
  const chatEndRef = useRef(null);
  const codeChangeTimerRef = useRef(null);

  const myName = user?.username || 'You';
  const myId = user?._id || user?.id;

  const partnerUser = participants.find(p => p.user._id !== myId);
  const webrtc = useWebRTC(socket, roomCode);

  useEffect(() => {
    if (remoteAudioRef.current && webrtc.remoteStream) {
      remoteAudioRef.current.srcObject = webrtc.remoteStream;
    }
  }, [webrtc.remoteStream]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  // Initial Room Load (API)
  useEffect(() => {
    if (!roomCode) { navigate('/dashboard'); return; }

    api.get(`/rooms/${roomCode}`)
      .then(r => {
        const data = r?.data;
        if (!data) throw new Error('Room not found');
        setRoom(data);

        if (data.problemId) {
          const pid = data.problemId._id || data.problemId;
          api.get(`/problems/${pid}`).then(p => {
            setProblem(p.data);
            const starter = getInitialCodeState(p.data, { javascript: '', python: '', cpp: '', java: '' });
            setLocalCodeState(starter);
            setRemoteCodeState(starter);
          }).catch(() => { });
        } else {
          const starter = getInitialCodeState(null, { javascript: '', python: '', cpp: '', java: '' });
          setLocalCodeState(starter);
          setRemoteCodeState(starter);
        }
      })
      .catch(err => setRoomError(err?.message || 'Failed to load room'));

    api.get('/problems?limit=50').then(r => setProblemList(r?.data || [])).catch(() => { });
  }, [roomCode, navigate]);

  // Socket Setup (Run ONCE on mount/reconnect)
  useEffect(() => {
    if (!socket || !roomCode) return;

    // Join room with ACK
    socket.emit('join_room', { roomCode }, (response) => {
      if (response?.success) {
        setRoomReady(true);
        trackEvent('session_start', { mode: 'collab', roomCode });
        if (response.room) setRoom(prev => response.room || prev);
        if (response.participants) setParticipants(response.participants);
        if (response.language) setLanguage(response.language);
        if (response.codeState) setLocalCodeState(prev => ({ ...prev, ...response.codeState }));
        if (response.userCodes) {
          const remoteEntry = Object.entries(response.userCodes).find(([uid]) => uid !== myId);
          if (remoteEntry?.[1]) setRemoteCodeState(prev => ({ ...prev, ...remoteEntry[1] }));
        }
        if (response.lastExecution?.result) {
          setRunResult(response.lastExecution.result);
          setBottomTab('output');
        }
      } else {
        setRoomError(response?.error || 'Failed to join room');
      }
    });

    const onCodeUpdate = (data) => {
      if (data.senderSocketId === socket.id) return;
      if (data.code !== undefined && data.language) {
        setRemoteCodeState(prev => {
          if (prev[data.language] === data.code) return prev;
          return { ...prev, [data.language]: data.code };
        });
      }
    };

    const onProblemChange = async (data) => {
      if (data?.problemId) {
        try {
          const p = await api.get(`/problems/${data.problemId}`);
          setProblem(p.data);
        } catch (_) { }
      }
      if (data?.language) setLanguage(data.language);
      if (data?.codeState) {
        setLocalCodeState(data.codeState);
        setRemoteCodeState(data.codeState);
      }
    };

    const onExecutionResult = (data) => {
      if (data?.result) {
        setRunResult(data.result);
        setBottomTab('output');
      }
    };

    const onNewMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
    };

    const onRoomUsers = (users) => setParticipants(users);
    const onLanguageChange = (data) => setLanguage(data.language);

    socket.on('codeUpdate', onCodeUpdate);
    socket.on('newMessage', onNewMessage);
    socket.on('roomUsers', onRoomUsers);
    socket.on('language_change', onLanguageChange);
    socket.on('problem_change', onProblemChange);
    socket.on('execution_result', onExecutionResult);

    return () => {
      trackEvent('session_end', { mode: 'collab', roomCode });
      socket.emit('leave_room', { roomCode });
      socket.off('codeUpdate', onCodeUpdate);
      socket.off('newMessage', onNewMessage);
      socket.off('roomUsers', onRoomUsers);
      socket.off('language_change', onLanguageChange);
      socket.off('problem_change', onProblemChange);
      socket.off('execution_result', onExecutionResult);
      if (codeChangeTimerRef.current) clearTimeout(codeChangeTimerRef.current);
    };
  }, [socket, roomCode, myId]); // Stable dependencies


  const handleCodeChange = useCallback((newCode) => {
    setLocalCodeState(prev => {
      if (prev[language] === newCode) return prev;
      const next = { ...prev, [language]: newCode };
      if (socket && roomCode && roomReady) {
        if (codeChangeTimerRef.current) clearTimeout(codeChangeTimerRef.current);
        codeChangeTimerRef.current = setTimeout(() => {
          socket.emit('codeChange', { roomCode, language, code: newCode });
        }, 150);
      }
      return next;
    });
  }, [socket, roomCode, language, roomReady]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (socket && roomCode) {
      socket.emit('language_change', { roomCode, language: lang });
    }
  };

  const handleProblemChange = (id) => {
    if (!id || !room?._id) return;
    api.patch(`/rooms/${room._id}`, { problemId: id }).then(() => {
      api.get(`/problems/${id}`).then((p) => {
        setProblem(p.data);
        const newState = getInitialCodeState(p.data, { javascript: '', python: '', cpp: '', java: '' });
        setLocalCodeState(newState);
        setRemoteCodeState(newState);

        if (socket && roomCode && roomReady) {
          socket.emit('problem_change', { roomCode, problemId: id, language, codeState: newState });
        }
      });
    });
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !socket || !roomReady) return;
    socket.emit('sendMessage', { roomCode, message: chatInput.trim() });
    setChatInput('');
  };

  const handleRun = async () => {
    setIsSubmitting(true);
    setRunResult(null);
    setBottomTab('output');
    try {
      const res = await api.post('/run', { code: localCodeState[language], language, problemId: problem?._id, includeFeedback: true });
      setRunResult(res.data);
      if (socket && roomCode && roomReady) {
        socket.emit('execution_result', { roomCode, result: res.data });
      }
    } catch (err) {
      const result = { error: err?.response?.data?.message || err.message, status: 're' };
      setRunResult(result);
      if (socket && roomCode && roomReady) {
        socket.emit('execution_result', { roomCode, result });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem?._id) return;
    setIsSubmitting(true);
    setRunResult(null);
    setBottomTab('output');
    try {
      const res = await api.post('/submit', { code: localCodeState[language], language, problemId: problem._id, roomId: room._id });
      const result = { ...res.data.result, aiFeedback: res.data.aiFeedback };
      setRunResult(result);
      trackEvent('code_submit', { mode: 'collab', language, status: result.status, problemId: problem._id });
      if (res.data.aiFeedback) setBottomTab('ai');
      if (socket && roomCode && roomReady) {
        socket.emit('execution_result', { roomCode, result });
      }
    } catch (err) {
      const result = { error: err?.response?.data?.message || err.message, status: 're' };
      setRunResult(result);
      if (socket && roomCode && roomReady) {
        socket.emit('execution_result', { roomCode, result });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (roomError) {
    return (
      <MainLayout activeTab="collab">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl max-w-lg text-center font-outfit">
            <h2 className="text-xl font-bold mb-2">Collab Room Error</h2>
            <p className="mb-6 opacity-80">{roomError}</p>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-white font-medium transition-colors">Go Back</button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!room) {
    return (
      <MainLayout activeTab="collab">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeTab="collab">
      <div className="flex flex-col h-full overflow-hidden p-4 gap-4 w-full max-w-[1800px] mx-auto font-outfit relative">

        {/* TOP BAR */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-4 px-2 tracking-wide">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-red-500'}`} />
              <span className="font-bold text-gray-200 uppercase text-xs">Room {roomCode}</span>
            </div>

            <div className="h-5 w-px bg-white/10" />

            <select
              value={problem?._id || ''}
              onChange={(e) => handleProblemChange(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white uppercase tracking-wider font-semibold focus:ring-1 focus:ring-teal-500 outline-none"
            >
              <option value="">-- SELECT PROBLEM --</option>
              {problemList.map(p => <option key={p._id} value={p._id}>{p.title} ({p.difficulty})</option>)}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/5">
              <button
                onClick={webrtc.isConnected ? webrtc.stopAudio : webrtc.startAudio}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${webrtc.isConnected ? 'bg-rose-500/20 text-rose-300' : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30'}`}
              >
                {webrtc.isConnected ? '📞 Stop Audio' : '📞 Join Audio'}
              </button>
              <button
                onClick={() => setIsChatOpen(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isChatOpen ? 'bg-teal-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              >
                💬 Chat {messages.length > 0 && <span className="bg-white/20 px-1.5 rounded-full text-[10px] ml-1">{messages.length}</span>}
              </button>
              {webrtc.isConnected && (
                <button onClick={webrtc.toggleMute} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${webrtc.isMuted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-gray-300'}`}>
                  {webrtc.isMuted ? '🔇 Muted' : '🎤 Unmute'}
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
              {LANGS.map(l => (
                <button
                  key={l.id}
                  onClick={() => handleLanguageChange(l.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${language === l.id ? 'bg-teal-500 text-black shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {webrtc.remoteStream && <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />}

        {webrtc.audioError && (
          <div className="rounded-xl bg-red-500/10 border border-red-400/20 p-3 text-xs text-red-300 flex items-center gap-2">
            <span>🎙️</span>{webrtc.audioError}
          </div>
        )}

        {/* MAIN GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 min-h-0 overflow-hidden">

          {/* LEFT: PROBLEM DESCRIPTION */}
          <div className="flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden backdrop-blur-sm h-full">
            <div className="px-5 py-4 border-b border-white/[0.05] bg-black/20 flex items-center shadow-sm">
              <h2 className="font-bold text-lg text-gray-100 truncate tracking-tight">{problem ? problem.title : 'No problem selected'}</h2>
              {problem && (
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${problem.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' : problem.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                  {problem.difficulty}
                </span>
              )}
            </div>
            <div className="p-6 overflow-y-auto min-h-0 text-gray-300 text-sm leading-relaxed custom-scrollbar">
              {problem ? (
                <div className="space-y-6">
                  <div className="whitespace-pre-wrap">{problem.description}</div>

                  {problem.inputFormat && (
                    <div>
                      <h3 className="text-white font-bold mb-2 uppercase text-xs tracking-widest opacity-60">Input Format</h3>
                      <p className="bg-black/20 p-3 rounded-xl border border-white/5">{problem.inputFormat}</p>
                    </div>
                  )}

                  {problem.examples?.length > 0 && (
                    <div className="space-y-4">
                      {problem.examples.map((ex, i) => (
                        <div key={i} className="bg-black/30 rounded-xl p-4 border border-white/[0.05]">
                          <div className="font-bold text-gray-400 mb-2 text-xs uppercase tracking-widest">Example {i + 1}</div>
                          <div className="space-y-2 font-mono text-xs">
                            <div className="flex gap-2"><span className="text-gray-500">Input:</span><span className="text-teal-200 break-all">{ex.input}</span></div>
                            <div className="flex gap-2"><span className="text-gray-500">Output:</span><span className="text-emerald-200 break-all">{ex.output}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                  <span className="text-4xl mb-4">📝</span>
                  <p>Select a problem to begin collaborating.</p>
                </div>
              )}
            </div>
          </div>

          {/* EDITORS AREA */}
          <div className="flex flex-col gap-4 min-h-0 min-w-0">
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0">

              {/* MY EDITOR */}
              <div className="flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden backdrop-blur-sm shadow-inner relative group border-t-teal-500/50">
                <div className="absolute top-0 inset-x-0 h-10 bg-black/40 border-b border-white/5 flex items-center px-4 justify-between z-10 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{myName} (You)</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{language}</span>
                </div>
                <div className="pt-10 flex-1 overflow-hidden">
                  <CodeEditor value={localCodeState[language]} onChange={handleCodeChange} language={language} height="100%" />
                </div>
              </div>

              {/* PARTNER EDITOR / LIST */}
              <div className="flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden backdrop-blur-sm shadow-inner relative group min-w-0 border-t-purple-500/50">
                {participants.length < 2 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-4 animate-bounce">⏳</div>
                    <h3 className="text-gray-200 font-bold tracking-tight mb-1">Waiting for partner...</h3>
                    <p className="text-xs text-gray-500">Share the room code <span className="text-teal-400 font-mono font-bold">{roomCode}</span> to start collaborating.</p>
                  </div>
                ) : (
                  <>
                    <div className="absolute top-0 inset-x-0 h-10 bg-black/40 border-b border-white/5 flex items-center px-4 justify-between z-10 pointer-events-none">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                          {partnerUser?.user?.username || 'Partner'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase cursor-pointer hover:text-white pointer-events-auto">
                          <input type="checkbox" checked={blurPartner} onChange={(e) => setBlurPartner(e.target.checked)} className="rounded bg-black/50 border-white/20 text-purple-500 focus:ring-purple-500 size-3" />
                          Blur
                        </label>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{language}</span>
                      </div>
                    </div>
                    <div className="pt-10 flex-1 relative overflow-hidden">
                      <div className={`absolute inset-0 z-[5] ${blurPartner ? 'backdrop-blur-xl bg-black/20' : ''} pointer-events-none transition-all duration-500`} />
                      <CodeEditor value={remoteCodeState[language]} onChange={() => { }} language={language} readOnly height="100%" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Test Cases Panel */}
            <div className="h-64 flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden backdrop-blur-sm shrink-0">
              <div className="flex items-center justify-between bg-black/40 border-b border-white/[0.05] px-2 shadow-sm">
                <div className="flex">
                  <button onClick={() => setBottomTab('tests')} className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${bottomTab === 'tests' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Test Cases</button>
                  <button onClick={() => setBottomTab('output')} className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${bottomTab === 'output' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Execution Result</button>
                  <button onClick={() => setBottomTab('ai')} className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${bottomTab === 'ai' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>AI Feedback</button>
                </div>
                <div className="flex items-center gap-2 px-3">
                  <button onClick={handleRun} disabled={isSubmitting} className="px-5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30">Run Code</button>
                  <button onClick={handleSubmit} disabled={isSubmitting || !problem} className="px-5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] disabled:opacity-30">Submit Solution</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-black/20 font-mono">
                {bottomTab === 'tests' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {problem?.testCases?.filter(tc => !tc.hidden).map((tc, idx) => (
                      <div key={idx} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-[11px] hover:border-teal-500/30 transition-colors">
                        <div className="text-gray-500 mb-2 font-bold text-[9px] uppercase tracking-tighter">Input</div>
                        <div className="text-teal-100 break-all mb-4 bg-black/20 p-2 rounded-lg">{tc.input}</div>
                        <div className="text-gray-500 mb-2 font-bold text-[9px] uppercase tracking-tighter">Expected Output</div>
                        <div className="text-emerald-400 break-all bg-black/20 p-2 rounded-lg">{tc.expectedOutput}</div>
                      </div>
                    ))}
                    {!problem && <div className="col-span-full py-10 text-center text-gray-600 italic">No problem selected</div>}
                  </div>
                )}

                {bottomTab === 'output' && (
                  <div className="h-full flex flex-col">
                    {!runResult ? (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-30 italic">
                        <span className="text-2xl mb-2">🚀</span>
                        <p>Hit Run to execute against visible test cases.</p>
                      </div>
                    ) : runResult.error ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl font-mono text-xs text-red-400 whitespace-pre-wrap">
                        <div className="font-bold mb-2 uppercase tracking-widest flex items-center gap-2"><span>⚠️</span> Error</div>
                        {runResult.error}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-6 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                          <div className={`text-2xl font-black uppercase tracking-tighter ${runResult.status === 'ac' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {runResult.status === 'ac' ? 'ACCEPTED' : runResult.status === 'wa' ? 'WRONG ANSWER' : 'ERROR'}
                          </div>
                          <div className="h-8 w-px bg-white/10" />
                          <div className="text-gray-400 text-sm">Passed <span className="text-white font-bold">{runResult.passed} / {runResult.total}</span> Test Cases</div>
                        </div>

                        {runResult.tests?.map((t, idx) => (
                          <div key={idx} className={`p-4 rounded-2xl border ${t.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                            <div className="flex justify-between items-center mb-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${t.passed ? 'text-emerald-400' : 'text-rose-400'}`}>TEST CASE #{idx + 1} {t.isHidden ? '(HIDDEN)' : ''}</span>
                              <span className="text-[10px] text-gray-500 font-bold">{t.executionTime || 0} MS</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                              <div>
                                <span className="block text-[9px] opacity-40 uppercase font-black mb-1">Actual Output</span>
                                <div className={`p-2 rounded-lg bg-black/40 ${t.passed ? 'text-emerald-200' : 'text-rose-200'}`}>{t.actualOutput || '-'}</div>
                              </div>
                              <div>
                                <span className="block text-[9px] opacity-40 uppercase font-black mb-1">Expected Output</span>
                                <div className="p-2 rounded-lg bg-black/40 text-gray-300">{t.expectedOutput || '-'}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {bottomTab === 'ai' && (
                  <div className="h-full flex flex-col">
                    {!runResult?.aiFeedback ? (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-30 italic text-center">
                        <span className="text-2xl mb-2">🤖</span>
                        <p>Submit a solution to get AI-powered code analysis.</p>
                        <p className="text-[10px] mt-1 text-gray-600">Time complexity, patterns, and quality score.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-1">Time Complexity</div>
                            <div className="text-lg font-bold text-white">{runResult.aiFeedback.timeComplexity || 'N/A'}</div>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">Space Complexity</div>
                            <div className="text-lg font-bold text-white">{runResult.aiFeedback.spaceComplexity || 'N/A'}</div>
                          </div>
                          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 text-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-teal-400 mb-1">Quality Score</div>
                            <div className="text-lg font-bold text-white">{runResult.aiFeedback.qualityScore ?? 'N/A'}<span className="text-xs text-gray-500">/100</span></div>
                          </div>
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">Patterns</div>
                            <div className="text-xs font-bold text-white">{runResult.aiFeedback.patterns?.length ? runResult.aiFeedback.patterns.join(', ') : 'None detected'}</div>
                          </div>
                        </div>
                        {runResult.aiFeedback.feedbackText && (
                          <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Detailed Feedback</div>
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
        </div>

        {/* CHAT SLIDE-IN PANEL */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-[350px] bg-[#0d0d0d] border-l border-white/10 z-[50] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-black text-xs uppercase tracking-widest text-teal-500">Live Chat</h3>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 text-center italic text-sm px-6">
                    <p>No messages yet. Say hello to your partner!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.user._id === myId ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase text-gray-500">{msg.user.username}</span>
                        <span className="text-[8px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] break-words ${msg.user._id === myId ? 'bg-teal-500 text-black rounded-tr-none font-medium' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'}`}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/10">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-xs text-white focus:outline-none focus:border-teal-500/50 transition-all"
                  />
                  <button type="submit" className="absolute right-2 top-1.5 p-1.5 text-teal-500 hover:bg-teal-500/10 rounded-lg transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI CHATBOT — Collab mode only */}
        <AIChatbot codeContext={localCodeState[language]} language={language} />

      </div>
    </MainLayout>
  );
}
