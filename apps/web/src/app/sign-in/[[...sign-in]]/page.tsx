import type { Metadata } from "next";
import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ClerkHydrationGate } from "@/components/auth/clerk-hydration-gate";
import { resolveSafeAuthRedirect } from "@/lib/auth/redirect-url";
import { HOME_ROUTE } from "@/lib/home-routes";

export const metadata: Metadata = {
  title: "Connexion - CleanMyMap",
  description: "Connectez-vous à CleanMyMap pour déclarer vos actions de nettoyage, signaler les pollutions et rejoindre la communauté de bénévoles écologistes.",
  keywords: ["connexion", "login", "sign in", "bénévolat", "écologie", "CleanMyMap"],
  alternates: {
    canonical: "/sign-in",
  },
};

function SignInLoadingState() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse">
      <div className="h-11 rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-xl bg-indigo-600" />
      <p className="pt-2 text-sm text-slate-500">
        Chargement sécurisé de l&apos;authentification...
      </p>
    </div>
  );
}

type SignInPageProps = {
  searchParams?: Promise<{ redirect_url?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const forceRedirectUrl = resolveSafeAuthRedirect(params?.redirect_url);

  return (
    <AuthPageShell variant="sign-in">
      <ClerkHydrationGate fallback={<SignInLoadingState />}>
        <ClerkLoading>
          <SignInLoadingState />
        </ClerkLoading>

        <ClerkLoaded>
          <SignIn
            path="/sign-in"
            routing="path"
            oauthFlow="redirect"
            forceRedirectUrl={forceRedirectUrl}
            fallbackRedirectUrl={HOME_ROUTE}
            signUpUrl="/sign-up"
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
