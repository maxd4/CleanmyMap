// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackDiscoveryCallout } from "./feedback-discovery-callout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = "cleanmymap_feedback_discovery_v1";
const WEEK_AGO = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

describe("FeedbackDiscoveryCallout behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    document.body.innerHTML = "";
    localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderCallout(props: Partial<React.ComponentProps<typeof FeedbackDiscoveryCallout>> = {}) {
    const nextProps = {
      isAuthenticated: true,
      isMenuOpen: false,
      isPreferencesOpen: false,
      pathname: "/actions/history",
      ...props,
    };
    act(() => {
      root = createRoot(host);
      root.render(<FeedbackDiscoveryCallout {...nextProps} />);
    });
    act(() => vi.runOnlyPendingTimers());
  }

  function rerender(props: Partial<React.ComponentProps<typeof FeedbackDiscoveryCallout>>) {
    act(() => {
      root.render(
        <FeedbackDiscoveryCallout
          isAuthenticated
          isMenuOpen={false}
          isPreferencesOpen={false}
          pathname="/actions/history"
          {...props}
        />,
      );
    });
    act(() => vi.runOnlyPendingTimers());
  }

  it("shows initially, persists dismissal, and can be reopened by a storage event", () => {
    renderCallout();
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toContain("lastShownAt");

    act(() => {
      host.querySelector<HTMLButtonElement>('[aria-label="Fermer la présentation Feedback"]')!.click();
    });
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();

    act(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
      vi.runOnlyPendingTimers();
    });
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).not.toBeNull();
  });

  it("supports Compris and permanent disable actions", () => {
    renderCallout();
    act(() => {
      [...host.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent?.includes("Compris"))!
        .click();
    });
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    rerender({ pathname: "/actions/history?language=en" });
    act(() => {
      [...host.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent?.includes("Ne plus me le rappeler"))!
        .click();
    });
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").disabled).toBe(true);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ disabled: true }));
    rerender({ pathname: "/actions/history?language=en" });
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();
  });

  it("shows a reminder after the interval and hides it when the state is recent", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ firstShownAt: WEEK_AGO, lastShownAt: WEEK_AGO }),
    );
    renderCallout();
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).not.toBeNull();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ firstShownAt: new Date().toISOString(), lastShownAt: new Date().toISOString() }),
    );
    rerender({ pathname: "/actions/history?language=en" });
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();
  });

  it("does not show on blocked or ineligible surfaces", () => {
    renderCallout();
    for (const props of [
      { isAuthenticated: false },
      { isMenuOpen: true },
      { isPreferencesOpen: true },
      { pathname: "/onboarding" },
      { pathname: "/onboarding/localisation" },
      { pathname: "/sections/feedback" },
    ]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
      rerender(props);
      expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    document.body.appendChild(dialog);
    rerender({});
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();
    dialog.remove();

    const accountSurface = document.createElement("div");
    accountSurface.className = "cmm-account-setup-surface";
    document.body.appendChild(accountSurface);
    rerender({});
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();
    accountSurface.remove();

    const form = document.createElement("form");
    const input = document.createElement("input");
    form.appendChild(input);
    document.body.appendChild(form);
    input.focus();
    rerender({});
    expect(host.querySelector('[data-cmm-contextual-callout="feedback-discovery"]')).toBeNull();
  });
});
