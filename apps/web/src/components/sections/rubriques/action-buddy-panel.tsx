"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import useSWR from "swr";
import type { ActionBuddyState } from "@/lib/actions/action-buddy";

type BuddyResponse = { status: "ok" } & ActionBuddyState;

async function fetchBuddyState(url: string): Promise<BuddyResponse> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Le panneau binôme est momentanément indisponible.");
  return (await response.json()) as BuddyResponse;
}

function actionMessage(error: unknown): string {
  return error instanceof Error ? error.message : "La demande n’a pas abouti. Réessayez.";
}

type BuddyMutation = (key: string, url: string, init?: RequestInit) => Promise<void>;

function BuddyActionButtons({ request, availability, pendingKey, endpoint, mutateBuddy }: { request: BuddyResponse["request"]; availability: boolean; pendingKey: string | null; endpoint: string; mutateBuddy: BuddyMutation }) {
  return <div className="mt-4 flex flex-wrap gap-2">
    {!request || request.status === "cancelled" ? <button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy("request", endpoint, { method: "POST" }); }} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pendingKey === "request" ? "Envoi…" : "Demander un binôme"}</button> : null}
    {request?.status === "open" ? <button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy("cancel-request", endpoint, { method: "DELETE" }); }} className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-900 disabled:opacity-50">{pendingKey === "cancel-request" ? "Annulation…" : "Annuler ma demande"}</button> : null}
    {availability ? <button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy("availability-remove", `${endpoint}/availability`, { method: "DELETE" }); }} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">{pendingKey === "availability-remove" ? "Mise à jour…" : "Retirer ma disponibilité"}</button> : <button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy("availability", `${endpoint}/availability`, { method: "PUT" }); }} className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-900 disabled:opacity-50">{pendingKey === "availability" ? "Mise à jour…" : "Je peux accompagner quelqu&apos;un"}</button>}
  </div>;
}

function BuddyMatchedCard({ data, contactHref, pendingKey, endpoint, mutateBuddy }: { data: BuddyResponse; contactHref: string | null; pendingKey: string | null; endpoint: string; mutateBuddy: BuddyMutation }) {
  if (!data.matchedRequest || !data.matchedPartner) return null;
  return <div className="mt-4 rounded-xl border border-emerald-300 bg-white p-3"><p className="text-sm font-bold text-emerald-950">Binôme formé avec {data.matchedPartner.displayName}{data.matchedPartner.handle ? ` (@${data.matchedPartner.handle})` : ""}.</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">Match confirmé</span>{contactHref ? <Link href={contactHref} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Contacter mon binôme</Link> : null}<button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy("cancel-matched", endpoint, { method: "DELETE" }); }} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">Annuler le binôme</button></div></div>;
}

