import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        username,
        displayName: displayName || username,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-950">
      <div className="hidden lg:block lg:w-2/5 relative min-h-screen">
        <img
          src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 to-gray-950/90" />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-gray-900/90 border border-gray-800 p-8 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-center text-brand-400 mb-6">CodeCollab</h1>
          <h2 className="text-lg font-medium text-gray-200 mb-4">Create account</h2>
          <p className="text-gray-500 text-sm mb-4">Create your account with email, username and password.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-brand-500 focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-brand-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-brand-500 focus:outline-none"
                placeholder={username || 'Optional'}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-brand-500 focus:outline-none"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Register'}
            </button>
          </form>
          <p className="mt-4 text-center text-gray-400 text-sm">
            Already have an account? <Link to="/login" className="text-brand-400 hover:underline">Sign in</Link>
            {' · '}
            <Link to="/" className="text-gray-500 hover:text-gray-400">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
