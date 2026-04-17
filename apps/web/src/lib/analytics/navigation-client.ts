"use client";

import { initPostHogClient } from "@/lib/posthog/client";
import type { CtaSlot } from "@/lib/domain-language";

type NavClickPayload = {
  profile: string;
  spaceId: string | null;
  href: string;
  label: string;
};

type CtaClickPayload = {
  profile: string;
  ctaType: CtaSlot;
  href: string;
  label: string;
};

function capture(eventName: string, payload: Record<string, unknown>): void {
  const posthog = initPostHogClient();
  if (!posthog) {
    return;
  }
  posthog.capture(eventName, payload);
}

export function trackNavigationClick(payload: NavClickPayload): void {
  capture("cmm_navigation_click", payload);
}

export function trackRoleCtaClick(payload: CtaClickPayload): void {
  capture("cmm_role_cta_click", payload);
}
