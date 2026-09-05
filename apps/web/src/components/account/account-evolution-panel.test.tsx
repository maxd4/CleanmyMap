import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountEvolutionPanel, type AccountEvolutionRequest } from "./account-evolution-panel";

vi.mock("@/components/ui/family-rubrique-card", () => ({
  FamilyRubriqueCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));
vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, href }: { children: React.ReactNode; href?: string }) =>
    href ? <a href={href}>{children}</a> : <button>{children}</button>,
}));
vi.mock("@/components/sections/rubriques/promotion-request-form", () => ({
  PromotionRequestForm: () => <div data-testid="promotion-form">FORMULAIRE</div>,
}));

const request = (status: AccountEvolutionRequest["status"]): AccountEvolutionRequest => ({
  createdAt: "2026-09-04T10:00:00.000Z",
  requestedRole: "admin",
  status,
  reviewedAt: status === "pending_owner_review" ? null : "2026-09-05T10:00:00.000Z",
});

function renderPanel(latestRequest: AccountEvolutionRequest | null, currentRole: "benevole" | "elu" | "admin" | "max" = "benevole") {
  return renderToStaticMarkup(
    <AccountEvolutionPanel
      currentRole={currentRole}
      activeProfile={currentRole}
      initialRequest={latestRequest}
      initialStatusAvailable={true}
    />,
  );
}

describe("AccountEvolutionPanel", () => {
  it("replaces the form while a request is pending", () => {
    const markup = renderPanel(request("pending_owner_review"));
    expect(markup).toContain("Demande en cours d’examen");
    expect(markup).not.toContain("data-testid=\"promotion-form\"");
  });

  it.each(["accepted", "rejected"] as const)("renders the %s state", (status) => {
    const markup = renderPanel(request(status));
    expect(markup).toContain(status === "accepted" ? "Demande acceptée" : "Demande refusée");
    expect(markup).toContain("Rôle demandé");
    if (status === "accepted") {
      expect(markup).not.toContain("data-testid=\"promotion-form\"");
    }
  });

  it("does not render a promotion form for admin or max", () => {
    expect(renderPanel(null, "admin")).not.toContain("data-testid=\"promotion-form\"");
    expect(renderPanel(null, "max")).not.toContain("data-testid=\"promotion-form\"");
  });

  it("keeps role-guide CTAs on the canonical route and omits IMU promotion", () => {
    const markup = renderPanel(null, "benevole");

    expect(markup.match(/href="\/compte\/evolution"/g)).toHaveLength(2);
    expect(markup).not.toContain("href=\"/imu");
  });
});
