import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { Info, BookOpen, Scaling, Beaker } from "lucide-react";

export default function MethodologiePage() {
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-12 space-y-12">
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-xs">
          <Beaker size={14} />
          TRANSFERENCE & CRÉDIBILITÉ SCIENTIFIQUE
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
          Méthodologie de Calcul d'Impact.
        </h1>
        <p className="text-lg text-slate-600">
          Toutes nos métriques sont fondées sur des rapports officiels et des protocoles de calcul documentés.
        </p>
      </header>

      <section className="grid gap-8">
        {/* EAU SAVED */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-blue-600">
            <BookOpen size={24} />
            <h2 className="text-xl font-bold">Eau préservée de la pollution</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-blue-500">
            Impact = [Mégots collectés] × {factors.waterLitersPerCigaretteButt} L
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            Un seul mégot peut polluer jusqu'à 500 à 1000 litres d'eau en libérant des métaux lourds et des microplastiques (Source: WHO/Tobacco and its environmental impact, 2017). Nous utilisons la borne basse ({factors.waterLitersPerCigaretteButt}L) pour garantir une estimation prudente.
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">SOURCE: {sources.water}</div>
        </div>

        {/* CO2 AVOIDED */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-emerald-600">
            <Scaling size={24} />
            <h2 className="text-xl font-bold">Émissions CO2 évitées</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-emerald-500">
            Impact = [Masse déchets (kg)] × {factors.co2KgPerWasteKg} kg CO2eq
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            Ce facteur correspond à la moyenne d'émissions évitées par la collecte et le traitement contrôlé par rapport à l'abandon en nature (fermentation, microplastiques). Ce chiffre est dérivé de la base de données Empreinte de l'ADEME pour le mix de déchets urbains standards.
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">SOURCE: {sources.co2}</div>
        </div>

        {/* SURFACE CLEANED */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-slate-900">
            <Info size={24} />
            <h2 className="text-xl font-bold">Surface d'impact opérationnelle</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-slate-900">
            Surface (m²) = [Masse(kg)] × {factors.surfaceM2PerWasteKg} + [Minutes] × {factors.surfaceM2PerVolunteerMinute}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            Contrairement aux métriques physiques directes, notre calcul de surface est un index de "pénétration terrain". Il combine la densité de nettoyage (poids récolté) et l'effort de prospection (temps passé) pour simuler la zone d'influence d'une action.
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">SOURCE: {sources.surface}</div>
        </div>

        {/* MAP POLLUTION SCORE */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-rose-600">
            <Scaling size={24} />
            <h2 className="text-xl font-bold">L'Indice de Pollution Terrain (Carte)</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-rose-500">
            Score % = ([Poids/20kg] × 65) + ([Mégots/2000] × 35)
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            Utilisé pour colorer la carte interactive, ce score normalise la pollution observée sur une échelle de 0 à 100%. Un score de 100% (Violet) représente une zone nécessitant une intervention d'envergure (ex: 20kg de déchets ou 2000 mégots concentrés). L'interpolation des couleurs (Vert → Jaune → Rouge → Violet) suit une logique de criticité opérationnelle.
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">SOURCE: Algorithme de calibration terrain CleanMyMap v1.</div>
        </div>

        {/* CITIES ROI */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-amber-600">
            <Scaling size={24} />
            <h2 className="text-xl font-bold">Économies de voirie pour la ville (ROI)</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-amber-500">
            Économies (€) = [Poids collecté (kg)] × 1.5€
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            Ce proxy économique estime le coût évité pour les services de voirie municipaux. Sur la base des rapports de coûts de propreté urbaine, la collecte citoyenne permet d'économiser environ 1,50€ par kilogramme retiré (incluant logistique, main d'œuvre urbaine et frais de traitement). 
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400 font-mono italic">
            SOURCE: Estimation basée sur les coûts de propreté urbaine moyens (Moyenne observée : 1500€ / tonne).
          </div>
        </div>
      </section>

      <footer className="pt-12 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-400">
        <div className="text-xs space-y-1">
          <p className="font-bold">Protocol Version: {version}</p>
          <p>© 2026 CleanMyMap Scientific Committee.</p>
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-32 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center text-[8px] font-bold text-center">
            PARTENAIRE ADEME <br/> SOON
          </div>
        </div>
      </footer>
    </div>
  );
}
