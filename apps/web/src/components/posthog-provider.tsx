"use client";

import { useEffect } from"react";
import { initPostHogClient } from"@/lib/posthog/client";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
 useEffect(() => {
 const posthog = initPostHogClient();
 posthog?.capture("cmm_posthog_sdk_initialized", {
 source:"posthog-provider",
 });
 }, []);

 return <>{children}</>;
}
