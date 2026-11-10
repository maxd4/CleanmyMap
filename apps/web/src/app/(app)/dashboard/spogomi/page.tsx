import { redirect } from "next/navigation";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";

export default async function SpogomiOrganizerDashboardPage() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(buildSignInRedirectHref("/spogomi/mes-evenements"));
  redirect("/spogomi/mes-evenements");
}
