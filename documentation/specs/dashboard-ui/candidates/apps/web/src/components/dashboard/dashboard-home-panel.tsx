import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { getDashboardRoleActions } from "@/lib/dashboard/role-actions";
import { dashboardTabHref } from "@/lib/dashboard/tabs";
import { getProfileLabel, type AppProfile } from "@/lib/profiles";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import type { Locale } from "@/lib/ui/preferences";

export function DashboardHomePanel({ profile, locale }: { profile: AppProfile; locale: Locale }) {
  const actions = getDashboardRoleActions(profile);
  const fr = locale === "fr";
  return (
    <div className="space-y-6">
      <section aria-labelledby="dashboard-home-title" className="space-y-3">
        <h2 id="dashboard-home-title" className="text-xl font-bold cmm-text-primary">{fr ? "Vos accès prioritaires" : "Your priority links"}</h2>
        <p className="text-sm cmm-text-secondary">{fr ? "Selon votre rôle actif : " : "For your active role: "}{getProfileLabel(profile, locale)}</p>
        <RolePrimaryActions profile={profile} title="" tone="light" actionsOverride={actions} preserveAll />
      </section>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <CmmCard className="space-y-3">
          <h2 className="text-lg font-bold cmm-text-primary">{fr ? "Mon suivi" : "My activity"}</h2>
          <p className="text-sm cmm-text-secondary">{fr ? "Retrouvez vos participations documentées et les enregistrements accessibles." : "Find your documented participation and accessible records."}</p>
          <div className="flex flex-wrap gap-2">
            <CmmButton href="/profil/engagement" tone="primary">{fr ? "Mon dossier d'engagement" : "My engagement record"}</CmmButton>
            <CmmButton href="/actions/history" tone="secondary">{fr ? "Historique terrain" : "Field history"}</CmmButton>
            {!actions.some((action) => action.href === "/actions/new") && <CmmButton href="/actions/new" tone="secondary">{fr ? "Créer une action" : "Create an action"}</CmmButton>}
          </div>
        </CmmCard>
        <CmmCard className="space-y-3">
          <h2 className="text-lg font-bold cmm-text-primary">{fr ? "Mon compte" : "My account"}</h2>
          <p className="text-sm cmm-text-secondary">{fr ? "Consultez votre profil, vos badges et vos demandes." : "Review your profile, badges and requests."}</p>
          <div className="flex flex-wrap gap-2">
            <CmmButton href={buildProfileRoute(profile)} tone="secondary">{fr ? "Mon profil" : "My profile"}</CmmButton>
            <CmmButton href={dashboardTabHref("notifications")} tone="secondary">{fr ? "Mes notifications" : "My notifications"}</CmmButton>
          </div>
        </CmmCard>
      </div>
    </div>
  );
}
