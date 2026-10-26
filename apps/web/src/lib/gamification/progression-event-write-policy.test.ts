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

  it("classifies message-only transient errors and unknown error shapes conservatively", () => {
    expect(classifyProgressionEventWriteError("connection reset by peer")).toBe("retryable");
    expect(classifyProgressionEventWriteError({ message: "temporary outage" })).toBe("retryable");
    expect(classifyProgressionEventWriteError({ message: "too many connections" })).toBe("retryable");
    expect(classifyProgressionEventWriteError(null)).toBe("blocking");
    expect(classifyProgressionEventWriteError({ code: "  " })).toBe("blocking");
    expect(shouldRetryProgressionEventWriteError({ code: "42501" })).toBe(false);
    expect(shouldIgnoreProgressionEventWriteError({ code: "40001" })).toBe(false);
  });

  it("waits for a positive retry delay and falls back to the last configured delay", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const operation = vi.fn()
      .mockResolvedValueOnce({ error: { code: "ETIMEDOUT" } })
      .mockResolvedValueOnce({ error: { code: "ETIMEDOUT" } })
      .mockResolvedValueOnce({ data: "ok" });

    await expect(writeProgressionEventWithPolicy(operation, {
      sleep,
      retryDelaysMs: [7],
      maxAttempts: 3,
    })).resolves.toMatchObject({ inserted: true, attempts: 3 });
    expect(sleep).toHaveBeenNthCalledWith(1, 7);
    expect(sleep).toHaveBeenNthCalledWith(2, 7);
  });

  it("throws in strict mode after retries and returns a bounded best-effort result", async () => {
    const operation = vi.fn().mockResolvedValue({ error: { code: "40001", message: "retry" } });
    const logger = vi.fn();
    await expect(writeProgressionEventWithPolicy(operation, {
      maxAttempts: 2,
      retryDelaysMs: [0],
      logger,
    })).rejects.toThrow("[object Object]");

    const bestEffort = await writeProgressionEventWithPolicy(operation, {
      mode: "best_effort",
      maxAttempts: 2,
      retryDelaysMs: [0],
      logger,
    });
    expect(bestEffort).toMatchObject({ attempts: 2, classification: "retryable", inserted: false });
    expect(logger).toHaveBeenCalled();
  });

  it("treats a successful non-error-like result as an inserted event", async () => {
    await expect(writeProgressionEventWithPolicy(async () => ({ error: undefined, data: "ok" }), {
      maxAttempts: 0,
    })).resolves.toEqual({ inserted: true, duplicate: false, attempts: 1 });
  });
});
