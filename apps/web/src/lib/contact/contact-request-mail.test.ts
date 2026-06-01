import { describe, expect, it } from "vitest";
import { buildContactMailtoHref } from "./contact-request-mail";

describe("buildContactMailtoHref", () => {
  it("builds a prefilled mailto link for manual contact sending", () => {
    const href = buildContactMailtoHref({
      to: "contact@cleanmymap.fr",
      requestTypeLabel: "Droit à l'effacement",
      email: "alice@example.com",
      message: "Merci de supprimer mon compte.",
      dateLabel: "31/05/2026 11:30",
    });

    expect(href.startsWith("mailto:contact@cleanmymap.fr?subject=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Demande RGPD - Droit à l'effacement");
    expect(decodeURIComponent(href)).toContain("Email: alice@example.com");
    expect(decodeURIComponent(href)).toContain("Merci de supprimer mon compte.");
    expect(decodeURIComponent(href)).toContain("Date: 31/05/2026 11:30");
  });
});
