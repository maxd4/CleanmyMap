import { expect, it, vi } from "vitest";

export type ModerationScenarioMocks = Record<string, ReturnType<typeof vi.fn>>;

export function registerSanitizedErrorScenario({
  mocks,
}: {
  mocks: ModerationScenarioMocks;
}) {
  const {
    moderateSignalementMock,
  } = mocks;

  it("returns a sanitized error when the underlying database update fails", async () => {
    moderateSignalementMock.mockRejectedValueOnce(
      new Error('syntax error at or near "trash_spotter_spots"'),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "clean_place",
          id: "spot-1",
          status: "validated",
          confirmPhrase: "CONFIRMER MODERATION",
        }),
      }),
    );

    const body = (await response.json()) as {
      message?: string;
      error?: string;
      code?: string;
    };

    expect(response.status).toBe(500);
    expect(body.code).toBe("server_error");
    expect(body.message).toBe("La modération a échoué.");
    expect(body.error).toBe("La modération a échoué.");
  });
}
