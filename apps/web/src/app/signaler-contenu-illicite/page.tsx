import type { Metadata } from "next";
import Link from "next/link";
import { LegalContentReportForm } from "@/components/sections/rubriques/legal-content-report-form";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Signaler un contenu illicite - CleanMyMap",
  description: "Transmettre une notification électronique circonstanciée concernant un contenu potentiellement illicite.",
  alternates: { canonical: "/signaler-contenu-illicite" },
};

export default function SignalerContenuIllicitePage() {
  return (
    <main>
      <CmmPageLayout>
      <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-xl sm:p-10">
        <CmmSectionGroup>
        <PageHeader
          tone="slate"
          title="Signaler un contenu potentiellement illicite"
          subtitle="Indiquez l’URL exacte du contenu et décrivez les faits. Aucun compte n’est nécessaire."
        />
        <section className="space-y-3 text-sm leading-6 text-slate-600">
          <p>
            Ce formulaire permet de transmettre une notification électronique conçue pour le
            traitement prévu par l&apos;article 16 du règlement sur les services numériques (DSA),
            sans préjuger de la qualification juridique de CleanMyMap ni de celle des faits signalés.
          </p>
          <p>
            Aucun compte n&apos;est nécessaire. Aucune pièce d&apos;identité ni aucun fichier joint ne sont
            demandés dans ce premier dispositif. Si vous fournissez un email, un accusé de réception
            est envoyé après l&apos;enregistrement du signalement.
          </p>
        </section>
        <LegalContentReportForm />
        <p className="text-xs leading-5 text-slate-500">
          Pour l&apos;identité de l&apos;éditeur et les coordonnées de contact générales, consultez les{" "}
          <Link href="/mentions-legales" className="font-medium text-emerald-700 hover:underline">mentions légales</Link>.{" "}
          Les informations personnelles sont traitées selon la{" "}
          <Link href="/politique-confidentialite" className="font-medium text-emerald-700 hover:underline">politique de confidentialité</Link>.
        </p>
        </CmmSectionGroup>
      </div>
      </CmmPageLayout>
    </main>
  );
}
