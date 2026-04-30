"use client";

import {
 getSectionRubriqueById,
 type FinalizedSectionId,
 type SectionId,
} from"@/lib/sections-registry";
import { CommunitySection } from"@/components/sections/rubriques/community-section";
import { FeedbackSection } from"@/components/sections/rubriques/feedback-section";
import {
 ActorsSection,
 GamificationSection,
} from"@/components/sections/rubriques/engagement-sections";
import { AnnuaireSection } from"@/components/sections/rubriques/annuaire-section";
import { ElusSection } from"@/components/sections/rubriques/elus-section";
import { FundingSection } from"@/components/sections/rubriques/funding-section";
import { OpenDataSection } from"@/components/sections/rubriques/open-data-section";
import {
 ClimateSection,
 CompareSection,
 GuideSection,
 RecyclingSection,
 RouteSection,
 SandboxSection,
 TrashSpotterSection,
 WeatherSection,
} from"@/components/sections/rubriques/terrain-sections";
import { ConnectSection } from"@/components/sections/rubriques/connect-section";
import {
 NotFoundSection,
 PendingSection,
 SectionShell,
 type L10n,
} from"@/components/sections/rubriques/shared";

type SectionRendererProps = {
 sectionId: SectionId;
};

export function SectionRenderer({ sectionId }: SectionRendererProps) {
 const sectionDefinition = getSectionRubriqueById(sectionId) as
 | {
 id: string;
 implementation:"finalized" |"pending";
 label: L10n;
 description: L10n;
 pendingNote?: L10n;
 }
 | undefined;

 if (!sectionDefinition) {
 return <NotFoundSection />;
 }

 if (sectionDefinition.implementation ==="pending") {
 return (
 <PendingSection
 label={sectionDefinition.label}
 description={sectionDefinition.description}
 note={sectionDefinition.pendingNote}
 />
 );
 }

 const finalizedSectionId = sectionDefinition.id as FinalizedSectionId;

 switch (finalizedSectionId) {
 case"community":
 return (
 <SectionShell
 title={{ fr:"Opérations collectives", en:"Collective operations" }}
 subtitle={{
 fr:"Actions collectives, coordination des événements et historique au même endroit.",
 en:"Collective actions, event coordination and history in one place.",
 }}
 links={[
 {
 href:"/actions/new",
 label: { fr:"Déclarer une action", en:"Declare an action" },
 },
 {
 href:"/actions/history",
 label: { fr:"Voir l'historique", en:"View history" },
 },
 ]}
 >
 <CommunitySection />
 </SectionShell>
 );
 case"feedback":
 return <FeedbackSection />;
 case"gamification":
 return (
 <SectionShell
 title={{ fr:"Classement", en:"Leaderboard" }}
 subtitle={{
 fr:"Classement bénévole basé sur les actions validées.",
 en:"Volunteer ranking based on validated actions.",
 }}
 links={[
 {
 href:"/actions/history",
 label: { fr:"Consulter l'historique", en:"Consult history" },
 },
 ]}
 >
 <GamificationSection />
 </SectionShell>
 );
 case"actors":
 return (
 <SectionShell
 title={{ fr:"Partenaires", en:"Partners" }}
 subtitle={{
 fr:"Vue du réseau local et des zones prioritaires.",
 en:"Local partner network and priority areas.",
 }}
 links={[
 {
 href:"/sections/elus",
 label: { fr:"Accéder à la vue élus", en:"Access authorities view" },
 },
 ]}
 >
 <ActorsSection />
 </SectionShell>
 );
 case"annuaire":
 return (
 <SectionShell
 title={{ fr:"Découvrir le réseau", en:"Discover the network" }}
 subtitle={{
 fr:"Carte, fiches et repères pour lire le réseau local.",
 en:"Map, cards and reference points for reading the local network.",
 }}
 links={[
 {
 href:"/partners/network",
 label: { fr:"Explorer le réseau", en:"Explore network" },
 },
 {
 href:"/partners/onboarding",
 label: { fr:"S'inscrire au réseau", en:"Join the network" },
 },
 ]}
 >
 <AnnuaireSection />
 </SectionShell>
 );
 case"open-data":
 return (
 <SectionShell
 title={{ fr:"Données ouvertes", en:"Open data" }}
 subtitle={{
 fr:"Open data, API et exports pour chercheurs et collectivités.",
 en:"Open data, API and exports for researchers and cities.",
 }}
 links={[
 {
 href:"/reports",
 label: { fr:"Exporter l'impact", en:"Export impact" },
 },
 {
 href:"/sections/elus",
 label: { fr:"Accéder à la vue élus", en:"Access authorities view" },
 },
 ]}
 >
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="cmm-text-small font-semibold cmm-text-primary uppercase tracking-widest border-b border-slate-200 pb-2">
 Données ouvertes
 </h3>
 <OpenDataSection />
 </div>
 <div className="space-y-4">
 <h3 className="cmm-text-small font-semibold cmm-text-primary uppercase tracking-widest border-b border-slate-200 pb-2">
 Financement & Sponsoring
 </h3>
 <FundingSection />
 </div>
 </div>
 </SectionShell>
 );
 case"funding":
 return (
 <SectionShell
 title={{ fr:"Financement / sponsoring", en:"Funding / sponsoring" }}
 subtitle={{
 fr:"Sponsoring de zones, mécénat écologique et dons.",
 en:"Zone sponsorship, ecological patronage and donations.",
 }}
 links={[
 {
 href:"/sections/actors",
 label: { fr:"Voir les partenaires", en:"View partners" },
 },
 {
 href:"/reports",
 label: { fr:"Consulter l'impact", en:"Consult impact" },
 },
 ]}
 >
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
 <div className="space-y-4">
 <h3 className="cmm-text-small font-semibold cmm-text-primary uppercase tracking-widest border-b border-slate-200 pb-2">
 Financement & Sponsoring
 </h3>
 <FundingSection />
 </div>
 <div className="space-y-4">
 <h3 className="cmm-text-small font-semibold cmm-text-primary uppercase tracking-widest border-b border-slate-200 pb-2">
 Données ouvertes
 </h3>
 <OpenDataSection />
 </div>
 </div>
 </SectionShell>
 );
 case"trash-spotter":
 return (
 <SectionShell
 title={{ fr:"Trash Spotter", en:"Trash Spotter" }}
 subtitle={{
 fr:"Signalement, visualisation et priorisation géolocalisée.",
 en:"Reporting, visualization and geospatial prioritization.",
 }}
 links={[
 {
 href:"/actions/new",
 label: { fr:"Saisir une action", en:"Capture an action" },
 },
 {
 href:"/actions/map",
 label: { fr:"Consulter la carte", en:"Consult the map" },
 },
 ]}
 >
 <TrashSpotterSection />
 </SectionShell>
 );
 case"route":
 return (
 <SectionShell
 title={{ fr:"Itinéraire IA", en:"AI routing" }}
 subtitle={{
 fr:"Préparer un itinéraire priorisé par l'impact.",
 en:"Prepare an impact-prioritized route.",
 }}
 links={[
 {
 href:"/actions/map",
 label: { fr:"Vérifier sur la carte", en:"Check on map" },
 },
 ]}
 >
 <RouteSection />
 </SectionShell>
 );
 case"recycling":
 return (
 <SectionShell
 title={{ fr:"Seconde vie", en:"Recycling" }}
 subtitle={{
 fr:"Consignes de tri et valorisation terrain.",
 en:"Field sorting and reuse guidance.",
 }}
 links={[
 {
 href:"/reports",
 label: { fr:"Exporter les données", en:"Export data" },
 },
 ]}
 >
 <RecyclingSection />
 </SectionShell>
 );
 case"climate":
 return (
 <SectionShell
 title={{ fr:"Développement durable", en:"Sustainability" }}
 subtitle={{
 fr:"Lectures scientifiques et lien direct avec l'impact local.",
 en:"Scientific briefs linked to local action impact.",
 }}
 links={[
 {
 href:"/reports",
 label: { fr:"Rapports d'impact", en:"Impact reports" },
 },
 ]}
 >
 <div className="space-y-6">
 <ClimateSection />
 <section className="rounded-xl border border-slate-200 bg-white p-4">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">
 Comparaison territoriale intégrée
 </h3>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 Lecture comparée des zones pour prioriser la coordination locale
 et les arbitrages d&apos;impact.
 </p>
 <div className="mt-3">
 <CompareSection />
 </div>
 </section>
 </div>
 </SectionShell>
 );
 case"weather":
 return (
 <SectionShell
 title={{ fr:"Météo", en:"Weather" }}
 subtitle={{
 fr:"Conditions courantes pour sécuriser les opérations.",
 en:"Current conditions to secure field operations.",
 }}
 links={[
 {
 href:"/actions/new",
 label: { fr:"Planifier une action", en:"Plan action" },
 },
 ]}
 >
 <WeatherSection />
 </SectionShell>
 );
 case"sandbox":
 return (
 <SectionShell
 title={{ fr:"Visualiser la carte", en:"Map sandbox" }}
 subtitle={{
 fr:"Tester la carte et les filtres avant de commencer.",
 en:"Test the map and filters before starting.",
 }}
 links={[
 {
 href:"/actions/map",
 label: { fr:"Ouvrir la carte", en:"Open map" },
 },
 {
 href:"/actions/new",
 label: { fr:"Déclarer une action", en:"Declare action" },
 },
 ]}
 >
 <SandboxSection />
 </SectionShell>
 );
 case"guide":
 return (
 <SectionShell
 title={{ fr:"Guide pratique", en:"Practical guide" }}
 subtitle={{
 fr:"Workflow conseillé pour une collecte fiable.",
 en:"Recommended workflow for reliable data collection.",
 }}
 links={[
 { href:"/actions/new", label: { fr:"Commencer", en:"Start" } },
 {
 href:"/actions/history",
 label: { fr:"Vérifier", en:"Review" },
 },
 ]}
 >
 <GuideSection />
 </SectionShell>
 );
 case"dm":
 return <ConnectSection defaultTab="dm" />;
 case"messagerie":
 return <ConnectSection defaultTab="discussions" />;
 case"elus":
 return (
 <SectionShell
 title={{ fr:"Autorités locales & coordination", en:"Local authorities & coordination" }}
 subtitle={{
 fr:"Vision claire des besoins et résultats pour faciliter la coordination.",
 en:"Clear needs/results view to support coordination.",
 }}
 links={[
 {
 href:"/reports",
 label: { fr:"Accès aux rapports d'impact", en:"Open impact reports" },
 },
 ]}
 >
 <ElusSection />
 </SectionShell>
 );
 default: {
 const exhaustiveCheck: never = finalizedSectionId;
 return <NotFoundSection key={exhaustiveCheck} />;
 }
 }
}
