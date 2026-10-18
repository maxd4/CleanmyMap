import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReportsFiles } from "./reports-files";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ReportsFiles", () => {
  it("renders paginated metadata and historical actions without a generation control", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsFiles, {
        initialPage: {
          rows: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              report: "Rapport Paris",
              period: "Six mois",
              perimeter: "Global",
              detail: "Par défaut",
              generatedAt: "27/08/2026 12:30",
              theme: "scientific",
            },
          ],
          page: 2,
          pageSize: 12,
          total: 25,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      }),
    );

    expect(markup).toContain('data-testid="reports-files"');
    expect(markup).toContain("Rapport Paris");
    expect(markup).toContain("Scientifique");
    expect(markup).toContain("Reprendre la configuration");
    expect(markup).toContain("25 fichiers · Page 2");
    expect(markup).toContain("Rechercher par titre");
    expect(markup).not.toContain("Générer le rapport");
  });
});
