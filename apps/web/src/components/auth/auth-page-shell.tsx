import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

type AuthPageVariant = "sign-in" | "sign-up";

/**
 * Shared appearance for the native Clerk surfaces used by sign-in and sign-up.
 * Keeps Clerk as the owner of auth flows, OAuth providers, validation, and
 * mandatory legal/branding notices while aligning controls with CleanMyMap emerald tokens.
 */
export const AUTH_CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#059669",
    colorText: "#0f172a",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "!w-full !min-w-0",
    cardBox: "!w-full !max-w-none !min-w-0 !border-0 !bg-transparent !shadow-none",
    card: "!w-full !max-w-none !min-w-0 !border-0 !bg-transparent !py-0 !px-1 !shadow-none",
    main: "!w-full !min-w-0",
    form: "!w-full !min-w-0",
    logoBox: "!hidden",
    header: "mb-5 text-left",
    headerTitle: "text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]",
    headerSubtitle: "mt-1.5 text-sm text-slate-600",
    socialButtonsBlockButton:
      "min-h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-800 shadow-none transition-colors hover:border-emerald-500 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
    socialButtonsBlockButtonText: "font-medium text-slate-800",
    dividerLine: "bg-slate-200",
    dividerText: "text-xs font-medium text-slate-500",
    formFieldLabel: "text-sm font-medium text-slate-800",
    formFieldInput:
      "min-h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 shadow-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
    formFieldInputShowPasswordButton:
      "min-h-11 min-w-11 text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
    formButtonPrimary:
      "min-h-11 w-full rounded-xl border border-emerald-600 bg-emerald-600 font-semibold text-white shadow-none transition-colors hover:border-emerald-700 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
    footerAction: "!hidden",
    footer: "mt-4 !bg-transparent",
    alert: "rounded-xl border border-red-200 bg-red-50 text-red-800",
  },
} as const;

type AuthPageShellProps = {
  children: ReactNode;
  variant: AuthPageVariant;
  switchHref?: string;
};

type AuthCopy = {
  editorialTitle: string;
  editorialDescription: string;
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
};

const AUTH_COPY: Record<AuthPageVariant, AuthCopy> = {
  "sign-in": {
    editorialTitle: "Retrouvez votre espace d’action",
    editorialDescription:
      "Suivez vos actions de nettoyage, vos signalements et votre impact terrain au même endroit.",
    switchPrompt: "Pas encore de compte ?",
    switchLabel: "Créer un compte",
    switchHref: "/sign-up",
  },
  "sign-up": {
    editorialTitle: "Rejoignez la communauté écologique",
    editorialDescription:
      "Créez votre compte pour déclarer des actions, signaler les pollutions et agir près de chez vous.",
    switchPrompt: "Déjà un compte ?",
    switchLabel: "Se connecter",
    switchHref: "/sign-in",
  },
};

export function AuthPageShell({ children, variant, switchHref }: AuthPageShellProps) {
  const copy = AUTH_COPY[variant];

  return (
    <main
      className="min-h-screen bg-emerald-50/40 px-4 py-6 sm:px-6 sm:py-10 lg:px-8"
      data-auth-page={variant}
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1060px] items-center justify-center">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(6,78,59,0.22)] lg:grid lg:max-w-none lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]">
          <aside className="hidden flex-col justify-between bg-[linear-gradient(160deg,#052e22_0%,#064e3b_100%)] p-8 text-white lg:flex xl:p-10">
            <BrandLogo
              variant="darkSurface"
              alt="CleanMyMap"
              className="h-10 w-auto max-w-[13rem] object-contain object-left"
              sizes="13rem"
              priority
            />

            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {copy.editorialTitle}
              </h2>
              <p className="text-sm leading-relaxed text-emerald-100/90">
                {copy.editorialDescription}
              </p>
            </div>
          </aside>

          <section className="flex min-w-0 flex-col justify-between bg-white p-5 text-slate-950 sm:p-8 lg:p-10">
            <div>
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center lg:hidden">
                  <BrandLogo
                    variant="compact"
                    alt="CleanMyMap"
                    className="h-8 w-8 object-contain"
                    sizes="2rem"
                    priority
                  />
                </div>
                <Link
                  href="/"
                  className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Accueil</span>
                </Link>
              </div>

              {children}
            </div>

            <footer className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-600">
                {copy.switchPrompt}{" "}
                <Link
                  href={switchHref ?? copy.switchHref}
                  className="font-semibold text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {copy.switchLabel}
                </Link>
              </p>
              <p className="text-xs text-slate-500">
                <Link
                  href="/conditions-generales-utilisation"
                  className="underline-offset-4 transition-colors hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  CGU
                </Link>
                {" · "}
                <Link
                  href="/politique-confidentialite"
                  className="underline-offset-4 transition-colors hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  Confidentialité
                </Link>
              </p>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
