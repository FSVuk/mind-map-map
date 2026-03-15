"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type Role = "reader" | "author";

interface AuthState {
  role: Role | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  role: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { role: null }))
      .then((data) => setRole(data.role))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    document.cookie = "vanzemla-role=; path=/; max-age=0";
    setRole(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
