import type { Metadata } from "next";
import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import {
  AUTH_CLERK_APPEARANCE,
  AuthPageShell,
} from "@/components/auth/auth-page-shell";
import { ClerkHydrationGate } from "@/components/auth/clerk-hydration-gate";
import { resolveSafeAuthRedirect } from "@/lib/auth/redirect-url";
import { HOME_ROUTE } from "@/lib/home-routes";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à CleanMyMap pour déclarer vos actions de nettoyage, signaler les pollutions et rejoindre la communauté de bénévoles écologistes.",
  keywords: ["connexion", "login", "sign in", "bénévolat", "écologie", "CleanMyMap"],
  robots: { index: false, follow: false },
};

function SignInLoadingState() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse">
      <div className="h-11 rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-xl bg-[#a06c00]" />
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
            appearance={AUTH_CLERK_APPEARANCE}
          />
        </ClerkLoaded>
      </ClerkHydrationGate>
    </AuthPageShell>
  );
}
