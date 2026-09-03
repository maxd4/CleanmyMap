import type { Metadata } from "next";
import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ClerkHydrationGate } from "@/components/auth/clerk-hydration-gate";

export const metadata: Metadata = {
  title: "Créer un compte - CleanMyMap",
  description: "Rejoignez CleanMyMap pour déclarer vos actions de nettoyage, signaler les pollutions et agir pour l'environnement dans votre quartier.",
  keywords: ["inscription", "register", "sign up", "bénévolat", "écologie", "CleanMyMap"],
  alternates: {
    canonical: "/sign-up",
  },
};

function SignUpLoadingState() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse">
      <div className="h-11 rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-xl bg-indigo-600" />
      <p className="pt-2 text-sm text-slate-500">
        Chargement sécurisé de l&apos;inscription...
      </p>
    </div>
  );
}

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
    <AuthPageShell variant="sign-up">
      <ClerkHydrationGate fallback={<SignUpLoadingState />}>
        <ClerkLoading>
          <SignUpLoadingState />
        </ClerkLoading>

        <ClerkLoaded>
          <SignUp
            path="/sign-up"
            routing="path"
            oauthFlow="redirect"
            fallbackRedirectUrl={fallbackRedirectUrl}
            signInUrl="/sign-in"
            appearance={{
              variables: {
                colorPrimary: "#4f46e5",
              },
              elements: {
                rootBox: "w-full",
                card: "w-full max-w-none border-0 bg-transparent p-0 shadow-none",
                headerTitle: "text-2xl font-bold text-slate-950",
                headerSubtitle: "text-sm leading-relaxed text-slate-600",
                socialButtonsBlockButton:
                  "min-h-11 border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50",
                socialButtonsBlockButtonText: "font-semibold text-slate-700",
                dividerLine: "bg-slate-200",
                dividerText: "text-slate-500",
                formFieldLabel: "font-semibold text-slate-800",
                formFieldInput:
                  "border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 shadow-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
                formFieldInputShowPasswordButton:
                  "text-slate-500 hover:text-slate-900",
                formButtonPrimary:
                  "min-h-11 border border-indigo-600 bg-indigo-600 text-white shadow-sm transition-colors hover:border-indigo-700 hover:bg-indigo-700 focus:ring-2 focus:ring-emerald-500",
                footerActionText: "text-slate-500",
                footerActionLink:
                  "font-semibold text-emerald-700 hover:text-emerald-800",
                alert: "border-red-200 bg-red-50 text-red-800",
              },
            }}
          />
        </ClerkLoaded>
      </ClerkHydrationGate>
    </AuthPageShell>
  );
}
