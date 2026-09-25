import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "en" }),
}));

import { LearnLocalizedHeading } from "./learn-localized-heading";

describe("LearnLocalizedHeading", () => {
  it("renders the selected locale while keeping one SSR heading", () => {
    const markup = renderToStaticMarkup(
      <LearnLocalizedHeading fr="Bonnes pratiques" en="Good practices" />,
    );

    expect(markup).toContain("Good practices");
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
  });
});
