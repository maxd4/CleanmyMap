"use client";

import posthog from "posthog-js";
import { env } from "@/lib/env";

let initialized = false;

export function initPostHogClient() {
  if (initialized) return posthog;

  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    loaded: () => {
      initialized = true;
    },
  });

  initialized = true;
  return posthog;
}
