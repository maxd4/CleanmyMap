"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

export function ParticipantVisibilityConsentControl({ actionId, fr }: { actionId: string; fr: boolean }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openConsent() {
    setOpen(true);
    if (loaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/participant-visibility`, { cache: "no-store" });
      const payload = await response.json() as { enabled?: boolean };
      if (!response.ok) throw new Error("Consent unavailable");
      setEnabled(payload.enabled === true);
      setLoaded(true);
    } catch {
      setError(fr ? "Le réglage de visibilité est indisponible." : "The visibility setting is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function updateConsent(nextEnabled: boolean) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/participant-visibility`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      if (!response.ok) throw new Error("Consent update failed");
      setEnabled(nextEnabled);
    } catch {
      setError(fr ? "Le réglage n’a pas pu être enregistré." : "The setting could not be saved.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="rounded-xl border border-slate-200 p-3">
    <CmmButton type="button" tone="tertiary" variant="pill" className="w-full justify-center text-xs" ariaExpanded={open} onClick={() => { if (!open) void openConsent(); else setOpen(false); }}>
      {fr ? "Visibilité de mon profil pour cette action" : "My profile visibility for this action"}
    </CmmButton>
    {open ? <div className="mt-2 space-y-2 text-xs text-slate-700">
      {loading && !loaded ? <p role="status">{fr ? "Chargement…" : "Loading…"}</p> : null}
      {loaded ? <label className="flex items-start gap-2">
        <input type="checkbox" checked={enabled} disabled={loading} onChange={(event) => void updateConsent(event.target.checked)} />
        <span>{fr ? "Afficher mon nom et mon pseudo dans les profils publics consentis de cette action." : "Show my name and handle in this action’s consented public profiles."}</span>
      </label> : null}
      <p>{fr ? "Désactivé par défaut. Vous pouvez retirer votre accord à tout moment." : "Off by default. You can withdraw consent at any time."}</p>
      {error ? <p role="alert" className="font-semibold text-rose-700">{error}</p> : null}
    </div> : null}
  </div>;
}
