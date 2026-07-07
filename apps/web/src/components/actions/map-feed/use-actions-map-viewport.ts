import { useCallback, useEffect, useRef, useState } from "react";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import {
  DEFAULT_ACTIONS_MAP_VIEWPORT,
  createActionsMapViewport,
} from "@/components/actions/actions-map-canvas.utils";
import { canRequestGeolocation } from "@/lib/browser/geolocation";

function sameViewport(left: MapViewportState | null, right: MapViewportState | null): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.center[0] === right.center[0] &&
    left.center[1] === right.center[1] &&
    left.zoom === right.zoom &&
    left.bounds.south === right.bounds.south &&
    left.bounds.west === right.bounds.west &&
    left.bounds.north === right.bounds.north &&
    left.bounds.east === right.bounds.east
  );
}

export function useActionsMapViewport(
  onViewportChange?: (viewport: MapViewportState) => void,
) {
  const [viewport, setViewport] = useState<MapViewportState | null>(
    DEFAULT_ACTIONS_MAP_VIEWPORT,
  );
  const hasReceivedInitialViewportReportRef = useRef(false);
  const hasManualViewportChangeRef = useRef(false);
  const hasGeolocationViewportAppliedRef = useRef(false);
  const hasFallbackViewportAppliedRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingProgrammaticViewportRef = useRef<MapViewportState | null>(null);

  const loadFallbackViewport = useCallback(async (): Promise<MapViewportState | null> => {
    if (
      hasManualViewportChangeRef.current ||
      hasGeolocationViewportAppliedRef.current ||
      hasFallbackViewportAppliedRef.current
    ) {
      return null;
    }

    try {
      const response = await fetch("/api/users/map-viewport-fallback", {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        viewport?: MapViewportState | null;
      };

      if (
        !isMountedRef.current ||
        !payload?.viewport ||
        hasManualViewportChangeRef.current ||
        hasGeolocationViewportAppliedRef.current ||
        hasFallbackViewportAppliedRef.current
      ) {
        return null;
      }

      return payload.viewport;
    } catch {
      /* Silent fallback: geolocation or the Paris default will remain available. */
      return null;
    }
  }, []);

  const applyFallbackViewport = useCallback(async () => {
    const nextViewport = await loadFallbackViewport();
    if (
      !isMountedRef.current ||
      !nextViewport ||
      hasManualViewportChangeRef.current ||
      hasGeolocationViewportAppliedRef.current ||
      hasFallbackViewportAppliedRef.current
    ) {
      return;
    }

    hasFallbackViewportAppliedRef.current = true;
    pendingProgrammaticViewportRef.current = nextViewport;
    setViewport(nextViewport);
  }, [loadFallbackViewport]);

  const queueFallbackViewport = useCallback(() => {
    queueMicrotask(() => {
      void applyFallbackViewport();
    });
  }, [applyFallbackViewport]);

  useEffect(() => {
    isMountedRef.current = true;
    const cleanup = () => {
      isMountedRef.current = false;
    };

    if (!canRequestGeolocation() || hasManualViewportChangeRef.current) {
      queueFallbackViewport();
      return cleanup;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      queueFallbackViewport();
      return cleanup;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current || hasManualViewportChangeRef.current) {
          return;
        }

        const nextViewport = createActionsMapViewport(
          [
            Number(position.coords.latitude.toFixed(6)),
            Number(position.coords.longitude.toFixed(6)),
          ],
          14,
        );
        hasGeolocationViewportAppliedRef.current = true;
        pendingProgrammaticViewportRef.current = nextViewport;
        setViewport(nextViewport);
      },
      () => {
        queueFallbackViewport();
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 300000,
      },
    );

    return cleanup;
  }, [queueFallbackViewport]);

  const handleViewportChange = useCallback(
    (nextViewport: MapViewportState) => {
      const isProgrammaticViewport = sameViewport(
        nextViewport,
        pendingProgrammaticViewportRef.current,
      );
      const isAlreadySelectedViewport = sameViewport(viewport, nextViewport);

      if (!hasReceivedInitialViewportReportRef.current) {
        hasReceivedInitialViewportReportRef.current = true;
        if (isProgrammaticViewport) {
          pendingProgrammaticViewportRef.current = null;
        }
        if (!isAlreadySelectedViewport) {
          setViewport(nextViewport);
        }
        onViewportChange?.(nextViewport);
        return;
      }

      if (isProgrammaticViewport) {
        pendingProgrammaticViewportRef.current = null;
        if (!isAlreadySelectedViewport) {
          setViewport(nextViewport);
        }
        onViewportChange?.(nextViewport);
        return;
      }

      hasManualViewportChangeRef.current = true;
      if (!isAlreadySelectedViewport) {
        setViewport(nextViewport);
      }
      onViewportChange?.(nextViewport);
    },
    [onViewportChange, viewport],
  );

  return {
    viewport,
    handleViewportChange,
  };
}
