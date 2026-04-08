import { ActionsMapFeed } from "@/components/actions/actions-map-feed";

export default function ActionsMapPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Parcours prioritaire</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Vue terrain geolocalisee</h1>
        <p className="mt-2 text-sm text-slate-600">Vue cartographique des actions geolocalisees et des zones d&apos;intervention.</p>
      </section>

      <ActionsMapFeed />
    </div>
  );
}
