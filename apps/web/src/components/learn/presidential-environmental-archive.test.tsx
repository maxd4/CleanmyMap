/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

import { PresidentialEnvironmentalArchive } from "./presidential-environmental-archive";

describe("PresidentialEnvironmentalArchive", () => {
  it("shows both official rosters and their source origin without leaking unreviewed measures", () => {
    const markup = renderToStaticMarkup(<PresidentialEnvironmentalArchive />);

    expect(markup).toContain("Archives présidentielles");
    expect(markup).toContain("2012");
    expect(markup).toContain("2017");
    expect(markup).toContain("2022");
    expect(markup).toContain("2027");
    expect(markup).toContain("Source de la liste officielle");
    expect(markup).toContain("Ministère de l’Intérieur");
    expect(markup).toContain("Filtrer les engagements par candidat");
    expect(markup).toContain("Filtrer par niveau de documentation");
    expect(markup).toContain("Par thème");
    expect(markup).toContain("Par candidature");
    expect(markup).toContain("Corpus non encore collecté");
    expect(markup).toContain("Aucun engagement validé n’est affiché");
    expect(markup).toContain("ne signifie pas l’absence de position");
    expect(markup).not.toContain("Porter la part du nucléaire à 50 % en 2025");
    expect(markup).not.toContain("100 % d’énergies renouvelables dès que possible");
  });

  it("keeps 2027 empty and explicitly preparatory", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PresidentialEnvironmentalArchive />);
    });
    const yearButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "2027");
    expect(yearButton).toBeDefined();

    await act(async () => {
      yearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Présidentielle 2027 : dossier en préparation");
    expect(container.textContent).toContain("0 candidats recensés");
    expect(container.textContent).toContain("Aucun engagement validé n’est affiché pour ce millésime.");
    root.unmount();
    container.remove();
  });
});
