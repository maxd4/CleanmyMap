import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import type { FormState } from "../model";
import { buildPublicationSummary } from "./model";
import { buildPreparationDataFromForm } from "../payload";
import { buildPublicActionPracticalInformation } from "@/lib/actions/participation/group-participation-public-projection";
import { ActionCreationLegalPanel } from "../../action-creation-legal-panel";
import { deriveActionFormalitiesFacts } from "@/lib/actions/formalities-facts";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities-qualification";

export function ActionBeforeVerificationSection({
  form,
  submissionState,
  validationIssues,
  errorMessage,
  guidedReadiness,
  isAuthenticated,
  signInHref,
  signUpHref,
  actionId,
  updateField,
  onFormalitiesReadiness,
}: {
  form: FormState;
  submissionState: "idle" | "pending" | "success" | "error";
  validationIssues: string[];
  errorMessage: string | null;
  guidedReadiness: "unknown" | "ready" | "blocked";
  isAuthenticated: boolean;
  signInHref?: string;
  signUpHref?: string;
  actionId?: string | null;
  updateField: (key: "formalitiesContext", value: ActionFormalitiesFacts | null) => void;
  onFormalitiesReadiness?: (readiness: { known: boolean; blocked: boolean }) => void;
}) {
  const summary = buildPublicationSummary(form);
  const draftFacts = form.formalitiesContext ?? deriveActionFormalitiesFacts({
    plannedObjective: form.plannedObjective,
    placeType: form.placeType,
  });
  const publicInformation = buildPublicActionPracticalInformation(buildPreparationDataFromForm(form));
  const corrections = [
    ...validationIssues,
    ...(guidedReadiness === "blocked" ? ["Une formalité démontrée comme requise reste à déclarer envoyée."] : []),
  ];
  const checks = guidedReadiness === "unknown"
    ? ["La qualification serveur sera confirmée après l’enregistrement de l’action."]
    : [];
  const suggestions = [
    ...(!publicInformation.participantMessage ? ["Ajouter un message pratique visible par les bénévoles."] : []),
    ...(publicInformation.accessibilityStatus === "not_evaluated" ? ["Renseigner les conditions d’accessibilité si elles sont connues."] : []),
  ];
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

        <div className="grid gap-3 lg:grid-cols-3" data-testid="action-publication-review-groups">
          <ReviewGroup title="À corriger avant publication" tone="rose" items={corrections.length > 0 ? corrections : ["Aucun blocage démontré."]} />
          <ReviewGroup title="À vérifier" tone="amber" items={checks.length > 0 ? checks : ["Les informations affichées sont issues des données actuellement saisies."]} />
          <ReviewGroup title="Suggestions" tone="sky" items={suggestions.length > 0 ? suggestions : ["Aucune suggestion supplémentaire."]} />
        </div>

        <div className="rounded-2xl border border-sky-200/70 bg-sky-50/60 px-4 py-4" data-testid="action-volunteer-preview">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-sky-700">Aperçu bénévole</p><h3 className="mt-1 text-lg font-black text-sky-950">Informations pratiques publiques</h3></div><CmmPill tone="sky" size="sm">Sans notes internes</CmmPill></div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <PreviewValue label="Message" value={publicInformation.participantMessage ?? "Non renseigné"} />
            <PreviewValue label="Sécurité" value={publicInformation.safetyInstructions ?? "Aucune consigne principale renseignée"} />
            <PreviewValue label="Matériel à apporter" value={[publicInformation.materialsToBring, ...publicInformation.derivedMaterials, ...(publicInformation.suggestedMaterials ?? [])].filter(Boolean).join(" · ") || "Non renseigné"} />
            <PreviewValue label="Accessibilité" value={publicInformation.accessibility ?? "Non évaluée"} />
          </dl>
        </div>

        <ActionCreationLegalPanel
          actionId={actionId}
          draftFacts={draftFacts}
          onDraftFactsChange={(facts) => updateField("formalitiesContext", facts)}
          onReadinessChange={onFormalitiesReadiness}
        />

        {corrections.length > 0 || errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950" role="alert">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} aria-hidden="true" />Certains éléments doivent être traités avant la publication.</div>
            {corrections.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{corrections.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
            {errorMessage && corrections.length === 0 ? <p className="mt-2 text-xs">{errorMessage}</p> : null}
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

function ReviewGroup({ title, tone, items }: { title: string; tone: "rose" | "amber" | "sky"; items: string[] }) {
  const classes = tone === "rose"
    ? "border-rose-200 bg-rose-50 text-rose-950"
    : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-sky-200 bg-sky-50 text-sky-950";
  return <section className={`rounded-2xl border px-4 py-3 ${classes}`}><h3 className="text-sm font-black">{title}</h3><ul className="mt-2 space-y-1 text-xs leading-5">{items.map((item) => <li key={item}>• {item}</li>)}</ul></section>;
}

function PreviewValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-black uppercase tracking-[0.1em] text-sky-700">{label}</dt><dd className="mt-1 whitespace-pre-line leading-5 text-sky-950">{value}</dd></div>;
}
