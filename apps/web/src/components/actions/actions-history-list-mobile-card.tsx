import { CmmBadge } from "@/components/ui/cmm-badge";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import { formatScorePercent } from "@/lib/formatters/score";
import type { ActionQualityResult } from "./actions-history-list-table-row";
import {
  buildJoinHref,
  canManageGroupJoin,
  formatActionStatus,
  formatDate,
  formatRecordType,
  isJoinableAction,
  qualityTone,
} from "./actions-history-list.helpers";

type ActionsHistoryListMobileCardProps = {
  item: ActionListItem;
  quality?: ActionQualityResult;
  isSelected?: boolean;
  currentUserId: string | null;
  isAdminLikeUser: boolean;
  groupJoinActionId: string | null;
  onSelectItem: (itemId: string) => void;
  onToggleGroupJoin: (item: ActionListItem, nextEnabled: boolean) => void;
};

export function ActionsHistoryListMobileCard({
  item,
  quality,
  isSelected = false,
  currentUserId,
  isAdminLikeUser,
  groupJoinActionId,
  onSelectItem,
  onToggleGroupJoin,
}: ActionsHistoryListMobileCardProps) {
  const wasteKg = mapItemWasteKg(item as ActionMapItem);
  const butts = mapItemCigaretteButts(item as ActionMapItem);

  return (
    <CmmCard
      as="article"
      size="sm"
      tone={isSelected ? "emerald" : "slate"}
      className="space-y-2.5 p-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="cmm-text-caption font-medium cmm-text-muted">
          {formatDate(item.action_date)} · {formatRecordType(item)}
        </span>
        <div className="flex items-center gap-1.5">
          <CmmBadge tone="slate" shape="pill">
            <span className="whitespace-nowrap">{formatActionStatus(item.status)}</span>
          </CmmBadge>
          {quality ? (
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 cmm-text-caption font-semibold ${qualityTone(
                quality.grade,
              )}`}
            >
              {quality.grade} · {formatScorePercent(quality.score)}
            </span>
          ) : null}
        </div>
      </div>

      <h3 className="cmm-text-small font-semibold cmm-text-primary leading-snug">
        {item.location_label}
      </h3>

      <p className="cmm-text-caption cmm-text-secondary">
        {item.actor_name || "Anonyme"}
        {" · "}
        {wasteKg !== null ? `${Number(wasteKg).toFixed(1)} kg` : "0 kg"}
        {" · "}
        {butts !== null ? `${butts} mégots` : "0 mégot"}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <CmmButton
          type="button"
          tone="secondary"
          size="sm"
          onClick={() => onSelectItem(item.id)}
        >
          Voir détails
        </CmmButton>
        {item.status === "approved" && item.record_type === "action" ? (
          <>
            {isJoinableAction(item) ? (
              <CmmButton
                href={buildJoinHref(item.id)}
                tone="primary"
                size="sm"
                variant="pill"
              >
                Rejoindre
              </CmmButton>
            ) : null}
            {canManageGroupJoin(item, currentUserId, isAdminLikeUser) ? (
              <CmmButton
                type="button"
                tone="primary"
                size="sm"
                variant="pill"
                loading={groupJoinActionId === item.id}
                onClick={() =>
                  onToggleGroupJoin(
                    item,
                    item.contract?.metadata.groupJoinEnabled === false,
                  )
                }
              >
                {groupJoinActionId === item.id
                  ? item.contract?.metadata.groupJoinEnabled === false
                    ? "Réouverture…"
                    : "Fermeture…"
                  : item.contract?.metadata.groupJoinEnabled === false
                    ? "Rouvrir"
                    : "Fermer"}
              </CmmButton>
            ) : null}
          </>
        ) : null}
      </div>
    </CmmCard>
  );
}
