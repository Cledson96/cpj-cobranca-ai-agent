"use client";

import { KeyRound } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { getStoredAdminToken, setStoredAdminToken } from "../api-client";

type TokenGateProps = {
  children: (token: string) => ReactNode;
};

export function TokenGate({ children }: TokenGateProps) {
  const [token, setToken] = useState("");
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredAdminToken();
    setToken(stored);
    setDraft(stored);
    setReady(true);
  }, []);

  if (!ready) {
    return <main className="page-shell" />;
  }

  if (!token) {
    return (
      <main className="page-shell auth-shell">
        <form
          className="auth-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const value = draft.trim();
            if (value) {
              setStoredAdminToken(value);
              setToken(value);
            }
          }}
        >
          <div className="auth-icon">
            <KeyRound size={22} />
          </div>
          <label htmlFor="admin-token">Token administrativo</label>
          <div className="inline-form">
            <input
              id="admin-token"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
            <button type="submit">Entrar</button>
          </div>
        </form>
      </main>
    );
  }

  return children(token);
}
