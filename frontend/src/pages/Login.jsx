import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import { trackEvent } from "../utils/analytics";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      trackEvent('login_success', {});
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gray-950 text-white relative">

      {/* Background same as landing */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
        <div className="absolute -left-20 top-24 h-[360px] w-[360px] rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute right-10 top-10 h-[280px] w-[280px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Centered card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl shadow-black/50">

          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <Logo size={36} />
            <h1 className="mt-3 text-xl font-semibold text-white">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-400">
              Sign in to continue coding
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal-500 py-3 font-semibold text-black hover:bg-teal-400 transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-teal-400 transition">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-3 text-center text-sm text-gray-400">
            Don’t have an account?{" "}
            <Link to="/register" className="text-teal-400 hover:underline">
              Sign Up
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
