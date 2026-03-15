"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vanzemla-bg">
      <div className="w-80 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl tracking-[0.4em] font-display text-vanzemla-text">
            VANZEMLA
          </h1>
          <p className="text-xs text-vanzemla-text-dim mt-2 tracking-wider">
            Enter the passphrase to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passphrase"
            autoFocus
            className="w-full px-4 py-3 bg-vanzemla-sidebar border border-vanzemla-border rounded text-sm text-vanzemla-text text-center tracking-widest focus:outline-none focus:border-vanzemla-accent placeholder:text-vanzemla-text-dim placeholder:tracking-wider"
          />

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 bg-vanzemla-accent/20 border border-vanzemla-accent/40 rounded text-sm font-display tracking-wider text-vanzemla-accent-bright hover:bg-vanzemla-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "ENTER"}
          </button>
        </form>
      </div>
    </div>
  );
}
