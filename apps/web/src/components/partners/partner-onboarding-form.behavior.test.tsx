// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useUserMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useUser: useUserMock,
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr", displayMode: "exhaustif" }),
}));

import { PartnerOnboardingForm } from "./partner-onboarding-form";

function setInputValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("PartnerOnboardingForm behavior", () => {
  let container: HTMLDivElement;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    useUserMock.mockReturnValue({
      user: {
        fullName: "Alice Martin",
        primaryEmailAddress: { emailAddress: "alice@example.org" },
      },
    });
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("renders all sections, toggles options and submits a complete onboarding request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        status: "pending_admin_review",
        requestId: "req-partner-1",
      }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(PartnerOnboardingForm));
    });

    // Toggle engagement & contribution buttons
    const buttons = Array.from(container.querySelectorAll("button"));
    const envBtn = buttons.find((b) => b.textContent?.includes("Environnement"));
    const matBtn = buttons.find((b) => b.textContent?.includes("Matériel"));
    const arrBtn = buttons.find((b) => b.textContent?.trim() === "Paris 11e");

    act(() => {
      envBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      matBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      arrBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Fill inputs across general-info, geographic-coverage, availability, contact, relay
    const inputs = Array.from(container.querySelectorAll("input"));
    const textareas = Array.from(container.querySelectorAll("textarea"));

    act(() => {
      for (const input of inputs) {
        if (
          input.id === "partner-onboarding-website" ||
          input.name === "website"
        ) {
          continue;
        }
        if (input.type === "checkbox") {
          if (!input.checked) {
            input.click();
          }
          continue;
        }
        if (input.type === "url") {
          setInputValue(input, "https://www.association-clean-paris.fr");
        } else if (input.type === "email") {
          setInputValue(input, "contact@example.org");
        } else if (input.type === "tel") {
          setInputValue(input, "0612345678");
        } else if (
          input.placeholder?.toLowerCase().includes("arrondissement") ||
          input.name?.includes("arrondissement")
        ) {
          setInputValue(input, "11, 20");
        } else if (!input.value) {
          setInputValue(input, "Association Test Paris");
        }
      }
      for (const textarea of textareas) {
        setInputValue(
          textarea,
          "Description complète de nos actions de dépollution à Paris et relais locaux.",
        );
      }
    });

    const submitBtn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;
    expect(submitBtn).not.toBeNull();

    await act(async () => {
      submitBtn?.click();
    });

    expect(container.querySelector(".text-rose-800")?.textContent ?? "").toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(requestUrl).toBe("/api/partners/onboarding-requests");
    expect(requestInit.method).toBe("POST");

    const sentPayload = JSON.parse(String(requestInit.body)) as {
      honeypot: string;
      organizationName: string;
      contributionTypes: string[];
      publicWebsiteUrl?: string;
      publicWebsiteConsent: boolean;
      submittedAt: number;
    };
    expect(sentPayload.honeypot).toBe("");
    expect(sentPayload.organizationName).toBe("Association Test Paris");
    expect(sentPayload.contributionTypes.length).toBeGreaterThan(0);
    expect(sentPayload.publicWebsiteUrl).toBe("https://www.association-clean-paris.fr");
    expect(sentPayload.publicWebsiteConsent).toBe(true);
    expect(typeof sentPayload.submittedAt).toBe("number");

    expect(container.textContent).toContain("req-partner-1");

    act(() => {
      root.unmount();
    });
  });
});
