import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserRoleLabelMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getCurrentUserRoleLabel: getCurrentUserRoleLabelMock,
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

import { readAuthorizedMission } from "./mission-access";

type MissionFixture = {
  id: string;
  label: string;
  status: "pending" | "tracking" | "completed" | "cancelled";
  volunteer_id: string | null;
  created_by?: string;
  started_at: string | null;
  ended_at: string | null;
  distance_m: number | null;
  duration_s: number | null;
};

function createQueryBuilder(result: { data: unknown; error: Error | null }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockResolvedValue(result);
  builder.maybeSingle.mockResolvedValue(result);

  return builder;
}

function installSupabaseFixture(params: {
  mission?: MissionFixture | null;
  points?: Array<{ latitude: number; longitude: number; recorded_at: string }>;
  missionError?: Error | null;
  pointsError?: Error | null;
}) {
  const missionBuilder = createQueryBuilder({
    data: params.mission ?? null,
    error: params.missionError ?? null,
  });
  const pointsBuilder = createQueryBuilder({
    data: params.points ?? [],
    error: params.pointsError ?? null,
  });
  const from = vi.fn((table: string) => {
    if (table === "missions") {
      return missionBuilder;
    }
    if (table === "gps_points") {
      return pointsBuilder;
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  getSupabaseServerClientMock.mockReturnValue({ from });
  return { from, missionBuilder, pointsBuilder };
}

const missionFixture: MissionFixture = {
  id: "mission-1",
  label: "Mission réelle",
  status: "completed",
  volunteer_id: "owner-1",
  created_by: "another-user",
  started_at: "2026-05-06T09:00:00.000Z",
  ended_at: "2026-05-06T10:00:00.000Z",
  distance_m: 2400,
  duration_s: 3600,
};

describe("readAuthorizedMission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: true,
      userId: "owner-1",
    });
    getCurrentUserRoleLabelMock.mockResolvedValue("benevole");
  });

  it("refuse un anonyme avant toute résolution de rôle ou lecture Supabase", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    await expect(readAuthorizedMission("mission-1")).resolves.toEqual({
      kind: "unauthenticated",
      status: 401,
      error: "Unauthorized",
    });
    expect(getCurrentUserRoleLabelMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("retourne not_found après AuthN sans lire les GPS", async () => {
    const supabase = installSupabaseFixture({ mission: null });

    await expect(readAuthorizedMission("missing")).resolves.toEqual({
      kind: "not_found",
    });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("missions");
  });

  it("autorise le volunteer_id et ne restitue pas created_by", async () => {
    const supabase = installSupabaseFixture({
      mission: missionFixture,
      points: [{ latitude: 48.85, longitude: 2.35, recorded_at: "2026-05-06T09:01:00.000Z" }],
    });

    await expect(readAuthorizedMission("mission-1")).resolves.toEqual({
      kind: "ok",
      mission: {
        id: "mission-1",
        label: "Mission réelle",
        status: "completed",
        started_at: "2026-05-06T09:00:00.000Z",
        ended_at: "2026-05-06T10:00:00.000Z",
        distance_m: 2400,
        duration_s: 3600,
      },
      points: [{ latitude: 48.85, longitude: 2.35, recorded_at: "2026-05-06T09:01:00.000Z" }],
    });
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(supabase.from).toHaveBeenNthCalledWith(1, "missions");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "gps_points");
    expect(supabase.missionBuilder.select).toHaveBeenCalledWith(
      "id, label, status, started_at, ended_at, distance_m, duration_s, volunteer_id",
    );
    expect(supabase.missionBuilder.select.mock.calls[0][0]).not.toContain("created_by");
  });

  it.each(["admin", "max"] as const)(
    "autorise le profil privilégié %s après lecture de volunteer_id",
    async (role) => {
      getCurrentUserRoleLabelMock.mockResolvedValue(role);
      installSupabaseFixture({
        mission: { ...missionFixture, volunteer_id: "other-user" },
      });

      await expect(readAuthorizedMission("mission-1")).resolves.toMatchObject({
        kind: "ok",
      });
    },
  );

  it.each(["benevole", "coordinateur", "scientifique", "entreprise", "elu"] as const)(
    "refuse le profil ordinaire %s d'une mission tierce sans lire les GPS",
    async (role) => {
      getCurrentUserRoleLabelMock.mockResolvedValue(role);
      const supabase = installSupabaseFixture({
        mission: { ...missionFixture, volunteer_id: "other-user" },
      });

      await expect(readAuthorizedMission("mission-1")).resolves.toEqual({
        kind: "forbidden",
      });
      expect(supabase.from).toHaveBeenCalledTimes(1);
      expect(supabase.from).toHaveBeenCalledWith("missions");
    },
  );

  it("ne traite pas service_role comme une autorisation", async () => {
    const supabase = installSupabaseFixture({
      mission: { ...missionFixture, volunteer_id: "other-user" },
    });

    await expect(readAuthorizedMission("mission-1")).resolves.toEqual({
      kind: "forbidden",
    });
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("propage les erreurs mission sans inventer de données ni lire les GPS", async () => {
    const databaseError = new Error("mission read failed");
    const supabase = installSupabaseFixture({ missionError: databaseError });

    await expect(readAuthorizedMission("mission-1")).rejects.toBe(databaseError);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});
