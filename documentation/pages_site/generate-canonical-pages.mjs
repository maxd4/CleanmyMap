import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve("documentation/pages_site");
const canonicalRoot = path.join(rootDir, "routes");

const families = [
  {
    key: "00-homepage",
    label: "Homepage",
    legacyFolder: "0-HOMEPAGE",
    description: "Famille autonome de la page d'accueil et de sa reprise de session.",
  },
  {
    key: "01-accueil-pilotage",
    label: "Accueil & Pilotage",
    legacyFolder: "1-BLOC-ACCUEIL&PILOTAGE",
    description: "Entrées opérationnelles de pilotage, profil, sommaire et méthodologie.",
  },
  {
    key: "02-agir",
    label: "Agir",
    legacyFolder: "2-BLOC-AGIR",
    description: "Parcours d'action, déclaration, signalement et préparation terrain.",
  },
  {
    key: "03-cartographie-impact",
    label: "Cartographie & Impact",
    legacyFolder: "3-BLOC-VISUALISER&IMPACTER",
    description: "Vue carte, impact, observatoire et lecture des résultats.",
  },
  {
    key: "04-reseau-discussions",
    label: "Réseau & Discussions",
    legacyFolder: "4-BLOC-RESEAU&DISCUSSION",
    description: "Pages de réseau, entraide, partenaires et messagerie.",
  },
  {
    key: "05-apprendre",
    label: "Apprendre",
    legacyFolder: "5-BLOC-APPRENDRE",
    description: "Contenus pédagogiques et guides de compréhension.",
  },
  {
    key: "06-auth-onboarding",
    label: "Auth & Onboarding",
    legacyFolder: "6-PAGES-STANDALONE",
    description: "Connexion, inscription et configuration initiale.",
  },
  {
    key: "07-legal",
    label: "Institutionnel & Légal",
    legacyFolder: "6-PAGES-STANDALONE",
    description: "Contacts et pages institutionnelles / juridiques.",
  },
  {
    key: "08-systeme-utilitaires",
    label: "Système & Utilitaires",
    legacyFolder: "6-PAGES-STANDALONE",
    description: "Réglages, comparateurs, preview et routes techniques.",
  },
  {
    key: "09-admin-superadmin",
    label: "Admin & Super-admin",
    legacyFolder: "6-PAGES-STANDALONE",
    description: "Administration, services et supervision avancée.",
  },
  {
    key: "10-print-export",
    label: "Print & Export",
    legacyFolder: "6-PAGES-STANDALONE",
    description: "Rapports imprimables et exports PDF.",
  },
];

