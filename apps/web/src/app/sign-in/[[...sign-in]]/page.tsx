import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";

export const metadata: Metadata = {
  title: "Connexion - CleanMyMap",
  description: "Connectez-vous à CleanMyMap pour déclarer vos actions de nettoyage, signaler les pollutions et rejoindre la communauté de bénévoles écologistes.",
  keywords: ["connexion", "login", "sign in", "bénévolat", "écologie", "CleanMyMap"],
  alternates: {
    canonical: "/sign-in",
  },
};

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(199,210,254,0.5)_0%,_rgba(255,255,255,0.94)_45%,_rgba(248,250,252,1)_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-violet-400/8 blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <div className="hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-center lg:px-12 xl:px-16">
          <div className="max-w-xl space-y-8 rounded-[2.75rem] border border-indigo-200/50 bg-white/72 p-8 shadow-[0_30px_80px_-45px_rgba(79,70,229,0.35)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-200/60 bg-indigo-100 text-indigo-700">
                <Leaf className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">CleanMyMap</h1>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-700">
                Famille autonome Auth & Onboarding
              </p>
              <h2 className="max-w-lg text-3xl font-black leading-tight text-slate-950">
                Agissez pour l'environnement dans votre quartier
              </h2>
              <p className="max-w-lg text-lg leading-relaxed text-slate-600">
                Rejoignez la communauté de bénévoles qui nettoient, signalent et coordonnent des actions de dépollution urbaine.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-white/82 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <p className="text-sm text-slate-700">Déclarez vos actions de nettoyage</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-white/82 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <p className="text-sm text-slate-700">Signalez les pollutions sur la carte</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-white/82 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <p className="text-sm text-slate-700">Coordonnez avec d'autres bénévoles</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-[54%] lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-md space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 transition-colors hover:text-indigo-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>

            <div className="lg:hidden">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200/60 bg-indigo-100 text-indigo-700">
                  <Leaf className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">CleanMyMap</h1>
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-indigo-700">
                Auth & Onboarding
              </p>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">Connexion</h2>
              <p className="mb-6 text-slate-600">
                Connectez-vous pour accéder à votre tableau de bord et reprendre vos actions.
              </p>
            </div>

            <div className="rounded-[2.25rem] border border-indigo-200/60 bg-white/82 p-6 shadow-[0_24px_70px_-40px_rgba(79,70,229,0.42)] backdrop-blur-2xl">
              <SignIn
                path="/sign-in"
                routing="path"
                fallbackRedirectUrl="/accueil"
                signUpUrl="/sign-up"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0 bg-transparent",
                    headerTitle: "text-xl font-bold text-slate-950",
                    headerSubtitle: "text-slate-600",
                    socialButtonsBlockButton:
                      "border-indigo-200/70 bg-white/90 text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/70",
                    formButtonPrimary:
                      "border border-[color:var(--cmm-button-primary-border)] bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-start)_0%,var(--cmm-button-primary-bg-end)_100%)] text-[color:var(--cmm-button-primary-text)] shadow-[0_16px_30px_-18px_rgba(79,70,229,0.45)] hover:border-[color:var(--cmm-button-primary-border-hover)] hover:bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-hover-start)_0%,var(--cmm-button-primary-bg-hover-end)_100%)]",
                    footerActionLink:
                      "text-indigo-700 hover:text-indigo-900 font-semibold",
                  },
                }}
              />
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-600">
                Pas encore de compte ?{" "}
                <Link
                  href="/sign-up"
                  className="font-semibold text-indigo-700 transition-colors hover:text-indigo-900"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
