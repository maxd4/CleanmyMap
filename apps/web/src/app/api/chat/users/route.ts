import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";

export async function GET(request: Request) {
 const { userId } = await auth();
 if (!userId) return unauthorizedJsonResponse();

 const { searchParams } = new URL(request.url);
 const query = searchParams.get("q") ||"";

 const supabase = await getSupabaseClerkRlsClient();
 if (!supabase) {
  return NextResponse.json(
   {
    error: "Connexion sécurisée indisponible",
    hint: "Configurez un template JWT Clerk Supabase (ou CLERK_SUPABASE_JWT_TEMPLATE) pour lire les profils sous RLS.",
   },
   { status: 503 },
  );
 }

 // Fetch handles for autocomplete, restricted to active/valid profiles
 let dbQuery = supabase
 .from("profiles")
 .select("id, handle, display_name, avatar_url")
  .order("display_name")
  .limit(10);

 dbQuery = dbQuery.neq("id", userId);

 if (query) {
 dbQuery = dbQuery.or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`);
 }

 const { data, error } = await dbQuery;
 if (error) return handleApiError(error,"GET /api/chat/users");

 return NextResponse.json({ users: data });
}
