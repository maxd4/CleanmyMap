import { Handshake, Users } from"lucide-react";
import Link from"next/link";
import { NavigationGrid, type NavigationGridItem } from"@/components/ui/navigation-grid";

export default function PartnersNetworkPage() {
  const networkActions: NavigationGridItem[] = [
    {
      icon: "Search",
      title: "Explorer le réseau",
      desc: "Ouvrir l'annuaire et la carte des structures locales pour découvrir les acteurs du territoire.",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      accent: "from-violet-50 to-white",
      ring: "ring-violet-100",
      dot: "bg-violet-500",
      href: "/sections/annuaire",
    },
    {
      icon: "UserPlus",
      title: "Rejoindre le réseau",
      desc: "Inscrire votre structure (association, commerce, collectif) pour devenir visible sur la carte.",
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
      accent: "from-rose-50 to-white",
      ring: "ring-rose-100",
      dot: "bg-rose-500",
      href: "/partners/onboarding",
    },
    {
      icon: "LayoutDashboard",
      title: "Espace Gouvernance",
      desc: "Accéder au tableau de bord de pilotage, valider les fiches et gérer les demandes du réseau.",
      iconBg: "bg-fuchsia-50",
      iconColor: "text-fuchsia-600",
      accent: "from-fuchsia-50 to-white",
      ring: "ring-fuchsia-100",
      dot: "bg-fuchsia-500",
      href: "/partners/dashboard",
    }
  ];

  return (
    <div className="w-full space-y-8 p-4 md:p-8">
      <header className="relative overflow-hidden rounded-[3rem] bg-[#1a0b3a] px-6 py-20 text-white shadow-2xl md:px-12 lg:py-28">
        {/* fond de base dégradé (violet/rose) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e0b52] via-[#5b0d70] to-[#6e0d4a] opacity-90" />
        
        {/* glow radial contrôlé */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(192,38,211,0.15),transparent),radial-gradient(ellipse_50%_50%_at_0%_100%,rgba(219,39,119,0.12),transparent)]" />
        
        {/* texture grain */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />

        <div className="relative z-10 mx-auto max-w-5xl space-y-10 text-center">
          {/* carte glassmorphism interne pour le titre */}
          <div className="mx-auto inline-block rounded-3xl border border-white/10 bg-white/[0.05] p-2 backdrop-blur-md">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-violet-500/10 border border-violet-500/20 px-5 py-2 text-violet-400 cmm-text-caption font-bold tracking-[0.25em] uppercase">
              <Handshake size={16} /> Réseau Local
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-[0.95] tracking-tighter sm:text-6xl md:text-8xl">
              Collaborer et <br /> s&apos;engager localement.
            </h1>
            <p className="mx-auto max-w-2xl text-lg font-light leading-relaxed text-white/80 sm:text-xl">
              Découvrez les structures, consultez les fiches et rejoignez la dynamique de territoire pour un impact durable.
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-20 mx-auto max-w-7xl px-4 -mt-10 sm:-mt-14">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/95 p-6 backdrop-blur-xl shadow-2xl shadow-violet-950/10 dark:border-slate-800 dark:bg-slate-900/95 sm:p-10">
          <NavigationGrid items={networkActions} columns={{ default: 1, md: 3 }} />
        </div>
      </div>

      <section className="mx-auto max-w-7xl overflow-hidden rounded-[3rem] border border-slate-200/60 bg-white/70 p-8 shadow-xl backdrop-blur-xl transition-all duration-500 hover:shadow-2xl md:p-16 lg:p-20">
        <div className="grid gap-12 items-center md:grid-cols-2 lg:gap-20">
          <div className="space-y-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-violet-50 text-violet-600 shadow-inner">
              <Users size={36} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight tracking-tight cmm-text-primary lg:text-6xl">
                Transparence <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500">
                  et coordination.
                </span>
              </h2>
              <p className="text-lg leading-relaxed cmm-text-secondary md:text-xl font-light">
                Ici, on privilégie la découverte et la visibilité. Les cartes et les fiches restent
                accessibles à tous, favorisant la mise en relation directe et la compréhension du maillage local.
              </p>
            </div>
          </div>

          <div className="relative">
            {/* carte de contenu "Ce que vous trouverez" */}
            <div className="relative z-10 rounded-[3rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-lg sm:p-12">
              <h3 className="mb-8 flex items-center gap-4 text-2xl font-bold cmm-text-primary">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/5">
                  <Handshake size={24} className="text-violet-600" />
                </div>
                Ce que vous trouverez
              </h3>
              
              <ul className="space-y-4">
                {[
                  "Les commerces engagés, associations et collectifs visibles dans un même espace.",
                  "Des fiches détaillées pour comprendre les missions de chaque acteur du réseau.",
                  "Un accès direct aux outils de pilotage pour les administrateurs du réseau."
                ].map((text, idx) => (
                  <li key={idx} className="group flex items-start gap-4 rounded-3xl border border-slate-100 bg-white/50 p-5 transition-all hover:bg-white hover:shadow-md">
                    <div className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500 transition-transform group-hover:scale-110">
                      <span className="h-2 w-2 rounded-full bg-violet-500" />
                    </div>
                    <p className="cmm-text-small leading-relaxed cmm-text-secondary group-hover:cmm-text-primary transition-colors">
                      {text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* accent décoratif derrière la carte */}
            <div className="absolute -bottom-6 -right-6 h-full w-full rounded-[3rem] bg-gradient-to-br from-violet-100/50 to-rose-100/20 -z-10" />
          </div>
        </div>
      </section>
    </div>
  );
}
