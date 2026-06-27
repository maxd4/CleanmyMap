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
  const pendingProgrammaticViewportRef = useRef<MapViewportState | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/users/map-viewport-fallback", {
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as {
          viewport?: MapViewportState | null;
        };
      })
      .then((payload) => {
        if (
          cancelled ||
          !payload?.viewport ||
          hasManualViewportChangeRef.current ||
          hasGeolocationViewportAppliedRef.current ||
          hasFallbackViewportAppliedRef.current
        ) {
          return;
        }
        hasFallbackViewportAppliedRef.current = true;
        pendingProgrammaticViewportRef.current = payload.viewport;
        setViewport(payload.viewport);
      })
      .catch(() => {
        /* Silent fallback: geolocation or the Paris default will remain available. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canRequestGeolocation() || hasManualViewportChangeRef.current) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled || hasManualViewportChangeRef.current) {
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
        // Fallback silencieux vers Paris intramuros.
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 300000,
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

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
