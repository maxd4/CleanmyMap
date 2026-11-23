"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { deleteActionRouteReference, readActionRouteReference, uploadActionRouteReference } from "@/lib/actions/action-media/action-route-reference-client";

export function ActionRouteReferenceImage({
  actionId,
  mediaId,
  onMediaIdChange,
}: {
  actionId?: string | null;
  mediaId?: string | null;
  onMediaIdChange: (mediaId: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<{ id: string; url: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!actionId || !mediaId) return () => { active = false; };
    void readActionRouteReference(actionId, mediaId).then((item) => {
      if (active) setImage({ id: item.id, url: item.signedUrl, name: item.originalName });
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "La référence privée est indisponible.");
    });
    return () => { active = false; };
  }, [actionId, mediaId]);
  const visibleImage = mediaId && image?.id === mediaId ? image : null;

  async function chooseFile(file: File | undefined) {
    if (!file || !actionId) return;
    setSaving(true); setError(null);
    const previous = visibleImage?.id ?? mediaId ?? null;
    try {
      const saved = await uploadActionRouteReference(actionId, file);
      onMediaIdChange(saved.id);
      setImage({ id: saved.id, url: saved.signedUrl, name: saved.originalName });
      if (previous && previous !== saved.id) await deleteActionRouteReference(actionId, previous);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’image n’a pas pu être enregistrée.");
    } finally { setSaving(false); }
  }

  async function removeImage() {
    if (!actionId || !visibleImage || !window.confirm("Supprimer définitivement cette image de référence privée ?")) return;
    setSaving(true); setError(null);
    try {
      await deleteActionRouteReference(actionId, visibleImage.id);
      onMediaIdChange(null); setImage(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "La suppression a échoué."); }
    finally { setSaving(false); }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="route-reference-image-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 id="route-reference-image-title" className="font-bold text-slate-900">Image de référence privée</h3><p className="mt-1 text-sm text-slate-600">Jusqu’à 5 Mo · JPEG, PNG ou WebP · sans géométrie ni mesure.</p></div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choisir une image de référence du parcours" disabled={!actionId || saving} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void chooseFile(file); }} />
        <button type="button" disabled={!actionId || saving} onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <ImagePlus size={16} />}{visibleImage ? "Remplacer l’image" : "Ajouter une image"}</button>
      </div>
      {!actionId ? <p className="text-sm text-slate-600">Enregistrez l’action pour pouvoir joindre une image privée.</p> : null}
      {actionId && mediaId && !visibleImage && !error ? <p role="status" className="text-sm text-slate-600">Chargement de l’image privée…</p> : null}
      {visibleImage ? <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3"><Image src={visibleImage.url} alt={`Référence visuelle privée : ${visibleImage.name}`} width={128} height={96} unoptimized className="h-24 w-32 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-slate-800">{visibleImage.name}</p><p role="status" className="text-xs text-emerald-800">Enregistrée · accès privé temporaire</p></div><button type="button" disabled={saving} onClick={() => void removeImage()} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-50"><Trash2 size={15} />Supprimer</button></div> : null}
      {saving ? <p role="status" className="text-sm text-slate-700">Enregistrement de l’image…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
