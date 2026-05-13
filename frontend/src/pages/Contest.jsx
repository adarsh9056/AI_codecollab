import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import MainLayout from "../components/MainLayout";

import { useAuth } from "../context/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.6, -0.05, 0.01, 0.99], delay: d } }),
};

export default function ContestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/contests/history/me")
      .then((res) => setHistory(Array.isArray(res?.data) ? res.data : []))
      .catch(() => { });
  }, []);

  const handleCreate = async () => {
    setError("");
    setCreateLoading(true);
    try {
      // 1. Create Contest (backend now auto-creates room, selects problems, and returns code)
      const res = await api.post("/contests", {
        title: `${user?.username || 'User'}'s Weekly Challenge`,
        isPublic: true,
        duration: 60
      });

      const code = res?.data?.code;
      if (!code) throw new Error("Contest created but no room code returned.");

      navigate(`/dashboard/contest/${code}`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create contest room");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <MainLayout activeTab="contest">
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -16, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -16, height: 0 }} className="mx-auto max-w-7xl px-8 pt-4 w-full">
            <div className="rounded-xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-red-300 text-sm flex items-center gap-2">
              <span>⚠️</span>{error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 w-full py-12 flex flex-col items-center justify-center text-center">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest border border-amber-500/40 bg-amber-500/10 text-amber-500">
            COMPETITIVE PROGRAMMING
          </span>
        </motion.div>

        <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={0.1} className="mt-8 text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6">
          Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Contests</span>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="show" custom={0.2} className="max-w-2xl text-lg text-gray-400 mb-12">
          Challenge yourself against the world. Start a 60-minute contest room.
          You'll be given 3 random problems (Easy, Medium, Hard). Solve them as fast as possible to climb the leaderboard.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.3} className="w-full max-w-sm">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={createLoading}
            className="w-full py-5 rounded-2xl font-bold text-lg tracking-wide text-gray-900 bg-amber-500 hover:bg-amber-400 transition-colors shadow-[0_0_40px_rgba(245,158,11,0.3)] disabled:opacity-50"
          >
            {createLoading ? "Creating Contest..." : "Start Contest (60 mins)"}
          </motion.button>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.5} className="mt-16 w-full max-w-5xl text-left">
          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-4">Your Contest History</h3>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            {history.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No contest history yet.</div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {history.map((item) => (
                  <div key={item.contestId} className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                    <div className="text-gray-300 font-bold col-span-2">{item.title}</div>
                    <div className="text-gray-400">Solved: <span className="text-white">{item.questionsSolved}</span></div>
                    <div className="text-gray-400">Points: <span className="text-white">{item.pointsScored}</span></div>
                    <div className="text-gray-400">Rank: <span className="text-white">{item.rank || "-"}/{item.totalParticipants || "-"}</span></div>
                    <div className="text-gray-400">Time: <span className="text-white">{Math.round((item.timeTakenSec || 0) / 60)}m</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </MainLayout>
  );
}