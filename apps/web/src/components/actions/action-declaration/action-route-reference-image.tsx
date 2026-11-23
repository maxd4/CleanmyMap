"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { deleteActionRouteReference, readActionRouteReferences, uploadActionRouteReference } from "@/lib/actions/action-media/action-route-reference-client";
import type { ActionMediaReadItem } from "@/lib/actions/action-media/action-media-contract";

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
  const [images, setImages] = useState<ActionMediaReadItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!actionId) return () => { active = false; };
    void readActionRouteReferences(actionId).then((items) => {
      if (active) setImages(items);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "La référence privée est indisponible.");
    });
    return () => { active = false; };
  }, [actionId]);
  const visibleImage = images.find((item) => item.id === mediaId && item.signedUrl) ?? null;

  async function refreshImages() {
    if (actionId) setImages(await readActionRouteReferences(actionId));
  }

  async function chooseFile(file: File | undefined) {
    if (!file || !actionId) return;
    setSaving(true); setError(null);
    const previous = visibleImage?.id ?? mediaId ?? null;
    try {
      const saved = await uploadActionRouteReference(actionId, file);
      onMediaIdChange(saved.id);
      await refreshImages();
      if (previous && previous !== saved.id) {
        await deleteActionRouteReference(actionId, previous);
        await refreshImages();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’image n’a pas pu être enregistrée.");
      try { await refreshImages(); } catch { /* Le message d’erreur principal reste visible. */ }
    } finally { setSaving(false); }
  }

  async function removeImage(item: ActionMediaReadItem) {
    if (!actionId || !window.confirm(item.cleanupPending ? "Réessayer le nettoyage de cette image privée ?" : "Supprimer définitivement cette image de référence privée ?")) return;
    setSaving(true); setError(null);
    try {
      await deleteActionRouteReference(actionId, item.id);
      if (item.id === mediaId) onMediaIdChange(null);
      await refreshImages();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La suppression a échoué.");
      try { await refreshImages(); } catch { /* La nouvelle tentative reste disponible au prochain chargement. */ }
    }
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
      {actionId && mediaId && !visibleImage && images.length === 0 && !error ? <p role="status" className="text-sm text-slate-600">Chargement de l’image privée…</p> : null}
      {images.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
        {item.signedUrl ? <Image src={item.signedUrl} alt={`Référence visuelle privée : ${item.originalName}`} width={128} height={96} unoptimized className="h-24 w-32 rounded-lg object-cover" /> : <div className="grid h-24 w-32 place-items-center rounded-lg bg-amber-50 text-xs text-amber-900">Nettoyage en attente</div>}
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-slate-800">{item.originalName}</p><p role="status" className={item.cleanupPending ? "text-xs text-amber-800" : "text-xs text-emerald-800"}>{item.cleanupPending ? "Image désactivée · stockage à nettoyer, réessayable" : item.id === mediaId ? "Image sélectionnée · accès privé temporaire" : "Image privée disponible"}</p></div>
        {item.signedUrl && item.id !== mediaId ? <button type="button" disabled={saving} onClick={() => onMediaIdChange(item.id)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50">Utiliser</button> : null}
        <button type="button" disabled={saving} onClick={() => void removeImage(item)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-50"><Trash2 size={15} />{item.cleanupPending ? "Réessayer le nettoyage" : "Supprimer"}</button>
      </div>)}
      {saving ? <p role="status" className="text-sm text-slate-700">Enregistrement de l’image…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
