import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  buildCodexMonthlyUsageEstimate,
  buildCodexUsageWeeklySnapshot,
  listCodexUsageWeeklySnapshots,
  upsertCodexUsageWeeklySnapshot,
} from "@/lib/environmental-impact-estimator";
import { ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION } from "@/lib/environmental-impact-estimator/constants";

export const runtime = "nodejs";

const codexUsageWeeklyInputSchema = z.object({
  weekStart: z.string().trim().optional().nullable(),
  weekEnd: z.string().trim().optional().nullable(),
  sessionCount: z.number().finite().nonnegative().optional().nullable(),
  conversationCount: z.number().finite().nonnegative().optional().nullable(),
  turnCount: z.number().finite().nonnegative().optional().nullable(),
  toolCallCount: z.number().finite().nonnegative().optional().nullable(),
  shellCommandCount: z.number().finite().nonnegative().optional().nullable(),
  fileTouchCount: z.number().finite().nonnegative().optional().nullable(),
  testRunCount: z.number().finite().nonnegative().optional().nullable(),
  changedLineCount: z.number().finite().nonnegative().optional().nullable(),
  activeMinutes: z.number().finite().nonnegative().optional().nullable(),
  source: z.enum(["manual", "imported", "reconstructed"]).optional().nullable(),
  notes: z.array(z.string().trim()).optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

function parseHistoryLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 12;
  }

  return Math.min(24, Math.max(4, Math.trunc(parsed)));
}

async function readRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function buildCodexAdminPayload(historyLimit: number) {
  const snapshots = await listCodexUsageWeeklySnapshots(historyLimit);
  const aggregate = buildCodexMonthlyUsageEstimate(snapshots);

  return {
    status: "ok" as const,
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
    aggregate,
    latest: snapshots[0] ?? null,
    snapshots,
  };
}

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, `codex-usage-${Date.now()}`);
  }

  const url = new URL(request.url);
  const historyLimit = parseHistoryLimit(url.searchParams.get("historyLimit"));

  try {
    return NextResponse.json(await buildCodexAdminPayload(historyLimit));
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de lire l'historique Codex hebdomadaire.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, `codex-usage-${Date.now()}`);
  }

  const url = new URL(request.url);
  const historyLimit = parseHistoryLimit(url.searchParams.get("historyLimit"));

  try {
    const body = codexUsageWeeklyInputSchema.parse(await readRequestBody(request));
    const snapshot = buildCodexUsageWeeklySnapshot(body);
    await upsertCodexUsageWeeklySnapshot(snapshot);
    const payload = await buildCodexAdminPayload(historyLimit);

    return NextResponse.json({
      ...payload,
      triggeredBy: "admin-manual",
      snapshot,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible d'enregistrer la semaine Codex.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}
