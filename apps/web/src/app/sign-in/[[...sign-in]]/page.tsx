import type { Metadata } from "next";
import { SignIn } from"@clerk/nextjs";

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
 <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
 <SignIn
 path="/sign-in"
 routing="path"
 fallbackRedirectUrl="/profil"
 signUpUrl="/sign-up"
 />
 </main>
 );
}
