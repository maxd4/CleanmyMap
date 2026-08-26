import { describe, expect, it } from "vitest";
import {
  CHAT_POLL_MAX_OPTIONS,
  CHAT_POLL_MIN_OPTIONS,
  getChatPollOptionsValidationError,
  normalizeChatPollOptionLabels,
} from "./polls";

describe("chat poll option contract", () => {
  it("accepts two to six distinct non-empty labels", () => {
    expect(getChatPollOptionsValidationError(["Oui", "Non"])).toBeNull();
    expect(
      getChatPollOptionsValidationError(
        Array.from({ length: CHAT_POLL_MAX_OPTIONS }, (_, index) => `Option ${index + 1}`),
      ),
    ).toBeNull();
  });

  it.each([
    [Array.from({ length: CHAT_POLL_MIN_OPTIONS - 1 }, () => "Option"), "minimum"],
    [Array.from({ length: CHAT_POLL_MAX_OPTIONS + 1 }, (_, index) => `Option ${index}`), "maximum"],
    [["Oui", " oui "], "duplicates"],
    [["Oui", "   "], "empty labels"],
  ])("rejects %s", (labels) => {
    expect(getChatPollOptionsValidationError(labels)).toBeTypeOf("string");
  });

  it("trims labels before persistence", () => {
    expect(normalizeChatPollOptionLabels([" Oui ", "Non"])).toEqual(["Oui", "Non"]);
  });
});
