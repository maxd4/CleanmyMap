"use client";

import {
 getSectionRubriqueById,
 type FinalizedSectionId,
 type SectionId,
} from"@/lib/sections-registry";
import { CommunitySection } from"@/components/sections/rubriques/community-section";
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
import { ChatShell } from"@/components/chat/chat-shell";
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
 fr:"Ressources terrain, coordination d'événements collectifs et suivi historique des actions au même endroit.",
 en:"Field resources, collective event coordination and action history in one place.",
 }}
 links={[
 {
 href:"/actions/new",
 label: { fr:"Nouvelle action", en:"New action" },
 },
 {
 href:"/actions/history",
 label: { fr:"Trace historique complète", en:"Full history trace" },
 },
 ]}
 >
 <CommunitySection />
 </SectionShell>
 );
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
 label: { fr:"Voir historique", en:"Open history" },
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
 label: { fr:"Vue collectivités", en:"Authorities view" },
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
 fr:"Carte, fiches et repères pour lire le réseau local sans mélange avec le pilotage.",
 en:"Map, cards and reference points to read the local network without mixing in governance.",
 }}
 links={[
 {
 href:"/partners/network",
 label: { fr:"Ouvrir la vue réseau", en:"Open network view" },
 },
 {
 href:"/partners/onboarding",
 label: { fr:"Rejoindre le réseau", en:"Join the network" },
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
 fr:"Open data, API, export JSON et cadre d'interopérabilité pour chercheurs et collectivités.",
 en:"Open data, API, JSON export and interoperability for researchers and cities.",
 }}
 links={[
 {
 href:"/reports",
 label: { fr:"Exporter les rapports", en:"Export reports" },
 },
 {
 href:"/sections/elus",
 label: { fr:"Vue institutionnelle", en:"Institutional view" },
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
 fr:"Sponsoring de zones, mécénat écologique et appel au don pour consolider le modèle économique.",
 en:"Zone sponsorship, ecological patronage and donations for a sustainable model.",
 }}
 links={[
 {
 href:"/sections/actors",
 label: { fr:"Partenaires engagés", en:"Engaged partners" },
 },
 {
 href:"/reports",
 label: { fr:"Suivi d'impact", en:"Impact tracking" },
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
 label: { fr:"Déclarer une action", en:"Declare action" },
 },
 {
 href:"/actions/map",
 label: { fr:"Carte complète", en:"Full map" },
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
 fr:"Préparation d'un plan de passage priorisé par impact.",
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
 fr:"Vulgarisation des rapports récents, ODD et limites planétaires, avec lien direct entre impact local et enjeux climatiques, incluant la comparaison territoriale.",
 en:"Scientific briefs, SDGs and planetary boundaries linked to local action impact.",
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
 fr:"Tester la carte, les filtres et la santé technique avant de commencer une action.",
 en:"Test the map, filters and technical health before starting an action.",
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
 fr:"Workflow web conseillé pour une collecte fiable.",
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
 fr:"Vision lisible et exploitable des besoins et résultats pour faciliter l'arbitrage public et la coordination locale.",
 en:"Readable, actionable needs/results view for public arbitration and local coordination.",
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
