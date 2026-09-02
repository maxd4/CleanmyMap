import type { Metadata } from "next";
import { QuizSchoolKitPage } from "@/components/learn/quiz/quiz-school-kit-page";

export const metadata: Metadata = {
  title: "Mode École - Kit d'atelier | CleanMyMap",
  description:
    "Séance publique de 30 ou 60 minutes pour les classes de 6e à 3e, avec choix du niveau, du format et déroulé collectif.",
  alternates: {
    canonical: "/learn/ecole",
  },
};

export default function LearnSchoolKitPage() {
  return <QuizSchoolKitPage />;
}
