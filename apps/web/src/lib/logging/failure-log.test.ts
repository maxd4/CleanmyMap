import { beforeEach, describe, expect, it, vi } from "vitest";
import { logFailure, logWarning } from "./failure-log";

describe("failure logging minimization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("removes raw stacks and masks sensitive nested error data", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = Object.assign(
      new Error("request failed for person@example.com password=super-secret"),
      { code: "E_PROVIDER", status: 502, cause: { token: "nested-secret", retryable: true } },
    );

    logFailure(
      "Contact",
      "Notification failed for person@example.com token=top-secret",
      error,
      {
        requestId: "request-123",
        nested: {
          email: "person@example.com",
          authorization: "Bearer top-secret",
          stack: "Error: raw stack line",
          publicStatus: "retryable",
        },
      },
    );

    const [prefix, payload] = consoleError.mock.calls[0] as [string, Record<string, unknown>];
    expect(prefix).not.toContain("person@example.com");
    expect(prefix).not.toContain("top-secret");
    expect(payload).toMatchObject({
      requestId: "request-123",
      nested: {
        email: "[redacted]",
        authorization: "[redacted]",
        publicStatus: "retryable",
      },
      error: {
        name: "Error",
        code: "E_PROVIDER",
        status: 502,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("super-secret");
    expect(JSON.stringify(payload)).not.toContain("nested-secret");
    expect(JSON.stringify(payload)).not.toContain("raw stack line");
    expect((payload.nested as Record<string, unknown>).stack).toBe("[redacted]");
  });

  it("retains bounded technical metadata while minimizing warning details", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    logWarning("Routing", "Provider failed", {
      status: 503,
      pointCount: 3,
      userId: "user-sensitive",
      details: { apiKey: "secret-key", message: "email=person@example.com" },
    });

    const [prefix, details] = consoleWarn.mock.calls[0] as [string, Record<string, unknown>];
    expect(prefix).toBe("[Routing] Provider failed");
    expect(details).toMatchObject({
      status: 503,
      pointCount: 3,
      userId: "[redacted]",
      details: { apiKey: "[redacted]", message: "email=[redacted-email]" },
    });
  });
});
