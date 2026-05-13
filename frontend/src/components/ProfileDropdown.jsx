import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    try { await logout(); } catch (_) { /* always clear */ }
    navigate("/login");
  };

  const items = [
    { label: "View Profile", icon: "👤", action: () => { setOpen(false); navigate("/dashboard/profile"); } },
    { label: "Analytics", icon: "📊", action: () => { setOpen(false); navigate("/dashboard/analytics"); } },
    { label: "Settings", icon: "⚙️", action: () => { setOpen(false); navigate("/dashboard/profile"); } },
  ];

  return (
    <div ref={ref} className="relative">
      <motion.div whileHover={{ scale: 1.05 }} className="relative group">
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 opacity-0 group-hover:opacity-40 blur transition duration-500" />
        <button onClick={() => setOpen((v) => !v)} className="relative z-10 block focus:outline-none">
          <Avatar user={user} size={36} />
        </button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-48 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {/* User info header */}
            <div className="px-4 py-4 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <Avatar user={user} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">
                    {user?.displayName || user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="border-t border-slate-700/60 py-1.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <span className="text-base">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
