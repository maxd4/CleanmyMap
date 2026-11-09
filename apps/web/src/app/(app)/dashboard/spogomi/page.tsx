import { redirect } from "next/navigation";
import { requireAuthenticatedAccess } from "@/lib/authz";

export default async function SpogomiOrganizerDashboardPage() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent("/spogomi/mes-evenements")}`);
  redirect("/spogomi/mes-evenements");
}
