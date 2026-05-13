import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import MainLayout from "../components/MainLayout";

export default function InterviewUpcoming() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  const load = () => {
    api.get("/interviews/upcoming")
      .then((res) => setItems(Array.isArray(res?.data) ? res.data : []))
      .catch((err) => setError(err?.message || "Failed to load upcoming interviews"));

    api.get("/interviews/history/me")
      .then((res) => setHistory(Array.isArray(res?.data) ? res.data : []))
      .catch(() => { });
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id) => {
    await api.post(`/interviews/${id}/cancel`, {});
    load();
  };

  const handleMatch = async (id) => {
    await api.post("/interviews/match", { interviewId: id });
    load();
  };

  return (
    <MainLayout activeTab="interview">
      <div className="mx-auto max-w-5xl w-full p-6 overflow-y-auto">
        <h1 className="text-2xl font-black text-white mb-2">Upcoming Interviews</h1>
        <p className="text-sm text-gray-400 mb-6">See scheduled sessions and start or cancel them.</p>
        {error && <div className="mb-4 rounded-xl bg-red-500/10 border border-red-400/20 p-3 text-sm text-red-300">{error}</div>}

        <div className="space-y-3">
          {items.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-gray-500">No upcoming interviews.</div>
          )}
          {items.map((item) => (
            <div key={item._id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-white font-bold uppercase">{item.mode} • {item.level}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(item.scheduledFor || item.startedAt).toLocaleString()} • Slot {item.timeSlot || "N/A"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Status: {item.status} • Room: {item.roomId?.roomCode || "-"}</div>
                </div>
                <div className="flex gap-2">
                  {item.mode === "peer" && item.status === "scheduled" && (
                    <button onClick={() => handleMatch(item._id)} className="px-3 py-2 rounded-lg bg-indigo-500 text-white text-xs font-bold uppercase">
                      Match Now
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/dashboard/interview/${item.roomId?.roomCode}`)}
                    className="px-3 py-2 rounded-lg bg-teal-500 text-black text-xs font-bold uppercase"
                  >
                    Open Room
                  </button>
                  {(item.status === "scheduled" || item.status === "matched") && (
                    <button onClick={() => handleCancel(item._id)} className="px-3 py-2 rounded-lg bg-white/10 text-gray-200 text-xs font-bold uppercase">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-black text-indigo-300 mt-10 mb-3">Interview History</h2>
        <div className="space-y-3">
          {history.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-gray-500">No interview history yet.</div>
          )}
          {history.map((item) => (
            <div key={item.interviewId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid md:grid-cols-6 gap-3 text-xs">
                <div className="md:col-span-2 text-white font-bold">{item.partner?.displayName || item.partner?.username || "Partner"}</div>
                <div className="text-gray-400">Date: <span className="text-white">{new Date(item.date).toLocaleString()}</span></div>
                <div className="text-gray-400">Questions: <span className="text-white">{item.questions?.length || 0}</span></div>
                <div className="text-gray-400">Rounds: <span className="text-white">{item.roundsCompleted || 0}</span></div>
                <div className="text-gray-400">Duration: <span className="text-white">{item.durationMin || 0}m</span></div>
              </div>
              {item.myFeedback && <div className="mt-2 text-xs text-gray-300">Your feedback: {item.myFeedback}</div>}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
