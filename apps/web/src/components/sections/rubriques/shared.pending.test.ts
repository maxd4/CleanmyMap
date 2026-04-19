import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { PendingSection } from "./shared";

describe("PendingSection", () => {
  it("renders section purpose text even when implementation is pending", () => {
    const html = renderToStaticMarkup(
      createElement(
        SitePreferencesProvider,
        null,
        createElement(PendingSection, {
          label: { fr: "Rubrique test", en: "Test section" },
          description: {
            fr: "Expliquer la finalite de la rubrique.",
            en: "Explain section purpose.",
          },
          note: { fr: "Contenu en cours", en: "Content in progress" },
        }),
      ),
    );

    expect(html).toContain("But de la rubrique");
    expect(html).toContain("Expliquer la finalite de la rubrique.");
    expect(html).toContain("Contenu en cours");
  });
});
