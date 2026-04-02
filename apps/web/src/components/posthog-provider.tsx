"use client";

import { useEffect } from "react";
import { initPostHogClient } from "@/lib/posthog/client";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHogClient();
  }, []);

  return <>{children}</>;
}
