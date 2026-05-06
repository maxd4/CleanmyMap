"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, RotateCcw, WifiOff, X } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import {
  NETWORK_TOAST_EVENT,
  type NetworkToastPayload,
} from "@/lib/errors/network-toast";

type NetworkToastState = NetworkToastPayload & {
  id: number;
};

export function NetworkToastHost() {
  const [toast, setToast] = useState<NetworkToastState | null>(null);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<NetworkToastPayload>;
      setToast({
        id: Date.now(),
        title: customEvent.detail.title,
        message: customEvent.detail.message,
        retryLabel: customEvent.detail.retryLabel,
        refreshLabel: customEvent.detail.refreshLabel,
        onRetry: customEvent.detail.onRetry,
        onRefresh: customEvent.detail.onRefresh,
        durationMs: customEvent.detail.durationMs,
      });
    };

    window.addEventListener(NETWORK_TOAST_EVENT, handleToast);
    return () => window.removeEventListener(NETWORK_TOAST_EVENT, handleToast);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(
      () => setToast(null),
      toast.durationMs ?? 7000,
    );

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <NetworkToast
      key={toast.id}
      title={toast.title}
      message={toast.message}
      retryLabel={toast.retryLabel}
      refreshLabel={toast.refreshLabel}
      onRetry={toast.onRetry}
      onRefresh={toast.onRefresh}
      onClose={() => setToast(null)}
    />
  );
}

type NetworkToastProps = {
  title?: string;
  message: string;
  retryLabel?: string;
  refreshLabel?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  onClose: () => void;
};

export function NetworkToast({
  title = "Connexion perdue",
  message,
  retryLabel = "Réessayer maintenant",
  refreshLabel = "Rafraîchir",
  onRetry,
  onRefresh,
  onClose,
}: NetworkToastProps) {
  const actions = useMemo(
    () => (
      <>
        {onRetry ? (
          <CmmButton tone="primary" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </CmmButton>
        ) : null}
        {onRefresh ? (
          <CmmButton tone="secondary" size="sm" onClick={onRefresh}>
            <RotateCcw className="h-4 w-4" />
            {refreshLabel}
          </CmmButton>
        ) : null}
      </>
    ),
    [onRefresh, onRetry, refreshLabel, retryLabel],
  );

  return (
    <div className="fixed bottom-4 right-4 z-[90] w-[min(24rem,calc(100vw-2rem))]">
      <div className="rounded-2xl border border-cyan-200 bg-white/95 p-4 shadow-[0_18px_36px_-24px_rgba(8,145,178,0.5)] backdrop-blur">
        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0 rounded-full bg-cyan-50 p-2 text-cyan-700">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold cmm-text-primary">{title}</p>
            <p className="mt-1 text-sm cmm-text-secondary">{message}</p>
            <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700",
            )}
            aria-label="Fermer l'alerte réseau"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