const entries = [
  // Homepage
  {
    route: "/",
    slug: "root",
    title: "Page d'accueil",
    family: "00-homepage",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Hero, piliers, bénéfices, activité communautaire et crédibilité.",
    legacyDocs: [
      "../0-HOMEPAGE/AUDIT- HOMEPAGE.md",
      "../0-HOMEPAGE/RUBRIQUE-HOMEPAGE.md",
    ],
  },
  {
    route: "/accueil",
    slug: "accueil",
    title: "Accueil",
    family: "00-homepage",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Reprise de session et porte d'entrée personnelle.",
    legacyDocs: ["../0-HOMEPAGE/RUBRIQUE-HOMEPAGE.md"],
  },

  // Bloc 1 / Accueil & Pilotage
  {
    route: "/dashboard",
    slug: "dashboard",
    title: "Dashboard",
    family: "01-accueil-pilotage",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Vue de synthèse et actions rapides de pilotage.",
    legacyDocs: ["../6-PAGES-STANDALONE/dashboard.md"],
  },
  {
    route: "/profil",
    slug: "profil",
    title: "Profil",
    family: "01-accueil-pilotage",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Gestion du compte, progression et impact personnel.",
    legacyDocs: [],
  },
  {
    route: "/pilotage",
    slug: "pilotage",
    title: "Pilotage",
    family: "01-accueil-pilotage",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Vue d'arbitrage et lecture opérationnelle des indicateurs.",
    legacyDocs: [],
  },
  {
    route: "/sponsor-portal",
    slug: "sponsor-portal",
    title: "Portail décideur",
    family: "01-accueil-pilotage",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Espace de pilotage institutionnel et lecture ROI.",
    legacyDocs: [],
  },
  {
    route: "/explorer",
    slug: "explorer",
    title: "Sommaire",
    family: "01-accueil-pilotage",
    kind: "exception",
    status: "exception-ui",
    exception: true,
    summary: "Carte du site avec palette dédiée validée comme exception.",
    legacyDocs: [],
  },
  {
    route: "/methodologie",
    slug: "methodologie",
    title: "Méthodologie",
    family: "01-accueil-pilotage",
    kind: "exception",
    status: "exception-ui",
    exception: true,
    summary: "Lecture scientifique verte, alignée sur la homepage.",
    legacyDocs: [],
  },

  // Bloc 2 / Agir
  {
    route: "/actions/new",
    slug: "actions-new",
    title: "Déclarer une action",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Formulaire prioritaire pour déclarer une action terrain.",
    legacyDocs: ["../2-BLOC-AGIR/declarer_action.md"],
  },
  {
    route: "/declaration",
    slug: "declaration",
    title: "Déclaration",
    family: "02-agir",
    kind: "alias",
    status: "alias",
    exception: false,
    summary: "Redirection canonique vers `/actions/new`.",
    legacyDocs: [],
  },
  {
    route: "/declaration-simple",
    slug: "declaration-simple",
    title: "Déclaration simple",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Version simplifiée du formulaire de déclaration.",
    legacyDocs: [],
  },
  {
    route: "/signalement",
    slug: "signalement",
    title: "Signalement déchets",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Signalement rapide des points de pollution et déchets.",
    legacyDocs: ["../2-BLOC-AGIR/signalement_dechets.md"],
  },
  {
    route: "/actions/history",
    slug: "actions-history",
    title: "Historique des actions",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Historique opérationnel des actions déclarées.",
    legacyDocs: ["../6-PAGES-STANDALONE/historique.md"],
  },
  {
    route: "/sections/route",
    slug: "sections-route",
    title: "Itinéraire IA",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Recommandation guidée pour aller agir au bon endroit.",
    legacyDocs: ["../2-BLOC-AGIR/itineraire_ia.md"],
  },
  {
    route: "/sections/weather",
    slug: "sections-weather",
    title: "Météo terrain",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Fenêtres météo pour choisir le bon moment d'action.",
    legacyDocs: ["../2-BLOC-AGIR/meteo.md"],
  },
  {
    route: "/sections/guide",
    slug: "sections-guide",
    title: "Mode d'emploi",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Guide terrain et bonnes pratiques opérationnelles.",
    legacyDocs: ["../2-BLOC-AGIR/mode_emploi.md"],
  },
  {
    route: "/sections/kit",
    slug: "sections-kit",
    title: "Kit terrain",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Checklist matériel et préparation terrain.",
    legacyDocs: ["../2-BLOC-AGIR/kit_terrain.md"],
  },
  {
    route: "/sections/recycling",
    slug: "sections-recycling",
    title: "Que faire des déchets ?",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Tri, valorisation et filières après collecte.",
    legacyDocs: [],
  },
  {
    route: "/missions/[id]",
    slug: "missions-id",
    title: "Mission détaillée",
    family: "02-agir",
    kind: "dynamic",
    status: "canonique-exemple",
    exception: false,
    summary: "Vue détaillée d'une mission avec carte et chronologie.",
    exampleRoute: "/missions/terrain-2026",
    legacyDocs: [],
  },
  {
    route: "/parcours",
    slug: "parcours",
    title: "Parcours",
    family: "01-accueil-pilotage",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Point d'entrée vers le parcours associé au profil.",
    legacyDocs: [],
  },
  {
    route: "/parcours/[profile]",
    slug: "parcours-profile",
    title: "Parcours par profil",
    family: "01-accueil-pilotage",
    kind: "dynamic",
    status: "canonique-exemple",
    exception: false,
    summary: "Parcours redirigé selon le profil actif.",
    exampleRoute: "/parcours/benevole",
    legacyDocs: [],
  },
  {
    route: "/profil/[profile]",
    slug: "profil-profile",
    title: "Profil détaillé",
    family: "01-accueil-pilotage",
    kind: "dynamic",
    status: "canonique-exemple",
    exception: false,
    summary: "Vue de profil détaillée par rôle / profil d'application.",
    exampleRoute: "/profil/benevole",
    legacyDocs: [],
  },

  // Bloc 3 / Cartographie & Impact
  {
    route: "/actions/map",
    slug: "actions-map",
    title: "Carte des actions",
    family: "03-cartographie-impact",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Carte géolocalisée des actions et hotspots.",
    legacyDocs: ["../3-BLOC-VISUALISER&IMPACTER/carte_actions.md"],
  },
  {
    route: "/sandbox",
    slug: "sandbox",
    title: "Sandbox carte",
    family: "03-cartographie-impact",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Bac à sable cartographique pour tester les comportements.",
    legacyDocs: ["../3-BLOC-VISUALISER&IMPACTER/sandbox.md"],
  },
  {
    route: "/observatoire",
    slug: "observatoire",
    title: "Observatoire public",
    family: "03-cartographie-impact",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Lecture publique des données ouvertes et vérifiables.",
    legacyDocs: ["../3-BLOC-VISUALISER&IMPACTER/observatoire_public.md"],
  },
  {
    route: "/reports",
    slug: "reports",
    title: "Rapports d'impact",
    family: "03-cartographie-impact",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Synthèses et exports d'impact pour partager les résultats.",
    legacyDocs: ["../3-BLOC-VISUALISER&IMPACTER/reports.md"],
  },
  {
    route: "/profil/impact",
    slug: "profil-impact",
    title: "Profil impact",
    family: "03-cartographie-impact",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Impact personnel détaillé et progression utilisateur.",
    legacyDocs: [
      "../3-BLOC-VISUALISER&IMPACTER/mon_profil_impact.md",
      "../3-BLOC-VISUALISER&IMPACTER/profil-impact-page.desktop-context.webp",
    ],
  },
  {
    route: "/gamification",
    slug: "gamification",
    title: "Progression & badges",
    family: "03-cartographie-impact",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Badges, niveaux et progression personnelle.",
    legacyDocs: ["../3-BLOC-VISUALISER&IMPACTER/progression_badges.md"],
  },
  // Bloc 4 / Réseau & Discussions
  {
    route: "/community",
    slug: "community",
    title: "Communauté",
    family: "04-reseau-discussions",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Espace d'entraide et d'échanges communautaires.",
    legacyDocs: [],
  },
  {
    route: "/messagerie",
    slug: "messagerie",
    title: "Messagerie",
    family: "04-reseau-discussions",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Messagerie interne et discussions ciblées.",
    legacyDocs: [],
  },
  {
    route: "/open-data",
    slug: "open-data",
    title: "Open data",
    family: "04-reseau-discussions",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Point d'accès aux données et jeux ouverts.",
    legacyDocs: [],
  },
  {
    route: "/partners/network",
    slug: "partners-network",
    title: "Réseau engagé",
    family: "04-reseau-discussions",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Cartographie du réseau et des partenaires engagés.",
    legacyDocs: ["../4-BLOC-RESEAU&DISCUSSION/reseau_engage.md"],
  },
  {
    route: "/partners/dashboard",
    slug: "partners-dashboard",
    title: "Annuaire partenaires",
    family: "04-reseau-discussions",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Fiches partenaires et gestion du réseau.",
    legacyDocs: ["../4-BLOC-RESEAU&DISCUSSION/entraide_locale.md"],
  },
  {
    route: "/partners/onboarding",
    slug: "partners-onboarding",
    title: "Onboarding partenaire",
    family: "04-reseau-discussions",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Séquence guidée d'entrée dans le réseau partenaire.",
    legacyDocs: ["../4-BLOC-RESEAU&DISCUSSION/rassemblements.md"],
  },
  // Bloc 5 / Apprendre
  {
    route: "/learn/hub",
    slug: "learn-hub",
    title: "Hub éducatif",
    family: "05-apprendre",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Point d'entrée principal des contenus d'apprentissage.",
    legacyDocs: [],
  },
  {
    route: "/learn/ressources",
    slug: "learn-ressources",
    title: "Ressources",
    family: "05-apprendre",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Ressources, liens et contenus de référence.",
    legacyDocs: [],
  },
  {
    route: "/learn/comprendre",
    slug: "learn-comprendre",
    title: "Comprendre l'enjeu",
    family: "05-apprendre",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Pédagogie de l'enjeu environnemental.",
    legacyDocs: ["../5-BLOC-APPRENDRE/comprendre_enjeu.md"],
  },
  {
    route: "/learn/sentrainer",
    slug: "learn-sentrainer",
    title: "S'entraîner",
    family: "05-apprendre",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Entraînement et mise en pratique guidée.",
    legacyDocs: [],
  },
  {
    route: "/learn/bonnes-pratiques",
    slug: "learn-bonnes-pratiques",
    title: "Bonnes pratiques",
    family: "05-apprendre",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Guides courts pour agir plus efficacement.",
    legacyDocs: ["../5-BLOC-APPRENDRE/que_faire_des_dechets.md"],
  },

  // Auth & onboarding
  {
    route: "/sign-in",
    slug: "sign-in",
    title: "Connexion",
    family: "06-auth-onboarding",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Page de connexion Clerk au système.",
    legacyDocs: [],
  },
  {
    route: "/sign-up",
    slug: "sign-up",
    title: "Inscription",
    family: "06-auth-onboarding",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Page de création de compte Clerk.",
    legacyDocs: [],
  },
  {
    route: "/onboarding",
    slug: "onboarding",
    title: "Onboarding",
    family: "06-auth-onboarding",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Configuration initiale du profil utilisateur.",
    legacyDocs: [],
  },
  {
    route: "/onboarding/localisation",
    slug: "onboarding-localisation",
    title: "Onboarding localisation",
    family: "06-auth-onboarding",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Choix de la zone d'action à l'inscription.",
    legacyDocs: [],
  },

  // Institutionnel & légal
  {
    route: "/contact",
    slug: "contact",
    title: "Contact",
    family: "07-legal",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Page de contact, email public et formulaire RGPD.",
    legacyDocs: [],
  },
  {
    route: "/conditions-generales-utilisation",
    slug: "conditions-generales-utilisation",
    title: "CGU",
    family: "07-legal",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Conditions générales d'utilisation.",
    legacyDocs: [],
  },
  {
    route: "/conditions-utilisation",
    slug: "conditions-utilisation",
    title: "Conditions d'utilisation",
    family: "07-legal",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Version complémentaire des conditions d'utilisation.",
    legacyDocs: [],
  },
  {
    route: "/mentions-legales",
    slug: "mentions-legales",
    title: "Mentions légales",
    family: "07-legal",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Informations légales du site.",
    legacyDocs: [],
  },
  {
    route: "/politique-confidentialite",
    slug: "politique-confidentialite",
    title: "Politique de confidentialité",
    family: "07-legal",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Traitement et protection des données.",
    legacyDocs: [],
  },
  {
    route: "/politique-cookies",
    slug: "politique-cookies",
    title: "Politique cookies",
    family: "07-legal",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Gestion des cookies et consentement.",
    legacyDocs: [],
  },
  {
    route: "/en",
    slug: "en",
    title: "English entry",
    family: "07-legal",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Entrée bilingue / internationale.",
    legacyDocs: [],
  },

  // Système & utilitaires
  {
    route: "/form-comparison",
    slug: "form-comparison",
    title: "Comparaison de formulaires",
    family: "08-systeme-utilitaires",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Comparaison UX entre deux parcours de formulaire.",
    legacyDocs: [],
  },
  {
    route: "/reglages",
    slug: "reglages",
    title: "Réglages",
    family: "08-systeme-utilitaires",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Paramètres, préférences et réglages globaux.",
    legacyDocs: [],
  },
  {
    route: "/preview/actions/new",
    slug: "preview-actions-new",
    title: "Preview déclaration",
    family: "08-systeme-utilitaires",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Prévisualisation technique du formulaire de déclaration.",
    legacyDocs: [],
  },
  {
    route: "/error/429",
    slug: "error-429",
    title: "Erreur 429",
    family: "08-systeme-utilitaires",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Page d'erreur de limitation de requêtes.",
    legacyDocs: [],
  },
  {
    route: "/sections/[sectionId]",
    slug: "sections-sectionid",
    title: "Section dynamique",
    family: "08-systeme-utilitaires",
    kind: "dynamic",
    status: "canonique-exemple",
    exception: false,
    summary: "Route générique de rendu des rubriques de section.",
    exampleRoute: "/sections/route",
    legacyDocs: [],
  },

  // Admin
  {
    route: "/admin",
    slug: "admin",
    title: "Administration",
    family: "09-admin-superadmin",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Vue d'administration et de modération.",
    legacyDocs: ["../6-PAGES-STANDALONE/admin.md"],
  },
  {
    route: "/admin/forms",
    slug: "admin-forms",
    title: "Administration des formulaires",
    family: "09-admin-superadmin",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Gestion des formulaires et des règles associées.",
    legacyDocs: [],
  },
  {
    route: "/admin/services",
    slug: "admin-services",
    title: "Administration des services",
    family: "09-admin-superadmin",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Pilotage des services et paramètres techniques.",
    legacyDocs: [],
  },
  {
    route: "/admin/godmode",
    slug: "admin-godmode",
    title: "God mode",
    family: "09-admin-superadmin",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Supervision avancée et maintenance privilégiée.",
    legacyDocs: [],
  },

  // Print & export
  {
    route: "/prints/report",
    slug: "prints-report",
    title: "Rapport imprimable",
    family: "10-print-export",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Rapport d'impact prêt à imprimer et exporter.",
    legacyDocs: [],
  },
];

