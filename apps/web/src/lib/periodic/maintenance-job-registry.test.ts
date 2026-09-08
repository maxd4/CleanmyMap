import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAINTENANCE_JOB_IDS,
  MAINTENANCE_JOB_REGISTRY,
  runMaintenanceJobs,
  type MaintenanceJobDefinition,
} from "./maintenance-job-registry";
import { getUtcMonthStart, getUtcWeekStart } from "./periodic-job-calendar";

function makeJobs(params: {
  produced?: string[];
  failures?: string[];
} = {}): {
  jobs: MaintenanceJobDefinition[];
  calls: Map<string, number>;
  produced: Set<string>;
} {
  const produced = new Set(params.produced ?? []);
  const failures = new Set(params.failures ?? []);
  const calls = new Map<string, number>();
  const definitions: Array<[
    MaintenanceJobDefinition["id"],
    MaintenanceJobDefinition["cadence"],
    MaintenanceJobDefinition["getPeriod"],
  ]> = [
    ["impact-terrain", "monthly", getUtcMonthStart],
    ["platform-usage", "weekly", getUtcWeekStart],
    ["map-pollution-references", "weekly", getUtcWeekStart],
    ["governance-report", "monthly", getUtcMonthStart],
  ];

  const jobs = definitions.map(([id, cadence, getPeriod]) => ({
    id,
    cadence,
    getPeriod,
    isProduced: async (period: string) => produced.has(`${id}:${period}`),
    run: async (now: Date) => {
      const period = getPeriod(now);
      calls.set(id, (calls.get(id) ?? 0) + 1);
      if (failures.has(id)) {
        failures.delete(id);
        throw new Error(`${id} unavailable`);
      }
      produced.add(`${id}:${period}`);
    },
  }));

  return { jobs, calls, produced };
}

describe("maintenance job registry", () => {
  it("déclare exactement les quatre jobs et leurs cadences", () => {
    expect(MAINTENANCE_JOB_REGISTRY.map((job) => job.id)).toEqual([
      ...MAINTENANCE_JOB_IDS,
    ]);
    expect(MAINTENANCE_JOB_REGISTRY.map((job) => job.cadence)).toEqual([
      "monthly",
      "weekly",
      "weekly",
      "monthly",
    ]);
  });

  it("exécute les hebdomadaires le lundi et réutilise les mensuels déjà produits", async () => {
    const now = new Date("2026-09-07T03:20:00.000Z");
    const { jobs, calls } = makeJobs({
      produced: [
        "impact-terrain:2026-09-01",
        "governance-report:2026-09-01",
      ],
    });

    const result = await runMaintenanceJobs({ now, jobs });

    expect(result.status).toBe("ok");
    expect(result.jobs).toEqual([
      expect.objectContaining({
        job: "impact-terrain",
        period: "2026-09-01",
        status: "skipped",
        reason: "reused",
      }),
      expect.objectContaining({
        job: "platform-usage",
        period: "2026-09-07",
        status: "executed",
      }),
      expect.objectContaining({
        job: "map-pollution-references",
        period: "2026-09-07",
        status: "executed",
      }),
      expect.objectContaining({
        job: "governance-report",
        period: "2026-09-01",
        status: "skipped",
        reason: "reused",
      }),
    ]);
    expect(calls.get("platform-usage")).toBe(1);
    expect(calls.get("map-pollution-references")).toBe(1);
  });

  it("exécute les mensuels le premier jour même si ce n'est pas un lundi", async () => {
    const now = new Date("2026-09-01T03:20:00.000Z");
    const { jobs, calls } = makeJobs({
      produced: [
        "platform-usage:2026-08-31",
        "map-pollution-references:2026-08-31",
      ],
    });

    const result = await runMaintenanceJobs({ now, jobs });

    expect(result.jobs.filter((job) => job.status === "executed").map((job) => job.job)).toEqual([
      "impact-terrain",
      "governance-report",
    ]);
    expect(calls.get("impact-terrain")).toBe(1);
    expect(calls.get("governance-report")).toBe(1);
  });

  it("exécute hebdomadaires et mensuels exactement une fois le lundi premier", async () => {
    const now = new Date("2026-06-01T03:20:00.000Z");
    const state = makeJobs();

    const first = await runMaintenanceJobs({ now, jobs: state.jobs });
    const second = await runMaintenanceJobs({ now, jobs: state.jobs });

    expect(first.jobs.every((job) => job.status === "executed")).toBe(true);
    expect(second.jobs.every((job) => job.status === "skipped" && job.reason === "reused")).toBe(true);
    expect([...state.calls.values()]).toEqual([1, 1, 1, 1]);
  });

  it("rattrape un échec du lundi lors de l'appel quotidien suivant", async () => {
    const state = makeJobs({ failures: ["platform-usage"] });
    const monday = await runMaintenanceJobs({
      now: new Date("2026-09-07T03:20:00.000Z"),
      jobs: state.jobs,
    });
    const tuesday = await runMaintenanceJobs({
      now: new Date("2026-09-08T03:20:00.000Z"),
      jobs: state.jobs,
    });

    expect(monday.jobs.find((job) => job.job === "platform-usage")?.status).toBe("failed");
    expect(tuesday.jobs.find((job) => job.job === "platform-usage")).toMatchObject({
      status: "executed",
      period: "2026-09-07",
    });
  });

  it("isole l'échec d'un job sans invalider les jobs indépendants", async () => {
    const state = makeJobs({ failures: ["platform-usage"] });

    const result = await runMaintenanceJobs({
      now: new Date("2026-09-07T03:20:00.000Z"),
      jobs: state.jobs,
    });

    expect(result.status).toBe("degraded");
    expect(result.jobs.find((job) => job.job === "platform-usage")?.status).toBe("failed");
    expect(result.jobs.filter((job) => job.status === "executed").map((job) => job.job)).toEqual([
      "impact-terrain",
      "map-pollution-references",
      "governance-report",
    ]);
  });

  it("garde une configuration Vercel avec un seul cron commun", () => {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: Array<{ path?: string; schedule?: string }> };

    expect(config.crons).toEqual([
      { path: "/api/cron/maintenance", schedule: "20 3 * * *" },
    ]);
  });
});
