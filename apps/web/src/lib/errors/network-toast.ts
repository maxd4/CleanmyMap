export type NetworkToastPayload = {
  title?: string;
  message: string;
  retryLabel?: string;
  refreshLabel?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  durationMs?: number;
};

export const NETWORK_TOAST_EVENT = "cleanmymap-network-toast";

export function notifyNetworkToast(detail: NetworkToastPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<NetworkToastPayload>(NETWORK_TOAST_EVENT, { detail }),
  );
}
