import { useCallback, useEffect, useRef, useState } from "react";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import {
  createActionsMapViewport,
} from "@/components/actions/actions-map-canvas.utils";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import {
  resolveInitialPublicMapViewport,
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

export type ActionsMapViewportOptions = {
  fallbackViewport?: MapViewportState;
  useRemoteFallback?: boolean;
};

export function resolveInitialViewportFailure(params: {
  stableFallback: MapViewportState | null | undefined;
  error: unknown;
}): {
  viewport: MapViewportState | null;
  hasPublicActions: boolean;
  error: Error | null;
} {
  if (params.stableFallback) {
    return {
      viewport: params.stableFallback,
      hasPublicActions: true,
      error: null,
    };
  }

  return {
    viewport: null,
    hasPublicActions: false,
    error: params.error instanceof Error
      ? params.error
      : new Error("La résolution initiale de la carte a échoué."),
  };
}

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
  options: ActionsMapViewportOptions = {},
) {
  const fallbackViewport = options.fallbackViewport;
  const useRemoteFallback = options.useRemoteFallback ?? true;
  const [viewport, setViewport] = useState<MapViewportState | null>(
    fallbackViewport ?? null,
  );
  const [viewportRequest, setViewportRequest] = useState<MapViewportState | null>(null);
  const [viewportRequestKey, setViewportRequestKey] = useState(0);
  const [recenterViewport, setRecenterViewport] = useState<MapViewportState | null>(
    fallbackViewport ?? null,
  );
  const [isInitialViewportResolved, setIsInitialViewportResolved] = useState(
    fallbackViewport !== undefined,
  );
  const [hasInitialPublicActions, setHasInitialPublicActions] = useState(
    fallbackViewport !== undefined,
  );
  const [initialViewportError, setInitialViewportError] = useState<Error | null>(null);
  const [resolutionAttempt, setResolutionAttempt] = useState(0);
  const hasReceivedInitialViewportReportRef = useRef(false);
  const hasManualViewportChangeRef = useRef(false);
  const hasAutomaticViewportAppliedRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingProgrammaticViewportRef = useRef<MapViewportState | null>(null);
  const hasStartedInitialResolutionRef = useRef(false);

  const applyAutomaticViewport = useCallback(
    async (
      reference: MapReferencePoint | null,
      stableFallback: MapViewportState | null | undefined,
    ) => {
      if (hasManualViewportChangeRef.current || hasAutomaticViewportAppliedRef.current) {
        return;
      }

      let nextViewport = stableFallback;
      let hasPublicActions = fallbackViewport !== undefined && !reference;
      let resolutionError: Error | null = null;
      if (!useRemoteFallback && fallbackViewport !== undefined && !reference) {
        // Homepage previews intentionally keep their supplied stable viewport
        // when geolocation is unavailable; the public map uses the action
        // resolver because it has no neutral viewport fallback.
      } else if (reference) {
        try {
          const resolution = await resolveInitialPublicMapViewport({
            reference,
          });
          nextViewport = resolution.viewport;
          hasPublicActions = resolution.cityItems.length > 0;
        } catch (error) {
          // Keep a useful location fallback when the bounded public resolution
          // fails; do not fall back to the neutral world viewport.
          const failure = resolveInitialViewportFailure({
            stableFallback: stableFallback ?? (useRemoteFallback ? null : fallbackViewport),
            error,
          });
          nextViewport = failure.viewport;
          hasPublicActions = failure.hasPublicActions;
          resolutionError = failure.error;
        }
      } else {
        try {
          const resolution = await resolveInitialPublicMapViewport({
            reference: null,
          });
          nextViewport = resolution.viewport;
          hasPublicActions = resolution.cityItems.length > 0;
        } catch (error) {
          const failure = resolveInitialViewportFailure({ stableFallback, error });
          nextViewport = failure.viewport;
          hasPublicActions = failure.hasPublicActions;
          resolutionError = failure.error;
        }
      }

      if (
        !isMountedRef.current ||
        hasManualViewportChangeRef.current ||
        hasAutomaticViewportAppliedRef.current
      ) {
        return;
      }

      hasAutomaticViewportAppliedRef.current = true;
      setInitialViewportError(resolutionError);
      setHasInitialPublicActions(hasPublicActions);
      setIsInitialViewportResolved(true);
      if (nextViewport) {
        pendingProgrammaticViewportRef.current = nextViewport;
        setRecenterViewport(nextViewport);
        setViewportRequest(nextViewport);
        setViewportRequestKey((current) => current + 1);
        setViewport(nextViewport);
      }
    },
    [fallbackViewport, useRemoteFallback],
  );

  const retryInitialViewport = useCallback(() => {
    if (hasManualViewportChangeRef.current) {
      return;
    }

    hasAutomaticViewportAppliedRef.current = false;
    hasReceivedInitialViewportReportRef.current = false;
    hasStartedInitialResolutionRef.current = false;
    pendingProgrammaticViewportRef.current = null;
    setInitialViewportError(null);
    setIsInitialViewportResolved(false);
    setHasInitialPublicActions(false);
    setResolutionAttempt((current) => current + 1);
  }, []);

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
          !isMountedRef.current ||
          hasManualViewportChangeRef.current ||
          hasAutomaticViewportAppliedRef.current
        ) {
          return;
        }

        if (!payload) {
          await applyAutomaticViewport(null, fallbackViewport);
          return;
        }

        if (payload.reference) {
          const residenceReference = selectMapReferencePoint(null, payload.reference);
          if (residenceReference) {
            await applyAutomaticViewport(
              residenceReference,
              payload.viewport ??
                createActionsMapViewport(
                  [residenceReference.latitude, residenceReference.longitude],
                  12,
                ),
            );
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
          return;
        }

        await applyAutomaticViewport(null, fallbackViewport);
      })();
    });
  }, [applyAutomaticViewport, fallbackViewport, loadFallbackViewport]);

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
        if (useRemoteFallback) {
          queueFallbackViewport();
        } else {
          void applyAutomaticViewport(null, fallbackViewport);
        }
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
  }, [applyAutomaticViewport, fallbackViewport, queueFallbackViewport, resolutionAttempt, useRemoteFallback]);

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
    isInitialViewportResolved,
    hasInitialPublicActions,
    initialViewportError,
    retryInitialViewport,
    handleManualViewportInteraction,
    handleViewportChange,
  };
}
