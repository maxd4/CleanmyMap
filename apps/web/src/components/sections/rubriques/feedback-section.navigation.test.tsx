import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useUserMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({ useUser: useUserMock }));
vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));
vi.mock("@/components/ui/cmm-card", () => ({
  CmmCard: ({ header, children }: { header: ReactNode; children: ReactNode }) => (
    <div>
      {header}
      {children}
    </div>
  ),
}));
vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("./feedback/feedback-history", () => ({
  FeedbackHistory: () => <div data-testid="feedback-history" />,
}));
vi.mock("./feedback-section-dashboard-guidance", () => ({
  FeedbackSectionDashboardGuidance: () => <div data-testid="feedback-guidance" />,
}));
vi.mock("./feedback-section-discussion", () => ({
  FeedbackSectionDiscussion: () => <div data-testid="feedback-discussion" />,
}));

import { FeedbackSection } from "./feedback-section";

type FakeLocation = {
  pathname: string;
  search: string;
  hash: string;
};

function installFakeWindow(location: FakeLocation) {
  const listeners = new Map<string, Set<EventListener>>();
  const browserLocation = {
    get pathname() {
      return location.pathname;
    },
    get search() {
      return location.search;
    },
    get hash() {
      return location.hash;
    },
    get href() {
      return `https://cleanmymap.test${location.pathname}${location.search}${location.hash}`;
    },
  };
  const fakeWindow = {
    location: browserLocation,
    history: {
      replaceState: (_state: unknown, _title: string, nextUrl: string) => {
        const next = new URL(nextUrl, "https://cleanmymap.test");
        location.pathname = next.pathname;
        location.search = next.search;
        location.hash = next.hash;
      },
    },
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

function selectedFeedbackType(renderer: ReactTestRenderer): string {
  const selected = renderer.root.findAll(
    (node) =>
      node.type === "button" &&
      typeof node.props["data-feedback-type"] === "string" &&
      node.props["aria-pressed"] === true,
  );
  expect(selected).toHaveLength(1);
  return selected[0].props["data-feedback-type"] as string;
}

function textareaValues(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType("textarea")
    .map((textarea) => String(textarea.props.value ?? ""));
}

describe("FeedbackSection URL synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "feedback-test-user" },
    });
  });

  it("updates the real questionnaire after a popstate and preserves bug prefill and provenance", async () => {
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
    expect(selectedFeedbackType(renderer)).toBe("idea");
    expect(textOf(renderer)).toContain("Décrivez simplement ce que vous aimeriez voir.");

    location.search =
      "?type=bug&subject=Carte%20bloqu%C3%A9e&context=Mobile&steps=Ouvrir&expected=Afficher&source=feedback_discussion";
    location.hash = "#bug";
    await act(async () => {
      dispatchPopState();
    });

    expect(selectedFeedbackType(renderer)).toBe("bug");
    expect(textOf(renderer)).toContain("Qu'est-ce qui s'est produit ?");
    expect(textareaValues(renderer)).toEqual([
      "Carte bloquée",
      "Mobile",
      "Ouvrir",
      "Afficher",
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ requestId: "feedback-bug-1" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const bugValues = [
      "Carte bloquée",
      "Mobile",
      "Ouvrir la carte depuis le menu mobile",
      "Afficher la carte normalement",
    ];
    for (const [index, value] of bugValues.entries()) {
      await act(async () => {
        renderer.root.findAllByType("textarea")[index].props.onChange({
          target: { value },
        });
      });
    }
    await act(async () => {
      renderer.root.findByType("form").props.onSubmit({
        preventDefault: vi.fn(),
      });
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      reportType: "bug",
      source: "feedback_discussion",
    });
  });

  it("keeps URL, aria-pressed and the real questionnaire aligned through manual and history navigation", async () => {
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

    const bugButton = renderer.root.findByProps({ "data-feedback-type": "bug" });
    await act(async () => {
      bugButton.props.onClick();
    });
    expect(location.search).toBe("?type=bug");
    expect(location.hash).toBe("#bug");
    expect(selectedFeedbackType(renderer)).toBe("bug");
    expect(textOf(renderer)).toContain("Qu'auriez-vous dû observer ?");

    location.search = "";
    location.hash = "#collaboration";
    await act(async () => {
      dispatchPopState();
    });
    expect(selectedFeedbackType(renderer)).toBe("collaboration");
    expect(textOf(renderer)).toContain("Objet de la collaboration");

    location.search = "?type=idea";
    location.hash = "#idea";
    await act(async () => {
      dispatchPopState();
    });
    expect(selectedFeedbackType(renderer)).toBe("idea");
    expect(textOf(renderer)).toContain("Bénéfice attendu");
  });

  it("does not reset a draft when navigation changes only the source", async () => {
    const location: FakeLocation = {
      pathname: "/sections/feedback",
      search: "?type=bug&subject=Initial&context=Mobile&steps=Ouvrir&expected=Afficher",
      hash: "#bug",
    };
    const dispatchPopState = installFakeWindow(location);
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <FeedbackSection
          pagePath="/sections/feedback"
          initialSearchParams={{
            type: "bug",
            subject: "Initial",
            context: "Mobile",
            steps: "Ouvrir",
            expected: "Afficher",
          }}
        />,
      );
    });

    const subject = renderer.root.findAllByType("textarea")[0];
    await act(async () => {
      subject.props.onChange({ target: { value: "Brouillon local" } });
    });
    expect(textareaValues(renderer)[0]).toBe("Brouillon local");

    location.search =
      "?type=bug&subject=Initial&context=Mobile&steps=Ouvrir&expected=Afficher&source=feedback_discussion";
    await act(async () => {
      dispatchPopState();
    });
    expect(selectedFeedbackType(renderer)).toBe("bug");
    expect(textareaValues(renderer)[0]).toBe("Brouillon local");
  });
});
