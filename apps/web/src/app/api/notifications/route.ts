import { NextResponse } from"next/server";
import { auth } from"@clerk/nextjs/server";
import { getSupabaseClerkRlsClient } from"@/lib/supabase/clerk-rls";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";

function isJwtDecodeError(error: unknown): boolean {
 if (!error || typeof error !== "object") {
 return false;
 }
 const maybeError = error as { code?: unknown; message?: unknown };
 return (
 maybeError.code === "PGRST301" ||
 (typeof maybeError.message === "string" &&
  maybeError.message.includes("No suitable key was found to decode the JWT"))
 );
}

/**
 * GET - Fetch recent notifications for the current user
 */
export async function GET() {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 try {
 const supabase = await getSupabaseClerkRlsClient();
 if (!supabase) {
 return NextResponse.json(
 {
 error:"Connexion sécurisée indisponible",
 hint:"Activez l'intégration native Clerk/Supabase et vérifiez que la session Clerk est disponible.",
 },
 { status: 503 },
 );
 }
 const { data, error } = await supabase
 .from("app_notifications")
 .select("*")
 .eq("user_id", userId)
 .order("created_at", { ascending: false })
 .limit(20);

 if (error) {
  if (isJwtDecodeError(error)) {
   return NextResponse.json({ notifications: [] });
  }
  if (process.env.NODE_ENV !== "production") {
   console.warn("[Notifications API] Fetch fallback in dev:", error);
   return NextResponse.json({ notifications: [] });
  }
  console.error("[Notifications API] Fetch error:", error);
  return NextResponse.json({ error:"Failed to fetch notifications" }, { status: 500 });
 }

 return NextResponse.json({ notifications: data });
 } catch (error) {
 console.error("[Notifications API] Runtime error:", error);
 return NextResponse.json({ error:"Internal Server Error" }, { status: 500 });
 }
}

/**
 * PATCH - Mark a notification as read
 */
export async function PATCH(request: Request) {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 try {
 const body = await request.json();
 const { id } = body;

 if (!id) {
 return NextResponse.json({ error:"Notification ID required" }, { status: 400 });
 }

 const supabase = await getSupabaseClerkRlsClient();
 if (!supabase) {
 return NextResponse.json(
 {
 error:"Connexion sécurisée indisponible",
 hint:"Activez l'intégration native Clerk/Supabase et vérifiez que la session Clerk est disponible.",
 },
 { status: 503 },
 );
 }
 const { error } = await supabase
 .from("app_notifications")
 .update({ read_at: new Date().toISOString() })
 .eq("id", id)
 .eq("user_id", userId);

 if (error) {
  if (isJwtDecodeError(error)) {
   return NextResponse.json(
 {
 error:"Connexion sécurisée indisponible",
 hint:"La session Supabase/Clerk locale n'est pas prête. Rechargez après avoir configuré les secrets.",
 },
      { status: 503 },
    );
  }
  if (process.env.NODE_ENV !== "production") {
   console.warn("[Notifications API] Update fallback in dev:", error);
   return NextResponse.json({ status:"ok" });
  }
  console.error("[Notifications API] Update error:", error);
  return NextResponse.json({ error:"Failed to update notification" }, { status: 500 });
 }

 return NextResponse.json({ status:"ok" });
 } catch (error) {
 console.error("[Notifications API] Runtime error:", error);
 return NextResponse.json({ error:"Internal Server Error" }, { status: 500 });
 }
}
