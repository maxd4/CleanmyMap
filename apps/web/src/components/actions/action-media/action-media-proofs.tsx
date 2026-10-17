"use client";

import Image from "next/image";
import { Image as ImageIcon, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { createActionMediaReadController, type ActionMediaReadSnapshot } from "@/lib/actions/action-media/action-media-client";

const passthroughImageLoader = ({ src }: { src: string }) => src;

export function ActionMediaProofs({ actionId }: { actionId: string }) {
  const [, forceRender] = useState(0);
  const controller = useMemo(
    () => createActionMediaReadController(actionId, () => forceRender((value) => value + 1)),
    [actionId],
  );
  return (
    <ActionMediaProofsView
      snapshot={controller.getSnapshot()}
      onLoad={() => void controller.load()}
      onRetry={() => void controller.retry()}
    />
  );
}

export function ActionMediaProofsView({
  snapshot,
  onLoad,
  onRetry,
}: {
  snapshot: ActionMediaReadSnapshot;
  onLoad: () => void;
  onRetry: () => void;
}) {
  if (snapshot.status === "idle") {
    return (
      <CmmFeedback
        tone="info"
        title="Photos de bilan"
        action={
            <CmmButton type="button" onClick={onLoad} tone="secondary" variant="ghost" size="sm" className="min-h-9 px-3 text-xs font-black uppercase tracking-[0.12em]">
            <ImageIcon size={14} aria-hidden="true" /> Voir les photos
          </CmmButton>
        }
      >
        Les photos sont chargées uniquement à votre demande et restent réservées aux personnes autorisées.
      </CmmFeedback>
    );
  }
  if (snapshot.status === "loading") {
    return <div className="flex items-center gap-2 cmm-text-caption" role="status" aria-live="polite"><CmmSkeleton variant="circular" animation="pulse" className="h-4 w-4" aria-hidden="true" /><span>Chargement des photos de bilan…</span></div>;
  }
  if (snapshot.status === "error") {
    return <CmmFeedback tone="error" title="Photos de bilan" action={<CmmButton type="button" onClick={onRetry} tone="secondary" variant="ghost" size="sm" className="min-h-9 px-3 text-xs font-black uppercase tracking-[0.12em]"><RefreshCw size={14} aria-hidden="true" /> Réessayer</CmmButton>}>Les photos de bilan n&apos;ont pas pu être chargées.</CmmFeedback>;
  }
  if (snapshot.status === "empty") return <CmmFeedback tone="info" title="Photos de bilan">Aucune photo de bilan finalisée.</CmmFeedback>;

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="Photos de bilan de l'action">
      <p className="cmm-text-caption font-bold uppercase tracking-wider text-slate-500">Photos de bilan</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photos de bilan">
        {snapshot.items.slice(0, 3).map((item, index) => {
          const hasDimensions = item.width !== null && item.height !== null;
          return (
            <a key={item.id} href={item.signedUrl} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label={`Ouvrir la photo de bilan ${index + 1}`}>
              <span className="block overflow-hidden" style={{ aspectRatio: hasDimensions ? `${item.width} / ${item.height}` : "4 / 3" }}>
                <Image src={item.signedUrl} loader={passthroughImageLoader} alt={`Photo de bilan ${index + 1}`} width={item.width ?? 1200} height={item.height ?? 900} unoptimized loading="lazy" decoding="async" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
