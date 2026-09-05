import { NextResponse } from "next/server";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { listPromotionRequestsForUser } from "@/lib/admin/promotion-requests-store";

export const runtime = "nodejs";

type CurrentUserPromotionRequest = {
  createdAt: string;
  requestedRole: "elu" | "admin";
  status: "pending_owner_review" | "accepted" | "rejected";
  reviewedAt: string | null;
};

function toCurrentUserPromotionRequest(
  record: Awaited<ReturnType<typeof listPromotionRequestsForUser>>[number],
): CurrentUserPromotionRequest {
  return {
    createdAt: record.createdAt,
    requestedRole: record.requestedRole,
    status: record.status,
    reviewedAt: record.reviewedAt,
  };
}

export async function GET() {
  const { userId } = await getSafeAuthSession();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const records = await listPromotionRequestsForUser(userId, 50);
    const items = records
      .filter((record) => record.submittedByUserId === userId)
      .map(toCurrentUserPromotionRequest);

    return NextResponse.json({ status: "ok", items });
  } catch {
    return NextResponse.json(
      { error: "Le statut de vos demandes est temporairement indisponible." },
      { status: 503 },
    );
  }
}
