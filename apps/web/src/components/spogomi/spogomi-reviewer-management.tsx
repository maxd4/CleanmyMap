"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";

export function SpogomiReviewerManagement({ eventId }: { eventId: string }) {
  const [clerkId, setClerkId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function change(method: "POST" | "DELETE") {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/reviewers`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ clerkId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "La modification de l’arbitre a échoué.");
      setMessage(method === "POST" ? "Arbitre habilité pour cet événement." : "Arbitre révoqué pour cet événement.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "La modification de l’arbitre a échoué."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3" aria-labelledby="spogomi-reviewers-title"><div><h2 id="spogomi-reviewers-title" className="cmm-text-h3">Arbitres de l’événement</h2><p className="cmm-text-small">L’organisateur peut attribuer un identifiant Clerk d’arbitre pour cet événement uniquement. La certification reste interdite à une équipe via son lien de saisie.</p></div><div className="flex flex-wrap items-end gap-3"><CmmField label="Identifiant Clerk de l’arbitre"><CmmInput value={clerkId} onChange={(event) => setClerkId(event.target.value)} placeholder="user_…" /></CmmField><div className="flex gap-2"><CmmButton type="button" tone="primary" disabled={busy || clerkId.trim().length < 3} onClick={() => void change("POST")}>Habiliter</CmmButton><CmmButton type="button" tone="critical" disabled={busy || clerkId.trim().length < 3} onClick={() => void change("DELETE")}>Révoquer</CmmButton></div></div>{message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}</section>;
}
