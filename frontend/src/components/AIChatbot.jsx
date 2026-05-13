import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

const SUGGESTIONS = [
  'Explain two-pointer technique',
  'How does BFS work?',
  'Time complexity of merge sort',
  'What is dynamic programming?',
  'Optimize nested loops',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-violet-400"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function SourceCard({ source }) {
  const domain = (() => {
    try { return new URL(source.url).hostname.replace('www.', ''); } catch { return ''; }
  })();

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
    >
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center text-[10px] shrink-0 mt-0.5">🔗</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-200 truncate group-hover:text-violet-300 transition-colors">{source.title}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{domain}</p>
          {source.snippet && (
            <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{source.snippet}</p>
          )}
        </div>
      </div>
    </a>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isUser ? '' : 'w-full'}`}>
        {isUser ? (
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[13px] leading-relaxed shadow-lg shadow-violet-500/10">
            {msg.content}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06] text-gray-200 text-[13px] leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </div>
            {msg.sources?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-1">Sources</p>
                <div className="grid gap-2">
                  {msg.sources.map((s, i) => <SourceCard key={i} source={s} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AIChatbot({ codeContext, language }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    const query = (text || input).trim();
    if (!query || isLoading) return;

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    try {
      const res = await api.post('/ai-chat', { query, codeContext, language });
      const { answer, sources } = res.data;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer || 'I couldn\'t find a specific answer. Try rephrasing your question.',
        sources: sources || [],
      }]);
    } catch (err) {
      setError(err.message || 'Failed to get response');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
        sources: [],
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, codeContext, language]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-2xl shadow-violet-500/30 flex items-center justify-center hover:shadow-violet-500/50 transition-shadow"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center shadow-lg">
                {messages.filter(m => m.role === 'assistant').length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* CHATBOT PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-[100] w-[420px] h-[600px] max-h-[80vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-black/50"
            style={{ backdropFilter: 'blur(40px)' }}
          >
            {/* Glass background layers */}
            <div className="absolute inset-0 bg-[#0c0c14]/90 border border-white/[0.08] rounded-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] to-transparent rounded-3xl" />

            {/* HEADER */}
            <div className="relative z-10 px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">AI Assistant</h3>
                  <p className="text-[10px] text-gray-500 font-medium">Powered by Tavily Search</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={() => { setMessages([]); setError(null); }}
                    className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                    title="Clear chat"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* MESSAGES */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center mb-5"
                  >
                    <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </motion.div>
                  <motion.h4
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white font-bold text-base mb-2"
                  >
                    How can I help?
                  </motion.h4>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-500 text-xs leading-relaxed mb-6"
                  >
                    Ask me about algorithms, data structures, coding patterns, or anything related to your problem.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap gap-2 justify-center"
                  >
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] text-gray-400 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06]">
                        <TypingDots />
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ERROR BAR */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="relative z-10 px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-400 text-[11px] flex items-center gap-2"
                >
                  <span>⚠️</span>{error}
                  <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-300">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* INPUT */}
            <form onSubmit={handleSubmit} className="relative z-10 p-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about algorithms, patterns…"
                    disabled={isLoading}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-10 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:bg-violet-500/[0.02] transition-all disabled:opacity-50"
                  />
                  {codeContext && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Your current code will be sent as context">
                      <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-11 h-11 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-violet-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[9px] text-gray-600 mt-2 text-center">
                AI search results • Context-aware • {language?.toUpperCase() || 'JS'}
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
