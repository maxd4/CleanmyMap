import type {
  ModerationActionStatus,
  ModerationCleanPlaceStatus,
  ModerationEntityType,
} from "@/lib/admin/moderation-client";
import type { AdminWorkflowController } from "./types";

type StepConfirmProps = {
  workflow: AdminWorkflowController;
};

export function StepConfirm({ workflow }: StepConfirmProps) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Etape 3 - Confirmer
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void workflow.onDownloadCsv()}
          disabled={workflow.csvState === "pending"}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {workflow.csvState === "pending"
            ? "Preparation CSV..."
            : "Confirmer export CSV"}
        </button>
        <button
          onClick={() => void workflow.onDownloadJson()}
          disabled={workflow.jsonState === "pending"}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {workflow.jsonState === "pending"
            ? "Preparation JSON..."
            : "Confirmer export JSON"}
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Import: dry-run obligatoire
        </p>
        <p className="mt-1 text-sm text-slate-600">
          1) Previsualiser (dry-run) 2) Verifier le resume 3) Confirmer
          l&apos;import.
        </p>
        <textarea
          value={workflow.importPayload}
          onChange={(event) => workflow.setImportPayload(event.target.value)}
          rows={8}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none transition focus:border-emerald-500"
          spellCheck={false}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void workflow.onImportDryRun()}
            disabled={workflow.importDryRunState === "pending"}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
          >
            {workflow.importDryRunState === "pending"
              ? "Dry-run..."
              : "Previsualiser (dry-run)"}
          </button>
          <button
            onClick={() => void workflow.onImportPastActions()}
            disabled={workflow.importState === "pending" || !workflow.canConfirmImport}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {workflow.importState === "pending" ? "Import..." : "Confirmer import"}
          </button>
        </div>
        <label className="mt-3 flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Confirmation explicite
          <input
            value={workflow.importConfirmationText}
            onChange={(event) =>
              workflow.setImportConfirmationText(event.target.value)
            }
            placeholder="Taper: CONFIRMER IMPORT"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-800 outline-none transition focus:border-emerald-500"
          />
        </label>

        {workflow.importPreview ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <p className="font-semibold">Dry-run valide</p>
            <p>
              {workflow.importPreview.count} ligne(s) | Geo ok:{" "}
              {workflow.importPreview.stats.withCoordinates} | Geo manquante:{" "}
              {workflow.importPreview.stats.missingCoordinates}
            </p>
            <p>
              Volume: {workflow.importPreview.stats.totalWasteKg.toFixed(1)} kg |
              Megots: {workflow.importPreview.stats.totalButts} | Benevoles:{" "}
              {workflow.importPreview.stats.totalVolunteers}
            </p>
            <p>
              Periode: {workflow.importPreview.stats.dateMin ?? "n/a"} -&gt;{" "}
              {workflow.importPreview.stats.dateMax ?? "n/a"}
            </p>
            {workflow.importPreview.dryRunProof ? (
              <p>
                Jeton dry-run valable jusqu&apos;a{" "}
                {new Date(
                  workflow.importPreview.dryRunProof.expiresAt,
                ).toLocaleString("fr-FR")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Moderation: confirmation
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Entite
            <select
              value={workflow.moderationEntityType}
              onChange={(event) =>
                workflow.setModerationEntityType(
                  event.target.value as ModerationEntityType,
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
            >
              <option value="action">Action</option>
              <option value="clean_place">Lieu propre</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 md:col-span-2">
            ID de l&apos;entite
            <input
              value={workflow.moderationId}
              onChange={(event) => workflow.setModerationId(event.target.value)}
              placeholder="UUID/ID"
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none transition focus:border-emerald-500"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {workflow.moderationEntityType === "action" ? (
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Statut action
              <select
                value={workflow.actionStatus}
                onChange={(event) =>
                  workflow.setActionStatus(
                    event.target.value as ModerationActionStatus,
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
              >
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Statut lieu propre
              <select
                value={workflow.cleanPlaceStatus}
                onChange={(event) =>
                  workflow.setCleanPlaceStatus(
                    event.target.value as ModerationCleanPlaceStatus,
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
              >
                <option value="new">new</option>
                <option value="validated">validated</option>
                <option value="cleaned">cleaned</option>
              </select>
            </label>
          )}
          <div className="flex items-end">
            <button
              onClick={() => void workflow.onModerateEntity()}
              disabled={
                workflow.moderationState === "pending" ||
                !workflow.moderationConfirmed ||
                workflow.moderationConfirmationText.trim().toUpperCase() !==
                  "CONFIRMER MODERATION"
              }
              className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {workflow.moderationState === "pending"
                ? "Application..."
                : "Confirmer moderation"}
            </button>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={workflow.moderationConfirmed}
            onChange={(event) =>
              workflow.setModerationConfirmed(event.target.checked)
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Je confirme la moderation de cette entite.
        </label>
        <label className="mt-3 flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Phrase de confirmation
          <input
            value={workflow.moderationConfirmationText}
            onChange={(event) =>
              workflow.setModerationConfirmationText(event.target.value)
            }
            placeholder="Taper: CONFIRMER MODERATION"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-800 outline-none transition focus:border-emerald-500"
          />
        </label>
        {workflow.moderationResult ? (
          <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">
            {workflow.moderationResult}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
