import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/authz";

export default async function SpogomiOrganizerDashboardPage() {
  const access = await requireAdminAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent("/spogomi/mes-evenements")}`);
  redirect("/spogomi/mes-evenements");
}
