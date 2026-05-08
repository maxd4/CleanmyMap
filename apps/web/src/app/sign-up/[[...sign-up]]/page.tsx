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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-white">
      {/* Effets visuels subtils */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-cyan-400/6 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Panneau d'information */}
        <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-12">
          <div className="max-w-md space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                <Leaf className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">CleanMyMap</h1>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black leading-tight text-slate-900">
                Rejoignez la communauté écologique
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                Créez votre compte pour commencer à agir concrètement pour l'environnement dans votre quartier.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-sm text-slate-700">Accès gratuit à toutes les fonctionnalités</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="h-2 w-2 rounded-full bg-cyan-500" />
                <p className="text-sm text-slate-700">Tableau de bord personnalisé</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <p className="text-sm text-slate-700">Suivi de votre impact environnemental</p>
              </div>
            </div>
          </div>
        </div>

        {/* Panneau d'inscription */}
        <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-12">
          <div className="mx-auto w-full max-w-md space-y-6">
            {/* Navigation de retour */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>

            {/* Titre mobile */}
            <div className="lg:hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <Leaf className="h-5 w-5 text-emerald-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">CleanMyMap</h1>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Créer un compte</h2>
              <p className="text-slate-600 mb-6">
                Rejoignez la communauté et commencez à agir pour l'environnement.
              </p>
            </div>

            {/* Composant Clerk */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
              <SignUp
                path="/sign-up"
                routing="path"
                fallbackRedirectUrl="/onboarding"
                signInUrl="/sign-in"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0 bg-transparent",
                    headerTitle: "text-xl font-bold text-slate-900",
                    headerSubtitle: "text-slate-600",
                    socialButtonsBlockButton: "border-slate-200 hover:border-slate-300 transition-colors",
                    formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 transition-colors",
                    footerActionLink: "text-emerald-600 hover:text-emerald-700",
                  },
                }}
              />
            </div>

            {/* Lien vers la connexion */}
            <div className="text-center">
              <p className="text-sm text-slate-600">
                Déjà un compte ?{" "}
                <Link
                  href="/sign-in"
                  className="font-medium text-emerald-600 transition-colors hover:text-emerald-700"
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