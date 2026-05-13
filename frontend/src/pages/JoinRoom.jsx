import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { motion } from "framer-motion";
import MainLayout from "../components/MainLayout";

export default function JoinRoom() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) return;

    setError("");
    setLoading(true);
    try {
      const res = await api.post("/rooms/join", { roomCode: code });
      const mode = res?.data?.mode;

      if (mode === "contest") navigate(`/dashboard/contest/${code}`);
      else if (mode === "interview") navigate(`/dashboard/interview/${code}`);
      else navigate(`/dashboard/room/${code}`);
    } catch (err) {
      setError(err?.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout activeTab="">
    <div className="mx-auto max-w-xl px-4 py-12">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-semibold"
        >
          Join a room
        </motion.h1>

        <p className="mt-2 text-gray-400">
          Enter the 6-character code your friend shared with you.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <label className="text-sm text-gray-300">Room Code</label>

          <input
            value={roomCode}
            onChange={(e) =>
              setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            maxLength={6}
            placeholder="ABC123"
            className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-xl font-mono tracking-widest text-white placeholder-gray-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:outline-none"
          />

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-gray-200 hover:bg-white/10"
            >
              Back
            </button>

            <button
              onClick={handleJoin}
              disabled={loading || roomCode.trim().length !== 6}
              className="flex-1 rounded-xl bg-teal-400 px-5 py-3 font-semibold text-black hover:bg-teal-300 disabled:opacity-50"
            >
              {loading ? "Joining…" : "Join Room →"}
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
