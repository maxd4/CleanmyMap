"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CmmButton } from "@/components/ui/cmm-button";

type JoinStatus = "pending" | "approved" | "rejected" | "cancelled";
type JoinRequest = { id: string; status: JoinStatus };

export function SpogomiTeamJoinButton({
  eventId,
  teamId,
  signInHref,
}: {
  eventId: string;
  teamId: string;
  signInHref: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const [request, setRequest] = useState<JoinRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = `/api/spogomi/events/${encodeURIComponent(eventId)}/teams/${encodeURIComponent(teamId)}/join-request`;
  const loadRequest = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as { request?: JoinRequest | null; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Le statut de la demande n’a pas pu être chargé.");
    setRequest(body.request ?? null);
  }, [endpoint, isLoaded, isSignedIn]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequest().catch((reason) => setError(reason instanceof Error ? reason.message : "Le statut de la demande n’a pas pu être chargé."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequest]);

  async function sendRequest() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { request?: JoinRequest; error?: string };
      if (!response.ok) throw new Error(body.error ?? "La demande n’a pas pu être envoyée.");
      setRequest(body.request ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La demande n’a pas pu être envoyée.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { request?: JoinRequest; error?: string };
      if (!response.ok) throw new Error(body.error ?? "La demande n’a pas pu être annulée.");
      setRequest(body.request ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La demande n’a pas pu être annulée.");
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded) return <CmmButton type="button" size="sm" tone="secondary" disabled>Rejoindre cette équipe</CmmButton>;
  if (!isSignedIn) return <CmmButton href={signInHref} size="sm" tone="secondary">Se connecter pour rejoindre</CmmButton>;

  if (request?.status === "pending") {
    return (
      <div className="space-y-1" aria-live="polite">
        <p className="text-xs font-semibold text-amber-800">En attente de validation administrative</p>
        <CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => void cancelRequest()}>
          Annuler la demande
        </CmmButton>
      </div>
    );
  }
  if (request?.status === "approved") return <p className="text-xs font-bold text-emerald-800" role="status">Rattachement accepté</p>;
  if (request?.status === "rejected") return <p className="text-xs font-semibold text-slate-700" role="status">Demande refusée</p>;
  if (request?.status === "cancelled") return <CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => void sendRequest()}>Rejoindre cette équipe</CmmButton>;

  return (
    <div className="space-y-1">
      <CmmButton type="button" size="sm" tone="secondary" disabled={busy} loading={busy} onClick={() => void sendRequest()}>
        {busy ? "Envoi…" : "Rejoindre cette équipe"}
      </CmmButton>
      {error ? <p role="alert" className="max-w-56 text-xs font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
