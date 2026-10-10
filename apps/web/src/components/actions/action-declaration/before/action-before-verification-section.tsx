import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import type { FormState } from "../model";
import { buildPublicationSummary } from "./model";

export function ActionBeforeVerificationSection({
  form,
  submissionState,
  validationIssues,
  errorMessage,
  guidedReadiness,
  isAuthenticated,
  signInHref,
  signUpHref,
}: {
  form: FormState;
  submissionState: "idle" | "pending" | "success" | "error";
  validationIssues: string[];
  errorMessage: string | null;
  guidedReadiness: "unknown" | "ready" | "blocked";
  isAuthenticated: boolean;
  signInHref?: string;
  signUpHref?: string;
}) {
  const summary = buildPublicationSummary(form);
  const readinessLabel = guidedReadiness === "ready" ? "Complet" : guidedReadiness === "blocked" ? "À vérifier" : "À compléter";
  const readinessTone = guidedReadiness === "ready" ? "emerald" : "amber";

  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-700">Vérifier et publier</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-emerald-950">Un dernier regard sur votre action</h3>
            <p className="cmm-text-body cmm-text-primary mt-2 max-w-2xl">Les formalités et les contrôles restent distincts de l’enregistrement. Vous pouvez enregistrer maintenant et reprendre cette même action plus tard.</p>
          </div>
          <CmmPill tone={readinessTone} size="sm">{readinessLabel}</CmmPill>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2" data-testid="action-creation-preview-summary">
          {summary.map((item) => (
            <div key={item.label} className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3">
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{item.label}</dt>
              <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-950">{item.value}</dd>
            </div>
          ))}
        </dl>

        {validationIssues.length > 0 || errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950" role="alert">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} aria-hidden="true" />Complétez les éléments signalés avant l’enregistrement.</div>
            {validationIssues.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{validationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
            {errorMessage && validationIssues.length === 0 ? <p className="mt-2 text-xs">{errorMessage}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/70 bg-white/90 px-4 py-3">
          <div className="flex items-start gap-2 text-sm text-emerald-900/75"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /><span>La publication reste explicite et ne crée jamais une seconde action.</span></div>
          <div className="flex flex-wrap gap-2">
            {!isAuthenticated ? <><CmmButton href={signInHref} tone="primary" variant="pill" size="sm">Se connecter et reprendre</CmmButton><CmmButton href={signUpHref} tone="secondary" variant="pill" size="sm">Créer un compte</CmmButton></> : null}
            <CmmButton type="submit" tone="primary" variant="pill" size="md" disabled={submissionState === "pending"}>
              {submissionState === "pending" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}
              {submissionState === "pending" ? "Enregistrement…" : "Enregistrer la préparation"}
            </CmmButton>
          </div>
        </div>
      </div>
    </CmmCard>
  );
}
