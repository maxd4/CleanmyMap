import type { NavigationItem } from "@/lib/navigation";
import { CmmButton } from "@/components/ui/cmm-button";

type Localized = { fr: string; en: string };
type MethodologyFoundation = { data: Localized; method: Localized; limits: Localized; source: string };

/** Explanatory presentation of existing route contracts. Never a calculation owner. */
const FOUNDATIONS: Partial<Record<string, MethodologyFoundation>> = {
  dashboard: {
    data: { fr: "Compte connecté, résumé de situation et notifications du compte courant.", en: "Signed-in account, status summary and notifications for the current account." },
    method: { fr: "Le tableau de bord oriente vers les actions utiles selon le profil. Les notifications à traiter sont distinguées des informations ; les KPI conservent leur période, leurs unités et leur comparabilité.", en: "The dashboard prioritizes useful actions for the profile. Pending decisions are distinct from informational notifications; KPIs retain their period, units and comparability." },
    limits: { fr: "Un profil sélectionné n'accorde pas de permission supplémentaire. Une donnée indisponible ne vaut pas zéro. Le cockpit n'est pas un audit exhaustif.", en: "A selected profile grants no additional permission. Missing data is not zero. The dashboard is not an exhaustive audit." },
    source: "01-accueil-pilotage/dashboard/dashboard-README.md",
  },
  explorer: {
    data: { fr: "Registre des rubriques disponibles, profil courant et mode d'affichage.", en: "Registry of available sections, current profile and display mode." },
    method: { fr: "La navigation regroupe les entrées par famille et utilise les liens canoniques. Le sommaire sert à retrouver les surfaces, pas à calculer un impact.", en: "Navigation groups entries by family and uses canonical links. The index helps locate pages; it does not calculate impact." },
    limits: { fr: "La visibilité d'un lien ne garantit pas l'autorisation d'accéder à ses données ou de réaliser une opération.", en: "A visible link does not guarantee permission to access data or perform an operation." },
    source: "01-accueil-pilotage/explorer/explorer-README.md",
  },
  pilotage: {
    data: { fr: "Actions créées ou organisées/coorganisées par le coordinateur autorisé, avec période et provenance.", en: "Actions created or organized/co-organized by the authorized coordinator, with period and provenance." },
    method: { fr: "Les KPI, comparaisons, zones et priorités sont calculés sur ce périmètre serveur. Les indicateurs utilisent les calculateurs partagés et signalent leur comparabilité.", en: "KPIs, comparisons, zones and priorities use this server-side scope. Indicators reuse shared calculators and report comparability." },
    limits: { fr: "Le rôle ou une relation déclarée ne crée pas de périmètre global. Une variation n'est pas une preuve de causalité. L'accès dépend de l'autorisation effective.", en: "A role or declared relationship does not create global scope. Change does not establish causality. Access depends on actual authorization." },
    source: "01-accueil-pilotage/pilotage/pilotage-README.md",
  },
  sponsor: {
    data: { fr: "Synthèse consolidée du portail, indicateurs autorisés et zones observées sur la fenêtre de lecture documentée.", en: "Consolidated portal summary, authorized indicators and observed areas over its documented reading window." },
    method: { fr: "Les résultats réutilisent les repères et proxys du moteur d'impact ; les rapports permettent d'examiner le périmètre et les hypothèses.", en: "Results reuse the impact engine's benchmarks and proxies; reports explain scope and assumptions." },
    limits: { fr: "Le portail ne prouve ni un retour financier réel ni un impact causé par un partenaire. Le profil ne crée pas un scope organisationnel ou territorial personnel.", en: "The portal proves neither a real financial return nor partner-caused impact. A profile does not create a personal organizational or territorial scope." },
    source: "01-accueil-pilotage/sponsor-portal/sponsor-portal-README.md",
  },
  admin: {
    data: { fr: "Files de modération et de supervision accessibles aux comptes autorisés.", en: "Moderation and supervision queues available to authorized accounts." },
    method: { fr: "Les sources sont traitées séparément ; les contrôles, décisions et journaux relèvent de leurs contrats métier. Les états partiels ou indisponibles sont explicités.", en: "Sources are handled separately; checks, decisions and logs follow their domain contracts. Partial or unavailable states are explicit." },
    limits: { fr: "La modération valide l'admissibilité d'un enregistrement, pas la certification scientifique de chaque mesure. Aucun détail privé n'est exposé dans cette page méthodologique.", en: "Moderation validates record admissibility, not scientific certification of each measurement. This methodology page exposes no private details." },
    source: "09-admin-superadmin/admin/admin-README.md",
  },
  "rejoindre-une-action": {
    data: { fr: "Actions futures publiées, actions passées admissibles, demandes de participation et besoins structurés.", en: "Published upcoming actions, eligible past actions, participation requests and structured needs." },
    method: { fr: "Les inscriptions et rattachements suivent leurs états métier. Une demande, une inscription confirmée et une présence constatée sont des informations distinctes.", en: "Registration and linking follow their domain states. A request, confirmed registration and recorded attendance are distinct." },
    limits: { fr: "Une inscription ne prouve ni la présence ni une quantité de déchets retirés. Les mutations nécessitent un compte et les droits correspondants.", en: "Registration proves neither attendance nor waste removed. Mutations require an account and appropriate permissions." },
    source: "02-agir/rejoindre-une-action/rejoindre-une-action-README.md",
  },
  new: {
    data: { fr: "Préparation de l'action, contexte, équipe, itinéraire et mesures déclarées dans le bilan après terrain.", en: "Action preparation, context, team, route and measurements declared in the post-action report." },
    method: { fr: "La préparation et la récolte sont séparées. Les masses et mégots conservent leurs unités, leur provenance et leurs versions de conversion ; le bilan suit le circuit normal de validation.", en: "Preparation and collection are separate. Mass and cigarette-butt measurements retain units, provenance and conversion versions; the report follows normal validation." },
    limits: { fr: "Une action planifiée ou publiée n'est pas une action réalisée et admissible aux KPI. Une quantité non mesurée ne devient pas zéro ; une estimation ne remplace pas la mesure brute.", en: "A planned or published action is not a completed action eligible for KPIs. An unmeasured quantity is not zero; an estimate does not replace the raw measurement." },
    source: "02-agir/actions-new/actions-new-README.md",
  },
  signalement: {
    data: { fr: "Observation ponctuelle de type spot ou lieu propre, position, catégories et preuves photo facultatives.", en: "Point observation of a litter spot or clean place, location, categories and optional photo evidence." },
    method: { fr: "L'observation suit les états new, validated et cleaned. Le signalement et son cycle de preuves restent distincts d'une action de collecte.", en: "The observation follows new, validated and cleaned states. Reports and their evidence lifecycle are distinct from collection actions." },
    limits: { fr: "Un signalement n'est pas une mesure de masse, une collecte réalisée ni une preuve de propreté durable. Transmission et preuves restent protégées.", en: "A report is not a mass measurement, completed cleanup or proof of lasting cleanliness. Submission and evidence remain protected." },
    source: "02-agir/signalement/signalement-README.md",
  },
  gamification: {
    data: { fr: "Progression, récompenses et contributions admissibles du compte, calculées par le moteur canonique.", en: "Account progression, rewards and eligible contributions calculated by the canonical engine." },
    method: { fr: "Les XP, niveaux, badges et reconnaissances sont distingués. Le niveau potentiel n'est pas le niveau acquis ; les jalons avec XP et sans XP restent séparés.", en: "XP, levels, badges and recognition are distinct. Potential level is not earned level; milestones with and without XP remain separate." },
    limits: { fr: "L'XP n'est pas une unité environnementale. Les proxys d'eau, de CO₂e et de surface restent dans le panneau d'impact ; aucun score parallèle n'est calculé ici.", en: "XP is not an environmental unit. Water, CO₂e and area proxies stay in the impact panel; no parallel score is calculated here." },
    source: "03-cartographie-impact/gamification/gamification-README.md",
  },
  messagerie: {
    data: { fr: "Conversations, messages, annonces et sondages accessibles dans le périmètre autorisé.", en: "Conversations, messages, announcements and polls within the authorized scope." },
    method: { fr: "Les discussions servent à coordonner les participants ; les votes et messages restent des signaux de communication, distincts des actions et inscriptions.", en: "Discussions coordinate participants; votes and messages remain communication signals, distinct from actions and registrations." },
    limits: { fr: "Un message, vote ou accès à un salon ne prouve ni présence ni collecte. Une demande en attente ne confère pas de droit d'écriture dans la discussion d'action.", en: "A message, vote or channel access proves neither attendance nor collection. A pending request does not grant permission to write in the action discussion." },
    source: "04-reseau-discussions/messagerie/messagerie-README.md",
  },
  annuaire: {
    data: { fr: "Ressources éditoriales versionnées et fiches partenaires dont la publication est acceptée.", en: "Versioned editorial resources and partner profiles accepted for publication." },
    method: { fr: "Les deux provenances restent identifiables. La recherche s'applique aux données publiques ; les sources indisponibles sont signalées comme partielles.", en: "The two origins remain identifiable. Search uses public data; unavailable sources are marked as partial." },
    limits: { fr: "Une ressource référencée ne constitue pas une preuve de partenariat, d'activité passée ou d'impact mesuré. Aucun contact administratif privé n'est publié.", en: "A listed resource does not prove partnership, past activity or measured impact. Private administrative contacts are not published." },
    source: "04-reseau-discussions/annuaire/annuaire-README.md",
  },
  "open-data": {
    data: { fr: "Projection publique JSON des actions approuvées et cartographiées.", en: "Public JSON projection of approved and mapped actions." },
    method: { fr: "La réutilisation se fait sur la projection publique et son contrat, avec son périmètre, ses unités et les valeurs disponibles.", en: "Reuse relies on the public projection and its contract, with scope, units and available values." },
    limits: { fr: "Cette projection n'est ni le corpus intégral de la base ni un accès aux données personnelles. Les données manquantes ne peuvent être extrapolées sans hypothèse documentée.", en: "This projection is neither the entire database nor access to personal data. Missing values cannot be extrapolated without documented assumptions." },
    source: "04-reseau-discussions/open-data/open-data-README.md",
  },
  funding: {
    data: { fr: "Besoins présentés, agrégats Stripe nets confirmés et lien externe OnParticipe lorsqu'il est configuré.", en: "Presented funding needs, confirmed net Stripe aggregates and an external OnParticipe link when configured." },
    method: { fr: "Les flux de financement restent séparés : la cagnotte externe n'est ni importée ni additionnée aux agrégats Stripe. Les besoins présentés n'impliquent pas une affectation garantie.", en: "Funding flows remain separate: external fundraiser amounts are neither imported nor added to Stripe aggregates. Presented needs do not imply guaranteed allocation." },
    limits: { fr: "Un don ne constitue pas une quantité d'impact écologique et n'accorde aucun droit de modération. Les montants non suivis restent non renseignés.", en: "A donation is not a quantity of ecological impact and grants no moderation rights. Untracked amounts remain unknown." },
    source: "04-reseau-discussions/funding/funding-README.md",
  },
  "learn-comprendre": {
    data: { fr: "Repères scientifiques, ressources et corpus éditoriaux de politiques environnementales.", en: "Scientific benchmarks, resources and editorial environmental-policy corpora." },
    method: { fr: "Les fiches sont sélectionnées selon leur statut de publication. Les ordres de grandeur servent à interpréter des unités et hypothèses, pas à recalculer l'impact terrain.", en: "Entries are selected according to publication status. Orders of magnitude help interpret units and assumptions, not recalculate field impact." },
    limits: { fr: "Le corpus est non exhaustif ; une fiche en cours de revue ne doit pas être présentée comme publiée ou validée. Une équivalence pédagogique n'est pas une mesure.", en: "The corpus is not exhaustive; entries under review must not be presented as published or validated. A teaching equivalent is not a measurement." },
    source: "05-apprendre/learn-comprendre/learn-comprendre-README.md",
  },
  "learn-sentrainer": {
    data: { fr: "Questions, réponses et explications du quiz environnemental.", en: "Questions, answers and explanations from the environmental quiz." },
    method: { fr: "Les sessions courtes mélangent les questions et donnent un retour immédiat pour consolider les repères. Les explications permettent de vérifier le raisonnement.", en: "Short sessions mix questions and provide immediate feedback to consolidate knowledge. Explanations help verify reasoning." },
    limits: { fr: "Un résultat de quiz mesure une performance sur les questions proposées ; il ne certifie pas une compétence générale et ne mesure pas une réduction de pollution.", en: "A quiz result measures performance on the questions presented; it does not certify general competence or measure pollution reduction." },
    source: "05-apprendre/learn-sentrainer/learn-sentrainer-README.md",
  },
  "learn-bonnes-pratiques": {
    data: { fr: "Guides de tri, compostage, prévention des déchets abandonnés et sobriété numérique, avec références et enquêtes nationales.", en: "Guides on sorting, composting, litter prevention and digital sobriety, with references and national surveys." },
    method: { fr: "Les faits, estimations, recommandations et résultats déclaratifs sont séparés ; les guides orientent vers des gestes réalisables et leurs conditions.", en: "Facts, estimates, recommendations and self-reported results are separated; guides explain practical actions and their conditions." },
    limits: { fr: "Les consignes locales peuvent varier. Une enquête nationale ne constitue pas une mesure CleanMyMap et ne doit pas alimenter artificiellement les KPI de la plateforme.", en: "Local instructions may vary. A national survey is not a CleanMyMap measurement and must not artificially feed platform KPIs." },
    source: "05-apprendre/learn-bonnes-pratiques/learn-bonnes-pratiques-README.md",
  },
};

