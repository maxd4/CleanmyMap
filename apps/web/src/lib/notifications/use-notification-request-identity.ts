import { useCallback, useEffect, useRef } from "react";

import {
  isCurrentNotificationRequest,
  type NotificationIdentity,
} from "./identity";

export function useNotificationRequestIdentity(userId: string | null | undefined) {
  const mountedRef = useRef(true);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    requestGenerationRef.current += 1;
    return () => {
      mountedRef.current = false;
      requestGenerationRef.current += 1;
    };
  }, [userId]);

  const getRequest = useCallback(
    (): NotificationIdentity => ({
      userId: userId ?? null,
      generation: requestGenerationRef.current,
    }),
    [userId],
  );
  const isCurrentRequest = useCallback(
    (request: NotificationIdentity) =>
      mountedRef.current &&
      isCurrentNotificationRequest(request, {
        userId: userId ?? null,
        generation: requestGenerationRef.current,
      }),
    [userId],
  );

  return { getRequest, isCurrentRequest };
}
