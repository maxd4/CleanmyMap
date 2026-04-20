import { SmartRoutingMap } from "@/components/actions/smart-routing-map";
import { Navigation } from "lucide-react";

export default function RoutePage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-widest text-xs">
          <Navigation size={16} />
          PLANIFICATION TACTIQUE
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-none">
          Votre Itinéraire IA.
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          Concentrez votre énergie là où l'impact est maximal. Notre moteur analyse les signalements récents pour vous proposer le trajet de collecte le plus efficace.
        </p>
      </header>

      <SmartRoutingMap />

      <footer className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm text-slate-500 italic">
        <strong>Note technique :</strong> L'algorithme privilégie les zones à fort score de pollution (mégots et masse) situées à moins de 2km de votre position. La durée estimée inclut le temps de marche et une estimation moyenne de temps de ramassage par point.
      </footer>
    </div>
  );
}
