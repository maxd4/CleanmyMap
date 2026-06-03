import type { Metadata } from "next";
import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
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

type SignUpPageProps = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { ref } = await searchParams;
  const referralQuery = ref?.trim()
    ? `?ref=${encodeURIComponent(ref.trim())}`
    : "";
  const fallbackRedirectUrl = `/onboarding/localisation${referralQuery}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(219,234,254,0.72)_0%,_rgba(232,233,255,0.82)_34%,_rgba(206,250,225,0.9)_72%,_rgba(245,247,250,1)_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-indigo-400/14 blur-3xl" />
        <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-violet-400/12 blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <div className="hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-center lg:px-12 xl:px-16">
          <div className="max-w-xl space-y-8 rounded-[2.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.9)_48%,rgba(67,56,202,0.86)_100%)] p-8 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.75)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                <Leaf className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-white">CleanMyMap</h1>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200/90">
                Famille autonome Auth & Onboarding
              </p>
              <h2 className="max-w-lg text-3xl font-black leading-tight text-white">
                Rejoignez la communauté écologique
              </h2>
              <p className="max-w-lg text-lg leading-relaxed text-violet-100/80">
                Créez votre compte pour commencer à agir concrètement pour l&apos;environnement dans votre quartier.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-300" />
                <p className="text-sm text-white">Accès gratuit à toutes les fonctionnalités</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-violet-300" />
                <p className="text-sm text-violet-100/90">Mon espace personnalisé</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-200" />
                <p className="text-sm text-white">Suivi de votre impact environnemental</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-[54%] lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-md space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-violet-200 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;accueil
            </Link>

            <div className="lg:hidden">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                  <Leaf className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold text-white">CleanMyMap</h1>
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-emerald-200/90">
                Auth & Onboarding
              </p>
              <h2 className="mb-2 text-2xl font-bold text-white">Créer un compte</h2>
              <p className="mb-6 text-violet-100/80">
                Rejoignez la communauté et commencez à agir pour l&apos;environnement.
              </p>
            </div>

            <div className="rounded-[2.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.94)_0%,rgba(30,41,59,0.92)_44%,rgba(88,28,135,0.9)_100%)] p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.65)] backdrop-blur-2xl">
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-200/90">
                  Inscription
                </p>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  Créez votre compte
                </h3>
                <p className="text-sm leading-relaxed text-violet-100/78">
                  Une inscription sobre et lisible pour rejoindre la communauté et commencer à agir.
                </p>
              </div>

              <ClerkLoading>
                <div className="space-y-4 animate-pulse">
                  <div className="h-12 rounded-2xl border border-white/10 bg-white/[0.08]" />
                  <div className="h-12 rounded-2xl border border-white/10 bg-white/[0.08]" />
                  <div className="h-12 rounded-full bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(79,70,229,0.92)_54%,rgba(109,40,217,0.9)_100%)]" />
                  <p className="pt-2 text-sm text-violet-100/60">
                    Chargement sécurisé de l&apos;inscription...
                  </p>
                </div>
              </ClerkLoading>

              <ClerkLoaded>
                <SignUp
                  path="/sign-up"
                  routing="path"
                  oauthFlow="redirect"
                  fallbackRedirectUrl={fallbackRedirectUrl}
                  signInUrl="/sign-in"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 bg-transparent",
                      headerTitle: "text-xl font-bold text-white",
                      headerSubtitle: "text-violet-100/80",
                      socialButtonsBlockButton:
                        "border border-white/10 bg-white/[0.08] text-white transition-all duration-300 hover:border-emerald-300/30 hover:bg-white/[0.12] hover:text-white",
                      formFieldLabel: "text-violet-100/90",
                      formFieldInput:
                        "border-white/10 bg-white/[0.08] text-white placeholder:text-violet-100/40 shadow-none ring-0 focus:border-emerald-300/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-emerald-300/30",
                      formFieldInputShowPasswordButton: "text-violet-100/70 hover:text-white",
                      formButtonPrimary:
                        "border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(79,70,229,0.92)_54%,rgba(109,40,217,0.9)_100%)] text-white shadow-[0_18px_34px_-18px_rgba(15,23,42,0.55)] transition-all hover:border-emerald-300/30 hover:shadow-[0_22px_40px_-20px_rgba(79,70,229,0.45)]",
                      footerActionLink:
                        "text-emerald-200 hover:text-white font-semibold",
                    },
                  }}
                />
              </ClerkLoaded>
            </div>

            <div className="text-center">
              <p className="text-sm text-violet-100/80">
                Déjà un compte ?{" "}
                <Link
                  href="/sign-in"
                  className="font-semibold text-emerald-200 transition-colors hover:text-white"
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