function relativePosix(fromFile, toFile) {
  return path
    .relative(path.dirname(fromFile), toFile)
    .split(path.sep)
    .join("/");
}

function routeName(route) {
  if (route === "/") return "racine";
  return route
    .replaceAll("/", " / ")
    .replaceAll("[", "")
    .replaceAll("]", "")
    .replaceAll("  ", " ")
    .trim();
}

function renderRouteDoc(entry, family, routeReadmePath) {
  const legacyLinks = entry.legacyDocs?.length
    ? entry.legacyDocs
        .map((doc) => {
          const legacyAbs = path.resolve(rootDir, doc);
          const rel = relativePosix(routeReadmePath, legacyAbs);
          return `- [${path.basename(doc)}](${rel})`;
        })
        .join("\n")
    : "- Aucun fichier legacy dédié.";

  const exampleLine = entry.exampleRoute
    ? `- **Exemple canonique** : \`${entry.exampleRoute}\``
    : "";

  return `# ${entry.title}

## Fiche canonique

- **Route** : \`${entry.route}\`
- **Famille** : ${family.label}
- **Statut** : ${entry.status}
- **Exception UI** : ${entry.exception ? "oui" : "non"}
- **Type** : ${entry.kind}
${exampleLine}

## Rôle UI

${entry.summary}

## Captures officielles

- \`png/\` : captures PNG canoniques de cette page
- \`webp/\` : versions de contexte quand elles existent
- La capture peut aussi rester miroir dans \`documentation/liberte-UX-UI/\` selon le pipeline de capture

## Références legacy

${legacyLinks}

## Notes

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de \`documentation/pages_site/\` restent lisibles pour transition, mais ils ne sont plus la référence principale.
`;
}

