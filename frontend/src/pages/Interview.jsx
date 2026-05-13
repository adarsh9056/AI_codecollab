/**
 * Interview.jsx — Revamped interview landing page
 * 
 * Replaces the old scheduling-only page with two instant modes:
 *   1. Connect With Friends — share room code
 *   2. Peer Mode — random anonymous matchmaking
 * 
 * The old schedule flow is preserved as a secondary option.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/MainLayout";

export default function InterviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [mode, setMode] = useState(null); // null | 'friend-create' | 'friend-join' | 'peer'
  const [friendRoomCode, setFriendRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [peerStatus, setPeerStatus] = useState("idle"); // idle | queuing | matched
  const [copied, setCopied] = useState(false);
  const socketRef = useRef(socket);

  useEffect(() => { socketRef.current = socket; }, [socket]);

  // ── Friend Room: Create ───────────────────────────────────────────────────
  const handleCreateFriendRoom = () => {
    if (!socket) return setError("Not connected. Please wait...");
    setError("");
    setMode("friend-create");

    socket.emit("create-friend-room", {}, (res) => {
      if (res?.error) return setError(res.error);
      setFriendRoomCode(res.roomCode);
      // Navigate immediately — host waits in room
      navigate(`/dashboard/interview/room/${res.roomCode}?role=interviewer&mode=friend`);
    });
  };

  // ── Friend Room: Join ─────────────────────────────────────────────────────
  const handleJoinFriendRoom = () => {
    if (!joinCode.trim()) return setError("Enter a room code");
    navigate(`/dashboard/interview/room/${joinCode.trim().toUpperCase()}?role=interviewee&mode=friend`);
  };

  // ── Peer Mode ─────────────────────────────────────────────────────────────
  const handleJoinPeerQueue = () => {
    if (!socket) return setError("Not connected. Please wait...");
    setError("");
    setMode("peer");
    setPeerStatus("queuing");

    socket.emit("peer-join-queue", {}, (res) => {
      if (res?.error) {
        setError(res.error);
        setPeerStatus("idle");
      }
    });

    const onMatched = (data) => {
      setPeerStatus("matched");
      navigate(`/dashboard/interview/room/${data.roomCode}?role=${data.myRole}&mode=peer&name=${data.myName}`);
    };
    socket.on("peer-match-found", onMatched);

    return () => socket.off("peer-match-found", onMatched);
  };

  const handleCancelQueue = () => {
    socket?.emit("peer-leave-queue");
    setPeerStatus("idle");
    setMode(null);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(friendRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MainLayout activeTab="interview">
      <div className="min-h-full overflow-y-auto custom-scrollbar relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-[-8rem] h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute top-20 right-[-6rem] h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.18]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-sky-300">
                <span className="h-2 w-2 rounded-full bg-sky-300 animate-pulse" />
                Interview Mode
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
                Video + audio + live code
              </span>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white leading-[0.92] mb-5 max-w-4xl">
                  Practice interviews that feel
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-300 to-cyan-300">
                    fast, focused, and real.
                  </span>
                </h1>
                <p className="text-base md:text-lg text-gray-300 max-w-2xl leading-relaxed">
                  Pick a question, start a live room, and code with the same experience you get in the collaborative editor. Use friend rooms for private practice or peer mode for instant matchmaking.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Question library', value: 'Curated' },
                  { label: 'Interview room', value: 'Realtime' },
                  { label: 'Peer mode', value: 'Instant' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-gray-500 mb-2">{item.label}</div>
                    <div className="text-sm font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-400/20 p-4 text-sm text-red-300 flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          {/* Connection indicator */}
          {!connected && (
            <div className="mb-6 rounded-xl bg-yellow-500/10 border border-yellow-400/20 p-3 text-sm text-yellow-300 flex items-center gap-2">
              <span className="animate-pulse">●</span> Connecting to server...
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6 xl:gap-8">

            {/* ── CONNECT WITH FRIENDS ── */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-sky-400/15 bg-gradient-to-br from-sky-500/10 via-white/[0.03] to-white/[0.01] p-6 md:p-7 flex flex-col gap-5 shadow-2xl shadow-black/10">
              <div className="absolute right-[-3rem] top-[-3rem] h-28 w-28 rounded-full bg-sky-400/15 blur-2xl" />

              <div className="relative flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-2xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-2xl shadow-lg shadow-sky-500/10">👥</div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-sky-300 font-black mb-1">Private</div>
                  <h2 className="text-white font-black text-2xl">Connect With Friends</h2>
                  <p className="text-gray-400 text-sm">Private interview room with a friend</p>
                </div>
              </div>

              <div className="relative space-y-3">
                <p className="text-sm md:text-[15px] text-gray-300 leading-relaxed max-w-xl">
                  Create a private room and share the code with your friend. One of you acts as interviewer, the other as interviewee — swap anytime.
                </p>

                <div className="rounded-2xl bg-black/20 border border-white/5 p-4 md:p-5 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center font-black text-[11px]">1</span>
                    Host creates room & shares code
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center font-black text-[11px]">2</span>
                    Friend joins with room code
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center font-black text-[11px]">3</span>
                    Live collaborative interview begins
                  </div>
                </div>
              </div>

              {/* Create room */}
              <button
                onClick={handleCreateFriendRoom}
                disabled={!connected}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-300 hover:from-sky-300 hover:to-blue-200 text-black font-black text-sm uppercase tracking-[0.25em] disabled:opacity-40 transition-all shadow-lg shadow-sky-500/20"
              >
                Create Room (Host)
              </button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 border-t border-white/10" />
                <span className="text-[11px] uppercase tracking-[0.22em] text-gray-500">or join existing</span>
                <div className="flex-1 border-t border-white/10" />
              </div>

              {/* Join room */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoinFriendRoom()}
                  placeholder="ROOM CODE"
                  maxLength={10}
                  className="flex-1 bg-black/35 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-600 uppercase tracking-[0.18em] font-mono focus:outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                />
                <button
                  onClick={handleJoinFriendRoom}
                  disabled={!joinCode.trim()}
                  className="px-5 py-3.5 rounded-2xl bg-white text-slate-950 hover:bg-sky-200 font-black text-sm uppercase tracking-[0.18em] disabled:opacity-40 transition-all"
                >
                  Join
                </button>
              </div>
            </div>

            {/* ── PEER MODE ── */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-blue-400/15 bg-gradient-to-br from-blue-500/10 via-white/[0.03] to-white/[0.01] p-6 md:p-7 flex flex-col gap-5 shadow-2xl shadow-black/10">
              <div className="absolute right-[-3rem] top-[-3rem] h-28 w-28 rounded-full bg-blue-400/15 blur-2xl" />

              <div className="relative flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/10">🎲</div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-blue-300 font-black mb-1">Instant</div>
                  <h2 className="text-white font-black text-2xl">Peer Mode</h2>
                  <p className="text-gray-400 text-sm">Anonymous random mock interview</p>
                </div>
              </div>

              <div className="relative space-y-3">
                <p className="text-sm md:text-[15px] text-gray-300 leading-relaxed max-w-xl">
                  Get matched with a random anonymous peer. Roles (interviewer/interviewee) are randomly assigned. Practice with someone new every time.
                </p>

                <div className="rounded-2xl bg-black/20 border border-white/5 p-4 md:p-5 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-blue-400/20 text-blue-300 flex items-center justify-center">🔍</span>
                    Anonymous — shown as Peer_XXXX
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-blue-400/20 text-blue-300 flex items-center justify-center">⚡</span>
                    Matched instantly when queue ready
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-blue-400/20 text-blue-300 flex items-center justify-center">🔄</span>
                    Roles randomly assigned, can swap
                  </div>
                </div>
              </div>

              {peerStatus === "queuing" ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-blue-200 font-semibold">Finding a peer...</span>
                  </div>
                  <button
                    onClick={handleCancelQueue}
                    className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleJoinPeerQueue}
                  disabled={!connected}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-400 hover:from-sky-300 hover:to-blue-300 text-white font-black text-sm uppercase tracking-[0.25em] disabled:opacity-40 transition-all mt-auto shadow-lg shadow-sky-500/20"
                >
                  Find a Peer
                </button>
              )}

              <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-3 text-xs text-gray-400 text-center">
                Both users must be online simultaneously for matching
              </div>
            </div>
          </div>

          {/* Schedule section - preserved */}
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 backdrop-blur-xl">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-[0.22em] text-gray-500 font-black">Scheduled interviews</div>
              <h3 className="text-lg font-black text-white">Plan and manage upcoming sessions</h3>
              <p className="text-sm text-gray-400">Keep track of booked rooms, match-ready sessions, and interview history in one place.</p>
            </div>
            <button
              onClick={() => navigate("/dashboard/interview/upcoming")}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-sky-200 text-sm font-black uppercase tracking-[0.18em] transition-all"
            >
              View Scheduled →
            </button>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
