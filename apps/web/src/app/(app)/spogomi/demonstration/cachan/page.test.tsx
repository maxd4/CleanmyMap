import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("lucide-react", () => ({ ArrowLeft: () => null }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, href, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", { ...props, href }, children) }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => React.createElement("header", null, title, subtitle) }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => "spogomi" }));

import SpogomiCachanDemonstrationPage from "./page";

describe("public SPOGOMI Cachan demonstration", () => {
  it("renders the canonical two-division, eleven-team scenario as non-official read-only content", () => {
    const markup = renderToStaticMarkup(<SpogomiCachanDemonstrationPage />);

    expect(markup).toContain("DEMONSTRATION / NON OFFICIEL");
    expect(markup).toContain("Démonstration fictive, données synthétiques, règlement non officiel");
    expect(markup).toContain("DIV-WORLD-CUP");
    expect(markup).toContain("DIV-CASUAL");
    for (const teamRef of ["WC-01", "WC-02", "WC-03", "WC-04", "WC-05", "WC-06", "CAS-01", "CAS-02", "CAS-03", "CAS-04", "CAS-05"]) {
      expect(markup).toContain(teamRef);
    }
    expect(markup).toContain("aucune valeur publiée");
    expect(markup).toContain("Elle ne crée aucune édition");
    expect(markup).not.toContain("Classement officiel");
  });
});
