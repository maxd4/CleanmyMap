import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/sections/rubriques/community/helpers", () => ({
  formatFrDate: () => "19/10/2026",
}));

import { CommunityPostEventLoopCard } from "./post-event-loop-card";

describe("CommunityPostEventLoopCard", () => {
  it("keeps a partial corpus distinct from a complete 100 percent rate", () => {
    const markup = renderToStaticMarkup(
      <CommunityPostEventLoopCard
        postEventLoop={{
          rows: [],
          closedCount: 0,
          total: 0,
          completionRate: null,
          missing: [],
        }}
      />,
    );

    expect(markup).toContain("Inconnu (couverture partielle)");
    expect(markup).toContain("Aucune boucle incomplète parmi les événements lus");
    expect(markup).not.toContain("100.0%");
  });
});
