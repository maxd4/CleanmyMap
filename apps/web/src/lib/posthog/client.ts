"use client";

import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import {
  POSTHOG_PROPERTY_DENYLIST,
  sanitizeAnalyticsProperties,
  sanitizeAnalyticsUrl,
} from "@/lib/analytics/sanitize-analytics-payload";
import {
  getPostHogDeprecatedEnvWarnings,
  getPostHogHost,
  getPostHogKey,
} from "@/lib/posthog/config";

let initialized = false;
let envWarningLogged = false;
let posthogModulePromise: Promise<typeof import("posthog-js")> | null = null;

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
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_performance: false,
    save_campaign_params: false,
    save_referrer: false,
    disable_capture_url_hashes: true,
    disable_session_recording: true,
    disable_scroll_properties: true,
    loaded: () => {
      initialized = true;
    },
    disable_persistence: !enableAnalytics,
    get_current_url: sanitizeAnalyticsUrl,
    property_denylist: [...POSTHOG_PROPERTY_DENYLIST],
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    rageclick: false,
    respect_dnt: true,
    before_send: (event) => {
      if (["$autocapture", "$copy_autocapture", "$dead_click", "$rageclick"].includes(event.event)) {
        return null;
      }

      return {
        ...event,
        properties: sanitizeAnalyticsProperties(event.properties),
        ...(event.$set
          ? { $set: sanitizeAnalyticsProperties(event.$set) }
          : {}),
        ...(event.$set_once
          ? { $set_once: sanitizeAnalyticsProperties(event.$set_once) }
          : {}),
      };
    },
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
  posthog.stopSessionRecording();
  posthog.reset(true);
  posthog.opt_out_capturing();
}
