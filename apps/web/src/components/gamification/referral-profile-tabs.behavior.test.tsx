// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/gamification/referral-invite-badge", () => ({
  ReferralInviteBadge: () => <div data-testid="referral-invite-badge" />,
}));

vi.mock("@/components/gamification/referral-lineage-panel", () => ({
  ReferralLineagePanel: ({
    view,
    emptyCtaLabel,
  }: {
    view: { totalDirectCount: number } | null;
    emptyCtaLabel: string;
  }) => (
    <div data-testid="referral-lineage-panel">
      {view ? `lineage:${view.totalDirectCount}` : emptyCtaLabel}
    </div>
  ),
}));

import { ReferralProfileTabs } from "./referral-profile-tabs";

describe("ReferralProfileTabs", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("keeps lineage tree accessible when referral summary is null", async () => {
    await act(async () => {
      root.render(
        <ReferralProfileTabs
          summary={null}
          lineageView={{
            rootCode: "CMM-123",
            totalDirectCount: 2,
            activeDirectCount: 1,
            indirectCount: 0,
            directReferrals: [],
          } as never}
          emptyCtaHref="/profil/benevole?tab=referrals"
          locale="fr"
        />,
      );
    });

    expect(container.textContent).toContain("Badge de parrainage momentanément indisponible.");
    expect(container.textContent).toContain("Réessayer");

    const treeBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Arbre"),
    );
    expect(treeBtn).toBeTruthy();

    await act(async () => {
      treeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="referral-lineage-panel"]')?.textContent).toContain(
      "lineage:2",
    );
  });
});
