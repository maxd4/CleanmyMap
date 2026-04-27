import { NextResponse } from"next/server";
import { auth } from"@clerk/nextjs/server";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";

/**
 * GET - Fetch recent notifications for the current user
 */
export async function GET() {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 try {
 const supabase = getSupabaseServerClient(true); // Service role to bypass custom RLS quirks if any, filtered by user_id
 const { data, error } = await supabase
 .from("app_notifications")
 .select("*")
 .eq("user_id", userId)
 .order("created_at", { ascending: false })
 .limit(20);

 if (error) {
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

 const supabase = getSupabaseServerClient(true);
 const { error } = await supabase
 .from("app_notifications")
 .update({ read_at: new Date().toISOString() })
 .eq("id", id)
 .eq("user_id", userId);

 if (error) {
 console.error("[Notifications API] Update error:", error);
 return NextResponse.json({ error:"Failed to update notification" }, { status: 500 });
 }

 return NextResponse.json({ status:"ok" });
 } catch (error) {
 console.error("[Notifications API] Runtime error:", error);
 return NextResponse.json({ error:"Internal Server Error" }, { status: 500 });
 }
}
