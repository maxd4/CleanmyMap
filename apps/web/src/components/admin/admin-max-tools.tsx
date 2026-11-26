import { RoleManagementPanel } from "./role-management-panel";
import { listManagedRoleAccounts } from "@/lib/admin/role-management";
import type { UserIdentity } from "@/lib/authz";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { ADMIN_GODMODE_ROUTE } from "@/lib/accueil-pilotage-routes";

export async function AdminMaxTools({ displayName, identity }: { displayName: string; identity: UserIdentity | null }) {
  const managedRoleAccounts = await listManagedRoleAccounts();
  return (
    <div className="space-y-4">
      <CmmCard className="space-y-3">
        <h2 className="text-xl font-bold cmm-text-primary">Administration avancée</h2>
        <p className="text-sm cmm-text-secondary">Compte actif : {displayName}. Accès aux outils sensibles selon les contrôles existants.</p>
        <div className="flex flex-wrap gap-2">
          <CmmButton href={ADMIN_GODMODE_ROUTE} tone="important">Contrôle système</CmmButton>
          <CmmButton href="/admin/services" tone="secondary">Services et santé</CmmButton>
          <CmmButton href="/api/health" tone="secondary">État des endpoints</CmmButton>
          <CmmButton href="/reports" tone="secondary">Rapports d’impact</CmmButton>
          <CmmButton href="/admin?tab=audit" tone="secondary">Journal administrateurs</CmmButton>
        </div>
      </CmmCard>
      <RoleManagementPanel initialAccounts={managedRoleAccounts} currentUserId={identity?.userId ?? ""} />
    </div>
  );
}
