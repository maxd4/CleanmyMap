import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/observability/sentry", () => ({ isSentryEnabled: () => false }));

import { handleApiError } from "./api-errors";
import { ActionSupabaseError } from "@/lib/actions/query";

describe("handleApiError with validated Supabase errors", () => {
  it("keeps provider details out of the HTTP response", async () => {
    const response = handleApiError(
      new ActionSupabaseError("private provider detail", {
        code: "P0001",
        details: "internal SQL detail",
        hint: "internal SQL hint",
      }),
      "test/actions",
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Une erreur est survenue de notre côté. Réessayez dans quelques instants.");
    expect(JSON.stringify(body)).not.toContain("private provider detail");
    expect(JSON.stringify(body)).not.toContain("internal SQL detail");
    expect(JSON.stringify(body)).not.toContain("internal SQL hint");
  });
});
