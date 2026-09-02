export function AnalyticsCockpitEmptyState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
      <p className="text-sm font-bold text-slate-700">Aucune tendance disponible</p>
      <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
        Le flux mensuel apparaîtra lorsque des actions approuvées seront disponibles.
      </p>
    </div>
  );
}
