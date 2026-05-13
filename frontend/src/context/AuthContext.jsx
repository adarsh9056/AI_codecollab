import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/me")
      .then((res) => setUser(res?.data ?? null))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (email, password) =>
    api.post("/auth/login", { email, password }).then((res) => {
      if (res.data.accessToken) localStorage.setItem("token", res.data.accessToken);
      setUser(res.data.user);
      return res.data;
    });

  const register = (data) =>
    api.post("/auth/register", data).then((res) => {
      if (res.data.accessToken) localStorage.setItem("token", res.data.accessToken);
      setUser(res.data.user);
      return res.data;
    });

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (_) {
      // Always proceed with client-side cleanup
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateProfile = (data) =>
    api.put("/users/update", data).then((res) => {
      setUser(res.data);
      return res.data;
    });

  /** Refresh user from server (used after avatar upload, etc.) */
  const refreshUser = () =>
    api.get("/auth/me")
      .then((res) => { setUser(res?.data ?? null); return res?.data; })
      .catch(() => null);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
