import { ClipboardList, ChevronRight, Loader2, X } from "lucide-react";
import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";
import { CmmButton } from "@/components/ui/cmm-button";
import { getActionDisplayStatus } from "./rejoindre-un-formulaire-section.status";

function ActionCardLeaveButton({
  item,
  fr,
  leaving,
  onRequestLeave,
}: {
  item: JoinableActionItem;
  fr: boolean;
  leaving: boolean;
  onRequestLeave: (actionId: string) => void;
}) {
  return (
    <CmmButton
      tone="secondary"
      variant="pill"
      className="min-w-[12rem] px-5"
      disabled={leaving}
      onClick={() => onRequestLeave(item.id)}
    >
      {leaving ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          {fr ? "Retrait..." : "Leaving..."}
        </>
      ) : item.joined ? (
        <>
          <X size={14} />
          {fr ? "Annuler mon inscription" : "Cancel my registration"}
        </>
      ) : (
        <>
          <X size={14} />
          {fr ? "Annuler ma demande" : "Cancel request"}
        </>
      )}
    </CmmButton>
  );
}
function ActionCardJoinButton({
  item,
  fr,
  joining,
  onRequestJoin,
}: {
  item: JoinableActionItem;
  fr: boolean;
  joining: boolean;
  onRequestJoin: (actionId: string) => void;
}) {
  return (
    <CmmButton
      tone="primary"
      variant="pill"
      className="min-w-[12rem] px-5"
      disabled={joining}
      onClick={() => onRequestJoin(item.id)}
    >
      {joining ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          {fr ? "Envoi..." : "Saving..."}
        </>
      ) : (
        <>
          <ClipboardList size={14} />
          {fr ? "Demander à s'inscrire" : "Request registration"}
        </>
      )}
    </CmmButton>
  );
}

function ActionCardPrimaryAction({
  item,
  status,
  fr,
  authenticated,
  isPreAction,
  isPendingInvitation,
  joining,
  leaving,
  onRequestJoin,
  onRequestLeave,
}: {
  item: JoinableActionItem;
  status: ReturnType<typeof getActionDisplayStatus>;
  fr: boolean;
  authenticated: boolean;
  isPreAction: boolean;
  isPendingInvitation: boolean;
  joining: boolean;
  leaving: boolean;
  onRequestJoin: (actionId: string) => void;
  onRequestLeave: (actionId: string) => void;
}) {
  if (!isPreAction || status === "closed") {
    return (
      <CmmButton href="/actions/history" tone="secondary" variant="pill" className="min-w-[12rem] px-5">
        <span className="flex items-center gap-2">
          {fr ? "Voir les détails" : "View details"}
          <ChevronRight size={16} />
        </span>
      </CmmButton>
    );
  }
  if (!authenticated) {
    return (
      <CmmButton href="/sign-in" tone="primary" variant="pill" className="min-w-[12rem] px-5">
        <span className="flex items-center gap-2">
          <ClipboardList size={14} />
          {fr ? "Se connecter" : "Sign in"}
        </span>
      </CmmButton>
    );
  }
  if (isPendingInvitation) {
    return (
      <p className="max-w-[12rem] text-right text-xs font-semibold leading-relaxed text-amber-800">
        {fr ? "Répondez depuis la notification d’invitation." : "Respond from the invitation notification."}
      </p>
    );
  }
  if (item.joined || item.awaitingApproval) {
    return <ActionCardLeaveButton item={item} fr={fr} leaving={leaving} onRequestLeave={onRequestLeave} />;
  }
  return <ActionCardJoinButton item={item} fr={fr} joining={joining} onRequestJoin={onRequestJoin} />;
}

export function ActionCardActions({
  item,
  status,
  fr,
  authenticated,
  isPreAction,
  isPendingInvitation,
  joining,
  leaving,
  onRequestJoin,
  onRequestLeave,
  onShareAction,
}: {
  item: JoinableActionItem;
  status: ReturnType<typeof getActionDisplayStatus>;
  fr: boolean;
  authenticated: boolean;
  isPreAction: boolean;
  isPendingInvitation: boolean;
  joining: boolean;
  leaving: boolean;
  onRequestJoin: (actionId: string) => void;
  onRequestLeave: (actionId: string) => void;
  onShareAction?: (actionId: string) => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 md:items-end">
      <ActionCardPrimaryAction
        item={item}
        status={status}
        fr={fr}
        authenticated={authenticated}
        isPreAction={isPreAction}
        isPendingInvitation={isPendingInvitation}
        joining={joining}
        leaving={leaving}
        onRequestJoin={onRequestJoin}
        onRequestLeave={onRequestLeave}
      />
      {authenticated && isPreAction && item.joined ? (
        <CmmButton
          href={`/actions/new?space=day&actionId=${encodeURIComponent(item.id)}`}
          tone="secondary"
          variant="pill"
          size="sm"
        >
          {fr ? "Ouvrir Jour J" : "Open action day"}
        </CmmButton>
      ) : null}
      {onShareAction ? (
        <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => onShareAction(item.id)}>
          {fr ? "Partager dans la messagerie" : "Share in messaging"}
        </CmmButton>
      ) : null}
    </div>
  );
}
