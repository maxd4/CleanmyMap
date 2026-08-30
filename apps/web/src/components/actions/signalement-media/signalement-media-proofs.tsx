"use client";

import Image from "next/image";
import { Image as ImageIcon, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import {
  createSignalementMediaReadController,
  type SignalementMediaReadSnapshot,
} from "@/lib/actions/signalement/signalement-media-client";

export type SignalementMediaProofsVariant = "compact" | "panel";

type SignalementMediaProofsProps = {
  signalementId: string;
  variant?: SignalementMediaProofsVariant;
};

const passthroughImageLoader = ({ src }: { src: string }) => src;

function shellClassName(variant: SignalementMediaProofsVariant): string {
  return variant === "panel"
    ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    : "border-t border-slate-100 pt-3 dark:border-slate-800";
}

function titleClassName(variant: SignalementMediaProofsVariant): string {
  return variant === "panel"
    ? "cmm-text-small font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
    : "cmm-text-caption font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";
}

export function SignalementMediaProofs({
  signalementId,
  variant = "compact",
}: SignalementMediaProofsProps) {
  const [, forceRender] = useState(0);
  const controller = useMemo(
    () =>
      createSignalementMediaReadController(signalementId, () => {
        forceRender((value) => value + 1);
      }),
    [signalementId],
  );

  return (
    <SignalementMediaProofsView
      snapshot={controller.getSnapshot()}
      variant={variant}
      onLoad={() => controller.load()}
      onRetry={() => controller.retry()}
    />
  );
}

export function SignalementMediaProofsView({
  snapshot,
  variant = "compact",
  onLoad,
  onRetry,
}: {
  snapshot: SignalementMediaReadSnapshot;
  variant?: SignalementMediaProofsVariant;
  onLoad: () => void;
  onRetry: () => void;
}) {
  const shell = shellClassName(variant);
  const isPanel = variant === "panel";

  if (snapshot.status === "idle") {
    const loadButton = (
      <CmmButton
        type="button"
        onClick={onLoad}
        tone="secondary"
        variant="ghost"
        size="sm"
        className="min-h-9 max-w-full px-3 text-[10px] font-black uppercase tracking-[0.12em]"
      >
        <ImageIcon size={14} aria-hidden="true" />
        Voir les preuves photo
      </CmmButton>
    );

    return (
      <CmmFeedback
        tone="info"
        title={isPanel ? "Preuves terrain" : undefined}
        action={isPanel ? loadButton : undefined}
      >
        {isPanel ? "Les preuves photo sont chargées uniquement à votre demande." : loadButton}
      </CmmFeedback>
    );
  }

  if (snapshot.status === "loading") {
    return (
      <div
        className="flex items-center gap-2 cmm-text-caption"
        role="status"
        aria-live="polite"
      >
        <CmmSkeleton variant="circular" animation="pulse" className="h-4 w-4" aria-hidden="true" />
        <span>Chargement des preuves photo…</span>
      </div>
    );
  }

  if (snapshot.status === "forbidden") {
    return (
      <CmmFeedback tone="info" title={isPanel ? "Preuves terrain" : undefined}>
        Les preuves photo ne sont pas publiques pour ce signalement.
      </CmmFeedback>
    );
  }

  if (snapshot.status === "error") {
    return (
      <CmmFeedback
        tone="error"
        title={isPanel ? "Preuves terrain" : undefined}
        action={
          <CmmButton
            type="button"
            onClick={onRetry}
            tone="secondary"
            variant="ghost"
            size="sm"
            className="min-h-9 max-w-full px-3 text-[10px] font-black uppercase tracking-[0.12em]"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </CmmButton>
        }
      >
        Les preuves photo n&apos;ont pas pu être chargées.
      </CmmFeedback>
    );
  }

  if (snapshot.status === "empty") {
    return (
      <CmmFeedback tone="info" title={isPanel ? "Preuves terrain" : undefined}>
        Aucune preuve photo disponible.
      </CmmFeedback>
    );
  }

  return (
    <section className={`${shell} space-y-3`} aria-label="Preuves terrain du signalement">
      <p className={titleClassName(variant)}>
        {isPanel ? "Preuves terrain" : "Preuves photo"}
      </p>
      <div
        className={isPanel ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "grid grid-cols-3 gap-2"}
        aria-label="Preuves photo du signalement"
      >
        {snapshot.items.slice(0, 3).map((item, index) => {
          const hasDimensions = item.width !== null && item.height !== null;
          return (
            <a
              key={item.id}
              href={item.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition hover:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 dark:border-slate-700 dark:bg-slate-900"
              aria-label={`Ouvrir la preuve photo ${index + 1} du signalement`}
            >
              <span
                className="block overflow-hidden"
                style={{
                  aspectRatio: hasDimensions
                    ? `${item.width} / ${item.height}`
                    : "4 / 3",
                }}
              >
                <Image
                  src={item.signedUrl}
                  loader={passthroughImageLoader}
                  alt={`Preuve photo ${index + 1} du signalement`}
                  width={item.width ?? 1200}
                  height={item.height ?? 900}
                  unoptimized
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                />
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
