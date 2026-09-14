"use client";

import { useCallback, useEffect, useState } from "react";

type Exclusion = {
  user_id: string;
  reason: string | null;
  active: boolean;
};

type ChatActionModerationProps = {
  actionId: string;
  tone: "light" | "dark";
};

type SearchUser = { id: string; display_name: string | null; handle: string | null };

export function ChatActionModeration({ actionId, tone }: ChatActionModerationProps) {
  const [canModerate, setCanModerate] = useState(false);
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadExclusions = useCallback(async () => {
    const response = await fetch(`/api/chat/action-exclusions?actionId=${encodeURIComponent(actionId)}`);
    if (response.status === 403) return null;
    const payload = (await response.json()) as { canModerate?: boolean; exclusions?: Exclusion[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Impossible de charger la modération.");
    return payload;
  }, [actionId]);

  const refresh = useCallback(async () => {
    const payload = await loadExclusions();
    if (!payload) return;
    setCanModerate(payload.canModerate === true);
    setExclusions(payload.exclusions ?? []);
  }, [loadExclusions]);

  useEffect(() => {
    let active = true;
    void loadExclusions()
      .then((payload) => {
        if (!active || !payload) return;
        setCanModerate(payload.canModerate === true);
        setExclusions(payload.exclusions ?? []);
      })
      .catch((value) => {
        if (active) setError(value instanceof Error ? value.message : "Modération indisponible.");
      });
    return () => {
      active = false;
    };
  }, [loadExclusions]);

  useEffect(() => {
    if (!canModerate || query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/chat/users?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((payload: { users?: SearchUser[] }) => setUsers(payload.users ?? []))
        .catch(() => undefined);
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canModerate, query]);

  async function mutate(method: "POST" | "PATCH", targetUserId = selectedUserId) {
    if (!targetUserId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/action-exclusions", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actionId, userId: targetUserId, reason: reason.trim() || null }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "La modération a échoué.");
      setSelectedUserId(null);
      setQuery("");
      setReason("");
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "La modération a échoué.");
    } finally {
      setBusy(false);
    }
  }

  if (!canModerate) return null;
  const activeExclusions = exclusions.filter((item) => item.active);
  const surface = tone === "light" ? "border-rose-100 bg-white/70" : "border-slate-800 bg-slate-950/30";
  return (
    <section aria-label="Modération de la discussion d'action" className={`border-b px-5 py-3 ${surface}`}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="action-discussion-user" className="cmm-text-small font-semibold">Exclure un membre de la discussion</label>
          <input id="action-discussion-user" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, pseudo ou identifiant" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          {query.trim().length >= 2 && users.length > 0 ? <div className="mt-1 rounded-lg border bg-white p-1 text-slate-900">{users.map((user) => <button key={user.id} type="button" onClick={() => { setSelectedUserId(user.id); setQuery(user.display_name || user.handle || user.id); setUsers([]); }} className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-rose-50">{user.display_name || user.handle || user.id}</button>)}</div> : null}
        </div>
        <input aria-label="Motif optionnel" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motif (optionnel)" maxLength={500} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <button type="button" disabled={!selectedUserId || busy} onClick={() => void mutate("POST")} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Exclure</button>
      </div>
      {activeExclusions.length > 0 ? <ul className="mt-2 flex flex-wrap gap-2">{activeExclusions.map((item) => <li key={item.user_id} className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-900"><span>{item.user_id}</span><button type="button" disabled={busy} onClick={() => void mutate("PATCH", item.user_id)} className="font-semibold underline">Réintégrer</button></li>)}</ul> : null}
      {error ? <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
