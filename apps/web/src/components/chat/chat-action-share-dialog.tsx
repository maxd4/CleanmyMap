"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { readAppErrorResponse } from "@/lib/errors/app-errors";
import type { ShareDestination } from "@/lib/chat/action-sharing";
import { ChatActionReferenceCard } from "./ui/chat-action-reference-card";

type ShareStep = "choose" | "preview" | "done";

export function ChatActionShareDialog({
  actionId,
  onClose,
}: {
  actionId: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<ShareStep>("choose");
  const [destinations, setDestinations] = useState<ShareDestination[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [message, setMessage] = useState("Je vous partage cette action future publiée.");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/chat/share-destinations?actionId=${encodeURIComponent(actionId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw await readAppErrorResponse(response, "Les destinations de partage sont indisponibles.");
        }
        return (await response.json()) as { destinations?: ShareDestination[] };
      })
      .then((body) => {
        if (!active) return;
        const next = body.destinations ?? [];
        setDestinations(next);
        setSelectedDestinationId(next[0]?.id ?? null);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Destinations indisponibles.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actionId]);

  const selectedDestination = destinations.find((item) => item.id === selectedDestinationId) ?? null;

  async function confirmShare() {
    if (!selectedDestination) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: selectedDestination.channelType,
          actionId,
          content: message.trim() || "Je vous partage cette action future publiée.",
          messageKind: "message",
          recipientId: selectedDestination.recipientId,
        }),
      });
      if (!response.ok) {
        throw await readAppErrorResponse(response, "Le partage n’a pas pu être envoyé.");
      }
      setStep("done");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Le partage n’a pas pu être envoyé.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="share-action-title">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-sky-100 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Messagerie</p>
            <h2 id="share-action-title" className="mt-1 text-xl font-black text-slate-900">Partager dans la messagerie</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {step === "choose" ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-600">Choisissez une conversation existante dans laquelle vous pouvez publier.</p>
            {loading ? <p className="text-sm text-slate-500" role="status">Recherche des conversations autorisées…</p> : null}
            {!loading && destinations.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-600">Aucune conversation disponible pour ce partage.</p> : null}
            <div className="space-y-2">
              {destinations.map((destination) => (
                <label key={destination.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-sky-300">
                  <input
                    type="radio"
                    name="share-destination"
                    value={destination.id}
                    checked={selectedDestinationId === destination.id}
                    onChange={() => setSelectedDestinationId(destination.id)}
                  />
                  <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{destination.label}</span><span className="block text-xs text-slate-500">{destination.description}</span></span>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button type="button" disabled={!selectedDestination} onClick={() => setStep("preview")} className="rounded-full bg-sky-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50">Prévisualiser</button>
            </div>
          </div>
        ) : null}

        {step === "preview" ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-600">Aperçu vers <strong>{selectedDestination?.label}</strong>. La carte sera résolue depuis l’action courante.</p>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={2000} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-sky-400" aria-label="Message accompagnant le partage" />
            <ChatActionReferenceCard actionId={actionId} tone="light" />
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" onClick={() => setStep("choose")} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-600">Retour</button>
              <button type="button" disabled={sending || !selectedDestination} onClick={() => void confirmShare()} className="rounded-full bg-sky-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:cursor-wait disabled:opacity-50">{sending ? "Envoi…" : "Confirmer le partage"}</button>
            </div>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="mt-5 space-y-4"><p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Le partage a été envoyé dans {selectedDestination?.label}.</p><div className="flex justify-end"><button type="button" onClick={onClose} className="rounded-full bg-sky-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">Fermer</button></div></div>
        ) : null}
        {error ? <p className="mt-4 text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
