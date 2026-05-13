import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function QuestionLibrary({ onSelect, onClose }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/problems?limit=200')
      .then(r => {
        if (!mounted) return;
        setProblems(r?.data || []);
      })
      .catch(() => {
        if (!mounted) return;
        setProblems([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = problems.filter(p => {
    if (filter !== 'all' && p.difficulty !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (p.title||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q) || (p.tags||[]).join(' ').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-gray-900 rounded-xl p-4 border border-white/5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Question Library</h3>
          <button onClick={onClose} className="text-sm text-gray-400">Close</button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search title, description or tags"
            className="flex-1 px-3 py-2 rounded bg-black/20 text-sm outline-none"
          />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 bg-black/20 rounded text-sm">
            <option value="all">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-400">No problems found.</div>
          ) : (
            filtered.map(p => (
              <div key={p._id} className="p-3 mb-2 rounded bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{p.title}</div>
                    <div className="text-xs text-gray-400">{p.category} • <span className="capitalize">{p.difficulty}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelect(p)}
                      className="px-3 py-1 rounded bg-indigo-500 text-white text-sm"
                    >
                      Select
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-300 mt-2 line-clamp-3">{p.description}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
