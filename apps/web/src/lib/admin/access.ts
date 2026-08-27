import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeProfileRole } from "@/lib/profiles";

export async function checkAdminAccess() {
  const { userId } = await auth();
  if (!userId) redirect('/auth/signin');

  try {
    const supabase = getSupabaseServerClient();
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const role = normalizeProfileRole(
      typeof userRole?.role === "string" ? userRole.role : null,
    );
    if (!userRole || (role !== "admin" && role !== "max")) {
      redirect("/");
    }
  } catch {
    // If role check fails, deny access
    redirect("/");
  }
}
