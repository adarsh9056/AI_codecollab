import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MainLayout from '../components/MainLayout';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    api.get('/analytics/me')
      .then((r) => {
        const data = r?.data;
        setStats(typeof data === 'object' && data !== null ? data : {});
      })
      .catch((err) => {
        setStats(null);
        setError(err?.message || 'Failed to load analytics. Check that you are logged in and the backend is running.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MainLayout activeTab="analytics"><div className="flex justify-center p-8"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500" /></div></MainLayout>;
  if (error) {
    return (
      <MainLayout activeTab="analytics">
        <div className="max-w-xl mx-auto space-y-4 p-8">
          <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
          <p className="text-red-400">{error}</p>
          <p className="text-gray-500 text-sm">Ensure the backend is running and you are logged in.</p>
        </div>
      </MainLayout>
    );
  }

  const statsSafe = stats || {};
  const chartData = [
    { name: 'Easy', solved: statsSafe.byDifficulty?.easy ?? 0 },
    { name: 'Medium', solved: statsSafe.byDifficulty?.medium ?? 0 },
    { name: 'Hard', solved: statsSafe.byDifficulty?.hard ?? 0 },
  ];
  const suggestions = Array.isArray(statsSafe.suggestions) && statsSafe.suggestions.length
    ? statsSafe.suggestions
    : ['Complete sessions and submit solutions to see your stats here.'];

  return (
    <MainLayout activeTab="analytics">
    <div className="max-w-4xl mx-auto space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-sm text-gray-400">Sessions completed</p>
          <p className="text-2xl font-bold text-brand-400">{statsSafe.sessionsCompleted ?? 0}</p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-sm text-gray-400">Problems solved</p>
          <p className="text-2xl font-bold text-brand-400">{statsSafe.problemsSolved ?? 0}</p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-sm text-gray-400">Success rate</p>
          <p className="text-2xl font-bold text-brand-400">{statsSafe.successRate ?? 0}%</p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-sm text-gray-400">Submissions (last 7d)</p>
          <p className="text-2xl font-bold text-brand-400">{statsSafe.trendLast7Days ?? 0}</p>
        </div>
      </div>
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
        <h3 className="font-medium text-gray-300 mb-4">Problems by difficulty</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
            <Line type="monotone" dataKey="solved" stroke="#0ea5e9" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
        <h3 className="font-medium text-gray-300 mb-2">Suggestions</h3>
        <ul className="list-disc list-inside text-gray-400 space-y-1">
          {suggestions.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    </div>
    </MainLayout>
  );
}
