/** @vitest-environment jsdom */

import { createElement, type ReactNode } from "react";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type {
  SpogomiEventJourney,
  SpogomiJourneyStep,
} from "@/lib/spogomi/event-journey";
import { SpogomiEventPathChooser } from "./spogomi-event-path-chooser";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { ...props, href }, children),
}));

(globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;

function step(
  key: SpogomiJourneyStep["key"],
  status: SpogomiJourneyStep["status"],
  href: string | null = `#${key}`,
): SpogomiJourneyStep {
  return {
    key,
    title: key === "registration" ? "Demander son inscription sportive" : key,
    description: `Description ${key}`,
    status,
    href,
  };
}

function journey(
  next: SpogomiJourneyStep,
  steps: readonly SpogomiJourneyStep[],
  authorizedSpaces: SpogomiEventJourney["authorizedSpaces"] = [],
  accessResolution: SpogomiEventJourney["accessResolution"] = "known",
): SpogomiEventJourney {
  return { next, steps, authorizedSpaces, accessResolution };
}

const upcomingJourney = journey(
  step("quiz", "todo", "#quiz"),
  [
    step("quiz", "todo", "#quiz"),
    step("registration", "todo", "#registration"),
    step("practical", "todo", "#practical"),
  ],
);

function renderChooser(
  currentJourney: SpogomiEventJourney = upcomingJourney,
  props: Partial<React.ComponentProps<typeof SpogomiEventPathChooser>> = {},
) {
  return renderToStaticMarkup(
    <SpogomiEventPathChooser
      eventSlug="paris-2026"
      isAuthenticated
      divisionTypes={["casual", "world_cup"]}
      selectedDivisionType="world_cup"
      journey={currentJourney}
      {...props}
    />,
  );
}

describe("SpogomiEventPathChooser", () => {
  it("renders an accessible path choice and public mixed-division selector", () => {
    const markup = renderChooser();

    expect(markup).toContain('role="tablist"');
    expect(markup.match(/role="tab"/g)).toHaveLength(3);
    expect(markup).toContain("Choisir la division");
    expect(markup).toContain("division Casual");
    expect(markup).toContain("division World Cup");
    expect(markup).toContain("/spogomi/paris-2026?division=casual");
    expect(markup).toContain("/spogomi/paris-2026?division=world_cup");
    expect(markup).toContain("#quiz");
    expect(markup).toContain("#registration");
    expect(markup.match(/data-cmm-card-tone=/g)).toHaveLength(1);
    expect(markup).not.toContain("Votre prochaine étape");
  });

  it("removes the quiz during the competition and keeps presence regularization", () => {
    const markup = renderChooser(
      journey(
        step("registration", "todo", "#registration"),
        [
          step("quiz", "later", null),
          step("registration", "todo", "#registration"),
        ],
      ),
    );

    expect(markup).not.toContain("Valider le quiz obligatoire");
    expect(markup).toContain("Demander son inscription sportive");
    expect(markup).toContain("#registration");
  });

  it("hides registration after closure and prioritizes available public outcomes", () => {
    const markup = renderChooser(
      journey(
        step("results", "todo", "#results"),
        [
          step("quiz", "later", null),
          step("registration", "later", "#registration"),
          step("results", "todo", "#results"),
          step("contributions", "todo", "#contributions"),
          step("attestations", "todo", "#attestations"),
        ],
      ),
    );

    expect(markup).toContain("#results");
    expect(markup).toContain("#contributions");
    expect(markup).toContain("#attestations");
    expect(markup).not.toContain("Demander son inscription sportive");
    expect(markup).not.toContain("Valider le quiz obligatoire");
  });

  it("shows the pending admission instead of offering another registration", () => {
    const markup = renderChooser(
      journey(
        step("admission", "pending", "#admission"),
        [
          step("quiz", "validated"),
          step("registration", "pending", "#registration"),
          step("admission", "pending", "#admission"),
        ],
      ),
    );

    expect(markup).toContain("#admission");
    expect(markup).not.toContain("Demander son inscription sportive");
  });

  it("keeps Clerk registration intent and division for an anonymous visitor", () => {
    const markup = renderChooser(
      journey(
        step(
          "quiz",
          "access_required",
          "/sign-in?redirect_url=%2Fspogomi%2Fparis-2026%3Ffocus%3Dquiz%26division%3Dworld_cup",
        ),
        [
          step(
            "quiz",
            "access_required",
            "/sign-in?redirect_url=%2Fspogomi%2Fparis-2026%3Ffocus%3Dquiz%26division%3Dworld_cup",
          ),
          step(
            "registration",
            "access_required",
            "/sign-in?redirect_url=%2Fspogomi%2Fparis-2026%3Ffocus%3Dregistration%26division%3Dworld_cup",
          ),
        ],
      ),
      { isAuthenticated: false },
    );

    expect(markup).toContain("focus%3Dquiz");
    expect(markup).toContain("division%3Dworld_cup");
    expect(markup).not.toContain("focus%3Dregistration");
  });

  it("reveals only server-provided authorized spaces when their tabs are selected", () => {
    const container = document.createElement("div");
    let root!: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        <SpogomiEventPathChooser
          eventSlug="paris-2026"
          isAuthenticated
          journey={journey(upcomingJourney.next, upcomingJourney.steps, [
            {
              key: "referee",
              title: "Opérations autorisées",
              description: "Capacité terrain",
              href: "/spogomi/paris-2026/espace#operations",
            },
            {
              key: "organizer",
              title: "Cockpit",
              description: "Gestion",
              href: "/spogomi/paris-2026/espace#settings",
            },
          ])}
        />,
      );
    });
    const tabs = () => container.querySelectorAll<HTMLElement>('[role="tab"]');

    expect(container.innerHTML).not.toContain("espace#");
    act(() => tabs()[1].dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.innerHTML).toContain("espace#operations");
    expect(container.innerHTML).not.toContain("espace#settings");
    act(() => tabs()[2].dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.innerHTML).toContain("espace#settings");
    expect(tabs()[2].getAttribute("aria-selected")).toBe("true");
    act(() => root.unmount());
  });

  it("renders an authenticated empty projection as a non-interactive denial", () => {
    const container = document.createElement("div");
    act(() => {
      createRoot(container).render(<SpogomiEventPathChooser eventSlug="paris-2026" isAuthenticated journey={journey(upcomingJourney.next, upcomingJourney.steps, [], "known")} />);
    });
    act(() => container.querySelectorAll<HTMLElement>('[role="tab"]')[1].click());
    const markup = container.innerHTML;

    expect(markup).toContain("Accès non autorisé");
    expect(markup).toContain("Aucune habilitation active pour cette édition.");
    expect(markup).not.toContain('href="/spogomi/paris-2026/espace');
  });

  it("keeps an authorization read failure distinct from an explicit denial", () => {
    const container = document.createElement("div");
    act(() => {
      createRoot(container).render(<SpogomiEventPathChooser eventSlug="paris-2026" isAuthenticated journey={journey(upcomingJourney.next, upcomingJourney.steps, [], "unknown")} />);
    });
    act(() => container.querySelectorAll<HTMLElement>('[role="tab"]')[1].click());
    const markup = container.innerHTML;

    expect(markup).toContain("Vérification indisponible");
    expect(markup).not.toContain("Accès non autorisé");
    expect(markup).not.toContain('href="/spogomi/paris-2026/espace');
  });
});
