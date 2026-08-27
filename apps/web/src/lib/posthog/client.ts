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
    if (!hasAnalyticsConsent()) {
      return null;
    }

    const posthogModule = await loadPostHogModule();
    const posthog = posthogModule?.default ?? null;
    posthog?.opt_in_capturing({ captureEventName: false });
    return posthog;
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

  const posthogModule = await loadPostHogModule();
  if (!posthogModule) {
    return null;
  }

  // Consent can be withdrawn while the SDK chunk is loading. Re-check before
  // initializing so a stale async request cannot opt the user back in.
  if (!hasAnalyticsConsent()) {
    return null;
  }

  if (initialized) {
    const posthog = posthogModule.default;
    posthog.opt_in_capturing({ captureEventName: false });
    return posthog;
  }

  const posthog = posthogModule.default;
  posthog.init(key, {
    api_host: getPostHogHost(),
    capture_pageview: true,
    capture_pageleave: true,
    loaded: () => {
      initialized = true;
    },
    disable_persistence: !enableAnalytics,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    respect_dnt: true,
  });

  initialized = true;
  posthog.opt_in_capturing({ captureEventName: false });
  return posthog;
}

export async function disablePostHogClient(): Promise<void> {
  if (!initialized) {
    return;
  }

  const posthogModule = await loadPostHogModule();
  const posthog = posthogModule?.default;
  if (!posthog) {
    return;
  }

  // reset() clears the identity and SDK persistence; the explicit opt-out is
  // applied last so the instance remains silent until a new consent is given.
  posthog.reset(true);
  posthog.opt_out_capturing();
}
