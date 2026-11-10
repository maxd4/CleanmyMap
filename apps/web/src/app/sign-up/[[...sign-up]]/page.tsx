import type { Metadata } from "next";
import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import { AUTH_CLERK_APPEARANCE, AuthPageShell } from "@/components/auth/auth-page-shell";
import { ClerkHydrationGate } from "@/components/auth/clerk-hydration-gate";
import {
  buildSignInRedirectHref,
  buildSignUpCompletionRedirectHref,
  resolveSafeAuthRedirect,
} from "@/lib/auth/redirect-url";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Rejoignez CleanMyMap pour déclarer vos actions de nettoyage, signaler les pollutions et agir pour l'environnement dans votre quartier.",
  keywords: ["inscription", "register", "sign up", "bénévolat", "écologie", "CleanMyMap"],
  robots: { index: false, follow: false },
};

function SignUpLoadingState() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse">
      <div className="h-11 rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-xl bg-[#a06c00]" />
      <p className="pt-2 text-sm text-slate-500">
        Chargement sécurisé de l&apos;inscription...
      </p>
    </div>
  );
}

type SignUpPageProps = {
  searchParams: Promise<{
    ref?: string | string[];
    redirect_url?: string | string[];
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const requestedRoute = resolveSafeAuthRedirect(params.redirect_url);
  const completionRedirectUrl = buildSignUpCompletionRedirectHref(requestedRoute, {
    referralCode,
  });
  const signInHref = buildSignInRedirectHref(requestedRoute, { referralCode });

  return (
    <AuthPageShell variant="sign-up" switchHref={signInHref}>
      <ClerkHydrationGate fallback={<SignUpLoadingState />}>
        <ClerkLoading>
          <SignUpLoadingState />
        </ClerkLoading>

        <ClerkLoaded>
          <SignUp
            path="/sign-up"
            routing="path"
            oauthFlow="redirect"
            forceRedirectUrl={completionRedirectUrl}
            fallbackRedirectUrl={completionRedirectUrl}
            signInUrl={signInHref}
            appearance={AUTH_CLERK_APPEARANCE}
          />
        </ClerkLoaded>
      </ClerkHydrationGate>
    </AuthPageShell>
  );
}