function renderFamilyIndex(family, familyEntries) {
  const rows = familyEntries
    .map((entry) => {
      const routeLabel = entry.kind === "dynamic" ? `${entry.route} (ex. ${entry.exampleRoute})` : entry.route;
      return `| \`${routeLabel}\` | [${entry.title}](./${entry.slug}/README.md) | ${entry.status} | ${entry.exception ? "oui" : "non"} | ${entry.summary} |`;
    })
    .join("\n");

  return `# ${family.label}

${family.description}

## Routes canoniques

| Route | Fiche | Statut | Exception UI | Résumé |
|---|---|---:|:---:|---|
${rows}

## Captures

- Les captures officielles de cette famille vivent dans chaque dossier route sous \`png/\` et \`webp/\`.
- Les archives legacy restent dans \`documentation/liberte-UX-UI/\` tant que le pipeline de capture n'a pas été migré partout.
`;
}

function renderRootIndex(groupedFamilies) {
  const familyList = families
    .map((family) => `- [${family.label}](./routes/${family.key}/README.md)`)
    .join("\n");

  const familySections = groupedFamilies
    .map((family) => {
      const rows = family.entries
        .map((entry) => {
          const routeLabel = entry.kind === "dynamic" ? `${entry.route} (ex. ${entry.exampleRoute})` : entry.route;
          return `| \`${routeLabel}\` | [${entry.title}](./routes/${family.key}/${entry.slug}/README.md) | ${entry.kind} | ${entry.exception ? "oui" : "non"} | ${entry.summary} |`;
        })
        .join("\n");

      return `### ${family.label}

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
${rows}
`;
    })
    .join("\n");

  return `# Pages Site - Source de vérité documentaire

Ce dossier est le registre canonique des pages UI du repo. Chaque route rendue dispose d'une fiche route-first dans \`routes/\`, avec ses captures officielles en \`png/\` et ses dérivés de contexte en \`webp/\` quand ils existent.

## Familles canoniques

${familyList}

## Règles

- Une route = une fiche canonique.
- Les exceptions UI sont explicitement marquées.
- Les routes dynamiques utilisent un exemple canonique par pattern.
- Les dossiers legacy dans \`0-HOMEPAGE/\`, \`1-BLOC-*\` et \`6-PAGES-STANDALONE/\` restent consultables, mais ne sont plus la source de vérité principale.

## Index complet

${familySections}
`;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeFile(filePath, content) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, content, "utf8");
}

