import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";
import ProfileDropdown from "./ProfileDropdown";

const NAV_TABS = [
  { id: "collab", label: "Collab", path: "/dashboard", gradient: "from-teal-400 to-cyan-400" },
  { id: "contest", label: "Contest", path: "/dashboard/contest", gradient: "from-amber-400 to-orange-400" },
  { id: "interview", label: "Interview Prep", path: "/dashboard/interview", gradient: "from-sky-400 to-blue-400" },
];

export default function Navbar({ activeTab = "collab", bgClass = "bg-[#0F0F0F]/80" }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={`sticky top-0 z-50 border-b border-white/[0.07] ${bgClass} backdrop-blur-xl`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <Logo size={32} />
          </motion.div>

          {/* Desktop Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/[0.07]">
            {NAV_TABS.map((t) => (
              <motion.button
                key={t.id}
                onClick={() => navigate(t.path)}
                className={`relative px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${t.id === activeTab ? "text-white" : "text-gray-400 hover:text-white"
                  }`}
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
              >
                {t.id === activeTab && (
                  <motion.div
                    layoutId="navActiveTab"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${t.gradient} opacity-20`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </motion.button>
            ))}
          </nav>

          {/* Right: Hamburger (mobile) + Join + Profile */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => navigate("/dashboard/join")}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 text-white font-medium text-sm hover:bg-teal-600 transition-colors"
            >
              Join Room
            </button>

            <ProfileDropdown />

            {/* Hamburger button - mobile only */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] transition"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[3px]' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white mt-1 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white mt-1 transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-white/[0.07]"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    navigate(t.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    t.id === activeTab
                      ? "bg-white/[0.08] text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => {
                  navigate("/dashboard/join");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-teal-400 hover:bg-white/[0.04] transition sm:hidden"
              >
                Join Room
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