function BuddyProposalLists({ data, pendingKey, endpoint, mutateBuddy }: { data: BuddyResponse; pendingKey: string | null; endpoint: string; mutateBuddy: BuddyMutation }) {
  const pendingReceived = data.receivedProposals.filter((proposal) => proposal.status === "pending");
  const pendingSent = data.sentProposals.filter((proposal) => proposal.status === "pending");
  return <>
    {pendingReceived.length > 0 ? <div className="mt-4 space-y-2"><p className="text-sm font-bold text-slate-800">Propositions reçues</p>{pendingReceived.map((proposal) => <div key={proposal.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"><span className="text-sm text-slate-700">Une proposition est disponible pour cette action.</span><span className="flex gap-2"><button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy(`accept-${proposal.id}`, `${endpoint}/proposals/${proposal.id}/accept`, { method: "POST" }); }} className="rounded-full bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Accepter</button><button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy(`reject-${proposal.id}`, `${endpoint}/proposals/${proposal.id}/reject`, { method: "POST" }); }} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Refuser</button></span></div>)}</div> : null}
    {data.availability && data.openRequests.length > 0 ? <div className="mt-4 space-y-2"><p className="text-sm font-bold text-slate-800">Demandes ouvertes pour cette action</p>{data.openRequests.map((openRequest) => <div key={openRequest.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"><span className="text-sm text-slate-700">Une personne confirmée cherche un binôme.</span><button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy(`proposal-${openRequest.id}`, `${endpoint}/requests/${openRequest.id}/proposals`, { method: "POST" }); }} className="rounded-full bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Proposer mon aide</button></div>)}</div> : data.availability ? <p className="mt-4 text-sm text-slate-600">Aucune demande ouverte pour le moment.</p> : null}
    {pendingSent.length > 0 ? <div className="mt-4 space-y-2"><p className="text-sm font-bold text-slate-800">Vos propositions en attente</p>{pendingSent.map((proposal) => <div key={proposal.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"><span className="text-sm text-slate-700">Proposition envoyée.</span><button type="button" disabled={pendingKey !== null} onClick={() => { void mutateBuddy(`withdraw-${proposal.id}`, `${endpoint}/proposals/${proposal.id}`, { method: "DELETE" }); }} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Retirer</button></div>)}</div> : null}
  </>;
}

function ActionBuddyContent({ data, actionId, endpoint, pendingKey, mutationError, hasConfirmedFinalParticipation, contactHref, mutateBuddy }: { data: BuddyResponse; actionId: string; endpoint: string; pendingKey: string | null; mutationError: string | null; hasConfirmedFinalParticipation?: boolean | null; contactHref: string | null; mutateBuddy: BuddyMutation }) {
  return <section aria-labelledby={`action-buddy-title-${actionId}`} className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 id={`action-buddy-title-${actionId}`} className="text-base font-black text-emerald-950">Besoin d&apos;un binôme ?</h4><p className="cmm-text-body mt-1 text-slate-800">Les échanges restent privés entre personnes inscrites et confirmées.</p></div>{hasConfirmedFinalParticipation === false ? <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">Première action connue</span> : null}{hasConfirmedFinalParticipation === true ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900">Vous pouvez aussi accompagner</span> : null}</div>
    {mutationError ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{mutationError}</p> : null}
    <BuddyActionButtons request={data.request} availability={Boolean(data.availability)} pendingKey={pendingKey} endpoint={endpoint} mutateBuddy={mutateBuddy} />
    <BuddyMatchedCard data={data} contactHref={contactHref} pendingKey={pendingKey} endpoint={endpoint} mutateBuddy={mutateBuddy} />
    <BuddyProposalLists data={data} pendingKey={pendingKey} endpoint={endpoint} mutateBuddy={mutateBuddy} />
  </section>;
}

export function ActionBuddyPanel({
  actionId,
  fr,
  hasConfirmedFinalParticipation,
}: {
  actionId: string;
  fr: boolean;
  hasConfirmedFinalParticipation?: boolean | null;
}) {
  const endpoint = `/api/actions/${encodeURIComponent(actionId)}/buddy`;
  const { data, error, isLoading, mutate } = useSWR<BuddyResponse>(endpoint, fetchBuddyState, {
    revalidateOnFocus: false,
  });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const mutateBuddy = useCallback(async (key: string, url: string, init?: RequestInit) => {
    setPendingKey(key);
    setMutationError(null);
    try {
      const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
      if (!response.ok) throw new Error(actionMessage(await response.json().catch(() => null)));
      await mutate();
    } catch (mutationFailure) {
      setMutationError(actionMessage(mutationFailure));
      await mutate();
    } finally {
      setPendingKey(null);
    }
  }, [mutate]);

  if (isLoading) {
    return <section aria-label={fr ? "Binôme" : "Buddy"} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">{fr ? "Chargement du panneau binôme…" : "Loading buddy panel…"}</p></section>;
  }
  if (error || !data) {
    return <section aria-label={fr ? "Binôme" : "Buddy"} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">{actionMessage(error)}</p><button type="button" className="mt-3 rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900" onClick={() => { void mutate(); }}>{fr ? "Réessayer" : "Retry"}</button></section>;
  }

  const matchedRequest = data.matchedRequest;
  const contactHref = matchedRequest && data.matchedPartner
    ? `/sections/messagerie?tab=dm&channel=dm&actionId=${encodeURIComponent(actionId)}&buddyRequestId=${encodeURIComponent(matchedRequest.id)}&recipientId=${encodeURIComponent(data.matchedPartner.userId)}&recipientLabel=${encodeURIComponent(data.matchedPartner.displayName)}${data.matchedPartner.handle ? `&recipientHandle=${encodeURIComponent(data.matchedPartner.handle)}` : ""}`
    : null;

  return <ActionBuddyContent
    data={data}
    actionId={actionId}
    endpoint={endpoint}
    pendingKey={pendingKey}
    mutationError={mutationError}
    hasConfirmedFinalParticipation={hasConfirmedFinalParticipation}
    contactHref={contactHref}
    mutateBuddy={mutateBuddy}
  />;
}
