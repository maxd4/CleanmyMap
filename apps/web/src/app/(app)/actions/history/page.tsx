import { ActionsHistoryList } from "@/components/actions/actions-history-list";

export default function ActionsHistoryPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Parcours prioritaire</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Historique bénévole</h1>
        <p className="mt-2 text-sm text-slate-600">
          Consultation des déclarations avec filtres de statut et recherche rapide.
        </p>
      </section>

      <ActionsHistoryList />
    </div>
  );
}
