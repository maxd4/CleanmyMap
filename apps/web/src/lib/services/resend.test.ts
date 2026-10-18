import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({ RESEND_API_KEY: undefined as string | undefined }));
const resendConstructorMock = vi.hoisted(() =>
  vi.fn(
    class MockResend {
      constructor(public readonly apiKey: string) {}
    },
  ),
);

vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("resend", () => ({ Resend: resendConstructorMock }));

describe("Resend client factory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envMock.RESEND_API_KEY = undefined;
  });

  it("does not construct the SDK without a configured API key", async () => {
    const { getResendClient } = await import("./resend");

    expect(getResendClient()).toBeNull();
    expect(resendConstructorMock).not.toHaveBeenCalled();
  });

  it("constructs the SDK with the configured API key", async () => {
    envMock.RESEND_API_KEY = "re_test_key";
    const { getResendClient } = await import("./resend");
    const client = getResendClient();

    expect(client).toBeInstanceOf(resendConstructorMock);
    expect(resendConstructorMock).toHaveBeenCalledWith("re_test_key");
  });
});
