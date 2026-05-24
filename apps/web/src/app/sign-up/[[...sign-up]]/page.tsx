import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";

export const metadata: Metadata = {
  title: "Créer un compte - CleanMyMap",
  description: "Rejoignez CleanMyMap pour déclarer vos actions de nettoyage, signaler les pollutions et agir pour l'environnement dans votre quartier.",
  keywords: ["inscription", "register", "sign up", "bénévolat", "écologie", "CleanMyMap"],
  alternates: {
    canonical: "/sign-up",
  },
};

export default function SignUpPage() {
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
                Rejoignez la communauté écologique
              </h2>
              <p className="max-w-lg text-lg leading-relaxed text-slate-600">
                Créez votre compte pour commencer à agir concrètement pour l'environnement dans votre quartier.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-white/82 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <p className="text-sm text-slate-700">Accès gratuit à toutes les fonctionnalités</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-white/82 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <p className="text-sm text-slate-700">Tableau de bord personnalisé</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-white/82 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <p className="text-sm text-slate-700">Suivi de votre impact environnemental</p>
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
              <h2 className="mb-2 text-2xl font-bold text-slate-900">Créer un compte</h2>
              <p className="mb-6 text-slate-600">
                Rejoignez la communauté et commencez à agir pour l'environnement.
              </p>
            </div>

            <div className="rounded-[2.25rem] border border-indigo-200/60 bg-white/82 p-6 shadow-[0_24px_70px_-40px_rgba(79,70,229,0.42)] backdrop-blur-2xl">
              <SignUp
                path="/sign-up"
                routing="path"
                fallbackRedirectUrl="/onboarding"
                signInUrl="/sign-in"
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
                Déjà un compte ?{" "}
                <Link
                  href="/sign-in"
                  className="font-semibold text-indigo-700 transition-colors hover:text-indigo-900"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
