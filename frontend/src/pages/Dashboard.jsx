import { useState, useEffect } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import MainLayout from "../components/MainLayout";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (d = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99], delay: d },
  }),
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = location.pathname.startsWith("/dashboard/contest")
    ? "contest"
    : location.pathname.startsWith("/dashboard/interview")
      ? "interview"
      : "collab";

  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [publicContests, setPublicContests] = useState([]);
  const [contestsLoading, setContestsLoading] = useState(true);

  useEffect(() => {
    api.get("/contests/public")
      .then(res => setPublicContests(res.data || []))
      .catch(() => { })
      .finally(() => setContestsLoading(false));
  }, []);

  const handleCreateRoom = async () => {
    setError("");
    setCreateLoading(true);
    try {
      const res = await api.post("/rooms", { mode: "collab" });
      const data = res?.data;
      if (!data) throw new Error("Invalid response from server");
      const code = data.roomCode || data.room_code;
      if (!code) throw new Error("Room created but no room code returned.");
      navigate(`/dashboard/room/${code}`);
    } catch (err) {
      setError(err?.message || "Failed to create room");
    } finally {
      setCreateLoading(false);
    }
  };

  const getTimeLeft = (endTime) => {
    const total = Date.parse(endTime) - Date.now();
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <MainLayout activeTab={activeTab}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full h-full flex flex-col md:flex-row items-center gap-12 py-12 custom-scrollbar overflow-y-auto overflow-x-hidden">

        {/* LEFT: HERO */}
        <div className="flex-1 flex flex-col justify-center">
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  className="mb-8 overflow-hidden"
                >
                  <div className="rounded-xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-red-200 text-sm flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-sm tracking-[0.35em] text-teal-500 font-black mb-4">CODE & COMPETE</p>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white leading-none">
              REAL-TIME<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">COLLAB ROOMS</span>
            </h1>
            <p className="mt-8 text-lg text-gray-400 max-w-lg leading-relaxed">
              The ultimate platform for collaborative coding, competitive programming, and technical interview preparation.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row gap-4 sm:items-center">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                onClick={handleCreateRoom}
                disabled={createLoading}
                className="w-full sm:w-[240px] rounded-2xl bg-teal-500 hover:bg-teal-400 text-black font-black px-6 py-5 shadow-[0_0_40px_rgba(20,184,166,0.25)] disabled:opacity-60 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                {createLoading ? "Generating Room..." : "Start Collab Room"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </motion.button>

              <NavLink to="/dashboard/join" className="text-sm font-bold text-gray-400 hover:text-white transition-colors border-b border-white/10 pb-1 h-fit">
                JOIN WITH CODE
              </NavLink>
            </div>
          </motion.div>
        </div>

        {/* RIGHT: LIVE CONTESTS */}
        <div className="flex-1 w-full max-w-xl">
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-xs uppercase tracking-widest text-amber-500">Live Public Contests</h3>
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-amber-500 uppercase">{publicContests.length} ACTIVE</span>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 min-h-[400px] backdrop-blur-xl relative">
              {contestsLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                </div>
              ) : publicContests.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-30">
                  <span className="text-4xl mb-4">🏆</span>
                  <p className="text-sm font-medium">No public contests right now. Start one to see it here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {publicContests.map((c, i) => (
                    <motion.div
                      key={c._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-amber-500/30 rounded-2xl p-5 transition-all cursor-pointer relative overflow-hidden"
                      onClick={() => navigate(`/dashboard/contest/${c.code}`)}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                          <h4 className="font-bold text-white text-lg tracking-tight mb-1">{c.title}</h4>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">HOSTED BY {c.createdBy?.username}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-amber-500 font-bold text-sm">{getTimeLeft(c.endTime)}</span>
                          <span className="text-[9px] font-bold text-gray-600 uppercase">LEFT</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex -space-x-2">
                          {c.participants?.slice(0, 3).map((p, j) => (
                            <img key={j} src={p.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId?.username}`} className="w-6 h-6 rounded-full border border-black shadow-lg" alt="avatar" />
                          ))}
                          {c.participants?.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-800 border border-black flex items-center justify-center text-[8px] font-bold">+{c.participants.length - 3}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex gap-1">
                            {c.problemIds?.map((p, j) => (
                              <div key={j} className={`w-1.5 h-1.5 rounded-full ${p.difficulty === 'easy' ? 'bg-emerald-500' : p.difficulty === 'medium' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                            ))}
                          </div>
                          <button className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] px-4 py-2 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-amber-500/10">Join</button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest pt-2">Join a public contest to compete with others globally</p>
          </motion.div>
        </div>

      </div>
    </MainLayout>
  );
}
