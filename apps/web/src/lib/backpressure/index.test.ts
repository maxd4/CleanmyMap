import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireBackpressure, releaseBackpressure } from "./index";

describe("backpressure queue behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("allows configured concurrency and then queues work with a bounded retry", () => {
    expect(acquireBackpressure("import", "import-1")).toEqual({ allowed: true });
    expect(acquireBackpressure("import", "import-2")).toEqual({ allowed: true });
    expect(acquireBackpressure("import", "import-3")).toMatchObject({
      allowed: false,
      position: 1,
      retryAfter: 5,
    });
    releaseBackpressure("import");
    releaseBackpressure("import");
    releaseBackpressure("import");
  });

  it("rejects a full import queue and delays a full batch queue", () => {
    for (let index = 0; index < 2; index += 1) {
      acquireBackpressure("import", `import-active-${index}`);
    }
    for (let index = 0; index < 10; index += 1) {
      expect(acquireBackpressure("import", `import-queued-${index}`).allowed).toBe(false);
    }
    expect(acquireBackpressure("import", "import-overflow")).toMatchObject({
      allowed: false,
      retryAfter: 30,
      reason: expect.stringContaining("10 operations already queued"),
    });

    for (let index = 0; index < 5; index += 1) {
      acquireBackpressure("batch", `batch-active-${index}`);
    }
    for (let index = 0; index < 20; index += 1) {
      acquireBackpressure("batch", `batch-queued-${index}`);
    }
    expect(acquireBackpressure("batch", "batch-overflow")).toMatchObject({
      allowed: false,
      retryAfter: 25,
      reason: expect.stringContaining("Estimated wait: 25 seconds"),
    });
    for (let index = 0; index < 5; index += 1) {
      releaseBackpressure("batch");
    }
    vi.runAllTimers();
  });

  it("uses the default policy and drains queued operations after release", () => {
    for (let index = 0; index < 10; index += 1) {
      expect(acquireBackpressure("other", `other-active-${index}`).allowed).toBe(true);
    }
    expect(acquireBackpressure("other", "other-queued")).toMatchObject({ allowed: false, position: 1 });
    releaseBackpressure("other");
    vi.advanceTimersByTime(100);
    expect(acquireBackpressure("other", "other-after-release")).toEqual({ allowed: true });
    for (let index = 0; index < 10; index += 1) {
      releaseBackpressure("other");
    }
    vi.runAllTimers();
  });
});
