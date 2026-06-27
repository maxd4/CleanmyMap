import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchCachedChatUsers } from "@/lib/chat/user-search";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";

const CHAT_USERS_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
};

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().slice(0, 120);

  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Connexion sécurisée indisponible",
        hint:
          "Activez l'intégration native Clerk/Supabase dans Supabase et vérifiez que la session Clerk est disponible.",
      },
      { status: 503 },
    );
  }

  try {
    const users = await fetchCachedChatUsers(userId, query, supabase);
    return NextResponse.json(
      { users: users.slice(0, 10) },
      { headers: CHAT_USERS_CACHE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/chat/users");
  }
}
