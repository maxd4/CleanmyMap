import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommunitySubscriptionsSetting } from "./community-subscriptions-setting";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => vi.unstubAllGlobals());

describe("CommunitySubscriptionsSetting", () => {
  it("exposes the initial network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<CommunitySubscriptionsSetting locale="fr" />);
      await settle();
    });

    expect(renderer.root.findAll((node) => node.props?.role === "alert")).not.toHaveLength(0);
    renderer.unmount();
  });
});
