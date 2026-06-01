import Link from "next/link";
import { Handshake, ArrowRight, Network, Users, LayoutDashboard, UserPlus, Search } from "lucide-react";
import { NavigationGrid, type NavigationGridItem } from "@/components/ui/navigation-grid";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { getServerLocale } from "@/lib/server-preferences";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import { getEntryTrustState } from "@/components/sections/rubriques/annuaire-helpers";
import { SPONSOR_PORTAL_ROUTE } from "@/lib/accueil-pilotage-routes";

function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

export default async function PartnersNetworkPage() {
  const locale = await getServerLocale();
  const fr = locale === "fr";

  const entries = INITIAL_ANNUAIRE_ENTRIES;
  const totalActors = entries.length;
  const featuredActors = entries.filter((entry) => entry.isFeatured).length;
  const trustedActors = entries.filter((entry) => getEntryTrustState(entry) === "trusted").length;
  const coveredZones = new Set(entries.flatMap((entry) => entry.coveredArrondissements)).size;
  const nationalActors = entries.filter((entry) => entry.scope === "national" || entry.scope === "france").length;
  const gestesPropres = entries.find((entry) => entry.name === "Gestes Propres");

  const byKind = [
    { label: fr ? "Associations" : "Associations", count: entries.filter((entry) => entry.kind === "association").length },
    { label: fr ? "Collectifs" : "Collectives", count: entries.filter((entry) => entry.kind === "groupe_parole" || entry.kind === "evenement").length },
    { label: fr ? "Commerces" : "Businesses", count: entries.filter((entry) => entry.kind === "commerce").length },
    { label: fr ? "Entreprises" : "Companies", count: entries.filter((entry) => entry.kind === "entreprise").length },
    { label: fr ? "Nationaux" : "National", count: nationalActors },
  ];

  const networkActions: NavigationGridItem[] = [
    {
      icon: Search,
      title: fr ? "Consulter l'annuaire" : "Open the directory",
      desc: fr
        ? "Parcourir les structures, filtrer par rôle et repérer les acteurs utiles."
        : "Browse structures, filter by role and spot the relevant actors.",
      iconBg: "bg-indigo-400/16",
      iconColor: "text-indigo-50",
      accent: "from-[rgba(22,26,72,0.96)] to-[rgba(49,46,129,0.94)]",
      ring: "ring-indigo-300/18",
      dot: "bg-indigo-300",
      href: "/sections/annuaire",
    },
    {
      icon: UserPlus,
      title: fr ? "Rejoindre le réseau" : "Join the network",
      desc: fr
        ? "Proposer votre structure et devenir visible dans le maillage local."
        : "Submit your structure and become visible in the local network.",
      iconBg: "bg-indigo-400/16",
      iconColor: "text-indigo-50",
      accent: "from-[rgba(22,26,72,0.96)] to-[rgba(67,56,202,0.94)]",
      ring: "ring-indigo-300/18",
      dot: "bg-indigo-300",
      href: "/partners/onboarding",
    },
    {
      icon: LayoutDashboard,
      title: fr ? "Pilotage réseau" : "Network dashboard",
      desc: fr
        ? "Contrôler les fiches, suivre les demandes et garder la coordination lisible."
        : "Review profiles, track requests and keep coordination readable.",
      iconBg: "bg-indigo-400/16",
      iconColor: "text-indigo-50",
      accent: "from-[rgba(22,26,72,0.96)] to-[rgba(67,56,202,0.94)]",
      ring: "ring-indigo-300/18",
      dot: "bg-indigo-300",
      href: "/partners/dashboard",
    },
    {
      icon: Network,
      title: fr ? "Porte institutionnelle" : "Institutional path",
      desc: fr
        ? "Basculer vers le sponsor portal pour les financeurs et décideurs."
        : "Switch to the sponsor portal for funders and decision makers.",
      iconBg: "bg-indigo-400/16",
      iconColor: "text-indigo-50",
      accent: "from-[rgba(22,26,72,0.96)] to-[rgba(49,46,129,0.94)]",
      ring: "ring-indigo-300/18",
      dot: "bg-indigo-300",
      href: SPONSOR_PORTAL_ROUTE,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_20%_0%,rgba(99,102,241,0.16),transparent),radial-gradient(ellipse_50%_35%_at_85%_12%,rgba(129,140,248,0.12),transparent),radial-gradient(ellipse_55%_35%_at_75%_86%,rgba(67,56,202,0.10),transparent)]" />
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[3rem] border border-indigo-300/18 bg-[rgba(18,18,42,0.96)] px-6 py-10 shadow-[0_32px_80px_-36px_rgba(99,102,241,0.30)] sm:px-10 lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.10),transparent_30%)]" />

          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
            <div className="space-y-6">
              <PageHeader
                tone="indigo"
                contrast="inverse"
                eyebrow={fr ? "Réseau & partenaires" : "Network & partners"}
                title={fr ? "Lire le réseau, choisir le bon contact, rejoindre une dynamique." : "Read the network, pick the right contact, and join the momentum."}
                subtitle={fr
                  ? "Cette porte d'entrée rassemble les structures visibles, les parcours de qualification et les outils de pilotage. L'objectif: rendre le maillage local lisible et activable sans perdre la distinction entre acteurs, territoires et rôle institutionnel."
                  : "This entry point brings together visible structures, qualification flows and management tools. The goal is to make the local network readable and actionable while keeping actors, territories and institutional roles distinct."}
                badges={
                  <>
                    <PageHeaderBadge tone="indigo" contrast="inverse">
                      <Handshake size={12} className="mr-2 inline-block align-[-2px]" />
                      Réseau
                    </PageHeaderBadge>
                    <PageHeaderBadge tone="indigo" contrast="inverse" muted>Partenaires</PageHeaderBadge>
                    <PageHeaderBadge tone="indigo" contrast="inverse" muted>Onboarding</PageHeaderBadge>
                  </>
                }
                action={
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/sections/annuaire"
                      className="inline-flex items-center gap-2 rounded-2xl bg-indigo-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-indigo-950 transition hover:bg-indigo-300"
                    >
                      {fr ? "Ouvrir l'annuaire" : "Open the directory"}
                      <ArrowRight size={14} />
                    </Link>
                    <Link
                      href="/partners/onboarding"
                      className="inline-flex items-center gap-2 rounded-2xl border border-indigo-300/18 bg-[rgba(22,26,72,0.9)] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-indigo-50 transition hover:border-indigo-300/30 hover:bg-[rgba(30,41,118,0.96)]"
                    >
                      {fr ? "Rejoindre le réseau" : "Join the network"}
                    </Link>
                    <Link
                      href="/partners/dashboard"
                      className="inline-flex items-center gap-2 rounded-2xl border border-indigo-300/18 bg-[rgba(22,26,72,0.9)] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-indigo-50 transition hover:border-indigo-300/30 hover:bg-[rgba(30,41,118,0.96)]"
                    >
                      {fr ? "Piloter les fiches" : "Manage profiles"}
                    </Link>
                  </div>
                }
                className="max-w-4xl"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[2rem] border border-indigo-300/16 bg-[rgba(22,26,72,0.92)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/48">
                  {fr ? "Acteurs visibles" : "Visible actors"}
                </p>
                <p className="mt-2 text-3xl font-black text-white">{formatCount(totalActors)}</p>
                <p className="mt-2 text-sm text-violet-100/66">
                  {fr ? "Fiches actives dans l'annuaire local." : "Active profiles in the local directory."}
                </p>
              </div>
              <div className="rounded-[2rem] border border-indigo-300/16 bg-[rgba(22,26,72,0.92)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/48">
                  {fr ? "Zones couvertes" : "Covered zones"}
                </p>
                <p className="mt-2 text-3xl font-black text-white">{formatCount(coveredZones)}</p>
                <p className="mt-2 text-sm text-violet-100/66">
                  {fr ? "Arrondissements et périmètres utiles au repérage." : "Arrondissements and useful territorial scopes."}
                </p>
              </div>
              <div className="rounded-[2rem] border border-indigo-300/16 bg-[rgba(22,26,72,0.92)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/48">
                  {fr ? "Fiches confirmées" : "Confirmed profiles"}
                </p>
                <p className="mt-2 text-3xl font-black text-white">{formatCount(trustedActors)}</p>
                <p className="mt-2 text-sm text-violet-100/66">
                  {fr ? "Niveau de confiance et de lisibilité du réseau." : "Trust and readability level of the network."}
                </p>
              </div>
              <div className="rounded-[2rem] border border-indigo-300/16 bg-[rgba(22,26,72,0.92)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/48">
                  {fr ? "Portée nationale" : "National scope"}
                </p>
                <p className="mt-2 text-3xl font-black text-white">{formatCount(nationalActors)}</p>
                <p className="mt-2 text-sm text-violet-100/66">
                  {fr ? "Structures sans ancrage parisien obligatoire." : "Structures without a mandatory Paris footprint."}
                </p>
              </div>
              <div className="rounded-[2rem] border border-indigo-300/16 bg-[rgba(22,26,72,0.92)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/48">
                  {fr ? "En une" : "Featured"}
                </p>
                <p className="mt-2 text-3xl font-black text-white">{formatCount(featuredActors)}</p>
                <p className="mt-2 text-sm text-violet-100/66">
                  {fr ? "Structures mises en avant pour démarrer vite." : "Highlighted structures to get started quickly."}
                </p>
              </div>
            </div>
          </div>
        </header>

        {gestesPropres ? (
          <section className="mt-8 rounded-[2.5rem] border border-indigo-300/16 bg-[rgba(22,26,72,0.92)] p-6 shadow-[0_24px_56px_-32px_rgba(99,102,241,0.24)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-100/48">
                  {fr ? "Focus national" : "National spotlight"}
                </p>
                <h2 className="text-3xl font-black text-white">
                  {gestesPropres.name}
                </h2>
                <p className="max-w-3xl text-sm leading-relaxed text-violet-100/72">
                  {gestesPropres.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-indigo-300/16 bg-indigo-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-100">
                  {fr ? "Association nationale" : "National association"}
                </span>
                <span className="rounded-full border border-violet-300/16 bg-violet-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100">
                  {fr ? "Couverture France" : "France coverage"}
                </span>
                <span className="rounded-full border border-violet-300/16 bg-violet-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100">
                  {fr ? "Relais associatif" : "Association relay"}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="rounded-[2.5rem] border border-violet-300/16 bg-[rgba(28,20,58,0.9)] p-5 shadow-[0_24px_56px_-32px_rgba(139,92,246,0.24)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/48">
                  {fr ? "Répartition par type" : "Split by type"}
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  {fr ? "Une cartographie rapide des acteurs utiles" : "A quick map of useful actors"}
                </h2>
              </div>
              <div className="rounded-full border border-violet-300/16 bg-violet-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100">
                {fr ? "Coordination" : "Coordination"}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {byKind.map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-violet-300/12 bg-[rgba(36,27,75,0.88)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/44">{item.label}</p>
                  <p className="mt-2 text-3xl font-black text-white">{formatCount(item.count)}</p>
                  <p className="mt-2 text-sm text-violet-100/62">
                    {fr ? "Acteurs repérables dans le réseau actif." : "Actors visible in the active network."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <NavigationGrid items={networkActions} columns={{ default: 1, md: 2, xl: 4 }} />
        </section>

        <section className="mt-8 rounded-[3rem] border border-violet-300/16 bg-[rgba(28,20,58,0.9)] p-6 shadow-[0_24px_56px_-32px_rgba(139,92,246,0.24)] sm:p-10 lg:p-12">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/16 bg-violet-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100">
                <Users size={12} />
                {fr ? "Ce que le réseau rend lisible" : "What the network makes visible"}
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {fr ? "Qui contacter, pour quel besoin, et avec quel niveau de confiance." : "Who to contact, for which need, and with what level of trust."}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-violet-100/68 sm:text-base">
                {fr
                  ? "Le réseau distingue les acteurs publics, associatifs et privés, puis les relie à des zones, des missions et des canaux de contact. La page réseau sert d'orientation, l'annuaire de lecture détaillée, et le dashboard de contrôle."
                  : "The network separates public, associative and private actors, then links them to territories, missions and contact channels. The network page is the orienting layer, the directory is the detailed reading layer, and the dashboard is the control layer."}
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[1.7rem] border border-violet-300/12 bg-[rgba(36,27,75,0.88)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/46">
                  {fr ? "Étape 1" : "Step 1"}
                </p>
                <p className="mt-2 text-lg font-black text-white">{fr ? "Chercher" : "Search"}</p>
                <p className="mt-1 text-sm text-violet-100/66">
                  {fr ? "Filtrer par territoire, type de structure ou besoin." : "Filter by territory, structure type or need."}
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-violet-300/12 bg-[rgba(36,27,75,0.88)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/46">
                  {fr ? "Étape 2" : "Step 2"}
                </p>
                <p className="mt-2 text-lg font-black text-white">{fr ? "Comparer" : "Compare"}</p>
                <p className="mt-1 text-sm text-violet-100/66">
                  {fr ? "Voir la couverture, la fraîcheur et la capacité de contribution." : "Review coverage, freshness and contribution capacity."}
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-violet-300/12 bg-[rgba(36,27,75,0.88)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/46">
                  {fr ? "Étape 3" : "Step 3"}
                </p>
                <p className="mt-2 text-lg font-black text-white">{fr ? "Agir" : "Act"}</p>
                <p className="mt-1 text-sm text-violet-100/66">
                  {fr ? "Basculer vers l'onboarding, le dashboard ou le sponsor portal." : "Switch to onboarding, dashboard or sponsor portal."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="cmm-ribbon-surface mt-8 rounded-[3rem] p-6 sm:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-200/55">
                {fr ? "Accès rapide" : "Quick access"}
              </p>
              <h3 className="text-2xl font-black text-slate-100">
                {fr ? "Vous êtes une association, une entreprise ou une collectivité ?" : "Are you an association, business or public body?"}
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-100/70">
                {fr
                  ? "Rejoignez le réseau pour rendre votre rôle visible, vos canaux clairs et vos coordonnées faciles à utiliser."
                  : "Join the network to make your role visible, your channels clear and your contact points easy to use."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/partners/onboarding"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-white"
              >
                {fr ? "Rejoindre" : "Join"}
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/partners/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/40 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-100 transition hover:border-slate-500 hover:bg-slate-900/65"
              >
                {fr ? "Gérer les fiches" : "Manage profiles"}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
