"use client";

import { useCallback, useEffect, useState } from "react";

type Connection = {
  provider: string;
  label: string;
  description: string;
  viaGoogle: boolean;
  status: string;
  permissions: string;
  connectedAt: string | null;
};

export function ConnectionsPanel() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/connections");
    const data = await res.json();
    setConnections(data.connections ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(provider: string, status: string, viaGoogle: boolean) {
    if (viaGoogle && status !== "connected") {
      setMessage(
        "Google apps connect via Google sign-in scopes. Sign out/in again, or use Seed demo data in Chat.",
      );
      return;
    }
    const action = status === "connected" ? "disconnect" : "connect";
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, action }),
    });
    const data = await res.json();
    if (data.message) setMessage(data.message);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <h1 className="display text-3xl font-semibold">Connections</h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
          Grant Jarvis read access to the school systems you use. v1 is
          read-only — Jarvis can analyze and summarize, not send or submit.
        </p>
        {message && (
          <p className="mt-4 rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm">
            {message}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loading && <div className="panel p-6 text-[var(--ink-soft)]">Loading…</div>}
        {!loading &&
          connections.map((c) => (
            <div key={c.provider} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{c.label}</h2>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {c.description}
                  </p>
                </div>
                <span
                  className={`badge ${
                    c.status === "connected" ? "badge-on" : "badge-off"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                  Permission: {c.permissions}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => toggle(c.provider, c.status, c.viaGoogle)}
                >
                  {c.status === "connected" ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
