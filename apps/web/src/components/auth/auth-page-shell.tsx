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
import { BrandLogo } from "@/components/brand/brand-logo";
import { PageHeader } from "@/components/ui/page-header";

type AuthPageVariant = "sign-in" | "sign-up";

/**
 * Shared appearance for the native Clerk surfaces used by sign-in and sign-up.
 * Keep the auth flow native to Clerk while aligning its visible shell with the
 * CleanMyMap action hierarchy.
 */
export const AUTH_CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#a06c00",
    colorText: "#0f172a",
  },
  elements: {
    rootBox: "w-full",
    card: "w-full max-w-none border-0 bg-transparent p-0 shadow-none",
    headerTitle: "text-2xl font-bold text-emerald-950",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "min-h-11 rounded-xl border border-emerald-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
    socialButtonsBlockButtonText: "font-semibold text-slate-700",
    dividerLine: "bg-emerald-100",
    dividerText: "text-slate-500",
    formFieldLabel: "font-semibold text-emerald-950",
    formFieldInput:
      "min-h-11 rounded-xl border-emerald-200 bg-emerald-50/35 text-slate-950 placeholder:text-slate-400 shadow-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
    formFieldInputShowPasswordButton:
      "min-h-11 min-w-11 text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
    formButtonPrimary:
      "min-h-11 rounded-xl border border-[#a06c00] bg-[#a06c00] text-white shadow-sm transition-colors hover:border-[#845400] hover:bg-[#845400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
    footerAction: "hidden",
    alert: "rounded-xl border-red-200 bg-red-50 text-red-800",
  },
} as const;

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
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(209,250,229,0.96)_0%,_rgba(236,253,245,0.94)_42%,_rgba(247,252,248,1)_100%)] px-4 py-5 sm:px-6 sm:py-8 lg:px-8"
      data-auth-page={variant}
    >
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-emerald-200/50 blur-[110px]" />
      <div className="pointer-events-none absolute right-0 top-24 h-96 w-96 rounded-full bg-emerald-100/65 blur-[130px]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl items-center">
        <div className="grid min-w-0 w-full items-stretch gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-5">
          <section className="order-2 hidden min-h-[34rem] flex-col justify-between rounded-3xl border border-emerald-200/20 bg-[linear-gradient(145deg,#06261c_0%,#073b29_56%,#0b5139_100%)] p-7 text-white shadow-[0_34px_76px_-34px_rgba(7,44,27,0.72)] lg:order-1 lg:flex xl:p-8">
            <div className="space-y-7">
              <div className="flex items-center gap-3">
                <BrandLogo
                  variant="darkSurface"
                  alt="CleanMyMap"
                  className="h-11 w-auto max-w-[14rem] object-contain object-left"
                  sizes="15rem"
                />
              </div>

              <PageHeader
                tone="emerald"
                contrast="inverse"
                title={copy.editorialTitle}
                subtitle={copy.editorialDescription}
              />

              <div className="space-y-3" aria-label="Bénéfices CleanMyMap">
                {copy.benefits.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                    <div
                      key={benefit.title}
                      className="flex items-center gap-3 rounded-2xl border border-emerald-200/20 bg-white/[0.07] p-3.5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{benefit.title}</p>
                        <p className="cmm-text-small cmm-text-inverse mt-1">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="cmm-text-body cmm-text-inverse pt-6">
              Une entrée simple pour agir localement et durablement.
            </p>
          </section>

          <section className="order-1 min-w-0 w-full rounded-3xl border border-emerald-200/80 bg-white/90 p-3.5 shadow-[0_34px_76px_-34px_rgba(7,44,27,0.32)] backdrop-blur-xl sm:p-5 lg:order-2 lg:p-6">
            <div className="mx-auto flex w-full max-w-xl flex-col">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 lg:hidden">
                  <BrandLogo
                    variant="compact"
                    alt="CleanMyMap"
                    className="h-9 w-9 object-contain"
                    sizes="2.5rem"
                  />
                </div>
                <p className="cmm-text-caption text-emerald-800">
                  {copy.eyebrow}
                </p>
                <Link
                  href="/"
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Accueil</span>
                </Link>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-4 text-slate-950 shadow-sm sm:p-6">
                {children}
              </div>

              <p className="cmm-text-small cmm-text-secondary mt-4 text-center">
                {copy.switchPrompt}{" "}
                <Link
                  href={copy.switchHref}
                  className="font-semibold text-emerald-800 underline-offset-4 transition-colors hover:text-emerald-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
