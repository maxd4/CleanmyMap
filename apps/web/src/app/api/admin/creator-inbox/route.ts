import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity, requireCreatorAccess } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { loadCreatorInboxItems } from "@/lib/community/creator-inbox-loader";
import {
  actionSchema,
  type DecisionAuditAppender,
} from "./route.shared";
import { handleCreatorInboxFeedback } from "./route.feedback";
import { handleCreatorInboxPartner } from "./route.partner";
import { handleCreatorInboxPromotion } from "./route.promotion";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  try {
    const items = await loadCreatorInboxItems();
    return NextResponse.json({ status: "ok", count: items.length, items });
  } catch {
    return NextResponse.json(
      { error: "Unable to load creator inbox." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireCreatorAccess();
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
    reason,
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
