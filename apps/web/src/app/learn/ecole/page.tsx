import type { Metadata } from "next";
import { QuizSchoolKitPage } from "@/components/learn/quiz-school-kit-page";

export const metadata: Metadata = {
  title: "Mode École - Kit d'atelier | CleanMyMap",
  description:
    "Kit d'atelier pour le mode École du quiz CleanMyMap: fiche enseignant, fiche élève, déroulé collectif et première banque de 20 questions.",
  alternates: {
    canonical: "/learn/ecole",
  },
};

export default function LearnSchoolKitPage() {
  return <QuizSchoolKitPage />;
}
