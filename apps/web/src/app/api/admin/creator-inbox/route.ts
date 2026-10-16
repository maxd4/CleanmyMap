import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity, requireAdminAccess } from "@/lib/authz";
import { env } from "@/lib/env";
import { isImuOwnerIdentity } from "@/lib/auth/role-resolution";
import { canUseSupabaseServerPersistence } from "@/lib/persistence/runtime-store";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  loadCreatorInboxPage,
  parseCreatorInboxPageCursor,
} from "@/lib/community/creator-inbox-loader";
import {
  actionSchema,
  type DecisionAuditAppender,
} from "./route.shared";
import { handleCreatorInboxFeedback } from "./route.feedback";
import { handleCreatorInboxPartner } from "./route.partner";
import { handleCreatorInboxPromotion } from "./route.promotion";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const identity = await getCurrentUserIdentity();
  const canQualify =
    isImuOwnerIdentity(identity, env.CLERK_IMU_OWNER_USER_ID) &&
    canUseSupabaseServerPersistence();

  try {
    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit === null ? undefined : Number(rawLimit);
    if (rawLimit !== null && (!Number.isFinite(limit) || !Number.isInteger(limit))) {
      return NextResponse.json({ error: "Invalid pagination limit" }, { status: 400 });
    }
    const cursorValue = url.searchParams.get("cursor");
    const cursor = parseCreatorInboxPageCursor(cursorValue);
    if (!cursor) {
      return NextResponse.json({ error: "Invalid pagination cursor" }, { status: 400 });
    }
    const page = await loadCreatorInboxPage({ limit, cursor });
    return NextResponse.json({ status: "ok", ...page, canQualify });
  } catch {
    return NextResponse.json(
      { error: "Unable to load creator inbox." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
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

  if (parsed.data.action === "qualify") {
    if (!isImuOwnerIdentity(identity, env.CLERK_IMU_OWNER_USER_ID)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handleCreatorInboxFeedback({
      operationId: randomUUID(),
      actorUserId: identity.userId,
      itemId: parsed.data.itemId,
      action: parsed.data.action,
      reason: parsed.data.reason ?? "",
      appendDecisionAudit: async () => undefined,
      qualification: {
        decision: parsed.data.decision!,
        duplicateFeedbackId: parsed.data.duplicateFeedbackId ?? null,
      },
    });
  }

  const appendDecisionAudit: DecisionAuditAppender = async (params) => {
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.actorUserId,
      operationType: "admin_operation",
      outcome: params.outcome,
      targetId: params.targetId,
      details: params.details,
    });
  };
  const operationId = randomUUID();
  const { source, itemId, action, reason } = parsed.data;
  const common = {
    operationId,
    actorUserId: identity.userId,
    itemId,
    action,
    reason: reason!,
    appendDecisionAudit,
  };

  if (source === "feedback") {
    return handleCreatorInboxFeedback(common);
  }
  if (source === "promotion") {
    return handleCreatorInboxPromotion(common);
  }
  return handleCreatorInboxPartner(common);
}
