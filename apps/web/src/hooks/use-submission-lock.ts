"use client";

import { useCallback, useRef } from "react";

export function useSubmissionLock() {
  const lockRef = useRef(false);

  const acquire = useCallback(() => {
    if (lockRef.current) {
      return false;
    }

    lockRef.current = true;
    return true;
  }, []);

  const release = useCallback(() => {
    lockRef.current = false;
  }, []);

  return {
    acquire,
    release,
    lockRef,
  };
}
