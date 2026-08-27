import { describe, expect, it, vi } from "vitest";
import {
  ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
  dispatchActionPollutionScoreReferencesInvalidated,
} from "./pollution-score-references-events";

describe("pollution score references events", () => {
  it("dispatches the invalidation event in browser contexts", () => {
    const dispatchEvent = vi.fn();
    const globalWindow = globalThis as typeof globalThis & {
      window?: Window & { dispatchEvent: typeof dispatchEvent };
    };
    const originalWindow = globalWindow.window;
    Object.defineProperty(globalWindow, "window", {
      configurable: true,
      value: { dispatchEvent },
    });

    dispatchActionPollutionScoreReferencesInvalidated();

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0]).toBeInstanceOf(Event);
    expect(dispatchEvent.mock.calls[0]?.[0].type).toBe(
      ACTION_POLLUTION_SCORE_REFERENCES_INVALIDATED_EVENT,
    );

    if (originalWindow) {
      Object.defineProperty(globalWindow, "window", {
        configurable: true,
        value: originalWindow,
      });
    } else {
      Reflect.deleteProperty(globalWindow, "window");
    }
  });
});
