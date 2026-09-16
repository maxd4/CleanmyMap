"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, RotateCcw, WifiOff } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmToast } from "@/components/ui/cmm-toast";
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
    <CmmToast
      title={title}
      tone="error"
      announcement="assertive"
      icon={<WifiOff className="h-4 w-4" />}
      actions={actions}
      onClose={onClose}
      closeLabel="Fermer l'alerte réseau"
      className="fixed bottom-4 right-4 z-[90] w-[min(24rem,calc(100vw-2rem))]"
    >
      {message}
    </CmmToast>
  );
}
