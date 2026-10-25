"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";

function errorMessage(value: unknown, fallback: string): string {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string" ? value.error : fallback;
}

export function SpogomiReviewerManagement({ eventId }: { eventId: string }) {
  const [clerkId, setClerkId] = useState("");
  const [role, setRole] = useState<"referee" | "observer" | "checkin">("referee");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function change(method: "POST" | "DELETE") {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/reviewers`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ clerkId, role }) });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(body, "La modification de l’arbitre a échoué."));
      setMessage(method === "POST" ? "Accès habilité pour cet événement." : "Accès révoqué pour cet événement.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "La modification de l’arbitre a échoué."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3" aria-labelledby="spogomi-reviewers-title"><div><h2 id="spogomi-reviewers-title" className="cmm-text-h3">Habilitations de l’événement</h2><p className="cmm-text-small">L’organisateur attribue un accès propre à cette édition. Le pointage n’accorde ni export nominatif complet, ni configuration du règlement, ni certification.</p></div><div className="flex flex-wrap items-end gap-3"><CmmField label="Identifiant Clerk"><CmmInput value={clerkId} onChange={(event) => setClerkId(event.target.value)} placeholder="user_…" /></CmmField><label className="text-sm font-bold">Accès<select className="mt-1 min-h-11 rounded-lg border border-black/10 bg-white px-3" value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="referee">Arbitrage</option><option value="observer">Observation</option><option value="checkin">Accueil et présences</option></select></label><div className="flex gap-2"><CmmButton type="button" tone="primary" disabled={busy || clerkId.trim().length < 3} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ change("POST").catch(() => undefined); }}>Habiliter</CmmButton><CmmButton type="button" tone="critical" disabled={busy || clerkId.trim().length < 3} onClick={() => void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ change("DELETE").catch(() => undefined)}>Révoquer</CmmButton></div></div>{message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}</section>;
}
