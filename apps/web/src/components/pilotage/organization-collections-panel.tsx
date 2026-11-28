import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { OrganizationWorkspace } from "@/lib/organizations/contracts";

export function OrganizationCollectionsPanel({
  workspace,
  siteId,
  locale,
  busy,
  offset,
  onPage,
  onUnlinkAction,
}: {
  workspace: OrganizationWorkspace;
  siteId: string | null;
  locale: "fr" | "en";
  busy: boolean;
  offset: number;
  onPage: (direction: "previous" | "next") => void;
  onUnlinkAction?: (actionId: string, siteId: string | null) => void;
}) {
  const en = locale === "en";
  const canManage = workspace.role !== "member";
  const title = en ? "Organization collections" : "Collectes de l’organisation";
  const noActions = en ? "No collections on this page." : "Aucune collecte sur cette page.";
  const pending = en ? "Shared collection details are temporarily unavailable while the workspace updates." : "Les collectes partagées sont temporairement indisponibles pendant la mise à jour de l’espace.";
  const previous = en ? "Previous" : "Précédent";
  const next = en ? "Next" : "Suivant";
  const creationSiteId = workspace.role === "site_manager" ? workspace.site_id : siteId;
  const createHref = `/actions/new?tab=before&organizationId=${encodeURIComponent(workspace.id)}${creationSiteId ? `&siteId=${encodeURIComponent(creationSiteId)}` : ""}`;
  const unlinkAction = en ? "Remove from organization" : "Retirer de l’organisation";
  const unlinkConfirmation = en
    ? "Detach this collection from the organization? The Action remains available in CleanMyMap; campaign links will also be removed."
    : "Détacher cette collecte de l’organisation ? L’action reste disponible dans CleanMyMap ; ses liens aux campagnes seront également retirés.";
  const duplicateLabel = en ? "Duplicate collection" : "Dupliquer la collecte";

  return (
    <CmmCard className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {canManage ? <CmmButton href={createHref}>{en ? "Prepare a collection" : "Préparer une collecte"}</CmmButton> : null}
      </div>
      {workspace.collections_available === false ? <p role="status">{pending}</p> : workspace.actions.length ? (
        <ul className="divide-y divide-border">
          {workspace.actions.map((action) => (
            <li key={action.id} className="py-3">
              <time dateTime={action.action_date}>{action.action_date}</time>
              <span> · {action.title} · {action.status}</span>
              {action.can_manage ? <span className="block"><a href="/actions/history">{en ? "Open action history" : "Ouvrir l’historique des actions"}</a></span> : null}
              {canManage && action.can_manage ? <div className="mt-2 flex flex-wrap gap-2">
                <CmmButton href={`/actions/new?tab=before&duplicateFrom=${encodeURIComponent(action.id)}&organizationId=${encodeURIComponent(workspace.id)}${action.site_id ? `&siteId=${encodeURIComponent(action.site_id)}` : ""}`} size="sm">{duplicateLabel}</CmmButton>
                {onUnlinkAction ? <CmmButton tone="critical" size="sm" disabled={busy} onClick={() => { if (window.confirm(unlinkConfirmation)) onUnlinkAction(action.id, action.site_id); }}>{unlinkAction}</CmmButton> : null}
              </div> : null}
            </li>
          ))}
        </ul>
      ) : <p>{noActions}</p>}
      <nav aria-label={en ? "Collection pages" : "Pages de collectes"} className="flex gap-3">
        <button type="button" disabled={busy || offset === 0} onClick={() => onPage("previous")}>{previous}</button>
        <button type="button" disabled={busy || !workspace.actions_has_more} onClick={() => onPage("next")}>{next}</button>
      </nav>
    </CmmCard>
  );
}
