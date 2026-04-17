"use client";

import { ActionDeclarationCommonFields } from "@/components/actions/action-declaration/action-declaration-common-fields";
import { ActionDeclarationCompleteSection } from "@/components/actions/action-declaration/action-declaration-complete-section";
import { ActionDeclarationQuickSection } from "@/components/actions/action-declaration/action-declaration-quick-section";
import { useActionDeclarationForm } from "@/components/actions/action-declaration/use-action-declaration-form";
import type { ActionDeclarationFormProps } from "@/components/actions/action-declaration/types";

export function ActionDeclarationForm({
  actorNameOptions,
  defaultActorName,
  clerkIdentityLabel,
  clerkUserId,
  linkedEventId,
  initialMode = "quick",
}: ActionDeclarationFormProps) {
  const controller = useActionDeclarationForm({
    actorNameOptions,
    defaultActorName,
    clerkUserId,
    linkedEventId,
    initialMode,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Declarer une action</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enregistrez votre action terrain pour l&apos;historique benevole. Le
        statut initial est <span className="font-semibold">pending</span>.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Compte Clerk actif:{" "}
        <span className="font-semibold">{clerkIdentityLabel}</span> (
        <span className="font-mono">{clerkUserId}</span>)
      </p>
      {linkedEventId ? (
        <p className="mt-2 text-xs text-emerald-700">
          Declaration liee a l&apos;evenement:{" "}
          <span className="font-mono">{linkedEventId}</span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => controller.setDeclarationMode("quick")}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            controller.isQuickMode
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Rapide &lt;60s
        </button>
        <button
          type="button"
          onClick={() => controller.setDeclarationMode("complete")}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            !controller.isQuickMode
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Complet avec preuve
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {controller.isQuickMode
          ? "Mode rapide: champs essentiels, validation souple pendant la saisie."
          : "Mode complet: geolocalisation detaillee, trace/polygone et informations additionnelles."}
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={controller.onSubmit}>
        <ActionDeclarationCommonFields
          form={controller.form}
          updateField={controller.updateField}
          resolvedActorOptions={controller.resolvedActorOptions}
          isEntrepriseMode={controller.isEntrepriseMode}
        />

        {controller.isQuickMode ? (
          <ActionDeclarationQuickSection
            form={controller.form}
            updateField={controller.updateField}
          />
        ) : (
          <ActionDeclarationCompleteSection
            form={controller.form}
            updateField={controller.updateField}
            manualDrawingEnabled={controller.manualDrawingEnabled}
            setManualDrawingEnabled={controller.setManualDrawingEnabled}
            effectiveManualDrawingEnabled={controller.effectiveManualDrawingEnabled}
            manualDrawing={controller.manualDrawing}
            setManualDrawing={controller.setManualDrawing}
            drawingIsValid={controller.drawingIsValid}
          />
        )}

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={controller.submissionState === "pending"}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {controller.submissionState === "pending"
              ? "Envoi en cours..."
              : controller.isQuickMode
                ? "Envoyer rapidement"
                : "Partager mon action"}
          </button>

          {controller.submissionState === "success" && controller.createdId ? (
            <p className="text-sm font-medium text-emerald-700">
              Action enregistree. Reference:{" "}
              <span className="font-mono">{controller.createdId}</span>
            </p>
          ) : null}

          {controller.submissionState === "error" && controller.errorMessage ? (
            <p className="text-sm font-medium text-rose-700">
              {controller.errorMessage}
            </p>
          ) : null}
        </div>
      </form>

      {controller.hasAttemptedSubmit && controller.validationIssues.length > 0 ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="font-semibold">Correction requise avant envoi:</p>
          <ul className="mt-1 list-disc pl-5">
            {controller.validationIssues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {controller.optimisticLabel ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Declaration en preparation pour{" "}
          <span className="font-semibold">{controller.optimisticLabel}</span>...
        </div>
      ) : null}
    </section>
  );
}
