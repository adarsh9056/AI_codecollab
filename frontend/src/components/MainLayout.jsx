import React from "react";
import Navbar from "./Navbar";
import { motion } from "framer-motion";

export default function MainLayout({ activeTab, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#121212] text-gray-100 overflow-hidden relative">
      {/* Dynamic Background Grid & Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
            backgroundSize: `40px 40px`
          }}
        />
        {/* Colored ambient blobs */}
        <motion.div
          animate={{
            x: [0, 40, -40, 0],
            y: [0, -40, 40, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 50, 0],
            y: [0, 50, -50, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[40%] right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, 30, -30, 0],
            y: [0, -30, 30, 0],
            scale: [0.9, 1.1, 1, 0.9],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] left-[20%] w-[60%] h-[40%] rounded-full bg-blue-900/10 blur-[120px]"
        />
      </div>

      <Navbar activeTab={activeTab} />

      <main className="relative z-10 w-full h-[calc(100vh-64px)] flex flex-col">
        {children}
      </main>
    </div>
  );
}
