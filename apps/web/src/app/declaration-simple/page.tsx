import type { Metadata } from "next";
import { SimpleActionForm } from '@/components/actions/simple-action-form'

export const metadata: Metadata = {
  title: "Déclaration simple - CleanMyMap",
  description: "Déclarez rapidement votre action de nettoyage urbain. Formulaire simplifié pour signaler les déchets collectés.",
  keywords: ["déclaration", "signalement", "nettoyage", "déchets", "bénévolat", "écologie"],
  alternates: { canonical: "/declaration-simple" },
};

export default function SimpleDeclarationPage() {
 return (
 <div className="min-h-screen bg-gray-50 py-8">
 <div className="container mx-auto px-4">
 <SimpleActionForm />
 </div>
 </div>
 )
}