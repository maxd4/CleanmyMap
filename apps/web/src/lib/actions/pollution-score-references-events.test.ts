import { describe, expect, it, vi } from "vitest";
import {
  ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
  dispatchActionPollutionScoreReferencesInvalidated,
} from "./pollution-score-references-events";

describe("pollution score references events", () => {
  it("dispatches the invalidation event in browser contexts", () => {
    const dispatchEvent = vi.fn();
    const originalWindow = globalThis.window;
    (globalThis as typeof globalThis & { window?: { dispatchEvent: typeof dispatchEvent } }).window = {
      dispatchEvent,
    };

    dispatchActionPollutionScoreReferencesInvalidated();

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0]).toBeInstanceOf(Event);
    expect(dispatchEvent.mock.calls[0]?.[0].type).toBe(
      ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
    );

    if (originalWindow) {
      (globalThis as typeof globalThis & { window?: typeof originalWindow }).window =
        originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  });
});
