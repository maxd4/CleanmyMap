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
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(199,210,254,0.45)_0%,_rgba(255,255,255,0.96)_52%,_rgba(248,250,252,1)_100%)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-violet-400/8 blur-3xl" />
        <div className="absolute bottom-16 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <div className="space-y-8">
          <header className="text-center space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-700">
              Configuration initiale
            </p>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[0.95] tracking-tight text-slate-950">
              Bienvenue sur CleanMyMap
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Quelques étapes simples pour personnaliser votre expérience et commencer à agir pour l&apos;environnement dans votre quartier.
            </p>
          </header>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/onboarding/localisation"
              className="group relative overflow-hidden rounded-[2rem] border border-indigo-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-36px_rgba(79,70,229,0.4)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_24px_60px_-40px_rgba(79,70,229,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">Localisation</h3>
                  <p className="text-sm text-slate-600">Définir votre zone d&apos;action</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Choisissez votre arrondissement ou zone d&apos;intervention pour recevoir des recommandations personnalisées.
              </p>
            </Link>

            <div className="relative overflow-hidden rounded-[2rem] border border-indigo-100/70 bg-white/55 p-6 opacity-70 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800">Profil</h3>
                  <p className="text-sm text-slate-500">Personnaliser l&apos;expérience</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Configurez vos préférences d&apos;affichage et votre niveau d&apos;engagement.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-indigo-100/70 bg-white/55 p-6 opacity-70 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Settings className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800">Préférences</h3>
                  <p className="text-sm text-slate-500">Notifications et rappels</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Choisissez comment vous souhaitez être informé des opportunités d&apos;action.
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-indigo-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-36px_rgba(79,70,229,0.28)] backdrop-blur-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Ou commencez directement
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-indigo-50/80 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-100/80"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Tableau de bord</p>
                  <p className="text-sm text-slate-600">Voir les priorités</p>
                </div>
              </Link>
              <Link
                href="/explorer"
                className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-amber-50/80 p-4 transition-colors hover:border-amber-300 hover:bg-amber-100/80"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
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
