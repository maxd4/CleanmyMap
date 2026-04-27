type ActionDeclarationQualityReviewSectionProps = {
 warnings: string[];
};

export function ActionDeclarationQualityReviewSection({
 warnings,
}: ActionDeclarationQualityReviewSectionProps) {
 return (
 <section className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Aide à la relecture
 </p>
 <p className="cmm-text-small cmm-text-secondary">
 Informations facultatives qui aident l&apos;équipe à vérifier la déclaration.
 </p>
 </div>
 </div>

 {warnings.length > 0 ? (
 <div className="mt-4 cmm-text-small cmm-text-secondary">
 <p>
 Cette déclaration est envoyable, mais ces éléments peuvent aider l&apos;administration :
 </p>
 <ul className="mt-3 list-disc space-y-2 pl-5">
 {warnings.map((warning) => (
 <li key={warning}>{warning}</li>
 ))}
 </ul>
 <p className="mt-3 cmm-text-caption cmm-text-muted">
 Envoi possible sans photo ni position précise. Ces informations facilitent la validation.
 </p>
 </div>
 ) : (
 <p className="mt-4 cmm-text-small cmm-text-muted">
 Bonne base. L&apos;équipe devrait pouvoir traiter cette déclaration rapidement.
 </p>
 )}
 </section>
 );
}
