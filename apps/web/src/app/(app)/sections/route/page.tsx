import { SmartRoutingMap } from"@/components/actions/smart-routing-map";
import { Navigation } from"lucide-react";

export default function RoutePage() {
 return (
 <div className="w-full p-4 md:p-8 space-y-8">
 <header className="space-y-4">
 <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-widest cmm-text-caption">
 <Navigation size={16} />
 PLANIFICATION TACTIQUE
 </div>
 <h1 className="text-4xl md:text-5xl font-bold tracking-tight cmm-text-primary leading-none">
 Votre Itinéraire IA.
 </h1>
 <p className="text-lg cmm-text-secondary max-w-2xl">
 Concentrez votre énergie là où l&apos;impact est maximal. Notre moteur analyse les signalements récents pour vous proposer le trajet de collecte le plus efficace.
 </p>
 </header>

 <SmartRoutingMap />

 <footer className="bg-slate-50 border border-slate-200 rounded-2xl p-6 cmm-text-small cmm-text-muted italic">
 <strong>Note technique :</strong> L&apos;algorithme privilégie les zones à fort score de pollution (mégots et masse) situées à moins de 2km de votre position. La durée estimée inclut le temps de marche et une estimation moyenne de temps de ramassage par point.
 </footer>
 </div>
 );
}
