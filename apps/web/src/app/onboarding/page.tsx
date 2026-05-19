import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, User, Settings } from "lucide-react";
import type { Metadata } from "next";
import { getSafeAuthSession } from "@/lib/auth/safe-session";

export const metadata: Metadata = {
  title: "Bienvenue sur CleanMyMap - Configuration initiale",
  description: "Configurez votre profil CleanMyMap pour commencer à agir pour l'environnement dans votre quartier.",
  keywords: ["onboarding", "configuration", "profil", "écologie", "CleanMyMap"],
  robots: {
    index: false, // Page privée
    follow: false,
  },
};

export default async function OnboardingPage() {
  const { userId } = await getSafeAuthSession();
  
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-white px-4 py-8">
      {/* Effets visuels subtils */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="absolute -right-16 top-40 h-72 w-72 rounded-full bg-cyan-400/6 blur-3xl" />
        <div className="absolute bottom-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-400/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <div className="space-y-8">
          {/* En-tête */}
          <header className="text-center space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
              Configuration initiale
            </p>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[0.95] tracking-tight text-slate-900">
              Bienvenue sur CleanMyMap
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Quelques étapes simples pour personnaliser votre expérience et commencer à agir pour l'environnement dans votre quartier.
            </p>
          </header>

          {/* Étapes d'onboarding */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Étape 1: Localisation */}
            <Link
              href="/onboarding/localisation"
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">Localisation</h3>
                  <p className="text-sm text-slate-600">Définir votre zone d'action</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Choisissez votre arrondissement ou zone d'intervention pour recevoir des recommandations personnalisées.
              </p>
            </Link>

            {/* Étape 2: Profil */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 p-6 opacity-60">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-700">Profil</h3>
                  <p className="text-sm text-slate-500">Personnaliser l'expérience</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Configurez vos préférences d'affichage et votre niveau d'engagement.
              </p>
              <div className="absolute right-4 top-4 rounded-full bg-slate-300 px-2 py-1 text-xs font-semibold text-slate-600">
                Réservé
              </div>
            </div>

            {/* Étape 3: Préférences */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 p-6 opacity-60">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                  <Settings className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-700">Préférences</h3>
                  <p className="text-sm text-slate-500">Notifications et rappels</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Choisissez comment vous souhaitez être informé des opportunités d'action.
              </p>
              <div className="absolute right-4 top-4 rounded-full bg-slate-300 px-2 py-1 text-xs font-semibold text-slate-600">
                En préparation
              </div>
            </div>
          </section>

          {/* Actions rapides */}
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Ou commencez directement
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Tableau de bord</p>
                  <p className="text-sm text-slate-600">Voir les priorités</p>
                </div>
              </Link>
              <Link
                href="/explorer"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Sommaire</p>
                  <p className="text-sm text-slate-600">Découvrir les sections</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
