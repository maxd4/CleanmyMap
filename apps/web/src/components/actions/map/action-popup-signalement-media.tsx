"use client";

import { Image as ImageIcon, LoaderCircle, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  createSignalementMediaReadController,
  type SignalementMediaReadSnapshot,
} from "@/lib/actions/signalement-media-client";

type SignalementMediaProofsProps = {
  signalementId: string;
};

export function SignalementMediaProofs({ signalementId }: SignalementMediaProofsProps) {
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
      onLoad={() => controller.load()}
      onRetry={() => controller.retry()}
    />
  );
}

export function SignalementMediaProofsView({
  snapshot,
  onLoad,
  onRetry,
}: {
  snapshot: SignalementMediaReadSnapshot;
  onLoad: () => void;
  onRetry: () => void;
}) {
  if (snapshot.status === "idle") {
    return (
      <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
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
      </div>
    );
  }

  if (snapshot.status === "loading") {
    return (
      <div
        className="flex items-center gap-2 border-t border-slate-100 pt-3 cmm-text-caption text-slate-500 dark:border-slate-800 dark:text-slate-400"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
        Chargement des preuves photo…
      </div>
    );
  }

  if (snapshot.status === "forbidden") {
    return (
      <div
        className="border-t border-slate-100 pt-3 cmm-text-caption text-slate-500 dark:border-slate-800 dark:text-slate-400"
        role="status"
      >
        Les preuves photo ne sont pas publiques pour ce signalement.
      </div>
    );
  }

  if (snapshot.status === "error") {
    return (
      <div
        className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800"
        role="alert"
      >
        <p className="cmm-text-caption text-rose-700 dark:text-rose-300">
          Les preuves photo n&apos;ont pas pu être chargées.
        </p>
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
      </div>
    );
  }

  if (snapshot.status === "empty") {
    return (
      <div
        className="border-t border-slate-100 pt-3 cmm-text-caption text-slate-500 dark:border-slate-800 dark:text-slate-400"
        role="status"
      >
        Aucune preuve photo disponible.
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <p className="cmm-text-caption font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Preuves photo
      </p>
      <div className="grid grid-cols-3 gap-2" aria-label="Preuves photo du signalement">
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
                <img
                  src={item.signedUrl}
                  alt={`Preuve photo ${index + 1} du signalement`}
                  width={item.width ?? undefined}
                  height={item.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
