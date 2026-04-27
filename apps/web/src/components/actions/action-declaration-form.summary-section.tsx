import type { FormState } from"./action-declaration-form.model";

type ActionDeclarationSummarySectionProps = {
 form: FormState;
 routeSummary: string;
 advancedPrecisionSummary: string;
 photoCount: number;
 onNotesChange: (value: string) => void;
};

export function ActionDeclarationSummarySection({
 form,
 routeSummary,
 advancedPrecisionSummary,
 photoCount,
 onNotesChange,
}: ActionDeclarationSummarySectionProps) {
 return (
 <section className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Valider
 </p>
 <p className="cmm-text-small cmm-text-secondary">
 Relis les informations avant l&apos;envoi.
 </p>
 </div>
 <span className="rounded-full bg-white px-3 py-1 cmm-text-caption font-semibold cmm-text-secondary">
 prêt
 </span>
 </div>

 <label className="mt-4 flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Détails pour l&apos;équipe (optionnel)
 <textarea
 className="min-h-[110px] rounded-xl border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.notes}
 onChange={(event) => onNotesChange(event.target.value)}
 maxLength={1000}
 placeholder="Si le parcours est difficile à tracer sur mobile, décris ici les étapes et les points clés."
 />
 <span className="cmm-text-caption cmm-text-muted">
 Ces détails ne sont pas obligatoires, mais ils aident les admins à comprendre le ramassage.
 </span>
 </label>

 <div className="mt-4 grid gap-3 md:grid-cols-2">
 <div className="rounded-xl border border-white/70 bg-white p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Parcours
 </p>
 <p className="mt-1 cmm-text-small font-semibold cmm-text-primary">{routeSummary}</p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 {form.routeStyle ==="direct" ?"Direct" :"Souple"}
 </p>
 </div>
 <div className="rounded-xl border border-white/70 bg-white p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Quantité
 </p>
 <p className="mt-1 cmm-text-small font-semibold cmm-text-primary">
 {form.wasteKg ||"0"} kg collectés
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 Bénévoles: {form.volunteersCount ||"1"} · {form.durationMinutes ||"0"} min
 </p>
 </div>
 <div className="rounded-xl border border-white/70 bg-white p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Entraînement IA
 </p>
 <p className="mt-1 cmm-text-small font-semibold cmm-text-primary">
 {photoCount} photo(s)
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">{advancedPrecisionSummary}</p>
 </div>
 <div className="rounded-xl border border-white/70 bg-white p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Mégots
 </p>
 <p className="mt-1 cmm-text-small font-semibold cmm-text-primary">
 {form.wasteMegotsKg ||"0"} {Number(form.wasteMegotsKg) > 1 ?"kg" :"kg"}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 {form.wasteMegotsCondition}
 </p>
 </div>
 </div>
 </section>
 );
}
