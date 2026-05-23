import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { escapePostgrestLikePattern, mergeRowGroupsById } from "@/lib/chat/postgrest";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";

type ChatSupabaseClient = NonNullable<
 Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>
>;

type ChatUserRow = {
 id: string;
 handle: string | null;
 display_name: string | null;
 avatar_url: string | null;
};

function buildChatUserQuery(
 supabase: ChatSupabaseClient,
 userId: string,
) {
 return supabase
  .from("profiles")
  .select("id, handle, display_name, avatar_url")
  .neq("id", userId)
  .order("display_name")
  .limit(10);
}

export async function GET(request: Request) {
 const { userId } = await auth();
 if (!userId) return unauthorizedJsonResponse();

 const { searchParams } = new URL(request.url);
 const query = (searchParams.get("q") || "").trim().slice(0, 120);

 const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
   return NextResponse.json(
    {
     error: "Connexion sécurisée indisponible",
     hint: "Activez l'intégration native Clerk/Supabase dans Supabase et vérifiez que la session Clerk est disponible.",
    },
    { status: 503 },
   );
  }

 if (!query) {
  const { data, error } = await buildChatUserQuery(supabase, userId);
  if (error) return handleApiError(error,"GET /api/chat/users");
  return NextResponse.json({ users: data });
 }

 const pattern = `%${escapePostgrestLikePattern(query)}%`;
 const [handleResult, displayNameResult] = await Promise.all([
  buildChatUserQuery(supabase, userId).ilike("handle", pattern),
  buildChatUserQuery(supabase, userId).ilike("display_name", pattern),
 ]);

 const error = handleResult.error ?? displayNameResult.error;
 if (error) return handleApiError(error,"GET /api/chat/users");

 const users = mergeRowGroupsById<ChatUserRow>([
  (handleResult.data ?? []) as ChatUserRow[],
  (displayNameResult.data ?? []) as ChatUserRow[],
 ]).sort((left, right) => {
  const leftLabel = left.display_name?.trim() || left.handle?.trim() || "";
  const rightLabel = right.display_name?.trim() || right.handle?.trim() || "";
  return leftLabel.localeCompare(rightLabel, "fr") || left.id.localeCompare(right.id);
 });

 return NextResponse.json({ users: users.slice(0, 10) });
}
