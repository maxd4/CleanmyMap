"use client";

import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import {
  getPostHogDeprecatedEnvWarnings,
  getPostHogHost,
  getPostHogKey,
} from "@/lib/posthog/config";

let initialized = false;
let envWarningLogged = false;
let posthogModulePromise: Promise<typeof import("posthog-js")> | null = null;

export function isPostHogInitialized(): boolean {
  return initialized;
}

async function loadPostHogModule() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!posthogModulePromise) {
    posthogModulePromise = import("posthog-js");
  }

  return posthogModulePromise;
}

export async function initPostHogClient(enableAnalytics = true) {
  if (initialized) {
    const module = await loadPostHogModule();
    return module?.default ?? null;
  }

  if (!hasAnalyticsConsent()) {
    return null;
  }

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

  const module = await loadPostHogModule();
  if (!module) {
    return null;
  }

  const posthog = module.default;
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
