import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import MainLayout from "../components/MainLayout";
import Avatar from "../components/Avatar";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real profile data + stats from DB
  useEffect(() => {
    api.get("/users/me")
      .then((res) => {
        setProfileData(res?.data);
        if (res?.data) {
          setDisplayName(res.data.displayName || "");
          setUsername(res.data.username || "");
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setUsername(user.username ?? "");
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      await api.put("/users/update", { displayName, username });
      setMessage("Profile updated successfully!");
      // Re-fetch
      const res = await api.get("/users/me");
      setProfileData(res?.data);
    } catch (err) {
      setMessage(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image must be under 2MB");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const res = await api.upload("/users/upload-avatar", file, "avatar");
      setMessage("Avatar updated!");
      // Re-fetch profile
      const profileRes = await api.get("/users/me");
      setProfileData(profileRes?.data);
    } catch (err) {
      setMessage(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch (_) { /* always clear */ }
    navigate("/login");
  };

  const stats = profileData?.stats || {};

  return (
    <MainLayout activeTab="">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-8 w-full h-full overflow-y-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Profile</h1>
          <p className="text-sm text-gray-500 mt-2">Manage your account and view your progress</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Avatar Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-8 flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar user={profileData || user} size={96} className="ring-4 ring-white/10" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                >
                  <span className="text-white text-xs font-semibold">
                    {uploading ? "..." : "📷 Change"}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-100">{profileData?.displayName || profileData?.username || "User"}</p>
                <p className="text-sm text-gray-500">{profileData?.email}</p>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Problems Solved", value: stats.problemsSolved ?? 0, icon: "✅", color: "#20c9a0" },
                { label: "Submissions", value: stats.totalSubmissions ?? 0, icon: "🚀", color: "#f59e0b" },
                { label: "Accept Rate", value: `${stats.acceptRate ?? 0}%`, icon: "🎯", color: "#7c6af7" },
                { label: "Rooms Joined", value: stats.totalRooms ?? 0, icon: "👥", color: "#38bdf8" },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                  <div className="text-2xl">{s.icon}</div>
                  <div className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Edit Form */}
            <motion.form onSubmit={handleSave}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 space-y-5">
              <h2 className="text-lg font-bold text-gray-100">Account Details</h2>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                <input type="email" value={profileData?.email ?? ""} disabled
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-gray-500 cursor-not-allowed text-sm" />
                <p className="text-xs text-gray-600 mt-1">Email cannot be changed.</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none transition" />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Display Name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none transition" />
              </div>

              {message && (
                <p className={`text-sm px-3 py-2 rounded-lg ${message.includes("success") || message.includes("updated") ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
                  {message}
                </p>
              )}

              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={handleLogout}
                  className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-medium text-sm transition-colors">
                  Logout
                </button>
              </div>
            </motion.form>
          </>
        )}
      </div>
    </MainLayout>
  );
}
