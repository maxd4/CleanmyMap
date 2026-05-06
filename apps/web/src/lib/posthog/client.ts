"use client";

import posthog from "posthog-js";
import {
  getPostHogDeprecatedEnvWarnings,
  getPostHogHost,
  getPostHogKey,
} from "@/lib/posthog/config";

let initialized = false;
let envWarningLogged = false;

export function isPostHogInitialized(): boolean {
  return initialized;
}

export function initPostHogClient(enableAnalytics = true) {
  if (initialized) return posthog;

  const key = getPostHogKey();
  if (!key) {
    return null;
  }

  if (!envWarningLogged) {
    const warnings = getPostHogDeprecatedEnvWarnings();
    for (const warning of warnings) {
      console.warn(`[PostHog] ${warning}`);
    }
    envWarningLogged = true;
  }

  posthog.init(key, {
    api_host: getPostHogHost(),
    capture_pageview: true,
    capture_pageleave: true,
    loaded: () => {
      initialized = true;
    },
    disable_persistence: !enableAnalytics,
    respect_dnt: true,
  });

  initialized = true;
  return posthog;
}
