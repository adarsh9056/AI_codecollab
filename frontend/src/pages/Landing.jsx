import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../components/Logo";
import { useState, useEffect } from "react";

const code = `function greet() {
  console.log("Hello World");
}

greet();`;

const ctaText = "Ready to code together?";


const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut", delay: d },
  }),
};

const popIn = {
  hidden: { opacity: 0, scale: 0.92, y: 18 },
  show: (d = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut", delay: d },
  }),
};

export default function Landing() {
  const [typedHeading, setTypedHeading] = useState("");

useEffect(() => {
  let i = 0;

  const interval = setInterval(() => {
    setTypedHeading(ctaText.slice(0, i));
    i++;

    if (i > ctaText.length) {
      clearInterval(interval);
    }
  }, 50);

  return () => clearInterval(interval);
}, []);

  const [displayedCode, setDisplayedCode] = useState("");

useEffect(() => {
  let i = 0;
  let isDeleting = false;
  let timeoutId;

  const typeSpeed = 40;
  const deleteSpeed = 20;
  const holdFull = 900;
  const holdEmpty = 300;

  const tick = () => {
    if (!isDeleting) {
      i++;
      setDisplayedCode(code.slice(0, i));

      if (i >= code.length) {
        isDeleting = true;
        timeoutId = setTimeout(tick, holdFull);
        return;
      }

      timeoutId = setTimeout(tick, typeSpeed);
    } else {
      i--;
      setDisplayedCode(code.slice(0, i));

      if (i <= 0) {
        isDeleting = false;
        timeoutId = setTimeout(tick, holdEmpty);
        return;
      }

      timeoutId = setTimeout(tick, deleteSpeed);
    }
  };

  tick();

  return () => clearTimeout(timeoutId);
}, []);


  return (
    
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <Logo size={28} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="flex items-center gap-4"
          >
            <Link to="/login" className="text-gray-300 hover:text-white transition">
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-black hover:bg-teal-400 transition shadow-lg shadow-teal-900/25"
            >
              Get Started
            </Link>
          </motion.div>
        </nav>
      </header>

      <main className="mx-auto">
        {/* HERO */}
        <section className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />

            {/* soft diagonal blocks */}
            <div className="absolute -left-44 top-[-120px] h-[520px] w-[520px] rotate-12 bg-white/5" />
            <div className="absolute left-40 top-[-160px] h-[520px] w-[520px] -rotate-12 bg-white/5" />
            <div className="absolute right-[-220px] top-[-140px] h-[620px] w-[620px] rotate-12 bg-white/5" />

            {/* teal glow blobs */}
            <div className="absolute -left-20 top-24 h-[360px] w-[360px] rounded-full bg-teal-500/20 blur-3xl" />
            <div className="absolute right-10 top-10 h-[280px] w-[280px] rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="absolute inset-0 bg-black/35" />
          </div>

          {/* Content */}
          <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-5 md:items-center md:px-8 md:py-20">
            {/* Left: card (wider column) */}
            <div className="relative mx-auto w-full md:col-span-3 max-w-lg md:max-w-md">

              {/* floating blobs behind card */}
              <div className="pointer-events-none absolute -left-10 -top-10 h-24 w-24 rounded-3xl bg-white/5" />
              <div className="pointer-events-none absolute -bottom-10 left-24 h-20 w-20 rounded-3xl bg-white/5" />

              <motion.div
                initial={{ opacity: 0, x: -70, rotate: -12, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                  className="rotate-[-7deg]"
                >
                  {/* outer frame */}
                 <div className="rounded-[28px] border border-teal-400/40 bg-white/5 p-4 shadow-2xl shadow-black/60">

                    {/* inner surface */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/75 to-black/45 p-4 backdrop-blur">

                      <div className="flex items-center justify-between">
                        <div className="h-3 w-36 rounded bg-white/10" />
                        <div className="h-8 w-8 rounded-xl bg-white/10" />
                      </div>

                      {/* colorful tabs */}
                      <div className="mt-5 grid grid-cols-4 gap-3">
                        <div className="h-10 rounded-xl bg-sky-400/25 border border-white/10" />
                        <div className="h-10 rounded-xl bg-emerald-400/25 border border-white/10" />
                        <div className="h-10 rounded-xl bg-amber-400/25 border border-white/10" />
                        <div className="h-10 rounded-xl bg-rose-400/25 border border-white/10" />
                      </div>

                      {/* rows */}
                      <div className="mt-6 rounded-xl bg-black/80 p-4 font-mono text-sm text-teal-700
 min-h-[140px]">
  <pre className="whitespace-pre-wrap">
    {displayedCode}
    <span className="animate-pulse text-white">|</span>
  </pre>
</div>


                      {/* bottom cards */}
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-xl bg-white/5 p-3 border border-white/10"
                          >
                            <div className="h-3 w-12 rounded bg-white/10" />
                            <div className="mt-2 h-3 w-24 rounded bg-white/10" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Right: hero text */}
            <motion.div
              className="text-center md:text-left md:col-span-2"
              initial="hidden"
              animate="show"
            >
              <h1
  className="mt-4 text-4xl md:text-4xl font-semibold tracking-wide text-white text-center"

>
  Your Complete Coding Practice Platform
</h1>


            

            <p
  className="mt-10 max-w-xl text-sm md:text-base leading-7 text-gray-400 mx-auto text-center"

>
  CodeCollab is the best platform to help you enhance your skills, expand your knowledge and prepare for technical interviews.
</p>

            <motion.div
  custom={0.15}
  variants={fadeUp}
  className="mt-10 flex justify-center md:justify-center"
>
  <Link
    to="/register"
    className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-7 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition"
  >
    Create Account <span className="text-lg">›</span>
  </Link>
</motion.div>

  
            </motion.div>
          </div>

          {/* Diagonal divider */}
          <div className="relative">
            <div className="h-24 bg-white [clip-path:polygon(0_70%,100%_0,100%_100%,0_100%)]" />
          </div>
        </section>

        {/* MODES (light section) */}
        <section className="bg-white px-6 py-14 text-gray-900 md:px-12">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={popIn}
            className="text-4xl md:text-5xl font-bold text-center mb-12"
          >
            Three ways to collaborate
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}
            className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3"
          >
            {[
              {
                title: "Collab Mode",
                desc:
                  'Pair programming with real-time code sync. Share a room, pick a problem, code together with Run & Submit, chat, and optional voice.',
                bg: "bg-teal-50",
                ring: "hover:ring-teal-200",
              },
              {
                title: "Contest Mode",
                desc:
                  "3 random DSA problems, 25-minute timer. Independent editors per problem, auto-scoring, and a live leaderboard.",
                bg: "bg-amber-50",
                ring: "hover:ring-amber-200",
              },
              {
                title: "Mock Interview Mode",
                desc:
                  "Interviewer and candidate roles, structured evaluation, and a post-interview report.",
                bg: "bg-sky-50",
                ring: "hover:ring-sky-200",
              },
            ].map((c) => (
              <motion.div
                key={c.title}
                variants={fadeUp}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={`rounded-2xl ${c.bg} border border-gray-200 p-8 shadow-sm ring-0 ${c.ring} hover:ring-4`}
              >
                <h3 className="text-2xl font-semibold mb-3 text-center">{c.title}</h3>
                <p className="text-gray-700 text-sm leading-6">{c.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* FEATURES */}
        <section className="py-16 border-t border-gray-800">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={popIn}
            className="text-2xl font-bold text-white text-center mb-12"
          >
            What you get
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto"
          >
            {[
              "CodeMirror editor with syntax highlighting (JavaScript, Python, C++, Java)",
              "Real-time code sync and presence in Collab rooms",
              "Run code against sample tests; Submit for full test cases",
              "AI-style feedback: complexity, patterns, quality score",
              "Voice chat (WebRTC) for Collab and Interview",
              "Analytics: sessions, problems solved, success rate, suggestions",
            ].map((t) => (
              <motion.div key={t} variants={fadeUp} className="flex items-start gap-3 text-gray-300">
                <span className="text-teal-400 mt-0.5">✓</span>
                <span>{t}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA */}
        <section className="relative my-6 overflow-hidden rounded-3xl border border-gray-800 max-w-6xl mx-auto">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/30 via-gray-900/60 to-gray-950" />
            <div className="absolute inset-0 bg-black/30" />
          </div>

          <motion.div
            className="relative z-10 px-6 py-16 text-center md:px-12"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6 }}
          >
        <motion.h2 className="text-2xl font-bold text-white mb-4 font-mono">
  {typedHeading}
  <span className="animate-pulse">|</span>
</motion.h2>


            <p className="text-gray-300 mb-6">
              Create a free account and start in seconds.
            </p>
            <Link
              to="/register"
              className="inline-block rounded-xl bg-teal-500 px-8 py-3 text-lg font-medium text-black shadow-lg shadow-teal-900/25 hover:bg-teal-400 transition"
            >
              Sign up free
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        CodeCollab — Collaborative coding for DSA, pair programming & mock interviews
      </footer>
    </div>
  );
}
