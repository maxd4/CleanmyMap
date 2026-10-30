import { describe, expect, it } from "vitest";
import {
  ACTION_NEED_DESCRIPTION_MAX_LENGTH,
  ACTION_NEED_DESCRIPTION_MIN_LENGTH,
  ACTION_NEED_QUANTITY_LABEL_MAX_LENGTH,
  ACTION_NEED_STATUSES,
  ACTION_NEED_TITLE_MAX_LENGTH,
  ACTION_NEED_TITLE_MIN_LENGTH,
  COMMUNITY_HELP_CATEGORIES,
  getActionNeedEffectiveStatus,
} from "./action-needs";

describe("action needs canonical contract", () => {
  it("keeps exactly the eight community help categories", () => {
    expect(COMMUNITY_HELP_CATEGORIES).toEqual([
      "materiel",
      "transport",
      "renfort_benevole",
      "communication",
      "photo_video",
      "cartographie",
      "expertise",
      "logistique",
    ]);
    expect(new Set(COMMUNITY_HELP_CATEGORIES).size).toBe(8);
  });

  it("keeps persisted statuses closed and text limits canonical", () => {
    expect(ACTION_NEED_STATUSES).toEqual(["open", "fulfilled", "cancelled"]);
    expect(ACTION_NEED_TITLE_MIN_LENGTH).toBe(3);
    expect(ACTION_NEED_TITLE_MAX_LENGTH).toBe(80);
    expect(ACTION_NEED_DESCRIPTION_MIN_LENGTH).toBe(1);
    expect(ACTION_NEED_DESCRIPTION_MAX_LENGTH).toBe(500);
    expect(ACTION_NEED_QUANTITY_LABEL_MAX_LENGTH).toBe(80);
  });

  it("derives expiration without persisting an expired status", () => {
    const need = { status: "open" as const, expires_at: "2026-10-30T08:00:00.000Z" };
    expect(getActionNeedEffectiveStatus(need, new Date("2026-10-30T08:00:01.000Z"))).toBe("expired");
    expect(getActionNeedEffectiveStatus(need, new Date("2026-10-30T08:00:00.000Z"))).toBe("open");
    expect(getActionNeedEffectiveStatus({ status: "fulfilled", expires_at: "2020-01-01T00:00:00.000Z" }, new Date("2026-10-30T08:00:00.000Z"))).toBe("fulfilled");
  });
});
