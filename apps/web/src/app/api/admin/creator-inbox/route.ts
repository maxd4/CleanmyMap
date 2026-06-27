import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, requireCreatorAccess } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";
import { updatePromotionRequestCreatorState } from "@/lib/admin/promotion-requests-store";
import {
  deleteCommunityBugReport,
  updateCommunityBugReportCreatorState,
  updateCommunityBugReportStatus,
} from "@/lib/community/bug-reports-store";
import {
  buildFeedbackInboxItem,
  buildPartnerInboxItem,
  buildPromotionInboxItem,
  formatCreatorInboxSourceLabel,
} from "@/lib/community/creator-inbox";
import { loadCreatorInboxItems } from "@/lib/community/creator-inbox-loader";
import { deletePartnerOnboardingRequest, listPartnerOnboardingRequests, updatePartnerOnboardingRequestCreatorState } from "@/lib/partners/onboarding-requests-store";

export const runtime = "nodejs";

const actionSchema = z.object({
  source: z.enum(["feedback", "promotion", "partner"]),
  itemId: z.string().trim().min(1),
  action: z.enum(["mark_treated", "responded", "archive", "delete"]),
});

function creatorAccessResponse(status: number) {
  return NextResponse.json({ error: "Forbidden" }, { status });
}

export async function GET() {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return creatorAccessResponse(access.status);
  }

  try {
    const items = await loadCreatorInboxItems();
    return NextResponse.json({ status: "ok", count: items.length, items });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to load creator inbox.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return creatorAccessResponse(access.status);
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return creatorAccessResponse(401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const operationId = randomUUID();
  const sourceLabel = formatCreatorInboxSourceLabel(parsed.data.source, "fr");

  try {
    if (parsed.data.source === "feedback") {
      if (parsed.data.action === "delete") {
        const deleted = await deleteCommunityBugReport(parsed.data.itemId);
        if (!deleted) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }
        await appendAdminOperationAudit({
          operationId,
          at: new Date().toISOString(),
          actorUserId: identity.userId,
          operationType: "moderation",
          outcome: "success",
          targetId: parsed.data.itemId,
          details: {
            entityType: "creator_inbox_feedback",
            action: parsed.data.action,
            source: sourceLabel,
          },
        });
        return NextResponse.json({ status: "ok", deletedId: parsed.data.itemId });
      }

      if (parsed.data.action === "mark_treated") {
        const updated = await updateCommunityBugReportStatus({
          reportId: parsed.data.itemId,
          status: "treated",
        });
        if (!updated) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }
        await appendAdminOperationAudit({
          operationId,
          at: new Date().toISOString(),
          actorUserId: identity.userId,
          operationType: "moderation",
          outcome: "success",
          targetId: updated.id,
          details: {
            entityType: "creator_inbox_feedback",
            action: parsed.data.action,
            source: sourceLabel,
          },
        });
        return NextResponse.json({ status: "ok", item: buildFeedbackInboxItem(updated) });
      }

      const updated = await updateCommunityBugReportCreatorState({
        reportId: parsed.data.itemId,
        creatorState: parsed.data.action === "responded" ? "responded" : "archived",
      });
      if (!updated) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      if (parsed.data.action === "archive") {
        await updateCommunityBugReportStatus({
          reportId: parsed.data.itemId,
          status: "archived",
        });
      }
      const normalizedItem =
        parsed.data.action === "archive"
          ? {
              ...updated,
              status: "archived" as const,
              creatorState: "archived" as const,
            }
          : updated;
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: identity.userId,
        operationType: "moderation",
        outcome: "success",
        targetId: updated.id,
        details: {
          entityType: "creator_inbox_feedback",
          action: parsed.data.action,
          source: sourceLabel,
        },
      });
      return NextResponse.json({ status: "ok", item: buildFeedbackInboxItem(normalizedItem) });
    }

    if (parsed.data.source === "promotion") {
      if (parsed.data.action === "delete") {
        return NextResponse.json(
          { error: "Promotion requests can only be archived from the inbox." },
          { status: 409 },
        );
      }
      const updated = await updatePromotionRequestCreatorState({
        requestId: parsed.data.itemId,
        creatorState:
          parsed.data.action === "responded"
            ? "responded"
            : parsed.data.action === "mark_treated"
              ? "treated"
              : "archived",
      });
      if (!updated) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: identity.userId,
        operationType: "moderation",
        outcome: "success",
        targetId: updated.id,
        details: {
          entityType: "creator_inbox_promotion",
          action: parsed.data.action,
          source: sourceLabel,
        },
      });
      return NextResponse.json({ status: "ok", item: buildPromotionInboxItem(updated) });
    }

    const current = await listPartnerOnboardingRequests(500).then((items) =>
      items.find((item) => item.id === parsed.data.itemId) ?? null,
    );
    if (!current) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (parsed.data.action === "delete") {
      if (current.status === "accepted") {
        return NextResponse.json(
          { error: "Accepted partner requests cannot be deleted." },
          { status: 409 },
        );
      }
      const deleted = await deletePartnerOnboardingRequest(parsed.data.itemId);
      if (!deleted) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: identity.userId,
        operationType: "moderation",
        outcome: "success",
        targetId: parsed.data.itemId,
        details: {
          entityType: "creator_inbox_partner",
          action: parsed.data.action,
          source: sourceLabel,
        },
      });
      return NextResponse.json({ status: "ok", deletedId: parsed.data.itemId });
    }

    const updated = await updatePartnerOnboardingRequestCreatorState({
      requestId: parsed.data.itemId,
      creatorState:
        parsed.data.action === "responded"
          ? "responded"
          : parsed.data.action === "mark_treated"
            ? "treated"
            : "archived",
    });
    if (!updated) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: identity.userId,
      operationType: "moderation",
      outcome: "success",
      targetId: updated.id,
      details: {
        entityType: "creator_inbox_partner",
        action: parsed.data.action,
        source: sourceLabel,
      },
    });
    return NextResponse.json({ status: "ok", item: buildPartnerInboxItem(updated) });
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: identity.userId,
      operationType: "moderation",
      outcome: "error",
      targetId: parsed.data.itemId,
      details: {
        entityType: `creator_inbox_${parsed.data.source}`,
        action: parsed.data.action,
        source: sourceLabel,
        error: "Unavailable",
      },
    });
    return NextResponse.json(
      {
        error: "Unknown error",
      },
      { status: 500 },
    );
  }
}
