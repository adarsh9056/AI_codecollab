import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ErrorBoundary from './components/ErrorBoundary';
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CollabRoom from "./pages/CollabRoom";
import ContestRoom from "./pages/ContestRoom";
import InterviewRoom from "./pages/InterviewRoom";
import JoinRoom from "./pages/JoinRoom";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Contest from "./pages/Contest";
import Interview from "./pages/Interview";
import InterviewUpcoming from "./pages/InterviewUpcoming";
import ForgotPassword from "./pages/ForgotPassword";


function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-500" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-500" />
      </div>
    );
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

      {/* All /dashboard/* routes — each individually protected */}
      <Route path="/dashboard"
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
      />
      <Route path="/dashboard/contest"
        element={<ProtectedRoute><Contest /></ProtectedRoute>}
      />
      <Route path="/dashboard/interview"
        element={<ProtectedRoute><Interview /></ProtectedRoute>}
      />
      <Route path="/dashboard/interview/upcoming"
        element={<ProtectedRoute><InterviewUpcoming /></ProtectedRoute>}
      />
      <Route path="/dashboard/analytics"
        element={<ProtectedRoute><Analytics /></ProtectedRoute>}
      />
      <Route path="/dashboard/profile"
        element={<ProtectedRoute><Profile /></ProtectedRoute>}
      />
      <Route path="/dashboard/join"
        element={<ProtectedRoute><JoinRoom /></ProtectedRoute>}
      />
      <Route path="/dashboard/room/:roomCode"
        element={<ProtectedRoute><CollabRoom /></ProtectedRoute>}
      />
      <Route path="/dashboard/contest/:contestId"
        element={<ProtectedRoute><ContestRoom /></ProtectedRoute>}
      />
      {/* New friend/peer room route */}
<Route path="/dashboard/interview/room/:roomCode"
  element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>}
/>
{/* Legacy scheduled interview route — still works */}
<Route path="/dashboard/interview/:roomCode"
  element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>}
/>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}