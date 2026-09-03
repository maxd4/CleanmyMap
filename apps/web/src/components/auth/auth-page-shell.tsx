import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Leaf,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type AuthPageVariant = "sign-in" | "sign-up";

type AuthPageShellProps = {
  children: ReactNode;
  variant: AuthPageVariant;
};

type AuthCopy = {
  eyebrow: string;
  editorialTitle: string;
  editorialDescription: string;
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
  benefits: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
  }>;
};

const AUTH_COPY: Record<AuthPageVariant, AuthCopy> = {
  "sign-in": {
    eyebrow: "Connexion",
    editorialTitle: "Retrouvez votre espace d’action",
    editorialDescription:
      "Reprenez vos actions, vos signalements et votre impact environnemental au même endroit.",
    switchPrompt: "Pas encore de compte ?",
    switchLabel: "Créer un compte",
    switchHref: "/sign-up",
    benefits: [
      {
        icon: CheckCircle2,
        title: "Reprenez vos actions",
        description: "Retrouvez vos déclarations et votre progression.",
      },
      {
        icon: MapPin,
        title: "Suivez votre territoire",
        description: "Consultez les signalements et actions proches de vous.",
      },
      {
        icon: Users,
        title: "Agissez ensemble",
        description: "Coordonnez-vous avec la communauté CleanMyMap.",
      },
    ],
  },
  "sign-up": {
    eyebrow: "Inscription",
    editorialTitle: "Rejoignez la communauté écologique",
    editorialDescription:
      "Créez votre compte pour commencer à agir concrètement pour l’environnement dans votre quartier.",
    switchPrompt: "Déjà un compte ?",
    switchLabel: "Se connecter",
    switchHref: "/sign-in",
    benefits: [
      {
        icon: CheckCircle2,
        title: "Accès gratuit aux fonctionnalités",
        description: "Profitez des outils CleanMyMap sans frais.",
      },
      {
        icon: Leaf,
        title: "Un espace personnalisé",
        description: "Retrouvez vos actions et vos préférences.",
      },
      {
        icon: MapPin,
        title: "Mesurez votre impact",
        description: "Visualisez l’effet positif de votre engagement.",
      },
    ],
  },
};

export function AuthPageShell({ children, variant }: AuthPageShellProps) {
  const copy = AUTH_COPY[variant];

  return (
    <main
      className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_rgba(219,234,254,0.72)_0%,_rgba(232,233,255,0.82)_34%,_rgba(206,250,225,0.9)_72%,_rgba(245,247,250,1)_100%)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      data-auth-page={variant}
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full items-stretch gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:gap-7">
          <section className="hidden min-h-[38rem] flex-col justify-between rounded-3xl border border-slate-700/80 bg-[linear-gradient(145deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.97)_52%,rgba(49,46,129,0.95)_100%)] p-8 text-white shadow-xl shadow-slate-950/20 lg:flex xl:p-10">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                  <Leaf className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold tracking-tight">CleanMyMap</p>
              </div>

              <div className="max-w-md space-y-4">
                <p className="cmm-text-caption text-emerald-200">
                  Famille autonome Auth &amp; Onboarding
                </p>
                <h1 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
                  {copy.editorialTitle}
                </h1>
                <p className="text-base leading-relaxed text-slate-200 xl:text-lg">
                  {copy.editorialDescription}
                </p>
              </div>

              <div className="space-y-3" aria-label="Bénéfices CleanMyMap">
                {copy.benefits.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                    <div
                      key={benefit.title}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{benefit.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-300">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="pt-8 text-sm text-slate-400">
              Une entrée simple pour agir localement et durablement.
            </p>
          </section>

          <section className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-xl shadow-slate-950/20 sm:p-6 lg:p-7">
            <div className="mx-auto flex w-full max-w-xl flex-col">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                    <Leaf className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-bold text-white">CleanMyMap</p>
                </div>
                <p className="cmm-text-caption text-emerald-200">
                  {copy.eyebrow}
                </p>
                <Link
                  href="/"
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Accueil</span>
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-lg shadow-slate-950/20 sm:p-6">
                {children}
              </div>

              <p className="mt-5 text-center text-sm text-slate-300">
                {copy.switchPrompt}{" "}
                <Link
                  href={copy.switchHref}
                  className="font-semibold text-emerald-300 underline-offset-4 transition-colors hover:text-emerald-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {copy.switchLabel}
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
