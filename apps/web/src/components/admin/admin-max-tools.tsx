import { AdminCreatorConsole } from "./admin-creator-console";
import { RoleManagementPanel } from "./role-management-panel";
import { listManagedRoleAccounts } from "@/lib/admin/role-management";
import type { UserIdentity } from "@/lib/authz";

export async function AdminMaxTools({
  displayName,
  identity,
}: {
  displayName: string;
  identity: UserIdentity | null;
}) {
  const managedRoleAccounts = await listManagedRoleAccounts();

  return (
    <>
      <RoleManagementPanel
        initialAccounts={managedRoleAccounts}
        currentUserId={identity?.userId ?? ""}
      />
      <AdminCreatorConsole displayName={displayName} embedded />
    </>
  );
}
