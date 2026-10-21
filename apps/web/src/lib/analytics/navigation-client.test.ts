import { beforeEach, describe, expect, it, vi } from "vitest";

const initPostHogClientMock = vi.hoisted(() => vi.fn());
const captureMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/posthog/client", () => ({
  initPostHogClient: initPostHogClientMock,
}));

import { trackNavigationClick, trackRoleCtaClick } from "./navigation-client";

describe("navigation analytics client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initPostHogClientMock.mockResolvedValue({ capture: captureMock });
  });

  it("sends normalized URLs and preserves safe navigation categories", async () => {
    trackNavigationClick({
      profile: "benevole",
      spaceId: "private-space-id",
      href: "/actions/invite/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde?token=private",
      label: "Inviter",
    });
    trackRoleCtaClick({
      profile: "benevole",
      ctaType: "primary",
      href: "/actions/new",
      label: "Déclarer",
    });

    await vi.waitFor(() => expect(captureMock).toHaveBeenCalledTimes(2));

    expect(captureMock).toHaveBeenNthCalledWith(
      1,
      "cmm_navigation_click",
      {
        profile: "benevole",
        href: "/actions/invite",
        label: "Inviter",
      },
    );
    expect(captureMock).toHaveBeenNthCalledWith(
      2,
      "cmm_role_cta_click",
      {
        profile: "benevole",
        ctaType: "primary",
        href: "/actions/new",
        label: "Déclarer",
      },
    );
  });
});
