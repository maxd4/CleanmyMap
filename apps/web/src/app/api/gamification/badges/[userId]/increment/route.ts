import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BADGE_MAX_COUNTER, ACTIVE_RULES } from "@/config/gamification.config";

export const runtime = "nodejs";

const BodySchema = z.object({
  type: z.enum(["dechets", "megots"]),
  amount: z.number().finite().positive(),
});

function clampMax(value: number): number {
  return Math.min(BADGE_MAX_COUNTER, Math.max(0, value));
}

function listCrossedIntegerMilestones(params: {
  previous: number;
  next: number;
  step: number;
}): number[] {
  const step = Math.max(1, Math.trunc(params.step));
  const prev = Math.max(0, params.previous);
  const next = Math.max(0, params.next);
  const from = Math.floor(prev / step) + 1;
  const to = Math.floor(next / step);
  if (to < from) return [];
  const milestones: number[] = [];
  for (let k = from; k <= to; k += 1) {
    milestones.push(k * step);
  }
  return milestones;
}

// Gamification calculations are now handled by ACTIVE_RULES engine.
export async function POST(
  request: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId: sessionUserId } = await auth();
  if (!sessionUserId) return unauthorizedJsonResponse();

  const { userId } = await ctx.params;
  if (!userId || userId !== sessionUserId) {
    return forbiddenJsonResponse({ hint: "Vous ne pouvez modifier que vos propres badges." });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  const { type, amount } = parsed.data;

  try {
    const supabase = getSupabaseServerClient(true);

    const existing = await supabase
      .from("user_badge_totals")
      .select("user_id, waste_kg, butts")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (!existing.data) {
      const inserted = await supabase
        .from("user_badge_totals")
        .insert({ user_id: userId })
        .select("user_id, waste_kg, butts")
        .single();
      if (inserted.error) throw inserted.error;
      existing.data = inserted.data;
    }

    const currentWaste = Number(existing.data.waste_kg ?? 0);
    const currentButts = Number(existing.data.butts ?? 0);

    const nextWaste = type === "dechets" ? clampMax(currentWaste + amount) : currentWaste;
    const nextButts = type === "megots" ? clampMax(currentButts + amount) : currentButts;

    if (type === "dechets" && nextWaste >= BADGE_MAX_COUNTER && currentWaste >= BADGE_MAX_COUNTER) {
      return NextResponse.json(
        { status: "error", error: "Compteur déjà au maximum.", kind: "validation" },
        { status: 400 },
      );
    }
    if (type === "megots" && nextButts >= BADGE_MAX_COUNTER && currentButts >= BADGE_MAX_COUNTER) {
      return NextResponse.json(
        { status: "error", error: "Compteur déjà au maximum.", kind: "validation" },
        { status: 400 },
      );
    }

    const updated = await supabase
      .from("user_badge_totals")
      .update({
        waste_kg: nextWaste,
        butts: Math.trunc(nextButts),
      })
      .eq("user_id", userId)
      .select("waste_kg, butts")
      .single();
    if (updated.error) throw updated.error;

    // Best-effort XP milestones: do not fail the request if inserts fail.
    try {
      if (type === "dechets") {
        const milestones = listCrossedIntegerMilestones({
          previous: currentWaste,
          next: nextWaste,
          step: ACTIVE_RULES.wasteMilestoneStepKg,
        });
        for (const milestoneKg of milestones) {
          const xp = ACTIVE_RULES.calculateWasteXp(milestoneKg);
          await supabase.from("progression_events").insert({
            user_id: userId,
            event_type: "infinite_waste_milestone",
            source_table: "user_badge_totals",
            source_id: `waste:${milestoneKg}`,
            status_phase: "validated",
            weight: 1,
            xp_base: xp,
            xp_awarded: xp,
            occurred_on: new Date().toISOString().slice(0, 10),
            metadata: { milestoneKg, rulesVersion: ACTIVE_RULES.version },
          });
        }
      }

      if (type === "megots") {
        const milestones = listCrossedIntegerMilestones({
          previous: currentButts,
          next: nextButts,
          step: ACTIVE_RULES.buttsMilestoneStepCount,
        });
        for (const milestoneButts of milestones) {
          const xp = ACTIVE_RULES.calculateButtsXp(milestoneButts);
          await supabase.from("progression_events").insert({
            user_id: userId,
            event_type: "infinite_butts_milestone",
            source_table: "user_badge_totals",
            source_id: `butts:${milestoneButts}`,
            status_phase: "validated",
            weight: 1,
            xp_base: xp,
            xp_awarded: xp,
            occurred_on: new Date().toISOString().slice(0, 10),
            metadata: { milestoneButts, rulesVersion: ACTIVE_RULES.version },
          });
        }
      }
    } catch {
      // ignore
    }

    // Best-effort event log: do not fail the request if event insert fails.
    try {
      await supabase.from("badge_events").insert({
        user_id: userId,
        family: type === "dechets" ? "waste" : "butts",
        delta: amount,
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      status: "ok",
      totals: {
        wasteKg: Number(updated.data.waste_kg ?? 0),
        butts: Number(updated.data.butts ?? 0),
      },
    });
  } catch (error) {
    return handleApiError(error, "POST /api/gamification/badges/:userId/increment");
  }
}

