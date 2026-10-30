import { auth } from "@clerk/nextjs/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { validateChatPostRequest } from "./route.post-validation";
import { processValidatedChatPost } from "./route.post-execution";
import { getChatSupabaseOrResponse } from "./route.post-support";
export async function POST(request: Request) {
  const writeRateLimit = await verifyRateLimit(request, { limit: 20, window: 60 });
  const writeRateLimitResponse = createServerRateLimitResponse(
    writeRateLimit.allowed,
    writeRateLimit.retryAfter,
    writeRateLimit,
  );
  if (writeRateLimitResponse) {
    return writeRateLimitResponse;
  }
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  const identity = await getCurrentUserIdentity({ userId, syncActiveRole: true });
  if (!identity) return unauthorizedJsonResponse();
  const validation = await validateChatPostRequest(request, userId);
  if (!validation.ok) return validation.response;
  const { data: parsedData, topicId, messageKind, isExternalActionShare, isBuddyContact } = validation.value;

  const supabaseResult = await getChatSupabaseOrResponse();
  if (supabaseResult instanceof Response) return supabaseResult;
  const supabase = supabaseResult;

  try {
    return await processValidatedChatPost({ supabase, userId, identity, validated: { data: parsedData, topicId, messageKind, isExternalActionShare, isBuddyContact } });
  } catch (error) {
    return handleApiError(error, "POST /api/chat (general)");
  }
}
