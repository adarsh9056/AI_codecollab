import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import Logo from "../components/Logo";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter OTP + new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess("If that email is registered, a reset code has been sent.");
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { email, otp, newPassword });
      setSuccess(res.data?.message || res.message || "Password reset successfully!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gray-950 text-white relative">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
        <div className="absolute -left-20 top-24 h-[360px] w-[360px] rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute right-10 top-10 h-[280px] w-[280px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl shadow-black/50">
          <div className="flex flex-col items-center mb-6">
            <Logo size={36} />
            <h1 className="mt-3 text-xl font-semibold text-white">
              {step === 1 ? "Reset Password" : "Enter Reset Code"}
            </h1>
            <p className="text-sm text-gray-400">
              {step === 1
                ? "Enter your email to receive a reset code"
                : "Check your email for the 6-digit code"}
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-teal-500/10 border border-teal-400/30 px-3 py-2 text-sm text-teal-400 mb-4">
              {success}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 outline-none transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-teal-500 py-3 font-semibold text-black hover:bg-teal-400 transition disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">6-Digit Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 outline-none transition"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 outline-none transition"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 outline-none transition"
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-teal-500 py-3 font-semibold text-black hover:bg-teal-400 transition disabled:opacity-60"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); setSuccess(""); }}
                className="w-full text-gray-400 text-sm hover:text-white transition"
              >
                Back to email step
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-400">
            Remember your password?{" "}
            <Link to="/login" className="text-teal-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
