"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import type { SpogomiPublicGalleryPhoto } from "@/lib/spogomi/photo-gallery";

const passthroughImageLoader = ({ src }: { src: string }) => src;

export function SpogomiPhotoGallery({ photos }: { photos: SpogomiPublicGalleryPhoto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<string>>(() => new Set());
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Set<string>>(() => new Set());
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = useId();
  const activePhoto = activeIndex === null ? null : photos[activeIndex] ?? null;

  const markPhotoLoaded = (photoId: string) => {
    setLoadedPhotoIds((current) => {
      if (current.has(photoId)) return current;
      const next = new Set(current);
      next.add(photoId);
      return next;
    });
  };

  const markPhotoFailed = (photoId: string) => {
    setFailedPhotoIds((current) => {
      if (current.has(photoId)) return current;
      const next = new Set(current);
      next.add(photoId);
      return next;
    });
  };

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (photos.length < 2) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((value) => value === null ? null : (value + 1) % photos.length);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((value) => value === null ? null : (value - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, photos.length]);

  if (!photos.length) return null;

  const currentPhotoNumber = activeIndex === null ? 1 : activeIndex + 1;
  const previousPhotoNumber = currentPhotoNumber === 1 ? photos.length : currentPhotoNumber - 1;
  const nextPhotoNumber = currentPhotoNumber === photos.length ? 1 : currentPhotoNumber + 1;

  const renderPhoto = (photo: SpogomiPublicGalleryPhoto, priority: boolean) => {
    const isFailed = failedPhotoIds.has(photo.id);
    const isLoaded = loadedPhotoIds.has(photo.id);
    if (isFailed) {
      return (
        <div
          className="flex min-h-32 w-full items-center justify-center bg-slate-100 px-4 text-center text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"
          role="img"
          aria-label={`Photo indisponible : ${photo.alt}`}
        >
          Photo indisponible
        </div>
      );
    }

    return (
      <span className="relative block w-full">
        {!isLoaded ? (
          <span
            className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            role="status"
            aria-label={`Chargement de la photo : ${photo.alt}`}
          >
            Chargement…
          </span>
        ) : null}
        <Image
          loader={passthroughImageLoader}
          src={photo.url}
          alt={photo.alt}
          width={priority ? photo.width ?? 1600 : photo.width ?? 1200}
          height={priority ? photo.height ?? 1200 : photo.height ?? 800}
          sizes={priority ? "90vw" : "(min-width: 640px) 33vw, 50vw"}
          unoptimized
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          onLoad={() => markPhotoLoaded(photo.id)}
          onError={() => markPhotoFailed(photo.id)}
          className={priority ? "max-h-[68vh] w-auto max-w-full object-contain" : "aspect-[4/3] w-full object-cover motion-reduce:transition-none"}
        />
      </span>
    );
  };

  return (
    <>
      <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5" aria-label="Galerie photo de l'édition">
        <div>
          <h2 className="text-xl font-black text-emerald-950">Retour en images</h2>
          <p className="cmm-text-body mt-1 text-slate-900">Photos publiées avec une provenance, un crédit et une autorisation de diffusion vérifiés.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <button key={photo.id} type="button" onClick={() => setActiveIndex(index)} className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 motion-reduce:transition-none" aria-label={`Ouvrir la photo ${index + 1} sur ${photos.length} : ${photo.alt}`}>
              {renderPhoto(photo, false)}
            </button>
          ))}
        </div>
      </CmmCard>
      <CmmDialog
        open={activePhoto !== null}
        onClose={() => setActiveIndex(null)}
        ariaLabelledBy={dialogTitleId}
        initialFocusRef={closeButtonRef}
        size="xl"
        panelClassName="border border-slate-700 bg-slate-950 p-4 text-white shadow-2xl sm:p-6"
      >
        {activePhoto ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={dialogTitleId} className="text-lg font-bold text-white text-balance">Photo SPOGOMI</h2>
                <p className="cmm-text-small mt-1 text-slate-300">{activePhoto.alt}</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setActiveIndex(null)} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Fermer la photo">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 p-2">
              {renderPhoto(activePhoto, true)}
              {photos.length > 1 ? <>
                <button type="button" onClick={() => setActiveIndex((value) => value === null ? null : (value - 1 + photos.length) % photos.length)} className="absolute left-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label={`Photo précédente, ${previousPhotoNumber} sur ${photos.length}`}>
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setActiveIndex((value) => value === null ? null : (value + 1) % photos.length)} className="absolute right-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label={`Photo suivante, ${nextPhotoNumber} sur ${photos.length}`}>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </> : null}
            </div>
            <div className="rounded-xl bg-slate-900 p-3 text-sm text-white">
              <p>{activePhoto.caption ?? activePhoto.alt}</p>
              {activePhoto.credit ? <p className="cmm-text-small mt-1 text-slate-200">Crédit : {activePhoto.credit}</p> : null}
              <p className="cmm-text-small mt-2 text-slate-400">Photo {activeIndex === null ? 0 : activeIndex + 1} sur {photos.length}</p>
            </div>
          </div>
        ) : null}
      </CmmDialog>
    </>
  );
}