const familyMap = new Map(families.map((family) => [family.key, { ...family, entries: [] }]));
for (const entry of entries) {
  const family = familyMap.get(entry.family);
  if (!family) {
    throw new Error(`Unknown family ${entry.family} for route ${entry.route}`);
  }
  family.entries.push(entry);
}

for (const family of familyMap.values()) {
  family.entries.sort((a, b) => a.route.localeCompare(b.route, "fr"));
}

async function main() {
  await fs.mkdir(canonicalRoot, { recursive: true });

  for (const family of familyMap.values()) {
    const familyRoot = path.join(canonicalRoot, family.key);
    await fs.mkdir(familyRoot, { recursive: true });

    const familyReadmePath = path.join(familyRoot, "README.md");
    await writeFile(familyReadmePath, renderFamilyIndex(family, family.entries));

    for (const entry of family.entries) {
      const routeDir = path.join(familyRoot, entry.slug);
      await fs.mkdir(routeDir, { recursive: true });
      await fs.mkdir(path.join(routeDir, "png"), { recursive: true });
      await fs.mkdir(path.join(routeDir, "webp"), { recursive: true });

      const routeReadmePath = path.join(routeDir, "README.md");
      await writeFile(routeReadmePath, renderRouteDoc(entry, family, routeReadmePath));
    }
  }

  await writeFile(path.join(rootDir, "README.md"), renderRootIndex([...familyMap.values()]));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
