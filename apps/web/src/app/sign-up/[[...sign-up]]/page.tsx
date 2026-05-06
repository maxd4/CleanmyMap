import type { Metadata } from "next";
import { SignUp } from"@clerk/nextjs";

export const metadata: Metadata = {
  title: "Inscription - CleanMyMap",
  description: "Inscrivez-vous gratuitement sur CleanMyMap. Rejoignez la communauté de bénévoles pour la dépollution urbaine et le développement durable.",
  keywords: ["inscription", "signup", "créer compte", "bénévolat", "écologie", "CleanMyMap"],
  alternates: {
    canonical: "/sign-up",
  },
};

export default function SignUpPage() {
 return (
 <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
 <SignUp
 path="/sign-up"
 routing="path"
 fallbackRedirectUrl="/onboarding/localisation"
 signInUrl="/sign-in"
 />
 </main>
 );
}
