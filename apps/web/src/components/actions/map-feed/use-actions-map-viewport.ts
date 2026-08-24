import { useCallback, useEffect, useRef, useState } from "react";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import {
  DEFAULT_ACTIONS_MAP_VIEWPORT,
  createActionsMapViewport,
} from "@/components/actions/actions-map-canvas.utils";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import type { PollutionScoreReferences } from "@/lib/actions/pollution-score";
import { fetchMapActions } from "@/lib/actions/map-http";
import {
  resolveInitialMapViewport,
  selectMapReferencePoint,
  type MapReferencePoint,
} from "./actions-map-initial-viewport";

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

function sameViewportPosition(left: MapViewportState | null, right: MapViewportState | null): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    Math.abs(left.center[0] - right.center[0]) < 0.00001 &&
    Math.abs(left.center[1] - right.center[1]) < 0.00001 &&
    left.zoom === right.zoom
  );
}

type FallbackPayload = {
  viewport?: MapViewportState | null;
  reference?: MapReferencePoint | null;
};

export function shouldApplyAutomaticViewport(params: {
  isMounted: boolean;
  hasManualViewportChange: boolean;
  hasAutomaticViewportApplied: boolean;
  nextViewport: MapViewportState | null;
}): boolean {
  return (
    params.isMounted &&
    Boolean(params.nextViewport) &&
    !params.hasManualViewportChange &&
    !params.hasAutomaticViewportApplied
  );
}

export function useActionsMapViewport(
  onViewportChange?: (viewport: MapViewportState) => void,
  pollutionScoreReferences?: PollutionScoreReferences | null,
) {
  const [viewport, setViewport] = useState<MapViewportState | null>(
    DEFAULT_ACTIONS_MAP_VIEWPORT,
  );
  const [viewportRequest, setViewportRequest] = useState<MapViewportState | null>(null);
  const [viewportRequestKey, setViewportRequestKey] = useState(0);
  const [recenterViewport, setRecenterViewport] = useState<MapViewportState>(
    DEFAULT_ACTIONS_MAP_VIEWPORT,
  );
  const hasReceivedInitialViewportReportRef = useRef(false);
  const hasManualViewportChangeRef = useRef(false);
  const hasAutomaticViewportAppliedRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingProgrammaticViewportRef = useRef<MapViewportState | null>(null);
  const hasStartedInitialResolutionRef = useRef(false);

  const applyAutomaticViewport = useCallback(
    async (reference: MapReferencePoint, stableFallback: MapViewportState | null) => {
      if (hasManualViewportChangeRef.current || hasAutomaticViewportAppliedRef.current) {
        return;
      }

      let nextViewport = stableFallback;
      try {
        const resolution = await resolveInitialMapViewport({
          reference,
          pollutionScoreReferences,
          fetchActions: fetchMapActions,
        });
        nextViewport = resolution.viewport;
      } catch {
        // Keep the strict local reference viewport when the map API is unavailable.
      }

      if (!shouldApplyAutomaticViewport({
        isMounted: isMountedRef.current,
        hasManualViewportChange: hasManualViewportChangeRef.current,
        hasAutomaticViewportApplied: hasAutomaticViewportAppliedRef.current,
        nextViewport,
      })) {
        return;
      }
      if (!nextViewport) {
        return;
      }

      hasAutomaticViewportAppliedRef.current = true;
      pendingProgrammaticViewportRef.current = nextViewport;
      setRecenterViewport(nextViewport);
      setViewportRequest(nextViewport);
      setViewportRequestKey((current) => current + 1);
      setViewport(nextViewport);
    },
    [pollutionScoreReferences],
  );

  const loadFallbackViewport = useCallback(async (): Promise<FallbackPayload | null> => {
    try {
      const response = await fetch("/api/users/map-viewport-fallback", {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as FallbackPayload;
    } catch {
      return null;
    }
  }, []);

  const queueFallbackViewport = useCallback(() => {
    queueMicrotask(() => {
      void (async () => {
        const payload = await loadFallbackViewport();
        if (
          !payload ||
          !isMountedRef.current ||
          hasManualViewportChangeRef.current ||
          hasAutomaticViewportAppliedRef.current
        ) {
          return;
        }

        if (payload.reference) {
          const residenceReference = selectMapReferencePoint(null, payload.reference);
          if (residenceReference) {
            await applyAutomaticViewport(residenceReference, payload.viewport ?? null);
          }
          return;
        }

        if (payload.viewport) {
          await applyAutomaticViewport(
            {
              latitude: payload.viewport.center[0],
              longitude: payload.viewport.center[1],
            },
            payload.viewport,
          );
        }
      })();
    });
  }, [applyAutomaticViewport, loadFallbackViewport]);

  useEffect(() => {
    isMountedRef.current = true;
    if (hasStartedInitialResolutionRef.current) {
      return () => {
        isMountedRef.current = false;
      };
    }
    hasStartedInitialResolutionRef.current = true;

    const cleanup = () => {
      isMountedRef.current = false;
    };

    const handleGeolocationFailure = () => {
      if (!hasManualViewportChangeRef.current) {
        queueFallbackViewport();
      }
    };

    if (!canRequestGeolocation() || typeof navigator === "undefined" || !navigator.geolocation) {
      handleGeolocationFailure();
      return cleanup;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current || hasManualViewportChangeRef.current) {
          return;
        }

        const gpsReference = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        };
        const reference = selectMapReferencePoint(gpsReference, null);
        if (reference) {
          void applyAutomaticViewport(
            reference,
            createActionsMapViewport([reference.latitude, reference.longitude], 12),
          );
        }
      },
      handleGeolocationFailure,
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 300000,
      },
    );

    return cleanup;
  }, [applyAutomaticViewport, queueFallbackViewport]);

  const handleManualViewportInteraction = useCallback(() => {
    if (pendingProgrammaticViewportRef.current) {
      return;
    }
    hasManualViewportChangeRef.current = true;
    pendingProgrammaticViewportRef.current = null;
  }, []);

  const handleViewportChange = useCallback(
    (nextViewport: MapViewportState) => {
      const isProgrammaticViewport = sameViewportPosition(
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
    viewportRequest,
    viewportRequestKey,
    recenterViewport,
    handleManualViewportInteraction,
    handleViewportChange,
  };
}
