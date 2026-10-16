import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dashboardPropsMock = vi.hoisted(() => vi.fn());
const discussionPropsMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));
vi.mock("./feedback-section-dashboard", () => ({
  FeedbackSectionDashboard: (props: Record<string, unknown>) => {
    dashboardPropsMock(props);
    return <div data-testid="feedback-dashboard">{String(props.initialType)}</div>;
  },
}));
vi.mock("./feedback-section-discussion", () => ({
  FeedbackSectionDiscussion: (props: Record<string, unknown>) => {
    discussionPropsMock(props);
    return <div data-testid="feedback-discussion">discussion</div>;
  },
}));

import { FeedbackSection } from "./feedback-section";

type FakeLocation = {
  pathname: string;
  search: string;
  hash: string;
};

function installFakeWindow(location: FakeLocation) {
  const listeners = new Map<string, Set<EventListener>>();
  const fakeWindow = {
    location,
    addEventListener: (type: string, listener: EventListener) => {
      const current = listeners.get(type) ?? new Set<EventListener>();
      current.add(listener);
      listeners.set(type, current);
    },
    removeEventListener: (type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    },
  };

  vi.stubGlobal("window", fakeWindow);
  return () => {
    for (const listener of listeners.get("popstate") ?? []) {
      listener(new Event("popstate"));
    }
  };
}

function textOf(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

describe("FeedbackSection URL synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the visible questionnaire after browser back/forward URL changes", async () => {
    const location: FakeLocation = {
      pathname: "/sections/feedback",
      search: "?type=idea",
      hash: "#idea",
    };
    const dispatchPopState = installFakeWindow(location);
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <FeedbackSection
          pagePath="/sections/feedback"
          initialSearchParams={{ type: "idea" }}
        />,
      );
    });
    expect(textOf(renderer)).toContain("idea");

    location.search = "?type=bug";
    location.hash = "#bug";
    await act(async () => {
      dispatchPopState();
    });
    expect(textOf(renderer)).toContain("bug");

    location.search = "?type=collaboration";
    location.hash = "#collaboration";
    await act(async () => {
      dispatchPopState();
    });
    expect(textOf(renderer)).toContain("collaboration");
  });

  it("keeps prefill and provenance when a browser navigation selects a bug", async () => {
    const location: FakeLocation = {
      pathname: "/sections/feedback",
      search: "?type=idea",
      hash: "#idea",
    };
    const dispatchPopState = installFakeWindow(location);
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <FeedbackSection
          pagePath="/sections/feedback"
          initialSearchParams={{ type: "idea" }}
        />,
      );
    });

    location.search =
      "?subject=Carte%20bloqu%C3%A9e&context=Mobile&steps=Ouvrir&expected=Afficher&source=feedback_discussion";
    location.hash = "#bug";
    await act(async () => {
      dispatchPopState();
    });

    expect(textOf(renderer)).toContain("bug");
    expect(dashboardPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: "feedback_discussion",
        supportPrefill: {
          subject: "Carte bloquée",
          context: "Mobile",
          steps: "Ouvrir",
          expected: "Afficher",
        },
      }),
    );
  });
});
