"use client";

import { ShieldCheck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  teamRefereeStatusLabel,
  type SpogomiTeamRefereeCandidate,
  type SpogomiTeamRefereeStatus,
} from "@/lib/spogomi/team-referees";

type Props = {
  teamId?: string;
  teamName?: string;
  divisionId?: string;
  divisionType?: "casual" | "world_cup";
  status: SpogomiTeamRefereeStatus;
  refereeDisplayName?: string | null;
  refereeClerkId?: string | null;
  conflictReason?: string | null;
  showIdentity?: boolean;
  editable?: boolean;
  busy?: boolean;
  candidates?: SpogomiTeamRefereeCandidate[];
  onAssign?: (refereeClerkId: string) => void;
  onRevoke?: () => void;
};

const badgeToneByStatus: Record<SpogomiTeamRefereeStatus, string> = {
  to_assign: "border-amber-300 bg-amber-100 text-amber-950",
  pending_validation: "border-orange-300 bg-orange-100 text-orange-950",
  assigned: "border-emerald-300 bg-emerald-100 text-emerald-950",
  unavailable: "border-rose-300 bg-rose-100 text-rose-950",
};

export function SpogomiTeamRefereeSlot({
  teamId,
  teamName,
  divisionId,
  divisionType,
  status,
  refereeDisplayName,
  refereeClerkId,
  conflictReason,
  showIdentity = false,
  editable = false,
  busy = false,
  candidates = [],
  onAssign,
  onRevoke,
}: Props) {
  const scopedCandidates = divisionId
    ? candidates.filter((candidate) => candidate.divisionId === divisionId)
    : candidates;
  const label = teamRefereeStatusLabel(status);
  const canSelect = editable && Boolean(teamId) && !teamId?.startsWith("local-team-") && Boolean(onAssign);

  return (
    <div
      className="mt-3 space-y-2 rounded-xl border-2 border-orange-400 bg-orange-50/85 p-3 text-sm text-orange-950"
      aria-label={`Arbitre référent${teamName ? ` pour ${teamName}` : ""} : ${label}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-black text-orange-950">
          <ShieldCheck className="h-4 w-4 shrink-0 text-orange-700" aria-hidden="true" />
          <span>Arbitre référent</span>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeToneByStatus[status]}`}
        >
          {label}
        </span>
      </div>

      {showIdentity ? (
        <p className="text-xs font-semibold text-orange-950">
          {refereeDisplayName
            ? `Référent : ${refereeDisplayName}`
            : status === "to_assign"
              ? "Aucun arbitre référent affecté."
              : "Référent à vérifier."}
        </p>
      ) : (
        <p className="text-xs text-orange-900">
          {divisionType === "world_cup"
            ? "1 arbitre référent dédié en plus des 3 compétiteurs."
            : "Encadrement dédié hors effectif compétiteurs."}
        </p>
      )}

      {showIdentity && conflictReason ? (
        <p role="status" className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-900">
          {conflictReason}
        </p>
      ) : null}

      {showIdentity && canSelect ? (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <label className="min-w-[11rem] flex-1 text-xs font-bold text-orange-950">
            Affecter un arbitre habilité
            <select
              aria-label={`Arbitre référent de ${teamName ?? "l’équipe"}`}
              className="mt-1 min-h-11 w-full rounded-lg border border-orange-300 bg-white px-2.5 py-2 text-sm font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
              value={refereeClerkId ?? ""}
              disabled={busy}
              onChange={(event) => {
                if (event.target.value) onAssign?.(event.target.value);
              }}
            >
              <option value="">Choisir un arbitre habilité…</option>
              {scopedCandidates.map((candidate) => {
                const assignedElsewhere =
                  Boolean(candidate.assignedTeamId) && candidate.assignedTeamId !== teamId;
                return (
                  <option
                    key={candidate.clerkId}
                    value={candidate.clerkId}
                    disabled={assignedElsewhere}
                  >
                    {candidate.displayName}
                    {assignedElsewhere && candidate.assignedTeamName
                      ? ` (déjà affecté : ${candidate.assignedTeamName})`
                      : ""}
                  </option>
                );
              })}
            </select>
          </label>
          {refereeClerkId && onRevoke ? (
            <CmmButton
              type="button"
              size="sm"
              tone="secondary"
              disabled={busy}
              onClick={onRevoke}
            >
              Révoquer
            </CmmButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
