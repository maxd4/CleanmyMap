import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import type {
  ActionQualityGrade,
  ActionStatus,
} from "@/lib/actions/types";
import type { ActionsHistoryListQueryModel } from "./use-actions-history-list-query";

type ActionsHistoryListControlsProps = {
  partialSource: boolean | undefined;
  partialSourcesLabel: string;
  query: ActionsHistoryListQueryModel;
  pdfData: Parameters<typeof RubriquePdfExportButton>[0]["data"];
};

export function ActionsHistoryListControls({
  partialSource,
  partialSourcesLabel,
  query,
  pdfData,
}: ActionsHistoryListControlsProps) {
  const {
    error,
    isLoading,
    isValidating,
    reload,
    statusFilter,
    qualityFilter,
    toFixOnly,
    search,
    approvedFilteredItems,
    setStatusFilter,
    setQualityFilter,
    setToFixOnly,
    setSearch,
  } = query;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {partialSource ? (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-amber-900">
              Sources partielles: {partialSourcesLabel}
            </span>
          ) : null}
          <h2 className="text-xl font-semibold cmm-text-primary">Historique des actions</h2>
          <p className="mt-1 cmm-text-small cmm-text-secondary">
            Vue filtrable avec score qualite par action (A/B/C).
          </p>
        </div>
        <button
          onClick={() => void reload()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
        >
          {isValidating ? "Actualisation..." : "Rafraichir"}
        </button>
      </div>

      <div className="mt-4">
        <RubriquePdfExportButton
          rubrique="historique_terrain"
          periode={`filtre_${statusFilter}_${new Date().getFullYear()}`}
          organizationType="profil"
          defaultTitle="Rapport historique terrain"
          data={pdfData}
          disabled={isLoading || Boolean(error) || approvedFilteredItems.length === 0}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
          Statut
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ActionStatus | "all")}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Tous</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
          Grade qualite
          <select
            value={qualityFilter}
            onChange={(event) => setQualityFilter(event.target.value as ActionQualityGrade | "all")}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Tous</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
          Priorite correction
          <button
            type="button"
            onClick={() => setToFixOnly((previous) => !previous)}
            className={`rounded-lg border px-3 py-2 text-left cmm-text-small font-semibold transition ${
              toFixOnly
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-slate-300 bg-white cmm-text-secondary hover:bg-slate-100"
            }`}
          >
            {toFixOnly ? "Actif: a corriger" : "Tous les enregistrements"}
          </button>
        </label>

        <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary md:col-span-2">
          Recherche rapide
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom ou lieu"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          />
        </label>
      </div>
    </>
  );
}
