import { notFound } from "next/navigation";
import { AdminCreatorConsole } from "@/components/admin/admin-creator-console";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";

export default async function GodModeAdminPage() {
  const [identity, role] = await Promise.all([
    getCurrentUserIdentity().catch(() => null),
    getCurrentUserRoleLabel().catch(() => "anonymous"),
  ]);

  if (role !== "max") {
    return notFound();
  }

  const displayName =
    identity?.displayName?.trim() ||
    identity?.firstName?.trim() ||
    identity?.username ||
    identity?.handle ||
    "Administration avancée";

  return <AdminCreatorConsole displayName={displayName} />;
}
