"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { fetchParticipantPage } from "./action-participant-picker-search";
import { labelForUser, type ChatUserOption } from "./action-participant-picker-model";

type EditorSnapshot = { actionId: string; editorIds: string[]; actionPhase: string };

export function ActionFormEditorsPanel({ actionId }: { actionId: string }) {
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<ChatUserOption[]>([]);
  const [selected, setSelected] = useState<ChatUserOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/form-editors`, { cache: "no-store" });
      const body = await response.json() as EditorSnapshot & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Les privilèges ne sont pas disponibles.");
      setSnapshot(body);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Les privilèges ne sont pas disponibles.");
    }
  }, [actionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function search(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) { setAccounts([]); return; }
    try {
      const page = await fetchParticipantPage("/api/chat/users", value.trim(), 0, undefined, true);
      setAccounts(page.items.filter((account) => !snapshot?.editorIds.includes(account.id)));
    } catch {
      setAccounts([]);
      setError("La recherche de comptes Clerk est indisponible.");
    }
  }

  async function mutate(operation: "grant" | "revoke", clerkUserId: string) {
    if (operation === "revoke" && !window.confirm("Retirer le privilège de modification du formulaire à ce compte ?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/form-editors`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), operation, clerkUserId }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "La modification du privilège a échoué.");
      setSelected(null); setQuery(""); setAccounts([]);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La modification du privilège a échoué.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !snapshot) return <p role="alert" className="text-sm text-amber-900">{error}</p>;
  if (!snapshot) return <p role="status" className="text-sm">Chargement des privilèges…</p>;

  return <section aria-labelledby="action-form-editors-title" className="space-y-3 rounded-2xl border border-violet-100 p-3">
    <div><h3 id="action-form-editors-title" className="font-black text-violet-950">Privilèges</h3><p className="text-sm text-slate-700">« Peut modifier le formulaire » donne accès à la préparation et au bilan de cette action. Il ne donne aucun droit d’organisation ni de pointage.</p><a className="text-sm font-semibold text-violet-800 underline" href={`/actions/new?tab=${snapshot.actionPhase === "pre_action" ? "before" : "after"}&actionId=${encodeURIComponent(actionId)}`}>Ouvrir le formulaire de l’action</a></div>
    <CmmField label="Rechercher un compte Clerk à autoriser" hint="Le privilège peut être attribué à un compte qui ne figure pas dans les présences."><CmmInput value={query} autoComplete="off" onChange={(event) => { void search(event.target.value); }} /></CmmField>
    {accounts.length ? <ul aria-label="Comptes Clerk vérifiés" className="max-h-40 overflow-y-auto rounded-xl border p-2">{accounts.map((account) => <li key={account.id}><button type="button" className="min-h-10 w-full rounded-lg px-2 text-left hover:bg-violet-50 focus-visible:outline focus-visible:outline-2" onClick={() => { setSelected(account); setAccounts([]); }}>{labelForUser(account)}</button></li>)}</ul> : null}
    {selected ? <div className="flex flex-wrap items-center gap-2"><span className="text-sm">Sélection : {labelForUser(selected)}</span><CmmButton type="button" disabled={busy} onClick={() => { void mutate("grant", selected.id); }}>Accorder le privilège</CmmButton></div> : null}
    {snapshot.editorIds.length === 0 ? <p className="text-sm text-slate-600">Aucun éditeur délégué.</p> : <ul aria-label="Éditeurs du formulaire" className="divide-y rounded-xl border">{snapshot.editorIds.map((clerkUserId) => <li key={clerkUserId} className="flex flex-wrap items-center justify-between gap-2 p-2"><span className="break-all text-sm">Compte Clerk · {clerkUserId}</span><CmmButton type="button" variant="ghost" tone="destructive" size="sm" disabled={busy} onClick={() => { void mutate("revoke", clerkUserId); }}>Révoquer</CmmButton></li>)}</ul>}
    {error ? <p role="alert" className="text-sm text-amber-900">{error}</p> : null}
  </section>;
}
