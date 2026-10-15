"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import type { SpogomiPublicGalleryPhoto } from "@/lib/spogomi/photo-gallery";

const passthroughImageLoader = ({ src }: { src: string }) => src;

export function SpogomiPhotoGallery({ photos }: { photos: SpogomiPublicGalleryPhoto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex === null ? null : photos[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((value) => value === null ? null : (value + 1) % photos.length);
      if (event.key === "ArrowLeft") setActiveIndex((value) => value === null ? null : (value - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, photos.length]);

  if (!photos.length) return null;

  return (
    <>
      <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5" aria-label="Galerie photo de l'édition">
        <div>
          <h2 className="text-xl font-black text-emerald-950">Retour en images</h2>
          <p className="cmm-text-body mt-1 text-slate-900">Photos publiées avec une provenance, un crédit et une autorisation de diffusion vérifiés.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <button key={photo.id} type="button" onClick={() => setActiveIndex(index)} className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={`Ouvrir la photo : ${photo.alt}`}>
              <Image loader={passthroughImageLoader} src={photo.url} alt={photo.alt} width={photo.width ?? 1200} height={photo.height ?? 800} sizes="(min-width: 640px) 33vw, 50vw" unoptimized loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
            </button>
          ))}
        </div>
      </CmmCard>
      {activePhoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" role="dialog" aria-modal="true" aria-label="Photo SPOGOMI agrandie" onClick={(event) => { if (event.target === event.currentTarget) setActiveIndex(null); }}>
          <div className="relative flex max-h-[92vh] w-full max-w-5xl items-center justify-center">
            <Image loader={passthroughImageLoader} src={activePhoto.url} alt={activePhoto.alt} width={activePhoto.width ?? 1600} height={activePhoto.height ?? 1200} sizes="90vw" unoptimized className="max-h-[78vh] w-auto max-w-full object-contain" />
            <button type="button" onClick={() => setActiveIndex(null)} className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Fermer la photo"><X size={20} aria-hidden="true" /></button>
            {photos.length > 1 ? <>
              <button type="button" onClick={() => setActiveIndex((value) => value === null ? null : (value - 1 + photos.length) % photos.length)} className="absolute left-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Photo précédente"><ChevronLeft size={20} aria-hidden="true" /></button>
              <button type="button" onClick={() => setActiveIndex((value) => value === null ? null : (value + 1) % photos.length)} className="absolute right-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Photo suivante"><ChevronRight size={20} aria-hidden="true" /></button>
            </> : null}
            <div className="absolute bottom-2 left-2 right-2 rounded-xl bg-slate-950/80 p-3 text-sm text-white">
              <p>{activePhoto.caption ?? activePhoto.alt}</p>
              {activePhoto.credit ? <p className="mt-1 text-xs text-slate-200">Crédit : {activePhoto.credit}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
