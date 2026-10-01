import { NextResponse } from"next/server";
import { getUserProgression } from"@/lib/gamification/progression";
import { loadGamificationReconciliationInbox } from"@/lib/gamification/gamification-reconciliation-notice";
import { requireAuthenticatedAccess } from"@/lib/authz";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { getSupabaseServerClient } from"@/lib/supabase/server";

export const runtime ="nodejs";
// Cache/no-store justification: progression and reconciliation history are private, user-specific, and must share the same AFTER state.
const GAMIFICATION_ME_CACHE_HEADERS = { "Cache-Control": "private, no-store" };
export async function GET() {
 const access = await requireAuthenticatedAccess();
 if (!access.ok) return unauthorizedJsonResponse();
 const { userId } = access;

 try {
 const supabase = getSupabaseServerClient(true);
 const [progression, reconciliationInbox] = await Promise.all([
  getUserProgression(supabase, userId),
  loadGamificationReconciliationInbox(supabase, userId),
 ]);
 return NextResponse.json({
 status:"ok",
 progression,
 reconciliation: reconciliationInbox.pending,
 reconciliationHistory: reconciliationInbox.history,
 }, {
  headers: GAMIFICATION_ME_CACHE_HEADERS,
 });
 } catch (error) {
 return handleApiError(error, "GET /api/gamification/me");
 }
}
