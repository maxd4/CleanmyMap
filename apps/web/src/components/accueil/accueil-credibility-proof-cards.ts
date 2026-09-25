import { FileText, GraduationCap, MapPin, type LucideIcon } from "lucide-react";

export type CredibilityProofCard = {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
  external?: boolean;
};

export const CREDIBILITY_PROOF_CARDS = [
  { icon: GraduationCap, title: "Cadre universitaire", text: "DU Engagement\nSorbonne Université" },
  { icon: MapPin, title: "Ancrage terrain", text: "Actions réelles\net cartographiées", href: "/methodologie#indicateurs-impact-terrain" },
  { icon: FileText, title: "Traçabilité", text: "Projet open-source\nsur GitHub", href: "https://github.com/maxd4/CleanMyMap", external: true },
] satisfies readonly CredibilityProofCard[];
