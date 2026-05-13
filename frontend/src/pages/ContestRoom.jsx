import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import CodeEditor from '../components/CodeEditor';
import { api } from '../services/api';
import { getInitialCodeState } from '../utils/boilerplate';
import MainLayout from '../components/MainLayout';
import { trackEvent } from '../utils/analytics';

const LANGS = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' }
];

export default function ContestRoom() {
  const { contestId } = useParams(); // This is the contest.code (e.g. ABC123)
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [contest, setContest] = useState(null);
  const [error, setError] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [language, setLanguage] = useState('javascript');
  const [copied, setCopied] = useState(false);

  const [codeState, setCodeState] = useState({
    0: { javascript: '', python: '', cpp: '', java: '' },
    1: { javascript: '', python: '', cpp: '', java: '' },
    2: { javascript: '', python: '', cpp: '', java: '' }
  });

  const [runResult, setRunResult] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [solved, setSolved] = useState({});
  const [remainingMs, setRemainingMs] = useState(0);
  const [bottomTab, setBottomTab] = useState('tests');

  const timerRef = useRef(null);

  useEffect(() => {
    if (!contestId) { navigate('/dashboard'); return; }

    api.post(`/contests/join/${contestId}`)
      .then(res => {
        const data = res.data;
        setContest(data);
        setProblems(data.problemIds || []);
        trackEvent('contest_join', { contestId, contestCode: data.code });

        const me = data.participants?.find(p => p.userId?._id?.toString() === data.userId || p.userId?.toString() === data.userId);
        if (me) {
          const s = {};
          me.scores?.forEach((sc, i) => { if (sc.solvedAt) s[i] = true; });
          setSolved(s);
        }

        const newCodeState = { ...codeState };
        data.problemIds.forEach((p, idx) => {
          newCodeState[idx] = getInitialCodeState(p, codeState[idx]);
        });
        setCodeState(newCodeState);

        const end = new Date(data.endTime).getTime();
        const tick = () => {
          const now = Date.now();
          if (now >= end) {
            setRemainingMs(0);
            if (timerRef.current) clearInterval(timerRef.current);
          } else {
            setRemainingMs(end - now);
          }
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
      })
      .catch(err => {
        setError(err?.response?.data?.message || 'Failed to load contest');
      });

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [contestId]); // Run once on mount/ID change

  useEffect(() => {
    if (!contest?._id) return;
    api.get(`/contests/${contest._id}/leaderboard`)
      .then(r => setLeaderboard(r.data.leaderboard || []))
      .catch(() => { });
  }, [contest?._id]);

  useEffect(() => {
    if (!socket || !contest) return;
    const roomCode = contest.code;
    if (!roomCode) return;

    socket.emit('join_room', { roomCode, mode: 'contest' });

    socket.on('leaderboardUpdate', data => {
      // Backend now sends the array directly based on my recent change
      setLeaderboard(Array.isArray(data) ? data : data?.leaderboard || []);
    });

    socket.on('participantsUpdate', parts => {
      setContest(prev => prev ? { ...prev, participants: parts } : null);
    });

    socket.on('problemSolved', data => {
      const myId = user?._id?.toString() || user?.id?.toString();
      if (!myId || data?.userId !== myId) return;
      setSolved(s => ({ ...s, [data?.problemIndex]: true }));
    });

    return () => {
      socket.off('leaderboardUpdate');
      socket.off('participantsUpdate');
      socket.off('problemSolved');
    };
  }, [socket, contest?.code, user?._id, user?.id]);

  useEffect(() => {
    setAiAnalysis(null);
  }, [selectedIndex, language]);

  const handleCodeChange = (val) => {
    setCodeState(prev => ({ ...prev, [selectedIndex]: { ...prev[selectedIndex], [language]: val } }));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(contest?.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
    const pId = problems[selectedIndex]?._id;
    if (!pId) return;
    setIsSubmitting(true);
    setRunResult(null);
    setBottomTab('output');
    try {
      const res = await api.post('/run', { code: codeState[selectedIndex][language], language, problemId: pId });
      setRunResult(res.data);
    } catch (err) {
      setRunResult({ error: err?.response?.data?.message || err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const pId = problems[selectedIndex]?._id;
    if (!pId || !contest?._id) return;
    setIsSubmitting(true);
    setRunResult(null);
    setBottomTab('output');
    try {
      const res = await api.post(`/contests/${contest._id}/submit`, {
        code: codeState[selectedIndex][language],
        language,
        problemIndex: selectedIndex
      });
      setRunResult(res.data);
      trackEvent('contest_submit', { contestId: contest._id, problemIndex: selectedIndex, status: res.data.status, language }, { contestId: contest._id });
      if (res.data.passed === res.data.total && res.data.status === 'ac') {
        setSolved(s => ({ ...s, [selectedIndex]: true }));
      }
    } catch (err) {
      setRunResult({ error: err?.response?.data?.message || err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (!contest?._id) return;
    setAiLoading(true);
    try {
      const res = await api.post(`/contests/${contest._id}/analysis/${selectedIndex}`, {});
      setAiAnalysis(res.data?.analysis || null);
      setBottomTab('output');
    } catch (err) {
      setAiAnalysis({
        mistakes: err?.message || 'Failed to fetch AI analysis',
        codeQuality: 0,
        timeComplexity: 'N/A',
        spaceComplexity: 'N/A',
        betterApproach: 'N/A',
        edgeCasesMissed: 'N/A',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const formatTime = (ms) => {
    if (ms <= 0) return "00:00";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <MainLayout activeTab="contest">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-3xl max-w-lg text-center backdrop-blur-xl">
            <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Contest Error</h2>
            <p className="mb-8 opacity-70 text-sm leading-relaxed">{error}</p>
            <button onClick={() => navigate('/dashboard/contest')} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-white font-bold transition-all">Go Back</button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!contest || !problems.length) {
    return (
      <MainLayout activeTab="contest">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Entering Contest Room...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const selectedProblem = problems[selectedIndex];
  if (!selectedProblem) return null;
  const currentCode = codeState[selectedIndex][language];

  return (
    <MainLayout activeTab="contest">
      <div className="flex flex-col h-full overflow-hidden p-4 gap-4 w-full h-full max-w-[1700px] mx-auto">

        {/* TOP BAR */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-3xl p-3 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />

          <div className="flex items-center gap-2 relative z-10">
            {[
              { label: 'Easy', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Hard', color: 'text-rose-400', bg: 'bg-rose-500/10' }
            ].map((lvl, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-xs transition-all duration-300 uppercase tracking-widest ${selectedIndex === i ? 'bg-white/10 shadow-xl border border-white/10 text-white' : 'hover:bg-white/[0.04] text-gray-500 border border-transparent'}`}
              >
                <span className={lvl.color}>P{i + 1}</span>
                {solved[i] && <span className="text-emerald-500">✓</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="hidden md:flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-white/5 cursor-pointer hover:bg-black/60 transition-colors" onClick={handleCopyCode}>
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Code</span>
              <span className="font-mono text-sm font-bold text-white uppercase tracking-widest">{contest.code}</span>
              <span className="text-xs">{copied ? '✅' : 'Copy'}</span>
            </div>

            <div className="flex items-center gap-4 bg-black/40 px-5 py-3 rounded-2xl border border-white/5 shadow-inner">
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">Ends In</span>
              <span className={`font-mono text-2xl font-black ${remainingMs < 300000 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                {formatTime(remainingMs)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-2xl border border-white/5 overflow-hidden">
              {LANGS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === l.id ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {l.id === 'javascript' ? 'JS' : l.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)_340px] gap-4 min-h-0 h-full">

          {/* LEFT: PROBLEM */}
          <div className="flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-xl h-full shadow-xl">
            <div className="px-6 py-5 border-b border-white/[0.05] bg-black/20 flex items-center justify-between">
              <div>
                <h2 className="font-black text-xl text-white tracking-tight">{selectedProblem?.title}</h2>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">CONTEST PROBLEM {selectedIndex + 1}</span>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${selectedProblem?.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                selectedProblem?.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                }`}>{selectedProblem?.difficulty}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide text-sm leading-relaxed">
              <div className="text-gray-300 whitespace-pre-wrap">{selectedProblem?.description}</div>

              {selectedProblem?.examples?.length > 0 && (
                <div className="mt-10 space-y-6">
                  {selectedProblem.examples.map((ex, i) => (
                    <div key={i} className="bg-black/40 rounded-2xl p-5 border border-white/[0.03] shadow-inner">
                      <div className="font-black text-[10px] text-gray-500 mb-4 uppercase tracking-[0.2em]">Example {i + 1}</div>
                      <div className="space-y-4 font-mono text-[11px]">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-gray-500 text-[10px] uppercase font-bold">Input</span>
                          <div className="bg-white/5 p-3 rounded-xl text-amber-200/90 break-all">{ex.input}</div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-gray-500 text-[10px] uppercase font-bold">Output</span>
                          <div className="bg-white/5 p-3 rounded-xl text-emerald-300 font-bold break-all">{ex.output}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedProblem?.constraints && (
                <div className="mt-10">
                  <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Execution Constraints</h3>
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 font-mono text-[11px] text-rose-300/80 leading-relaxed shadow-inner">
                    {selectedProblem.constraints}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CENTER: EDITOR */}
          <div className="flex flex-col gap-4 min-h-0 h-full">
            <div className="flex-1 bg-white/[0.01] border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-xl flex flex-col min-h-0 shadow-2xl group">
              <div className="flex items-center justify-between px-6 py-3 bg-black/40 border-b border-white/5">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language}</span>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                </div>
              </div>
              <CodeEditor value={currentCode} onChange={handleCodeChange} language={language} height="100%" />
            </div>

            <div className="h-72 flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-xl shrink-0 shadow-2xl">
              <div className="flex items-center justify-between bg-black/40 border-b border-white/[0.05] px-2">
                <div className="flex">
                  <button onClick={() => setBottomTab('tests')} className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${bottomTab === 'tests' ? 'text-amber-500 bg-white/[0.02]' : 'text-gray-500 hover:text-gray-200'}`}>
                    {bottomTab === 'tests' && <motion.div layoutId="bt" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
                    Test Cases
                  </button>
                  <button onClick={() => setBottomTab('output')} className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${bottomTab === 'output' ? 'text-amber-500 bg-white/[0.02]' : 'text-gray-500 hover:text-gray-200'}`}>
                    {bottomTab === 'output' && <motion.div layoutId="bt" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
                    Results
                  </button>
                </div>
                <div className="flex items-center gap-3 px-3">
                  <button onClick={handleRun} disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">Run Code</button>
                  <button onClick={handleSubmit} disabled={isSubmitting || solved[selectedIndex]} className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all disabled:opacity-50">Submit</button>
                  <button
                    onClick={handleAiAnalysis}
                    disabled={remainingMs > 0 || aiLoading}
                    className="px-5 py-2 rounded-xl bg-indigo-500/80 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                  >
                    {aiLoading ? 'Analyzing...' : 'AI Analysis'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-[#080808]">
                {bottomTab === 'tests' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedProblem?.testCases?.filter(tc => !tc.hidden).map((tc, idx) => (
                        <div key={idx} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 font-mono text-[10px]">
                          <div className="text-gray-600 mb-2 uppercase font-black text-[9px] tracking-widest">Input {idx + 1}</div>
                          <div className="truncate text-amber-200/80 bg-black/20 p-2 rounded-lg mb-4">{tc.input}</div>
                          <div className="text-gray-600 mb-2 uppercase font-black text-[9px] tracking-widest">Expected</div>
                          <div className="truncate text-emerald-400 font-bold bg-black/20 p-2 rounded-lg">{tc.expectedOutput}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    {!runResult ? (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-20 mt-4">
                        <span className="text-4xl mb-2">⚡</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Run to see output</p>
                      </div>
                    ) : runResult.error ? (
                      <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl font-mono text-xs text-red-400 whitespace-pre-wrap leading-relaxed shadow-inner">{runResult.error}</div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className={`text-2xl font-black uppercase tracking-widest ${runResult.status === 'ac' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {runResult.status === 'ac' ? 'ACCEPTED' : runResult.status === 're' ? 'CRASHED' : runResult.status === 'tle' ? 'TIME LIMIT' : 'WRONG'}
                            </span>
                            <div className="h-8 w-px bg-white/5" />
                            <div className="flex flex-col">
                              <span className="text-white font-black text-sm">{runResult.passed}/{runResult.total}</span>
                              <span className="text-[9px] font-black text-gray-600 uppercase">TESTS PASSED</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {runResult.tests?.map((t, idx) => (
                            <div key={idx} className={`border rounded-2xl p-4 font-mono text-[10px] transition-all ${t.passed ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-red-500/20 bg-red-500/[0.02]'}`}>
                              <div className="flex justify-between items-center mb-4">
                                <span className={`font-black uppercase tracking-tight ${t.passed ? 'text-emerald-500' : 'text-red-500'}`}>T{idx + 1} {t.isHidden && '(H)'}</span>
                                <span className="text-[9px] text-gray-600 font-bold">{t.executionTime || 0}ms</span>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <span className="text-gray-600 block mb-1 uppercase text-[8px] font-black tracking-widest">Actual</span>
                                  <span className={`block p-2 rounded-lg bg-black/40 ${t.passed ? 'text-emerald-200' : 'text-red-300'}`}>{t.actualOutput || '-'}</span>
                                </div>
                                {!t.isHidden && (
                                  <div>
                                    <span className="text-gray-600 block mb-1 uppercase text-[8px] font-black tracking-widest">Expected</span>
                                    <span className="block p-2 rounded-lg bg-black/40 text-gray-400">{t.expectedOutput || '-'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {aiAnalysis && (
                          <div className="mt-4 border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-4 text-xs">
                            <h4 className="text-indigo-300 font-black uppercase tracking-widest mb-3">AI Feedback</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="text-gray-300">Code Quality: <span className="text-white font-bold">{aiAnalysis.codeQuality}</span></div>
                              <div className="text-gray-300">Time Complexity: <span className="text-white font-bold">{aiAnalysis.timeComplexity}</span></div>
                              <div className="text-gray-300">Space Complexity: <span className="text-white font-bold">{aiAnalysis.spaceComplexity}</span></div>
                              <div className="text-gray-300">Better Approach: <span className="text-white font-bold">{aiAnalysis.betterApproach}</span></div>
                            </div>
                            <div className="mt-3 text-gray-300">Mistakes: <span className="text-white">{aiAnalysis.mistakes}</span></div>
                            <div className="mt-1 text-gray-300">Edge Cases Missed: <span className="text-white">{aiAnalysis.edgeCasesMissed}</span></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: LEADERBOARD */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-xl h-full flex flex-col shadow-xl">
            <div className="px-6 py-5 border-b border-white/[0.05] bg-black/20 flex items-center justify-between">
              <h2 className="font-black text-sm text-amber-500 uppercase tracking-[0.3em]">Leaderboard</h2>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              <AnimatePresence>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <p className="text-[10px] font-black uppercase tracking-widest">No Submissions Yet</p>
                  </div>
                ) : leaderboard.map((l, idx) => (
                  <motion.div
                    key={l.userId?._id || idx}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} layout
                    className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3 relative transition-all"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-lg ${idx === 0 ? 'bg-amber-500 text-black' :
                          idx === 1 ? 'bg-gray-300 text-black' :
                            idx === 2 ? 'bg-orange-500 text-black' :
                              'bg-white/5 text-gray-500'
                          }`}>
                          {idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-black text-sm tracking-tight ${idx === 0 ? 'text-amber-500' : 'text-gray-200'}`}>
                            {l.userId?.displayName || l.userId?.username}
                          </span>
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Contestant</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-xl font-black text-white leading-none">
                          {l.totalScore ?? (l.scores || []).reduce((sum, score) => sum + (score?.score || 0), 0)}
                        </span>
                        <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Points</span>
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                          Solved {l.solvedCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 relative z-10">
                      {(l.scores || []).map((score, j) => (
                        <div key={j} className={`flex-1 h-1.5 rounded-full shadow-inner ${score.solvedAt ? 'bg-emerald-500 shadow-emerald-500/20' : score.attempts > 0 ? 'bg-rose-500/50' : 'bg-white/5'}`} />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
