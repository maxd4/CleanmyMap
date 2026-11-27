import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";

const LINKS = {
  actions: [
    ["/actions/new?tab=before", "Préparer une collecte", "Prepare a cleanup", "Lieu, matériel, sécurité et invitations.", "Location, equipment, safety and invitations."],
    ["/sections/rejoindre-une-action", "Rejoindre une action", "Join a cleanup", "Trouver une action publique ou suivre ses inscriptions.", "Find public actions or follow your registrations."],
    ["/actions/history", "Historique terrain", "Action history", "Retrouver les enregistrements accessibles.", "Review accessible action records."],
    ["/reports", "Rapports et exports", "Reports and exports", "Générer les bilans admissibles.", "Generate eligible reports."],
  ],
  opportunities: [
    ["/actions/map", "Explorer la carte", "Explore the map", "Observations et actions passées, pas une mesure exhaustive actuelle.", "Observations and past actions, not an exhaustive current measurement."],
    ["/sections/annuaire", "Trouver des acteurs", "Find organizations", "Identifier les associations et partenaires locaux.", "Find local associations and partners."],
    ["/partners/onboarding", "Présenter sa structure", "Introduce your organization", "Déposer une demande de partenariat.", "Submit a partnership request."],
    ["/learn/bonnes-pratiques", "Préparer les collaborateurs", "Prepare colleagues", "Consignes et sensibilisation.", "Safety guidance and learning resources."],
  ],
} as const;

export function EnterpriseActionLinks({ locale, view }: { locale: "fr" | "en"; view: keyof typeof LINKS }) {
  const isEn = locale === "en";
  return (
    <section aria-label={isEn ? "Enterprise resources" : "Ressources entreprise"} className="grid gap-3 md:grid-cols-2">
      {LINKS[view].map(([href, fr, en, hintFr, hintEn]) => (
        <CmmCard key={href} className="space-y-3">
          <h2 className="font-bold cmm-text-primary">{isEn ? en : fr}</h2>
          <p className="text-sm cmm-text-secondary">{isEn ? hintEn : hintFr}</p>
          <CmmButton href={href} tone="secondary">{isEn ? en : fr}</CmmButton>
        </CmmCard>
      ))}
    </section>
  );
}
