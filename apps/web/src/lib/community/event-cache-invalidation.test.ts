import { describe, expect, it, vi } from "vitest";

const revalidateTagMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}));

import { revalidateCommunityEventCaches } from "./event-cache-invalidation";

describe("community event cache invalidation", () => {
  it("invalidates every shared event-derived cache after a mutation", () => {
    revalidateCommunityEventCaches();

    expect(revalidateTagMock).toHaveBeenCalledWith("community-events", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith(
      "report-community-events",
      "max",
    );
    expect(revalidateTagMock).toHaveBeenCalledWith(
      "route-recommendation-event-pressure",
      "max",
    );
    expect(revalidateTagMock).toHaveBeenCalledTimes(3);
  });
});