export function MethodologyRouteFoundation({ item, locale }: { item: NavigationItem; locale: "fr" | "en" }) {
  const entry = FOUNDATIONS[item.routeId];
  const fr = locale === "fr";
  if (!entry) {
    return <div className="space-y-3"><p className="cmm-text-body cmm-text-secondary">{fr ? "Méthode spécifique non documentée. Cette rubrique ne justifie aucun indicateur supplémentaire à ce stade." : "No specific methodology documented. This section does not establish any additional indicator at this stage."}</p><CmmButton href={item.href} tone="secondary" size="sm">{fr ? "Consulter la rubrique" : "Open section"}</CmmButton></div>;
  }
  const rows = [
    [fr ? "Données utilisées" : "Input data", entry.data[locale]],
    [fr ? "Méthode de lecture" : "Method", entry.method[locale]],
    [fr ? "Limites et précautions" : "Limits and cautions", entry.limits[locale]],
  ];
  return (
    <div className="space-y-4">
      <dl className="grid gap-4 lg:grid-cols-3">
        {rows.map(([label, text]) => <div className="min-w-0 space-y-1" key={label}><dt className="font-semibold cmm-text-primary">{label}</dt><dd className="cmm-text-body cmm-text-secondary">{text}</dd></div>)}
      </dl>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
        <CmmButton href={item.href} tone="secondary" size="sm">{fr ? "Consulter la rubrique" : "Open section"}</CmmButton>
        <a className="cmm-text-small font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={`https://github.com/maxd4/CleanmyMap/blob/main/documentation/pages_site/routes/${entry.source}`}>{fr ? "Source documentaire canonique" : "Canonical documentation"}</a>
      </div>
    </div>
  );
}
