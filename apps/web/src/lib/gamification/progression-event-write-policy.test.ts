import { describe, expect, it, vi } from "vitest";
import {
  classifyProgressionEventWriteError,
  shouldIgnoreProgressionEventWriteError,
  shouldRetryProgressionEventWriteError,
  writeProgressionEventWithPolicy,
} from "./progression-event-write-policy";

describe("progression event write policy", () => {
  it("classifies duplicates, retryable and blocking errors", () => {
    expect(classifyProgressionEventWriteError({ code: "23505" })).toBe("duplicate");
    expect(classifyProgressionEventWriteError({ code: "40001" })).toBe("retryable");
    expect(classifyProgressionEventWriteError({ code: "ECONNRESET" })).toBe("retryable");
    expect(classifyProgressionEventWriteError({ code: "42501" })).toBe("blocking");
    expect(shouldRetryProgressionEventWriteError({ code: "40P01" })).toBe(true);
    expect(shouldIgnoreProgressionEventWriteError({ code: "23505" })).toBe(true);
  });

  it("retries transient errors before succeeding", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const operation = vi
      .fn()
      .mockResolvedValueOnce({ error: { code: "40001", message: "serialization failure" } })
      .mockResolvedValueOnce({ error: undefined });

    const result = await writeProgressionEventWithPolicy(operation, {
      sleep,
      retryDelaysMs: [0, 0, 0],
    });

    expect(result).toMatchObject({
      inserted: true,
      duplicate: false,
      attempts: 2,
    });
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("returns duplicate without throwing", async () => {
    const operation = vi.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    const result = await writeProgressionEventWithPolicy(operation, {
      retryDelaysMs: [0, 0, 0],
    });

    expect(result).toMatchObject({
      inserted: false,
      duplicate: true,
      attempts: 1,
    });
  });

  it("downgrades blocking errors to a logged best-effort failure when requested", async () => {
    const operation = vi.fn().mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    const logger = vi.fn();

    const result = await writeProgressionEventWithPolicy(operation, {
      mode: "best_effort",
      retryDelaysMs: [0, 0, 0],
      logger,
    });

    expect(result).toMatchObject({
      inserted: false,
      duplicate: false,
      attempts: 1,
      classification: "blocking",
    });
    expect(logger).toHaveBeenCalledTimes(1);
  });
});
