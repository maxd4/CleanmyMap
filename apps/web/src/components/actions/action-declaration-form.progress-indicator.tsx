export function ActionDeclarationProgressIndicator() {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center cmm-text-small font-semibold text-emerald-900">
        1. Localiser
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center cmm-text-small font-semibold cmm-text-secondary">
        2. Tracer
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center cmm-text-small font-semibold cmm-text-secondary">
        3. Valider
      </div>
    </div>
  );
}
