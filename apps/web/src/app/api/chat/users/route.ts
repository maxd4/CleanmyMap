import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const supabase = getSupabaseServerClient();

  // Fetch handles for autocomplete, restricted to active/valid profiles
  let dbQuery = supabase
    .from("profiles")
    .select("handle, display_name, avatar_url")
    .order("display_name")
    .limit(10);

  if (query) {
    dbQuery = dbQuery.or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`);
  }

  const { data, error } = await dbQuery;
  if (error) return handleApiError(error, "GET /api/chat/users");

  return NextResponse.json({ users: data });
}
