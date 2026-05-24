import type { Metadata } from "next";
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: "Déclaration - CleanMyMap",
  description: "Déclarez vos actions de nettoyage urbain et累计 votre impact environnemental.",
  keywords: ["déclaration", "action", "nettoyage", "impact", "bénévolat"],
  alternates: { canonical: "/actions/new" },
};

export default function DeclarationRedirect() {
 redirect('/actions/new')
}
