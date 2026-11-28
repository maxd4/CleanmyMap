import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { OrganizationWorkspace } from "@/lib/organizations/contracts";

export function OrganizationCollectionsPanel({
  workspace,
  locale,
  busy,
  offset,
  onPage,
}: {
  workspace: OrganizationWorkspace;
  locale: "fr" | "en";
  busy: boolean;
  offset: number;
  onPage: (direction: "previous" | "next") => void;
}) {
  const en = locale === "en";
  const canManage = workspace.role !== "member";
  const title = en ? "Organization collections" : "Collectes de l’organisation";
  const noActions = en ? "No collections on this page." : "Aucune collecte sur cette page.";
  const pending = en ? "Shared collection details are temporarily unavailable while the workspace updates." : "Les collectes partagées sont temporairement indisponibles pendant la mise à jour de l’espace.";
  const previous = en ? "Previous" : "Précédent";
  const next = en ? "Next" : "Suivant";

  return (
    <CmmCard className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {canManage ? <CmmButton href="/actions/new?tab=before">{en ? "Prepare a collection" : "Préparer une collecte"}</CmmButton> : null}
      </div>
      {workspace.collections_available === false ? <p role="status">{pending}</p> : workspace.actions.length ? (
        <ul className="divide-y divide-border">
          {workspace.actions.map((action) => (
            <li key={action.id} className="py-3">
              <time dateTime={action.action_date}>{action.action_date}</time>
              <span> · {action.title} · {action.status}</span>
              {action.can_manage ? <span className="block"><a href="/actions/history">{en ? "Open action history" : "Ouvrir l’historique des actions"}</a></span> : null}
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
