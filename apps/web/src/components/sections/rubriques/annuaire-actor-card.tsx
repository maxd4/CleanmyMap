import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import {
  CONTRIBUTION_LABELS,
  ENTITY_LABELS,
  VERIFICATION_LABELS,
  formatCoverage,
  formatFreshness,
} from "./annuaire-helpers";

type AnnuaireActorCardProps = {
  entry: EnrichedAnnuaireEntry;
  onFocusMap: (entryId: string) => void;
  showInternalContact: boolean;
};
export function AnnuaireActorCard({
  entry,
  onFocusMap,
  showInternalContact,
}: AnnuaireActorCardProps) {

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{entry.name}</h4>
        <div className="flex flex-wrap gap-1 text-[11px]">
          <span className="rounded bg-white px-2 py-0.5 font-medium text-slate-700 border border-slate-200">
            {ENTITY_LABELS[entry.kind]}
          </span>
          <span className="rounded bg-white px-2 py-0.5 font-medium text-indigo-700 border border-indigo-200">
            {VERIFICATION_LABELS[entry.verificationStatus]}
          </span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-700 sm:grid-cols-2">
        <p>
          <span className="font-semibold">Zone:</span>{" "}
          {formatCoverage(entry.coveredArrondissements, entry.location)}
        </p>
        <p>
          <span className="font-semibold">Disponibilite:</span> {entry.availability}
        </p>
        <p className="sm:col-span-2">
          <span className="font-semibold">Contribution:</span>{" "}
          {entry.contributionTypes.map((item) => CONTRIBUTION_LABELS[item]).join(", ")}
        </p>
        <p className="sm:col-span-2">
          <span className="font-semibold">Contact:</span>{" "}
          <a
            href={entry.primaryChannel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline"
          >
            {entry.primaryChannel.label} ({entry.primaryChannel.platform})
          </a>
        </p>
        <p className="sm:col-span-2 text-[11px] text-slate-500">
          MAJ: {entry.lastUpdatedAt} - {formatFreshness(entry.lastUpdatedAt)}
        </p>
        {showInternalContact && entry.internalAdminContact ? (
          <div className="sm:col-span-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
            <p className="font-semibold">Interne admin/elus</p>
            <p>
              Referent: {entry.internalAdminContact.referentName} | Email:{" "}
              {entry.internalAdminContact.email} | Tel:{" "}
              {entry.internalAdminContact.phone}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={() => onFocusMap(entry.id)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Voir sur la carte
        </button>
        <a
          href={`/actions/map?actor=${encodeURIComponent(entry.name)}`}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-800 hover:bg-blue-100"
        >
          Voir impact concret
        </a>
        <a
          href={entry.primaryChannel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700"
        >
          Contacter
        </a>
        <a
          href={`mailto:partenaires@cleanmymap.fr?subject=Proposer un partenariat - ${encodeURIComponent(entry.name)}`}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Proposer un partenariat
        </a>
      </div>
    </article>
  );
}
