import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import pageFamiliesManifest from "../../apps/web/src/lib/ui/page-families/page-families.manifest.json" with { type: "json" };

const rootDir = path.resolve("documentation/pages_site");
const canonicalRoot = path.join(rootDir, "routes");
const appRoot = path.resolve("apps/web/src/app");

const families = pageFamiliesManifest.map((family) => ({
  key: family.docKey,
  label: family.label,
  scope: family.scope,
  legacyFolder: family.legacyFolder,
  description: family.description,
}));

const BACKDROP_TONE_SWATCHES = {
  home: { canvas: "#e6f8ef", halo: "rgba(34, 197, 94, 0.28)" },
  pilotage: { canvas: "#f1d5b0", halo: "rgba(180, 83, 9, 0.24)" },
  amber: { canvas: "#fff2df", halo: "rgba(249, 115, 22, 0.26)" },
  emerald: { canvas: "#e8f8ef", halo: "rgba(34, 197, 94, 0.22)" },
  sky: { canvas: "#ddf3fd", halo: "rgba(14, 165, 233, 0.26)" },
  indigo: { canvas: "#e8e9fc", halo: "rgba(99, 102, 241, 0.22)" },
  red: { canvas: "#fee2e2", halo: "rgba(220, 38, 38, 0.24)" },
  rose: { canvas: "#fde8ef", halo: "rgba(244, 114, 182, 0.24)" },
  pink: { canvas: "#fce7f3", halo: "rgba(236, 72, 153, 0.24)" },
  slate: { canvas: "#eef0f3", halo: "rgba(148, 163, 184, 0.18)" },
  yellow: { canvas: "#fef9c3", halo: "rgba(234, 179, 8, 0.30)" },
  auth: { canvas: "#eef2ff", halo: "rgba(99, 102, 241, 0.24)" },
  moodAnalytic: { canvas: "#edf2ff", halo: "rgba(59, 130, 246, 0.20)" },
  moodField: { canvas: "#e8fbf4", halo: "rgba(20, 184, 166, 0.20)" },
  moodSimple: { canvas: "#f1f8ee", halo: "rgba(16, 185, 129, 0.16)" },
  moodNeutral: { canvas: "#eef0f3", halo: "rgba(148, 163, 184, 0.18)" },
  moodPrint: { canvas: "#f4f7fb", halo: "rgba(30, 64, 175, 0.12)" },
  state429: { canvas: "#fff4dd", halo: "rgba(245, 158, 11, 0.18)" },
  legal: { canvas: "#f8fafc", halo: "rgba(148, 163, 184, 0.18)" },
  system: { canvas: "#eef6fb", halo: "rgba(14, 165, 233, 0.18)" },
  admin: { canvas: "#15111d", halo: "rgba(245, 158, 11, 0.20)" },
  print: { canvas: "#faf7f0", halo: "rgba(148, 163, 184, 0.14)" },
};

export const entries = [
  // Homepage
  {
    route: "/",
    slug: "root",
    title: "Homepage",
    family: "00-homepage",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Hero, activité communautaire et crédibilité.",
    legacyDocs: [
      "../0-HOMEPAGE/AUDIT- HOMEPAGE.md",
      "../0-HOMEPAGE/RUBRIQUE-HOMEPAGE.md",
    ],
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
    summary: "Lecture scientifique rouge, alignée sur les pages d'impact.",
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
    family: "08-systeme-utilitaires",
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
    route: "/sections/route",
    slug: "sections-route",
    title: "Où agir",
    family: "02-agir",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Recommandation guidée pour aller agir au bon endroit.",
    legacyDocs: ["../2-BLOC-AGIR/itineraire_ia.md"],
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
    title: "Données publiques",
    family: "04-reseau-discussions",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Point d'accès aux données et jeux ouverts.",
    legacyDocs: [],
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
    title: "Point de départ",
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
    title: "Ordres de grandeur",
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
    kind: "alias",
    status: "alias",
    exception: false,
    summary: "Redirection vers la page d'onboarding unique.",
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
    title: "Administration avancée",
    family: "09-admin-superadmin",
    kind: "page",
    status: "canonique",
    exception: false,
    summary: "Sous-partie cachée de l'administration pour max.",
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

function routePatternFromDisplay(routeDisplay) {
  return routeDisplay.replace(/\s+\(ex\..*$/, "").trim();
}

function familyDisplayLabel(family) {
  return `${family.label} (${family.scope})`;
}

function pageTypeFor(entry) {
  const pattern = routePatternFromDisplay(entry.route);
  const base = pattern.split("/")[1] ?? "";

  if (entry.kind === "alias") return "redirection";
  if (entry.kind === "dynamic") {
    if (pattern.startsWith("/missions/")) return "dynamique — mission";
    if (pattern.startsWith("/parcours/")) return "dynamique — parcours";
    if (pattern.startsWith("/profil/")) return "dynamique — profil";
    if (pattern.startsWith("/sections/")) return "dynamique — section";
    return "dynamique";
  }

  if (pattern === "/") return "homepage";
  if (pattern === "/explorer") return "exception UI — sommaire";
  if (pattern === "/methodologie") return "exception UI — impact";
  if (base === "sign-in" || base === "sign-up") return "authentification";
  if (base === "onboarding") return "onboarding";
  if (
    base === "contact" ||
    base === "conditions-generales-utilisation" ||
    base === "conditions-utilisation" ||
    base === "mentions-legales" ||
    base === "politique-confidentialite" ||
    base === "politique-cookies" ||
    base === "en"
  ) {
    return "légale";
  }
  if (pattern === "/error/429") return "erreur";
  if (pattern === "/prints/report") return "rapport / export";
  if (base === "admin") return "administration";
  if (base === "form-comparison" || base === "reglages" || pattern.startsWith("/preview/") || pattern === "/declaration-simple") return "outil";
  if (base === "learn") return "page éducative";
  if (base === "community" || base === "messagerie" || base === "open-data" || base === "partners") return "page de réseau";
  if (base === "actions" || base === "declaration" || base === "signalement" || base === "missions" || base === "parcours") return "page d'action";
  if (base === "dashboard" || base === "profil" || base === "pilotage" || base === "sponsor-portal") return "page de bloc";
  return "page de bloc";
}

function scopeFor(entry) {
  const pattern = routePatternFromDisplay(entry.route);
  if (entry.kind === "alias") return "hors scope";
  if (pattern === "/explorer" || pattern === "/methodologie" || pattern === "/error/429") return "terminé";
  return "à corriger";
}

function terminatedFor(entry) {
  return scopeFor(entry) === "terminé" || entry.kind === "alias" ? "oui" : "non";
}

function familyConflictRisk(familyKey) {
  const risks = {
    "00-homepage": "faible : famille autonome, attention à ne pas diluer la teinte verte sous trop de blanc.",
    "01-accueil-pilotage": "moyen à élevé : la frontière orange / brun doit rester nette pour éviter la confusion avec la homepage.",
    "02-agir": "moyen : le vert doit rester distinct des panneaux de support et des surfaces techniques.",
    "03-cartographie-impact": "moyen : attention au chevauchement entre sky cartographique et rouge impact / alerte.",
    "04-reseau-discussions": "moyen : indigo et pink doivent rester distincts du légal et des zones techniques.",
    "05-apprendre": "faible à moyen : le jaune doit rester lisible sans devenir pâle sur fond clair.",
    "06-auth-onboarding": "moyen : fond lavande clair vers vert menthe clair; la carte Clerk doit rester violet nuit / indigo foncé et les boutons inchangés.",
    "07-legal": "faible : la palette doit rester neutre, stable et non décorative.",
    "08-systeme-utilitaires": "moyen : garder une mood layer autonome et éviter tout retour aux couleurs de bloc principales.",
    "09-admin-superadmin": "moyen à élevé : la palette doit rester technique et ne pas ressembler au pilotage.",
    "10-print-export": "faible : garder une identité documentaire autonome, sobre et détachée des blocs principaux.",
  };

  return risks[familyKey] ?? "moyen";
}

function filePathToRoute(filePath) {
  const relative = path.relative(appRoot, filePath).split(path.sep);
  const withoutPage = relative.filter((segment, index) => !(index === relative.length - 1 && segment === "page.tsx"));

  const routeSegments = [];
  for (const segment of withoutPage) {
    if (segment.startsWith("(") && segment.endsWith(")")) {
      continue;
    }

    const optionalCatchAll = segment.match(/^\[\[\.\.\.(.+)\]\]$/);
    if (optionalCatchAll) {
      continue;
    }

    const catchAll = segment.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) {
      routeSegments.push(`[${catchAll[1]}]`);
      continue;
    }

    routeSegments.push(segment);
  }

  const route = `/${routeSegments.join("/")}`.replace(/\/+/g, "/");
  return route === "/" ? "/" : route.replace(/\/$/, "");
}

async function buildSourceMap() {
  const sourceMap = new Map();
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith("page.tsx")) continue;

      const route = filePathToRoute(abs);
      const list = sourceMap.get(route) ?? [];
      list.push(path.relative(path.resolve("."), abs).split(path.sep).join("/"));
      sourceMap.set(route, list);
    }
  }

  await walk(appRoot);
  return sourceMap;
}

function expectedToneKeyForRoute(routePattern) {
  const base = routePattern.split("/")[1] ?? "";
  const isRoute = (route) => routePattern === route || routePattern.startsWith(`${route}/`);

  if (!routePattern || routePattern === "/") return "home";
  if (base === "methodologie") return "red";

  if (base === "dashboard" || base === "profil") return "amber";
  if (base === "explorer") return "yellow";
  if (base === "pilotage" || base === "sponsor-portal" || base === "elus") return "pilotage";

  if (isRoute("/actions/map")) return "sky";
  if (isRoute("/sections/route")) return "emerald";
  if (isRoute("/sections/[sectionId]")) return "system";
  if (isRoute("/parcours")) return "amber";
  if (base === "actions" || base === "declaration" || base === "signalement" || base === "missions") return "emerald";
  if (isRoute("/reports") || isRoute("/profil/impact") || isRoute("/gamification")) return "red";
  if (base === "community" || base === "messagerie" || base === "open-data") return "pink";
  if (base === "partners") return "indigo";
  if (base === "learn") return "yellow";
  if (base === "sign-in" || base === "sign-up" || base === "onboarding") return "authMint";
  if (base === "contact" || base === "conditions-generales-utilisation" || base === "conditions-utilisation" || base === "mentions-legales" || base === "politique-confidentialite" || base === "politique-cookies" || base === "en") return "legal";
  if (base === "form-comparison") return "moodAnalytic";
  if (isRoute("/preview/actions/new")) return "moodField";
  if (base === "declaration-simple") return "moodSimple";
  if (base === "reglages") return "moodNeutral";
  if (isRoute("/error/429")) return "state429";
  if (base === "sections") return "system";
  if (base === "admin") return "admin";
  if (base === "prints") return "moodPrint";

  return "slate";
}

function routeStatus(entry) {
  const pattern = routePatternFromDisplay(entry.route);
  const base = pattern.split("/")[1] ?? "";

  if (entry.kind === "alias") return "redirection";
  if (entry.kind === "dynamic") return "dynamique";
  if (pattern.startsWith("/error/")) return "erreur";
  if (base === "sign-in" || base === "sign-up" || base === "onboarding") return "auth";
  if (base === "form-comparison" || base === "reglages" || pattern.startsWith("/preview/")) return "standalone";
  if (pattern === "/declaration-simple" || pattern === "/prints/report") return "standalone";
  if (pattern === "/explorer" || pattern === "/methodologie" || base === "learn" || pattern === "/") {
    return "public";
  }
  if (base === "contact" || base === "conditions-generales-utilisation" || base === "conditions-utilisation" || base === "mentions-legales" || base === "politique-confidentialite" || base === "politique-cookies" || base === "en") return "légal";
  if (base === "admin") return "technique";
  return "protégé";
}

function accessContext(entry) {
  const status = routeStatus(entry);
  switch (status) {
    case "public":
      return "Aucun";
    case "légal":
      return "Aucun, page institutionnelle";
    case "protégé":
      return "Compte connecté, parfois rôle ou profil spécifique";
    case "auth":
      return "Page d'entrée d'authentification ou de configuration initiale";
    case "standalone":
      return "Accès direct depuis le shell ou un outil interne";
    case "technique":
      return "Compte connecté, parfois rôle technique ou de supervision";
    case "dynamique":
      return "Paramètre de route requis (profil, id, section, mission...)";
    case "erreur":
      return "Contexte d'erreur ou de quota déclenché par le système";
    case "redirection":
      return "Aucun, la page redirige automatiquement";
    case "état vide":
      return "Aucun, état de contenu vide ou initial";
    case "contexte spécial":
      return "Accès via un flux ou un mode de consultation spécifique";
    default:
      return "Aucun";
  }
}

function textLoadForRoute(entry) {
  const pattern = routePatternFromDisplay(entry.route);
  const base = pattern.split("/")[1] ?? "";

  if (pattern === "/") return "moyen";
  if (entry.kind === "alias") return "faible";
  if (entry.kind === "dynamic") return "moyen";
  if (pattern.startsWith("/error/")) return "faible";
  if (base === "sign-in" || base === "sign-up" || base === "onboarding") return "moyen";
  if (base === "learn" || base === "contact" || base === "conditions-generales-utilisation" || base === "conditions-utilisation" || base === "mentions-legales" || base === "politique-confidentialite" || base === "politique-cookies" || base === "en") return "fort";
  if (base === "admin" || base === "pilotage" || base === "dashboard" || base === "profil" || base === "reports" || base === "community" || base === "messagerie" || base === "partners") return "fort";
  if (base === "actions" || base === "declaration" || base === "signalement" || base === "missions" || base === "parcours") return "moyen";
  if (base === "form-comparison" || base === "reglages" || base === "prints") return "moyen";
  return "moyen";
}

function familyDefaults(familyKey) {
  const defaults = {
    "00-homepage": {
      objective: "Faire entrer l'utilisateur dans l'univers CleanMyMap et lui donner une porte d'entrée claire.",
      action: "Choisir une porte d'entrée principale.",
      keep: ["Titre de marque", "CTA principaux", "indicateurs clés", "activité communautaire"],
      reduce: ["Bulle de contexte redondante", "slogans doublonnés", "micro-copies explicatives non décisives"],
      clutter: "Plusieurs cartes et bulles cohabitent, la hiérarchie doit rester simple.",
      components: ["Hero", "Communauté", "Crédibilité"],
      conflictRisk: "faible : famille autonome, attention à ne pas diluer la teinte verte sous trop de blanc.",
    },
    "01-accueil-pilotage": {
      objective: "Donner un accès rapide aux vues de synthèse, au pilotage et aux pages de lecture principale.",
      action: "Consulter l'état du compte ou arbitrer une action.",
      keep: ["Titre de page", "cartes métriques", "CTA de navigation", "indicateurs prioritaires"],
      reduce: ["Rappels redondants", "badges de contexte répétés", "blocs d'aide trop verbeux"],
      clutter: "Le bloc mélange des cartes de lecture et des CTA, la densité doit rester maîtrisée.",
      components: ["Titre", "cards métriques", "CTA", "nav secondaire", "sidebar / ribbon"],
      conflictRisk: "moyen : la frontière rouge doit rester nette pour éviter la confusion avec les blocs d'impact et d'alerte.",
    },
    "02-agir": {
      objective: "Permettre l'action terrain, la déclaration et la préparation rapide.",
      action: "Lancer une action, signaler ou compléter un formulaire.",
      keep: ["Titre de tâche", "champs utiles", "CTA principal", "validation et erreurs"],
      reduce: ["Aides répétées", "cartes descriptives redondantes", "contextes décoratifs"],
      clutter: "Les formulaires et cartes de guidance peuvent multiplier les micro-blocs.",
      components: ["Formulaires", "cards d'aide", "CTA", "résultats de validation", "navigation de section"],
      conflictRisk: "moyen : le vert doit rester distinct des panneaux de support et des surfaces techniques.",
    },
    "03-cartographie-impact": {
      objective: "Lire, comparer et partager les données de carte et d'impact.",
      action: "Explorer la carte ou lire les résultats.",
      keep: ["Carte", "légende", "chiffres clés", "résumés d'impact"],
      reduce: ["Commentaires de contexte", "badges de répétition", "cartes trop proches visuellement"],
      clutter: "Les widgets de lecture d'impact se superposent facilement avec la carte ou les stats.",
      components: ["Carte", "cards d'impact", "filtres", "legend", "tableaux / rapports"],
      conflictRisk: "moyen : attention au chevauchement entre sky cartographique et rouge impact / alerte.",
    },
    "04-reseau-discussions": {
      objective: "Faire circuler l'information et faciliter les échanges entre acteurs.",
      action: "Lire, contacter ou rejoindre une discussion / un réseau.",
      keep: ["Messages clés", "liens de navigation", "CTA réseau", "état de participation"],
      reduce: ["Accroches longues", "cartes descriptives en doublon", "contextes trop bavards"],
      clutter: "Les listes d'acteurs, messages et cartes réseau peuvent saturer la colonne centrale.",
      components: ["Listes", "cartes discussion", "réseau / annuaire", "messagerie", "panneaux latéraux"],
      conflictRisk: "moyen : indigo et pink doivent rester distincts du légal et des zones techniques.",
    },
    "05-apprendre": {
      objective: "Transmettre les connaissances utiles et guider la montée en compétence.",
      action: "Lire un contenu ou ouvrir une ressource.",
      keep: ["Titre de module", "résumés", "ressources", "CTA d'apprentissage"],
      reduce: ["Paragraphes introductifs trop longs", "double explication", "bulle d'orientation inutile"],
      clutter: "Le contenu pédagogique peut rapidement s'alourdir si l'on empile des encarts d'aide.",
      components: ["Cards pédagogiques", "chapitres", "ressources", "CTA", "navigation secondaire"],
      conflictRisk: "faible à moyen : le jaune doit rester lisible sans devenir pâle sur fond clair.",
    },
    "06-auth-onboarding": {
      objective: "Créer ou reprendre l'accès au compte puis initialiser le profil.",
      action: "Se connecter, s'inscrire ou continuer l'onboarding.",
      keep: ["Formulaire", "CTA principal", "validation", "liens de bascule auth"],
      reduce: ["Marketing de contexte", "explications répétées", "bandeaux auxiliaires"],
      clutter: "L'auth doit rester focalisée sur l'action et éviter les panneaux multiples.",
      components: ["Formulaire auth", "inputs", "CTA", "helpers", "progression onboarding"],
      conflictRisk: "moyen : éviter une dérive vers une esthétique admin ou cartographique.",
    },
    "07-legal": {
      objective: "Informer sur les règles, les droits et la conformité, sans esthétique marketing.",
      action: "Lire un document ou contacter l'équipe.",
      keep: ["Titres légaux", "sections obligatoires", "liens de contact", "mentions réglementaires", "structures de lecture", "ancres utiles"],
      reduce: ["Décorations inutiles", "phrases promotionnelles", "blocs redondants", "callouts d'ambiance"],
      clutter: "Le contenu réglementaire doit rester sobre, compact et cohérent d'une page à l'autre.",
      components: ["LegalSection", "LegalLayout", "Article", "listes", "footer", "liens", "tableaux légaux"],
      conflictRisk: "faible : la palette doit rester slate / gris clair / blanc, sans gradients visibles ni effets marketing.",
    },
    "08-systeme-utilitaires": {
      objective: "Exposer des outils de support, de contrôle ou de prévisualisation.",
      action: "Configurer, comparer ou vérifier un état technique.",
      keep: ["Contrôles", "résultats", "messages système", "CTA utilitaires"],
      reduce: ["Explications longues", "duplication d'état", "cartes de contexte inutiles"],
      clutter: "Les outils peuvent accumuler des états et des micro-interfaces.",
      components: ["Outils", "tableaux de bord", "panneaux système", "prévisualisations", "contrôles"],
      conflictRisk: "moyen : garder une mood layer autonome et éviter tout retour aux couleurs de bloc principales.",
    },
    "09-admin-superadmin": {
      objective: "Piloter les réglages avancés, la modération et la supervision.",
      action: "Consulter un panneau d'administration ou agir sur une ressource.",
      keep: ["Accès de rôle", "tableaux", "actions critiques", "indicateurs de supervision"],
      reduce: ["Bannières techniques", "rappels de contexte", "textes non essentiels"],
      clutter: "Les vues d'administration concentrent des panneaux, tables et actions à forte densité.",
      components: ["Dashboards admin", "tables", "actions de gestion", "tabs", "panneaux de contrôle"],
      conflictRisk: "moyen à élevé : la palette doit rester technique et ne pas ressembler au pilotage.",
    },
    "10-print-export": {
      objective: "Préparer un export propre et imprimable.",
      action: "Générer ou relire un rapport.",
      keep: ["Titres", "tableaux exportables", "résumés", "CTA export / print"],
      reduce: ["Chrome web inutile", "explications de parcours redondantes", "éléments décoratifs"],
      clutter: "La version imprimable doit rester sobre et structurée.",
      components: ["Layout print", "boutons export", "tableaux", "résumés", "en-têtes de rapport"],
      conflictRisk: "faible : garder une identité documentaire autonome, sobre et détachée des blocs principaux.",
    },
  };

  return defaults[familyKey] ?? defaults["08-systeme-utilitaires"];
}

function paletteLabel(toneKey) {
  const labels = {
    home: "vert clair / emerald",
    pilotage: "amber / brun",
    amber: "amber / orange",
    emerald: "emerald",
    sky: "sky",
    indigo: "indigo",
    red: "red",
    rose: "rose",
    pink: "pink",
    slate: "slate / neutral",
    yellow: "yellow",
    auth: "indigo / violet",
    authMint: "lavande claire / vert menthe clair",
    moodAnalytic: "indigo / cyan doux",
    moodField: "vert / teal",
    moodSimple: "vert clair / neutres",
    moodNeutral: "slate / gris doux",
    moodPrint: "ardoise / bleu nuit / vert discret",
    state429: "amber / red léger / slate",
    legal: "slate / gris clair",
    system: "sky / slate",
    admin: "amber / brun sombre",
    print: "slate / papier",
  };

  return labels[toneKey] ?? toneKey;
}

function currentToneSummary(toneKey) {
  const tone = BACKDROP_TONE_SWATCHES[toneKey] ?? BACKDROP_TONE_SWATCHES.slate;
  return `${toneKey} — canvas ${tone.canvas}, halo ${tone.halo}`;
}

function resolveBackdropToneKey(pathname) {
  if (!pathname || pathname === "/") {
    return "home";
  }

  const isRoute = (route) => pathname === route || pathname.startsWith(`${route}/`);
  const base = pathname.split("/")[1] ?? "";

  if (base === "sign-in" || base === "sign-up" || isRoute("/onboarding")) {
    return "auth";
  }

  if (
    base === "contact" ||
    base === "conditions-generales-utilisation" ||
    base === "conditions-utilisation" ||
    base === "mentions-legales" ||
    base === "politique-confidentialite" ||
    base === "politique-cookies" ||
    base === "en"
  ) {
    return "legal";
  }

  if (
    base === "form-comparison" ||
    base === "declaration-simple" ||
    base === "reglages" ||
    isRoute("/preview/actions/new")
  ) {
    return "system";
  }

  if (isRoute("/error/429")) return "state429";

  if (base === "admin" || isRoute("/admin")) {
    return "admin";
  }

  if (base === "prints" || isRoute("/prints/report")) {
    return "print";
  }

  if (isRoute("/actions/map")) {
    return "sky";
  }

  if (isRoute("/sections/route")) {
    return "emerald";
  }

  if (isRoute("/reports") || isRoute("/sections/gamification")) {
    return "red";
  }

  if (isRoute("/sections/community") || isRoute("/sections/feedback")) {
    return "pink";
  }

  if (base === "explorer" || base === "learn") {
    return "yellow";
  }

  if (base === "dashboard" || base === "profil") {
    return "amber";
  }

  if (base === "methodologie") {
    return "red";
  }

  if (
    base === "actions" ||
    base === "declaration" ||
    base === "signalement" ||
    base === "missions" ||
    base === "parcours"
  ) {
    return "emerald";
  }

  if (
    base === "pilotage" ||
    base === "reports" ||
    base === "sponsor-portal" ||
    base === "elus"
  ) {
    return "pilotage";
  }

  if (base === "partners") {
    return "indigo";
  }

  return "slate";
}

function toneMismatch(entry) {
  const routePattern = routePatternFromDisplay(entry.route);
  const expected = expectedToneKeyForRoute(routePattern);
  const current = resolveBackdropToneKey(routePattern) ?? "slate";
  return { expected, current, mismatch: expected !== current };
}

function priorityFor(entry) {
  const { mismatch, current, expected } = toneMismatch(entry);
  const textLoad = textLoadForRoute(entry);
  if (entry.route === "/error/429") return "faible";
  if (entry.kind === "alias" || entry.kind === "dynamic" || entry.route.startsWith("/error/")) return "moyenne";
  if (entry.route.startsWith("/sign-in") || entry.route.startsWith("/sign-up") || entry.route.startsWith("/onboarding")) {
    return mismatch ? "moyenne" : "faible";
  }
  if (mismatch) return "critique";
  if (textLoad === "fort") return "moyenne";
  if (current === "home" && expected === "home") return "faible";
  return "faible";
}

function captureAvailability(routeDir) {
  const photoDir = path.join(routeDir, "photo");
  try {
    const files = fsSync.readdirSync(photoDir);
    return files.some((file) => file.toLowerCase().endsWith(".webp")) ? "oui" : "non";
  } catch {
    return "non";
  }
}

function captureStatesFor(entry) {
  const pattern = routePatternFromDisplay(entry.route);
  if (entry.kind === "dynamic") return "desktop, mobile, état paramétré";
  if (pattern.startsWith("/error/")) return "desktop, mobile, état erreur";
  if (entry.kind === "alias") return "desktop, mobile, état de redirection";
  return "desktop, mobile";
}

function sourceFilesFor(entry, sourceMap) {
  const pattern = routePatternFromDisplay(entry.route);
  const sources = sourceMap.get(pattern) ?? [];
  return sources.length ? sources : [`apps/web/src/app${pattern === "/" ? "" : pattern}/page.tsx`];
}

function listToBullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function stateDocFor(entry) {
  const status = routeStatus(entry);
  if (status !== "protégé" && status !== "dynamique") return "";

  return `## États à documenter

- **loading** : fond \`slate\`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond \`slate\` doux, ton encourageant, CTA utile unique.
- **access refused** : \`slate\` avec léger \`red\` / \`orange\`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : \`SystemStateLayout\`, \`SystemStateIcon\`, \`SystemStateTitle\`, \`SystemStateDescription\`, \`SystemStateAction\`, \`SystemStateMeta\`.
- **Variantes** : \`variant="loading"\`, \`variant="empty"\`, \`variant="forbidden"\`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.

`;
}

function renderRouteDoc(entry, family, routeReadmePath, sourceFiles) {
  const legacyLinks = entry.legacyDocs?.length
    ? entry.legacyDocs
        .map((doc) => {
          const legacyAbs = path.resolve(rootDir, doc);
          const rel = relativePosix(routeReadmePath, legacyAbs);
          return `- [${path.basename(doc)}](${rel})`;
        })
        .join("\n")
    : "- Aucun fichier legacy dédié.";

  const routePattern = routePatternFromDisplay(entry.route);
  const { expected, current, mismatch } = toneMismatch(entry);
  const defaults = familyDefaults(family.key);
  const pageType = pageTypeFor(entry);
  const scope = scopeFor(entry);
  const terminated = terminatedFor(entry);
  const familyLabel = familyDisplayLabel(family);
  const sourceList = sourceFiles.map((file) => `- \`${file}\``).join("\n");
  const keepTexts = listToBullets(defaults.keep);
  const reduceTexts = listToBullets(defaults.reduce);
  const components = listToBullets(defaults.components);
  const currentLabel = paletteLabel(current);
  const expectedLabel = paletteLabel(expected);
  const mismatchText = mismatch
    ? `Écart détecté: attendu ${expectedLabel}, code actuel ${currentLabel}.`
    : "Aucune incohérence de couleur détectée avec la règle actuelle.";

  const exampleLine = entry.exampleRoute ? `- **Exemple canonique** : \`${entry.exampleRoute}\`` : "";

  return `# ${entry.title}

## Fiche canonique

- **Route** : \`${entry.route}\`
- **Fichier(s) source(s)** :
${sourceList}
- **Type fonctionnel** : ${pageType}
- **Famille / bloc fonctionnel** : ${familyLabel}
- **Statut** : ${routeStatus(entry)}
- **Contexte nécessaire** : ${accessContext(entry)}
- **Objectif utilisateur principal** : ${defaults.objective}
- **Action principale attendue** : ${defaults.action}
- **Palette attendue** : ${expectedLabel}
- **Scope** : ${scope}
- **Terminée** : ${terminated}
- **Couleurs actuellement détectées** : ${currentToneSummary(current)}
- **Incohérences de couleurs** : ${mismatchText}
- **Risque de conflit avec les couleurs existantes** : ${defaults.conflictRisk}
- **Niveau de surcharge textuelle** : ${textLoadForRoute(entry)}
- **Textes à conserver** :
${keepTexts}
- **Textes à réduire ou supprimer** :
${reduceTexts}
- **Bulles / cartes / contextes trop nombreux** : ${defaults.clutter}
- **Composants UI concernés** :
${components}
- **Captures attendues** : ${captureStatesFor(entry)}
- **Priorité de correction** : ${priorityFor(entry)}
${exampleLine}

${stateDocFor(entry)}

## Références legacy

${legacyLinks}

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de \`documentation/pages_site/\` restent lisibles pour transition, mais ils ne sont plus la référence principale.
`;
}

function renderFamilyIndex(family, familyEntries, sourceMap) {
  const pageEntries = familyEntries.filter((entry) => entry.kind !== "alias");
  const aliasEntries = familyEntries.filter((entry) => entry.kind === "alias");

  const rows = pageEntries
    .map((entry) => {
      const routeLabel = entry.kind === "dynamic" ? `${entry.route} (ex. ${entry.exampleRoute})` : entry.route;
      const sourceFiles = sourceFilesFor(entry, sourceMap);
      const captureAvailable = captureAvailability(path.join(canonicalRoot, family.key, entry.slug));
      return `| \`${routeLabel}\` | [${entry.title}](./${entry.slug}/README.md) | ${pageTypeFor(entry)} | ${routeStatus(entry)} | ${scopeFor(entry)} | ${captureAvailable} | ${priorityFor(entry)} | ${sourceFiles[0]} |`;
    })
    .join("\n");

  const aliasRows = aliasEntries
    .map((entry) => {
      const routeLabel = entry.kind === "dynamic" ? `${entry.route} (ex. ${entry.exampleRoute})` : entry.route;
      const sourceFiles = sourceFilesFor(entry, sourceMap);
      const captureAvailable = captureAvailability(path.join(canonicalRoot, family.key, entry.slug));
      return `| \`${routeLabel}\` | [${entry.title}](./${entry.slug}/README.md) | ${pageTypeFor(entry)} | ${routeStatus(entry)} | ${scopeFor(entry)} | ${captureAvailable} | ${priorityFor(entry)} | ${sourceFiles[0]} |`;
    })
    .join("\n");

  return `# ${family.label}

${family.description}

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
${rows}

${aliasRows ? `## Redirections et alias\n\n| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |\n|---|---|---|---|---|:---:|---|---|\n${aliasRows}\n` : ""}

## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier \`pages_site\`.
- Les captures officielles, quand elles existent, vivent dans \`photo/\` de chaque route canonique et sont en \`WebP\`.
`;
}

function renderIndex(groupedFamilies, sourceMap) {
  const familyList = families
    .map((family) => `- [${family.label} (${family.scope})](./routes/${family.key}/README.md)`)
    .join("\n");

  const familySections = groupedFamilies
    .map((family) => {
      const pageEntries = family.entries.filter((entry) => entry.kind !== "alias");
      const aliasEntries = family.entries.filter((entry) => entry.kind === "alias");
      const familyLabel = familyDisplayLabel(family);

      const rows = pageEntries
        .map((entry) => {
          const routeLabel = entry.kind === "dynamic" ? `${entry.route} (ex. ${entry.exampleRoute})` : entry.route;
          const sourceFiles = sourceFilesFor(entry, sourceMap);
          const routeDir = path.join(canonicalRoot, family.key, entry.slug);
          return `| \`${routeLabel}\` | ${pageTypeFor(entry)} | [${entry.title}](./routes/${family.key}/${entry.slug}/README.md) | ${familyLabel} | ${routeStatus(entry)} | ${accessContext(entry)} | ${paletteLabel(toneMismatch(entry).expected)} | ${scopeFor(entry)} | ${sourceFiles[0]} | ./routes/${family.key}/${entry.slug} | ${captureAvailability(routeDir)} | ${textLoadForRoute(entry)} | ${toneMismatch(entry).mismatch ? "oui" : "non"} | ${priorityFor(entry)} |`;
        })
        .join("\n");

      const aliasRows = aliasEntries
        .map((entry) => {
          const routeLabel = entry.kind === "dynamic" ? `${entry.route} (ex. ${entry.exampleRoute})` : entry.route;
          const sourceFiles = sourceFilesFor(entry, sourceMap);
          const routeDir = path.join(canonicalRoot, family.key, entry.slug);
          return `| \`${routeLabel}\` | ${pageTypeFor(entry)} | [${entry.title}](./routes/${family.key}/${entry.slug}/README.md) | ${familyLabel} | ${routeStatus(entry)} | ${accessContext(entry)} | ${paletteLabel(toneMismatch(entry).expected)} | ${scopeFor(entry)} | ${sourceFiles[0]} | ./routes/${family.key}/${entry.slug} | ${captureAvailability(routeDir)} | ${textLoadForRoute(entry)} | ${toneMismatch(entry).mismatch ? "oui" : "non"} | ${priorityFor(entry)} |`;
        })
        .join("\n");

      return `### ${familyLabel}

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
${rows}

${aliasRows ? `#### Redirections et alias\n\n| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |\n|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|\n${aliasRows}\n` : ""}
`;
    })
    .join("\n");

  return `# Index maître des pages

Ce document est la table de référence exhaustive de \`documentation/pages_site\`. Chaque route codée du repo y est inventoriée avec son statut, son contexte d'accès, son dossier canonique et ses signaux d'audit UI / contenu.

## Familles

${familyList}

## Règles

- Une route = une fiche canonique.
- Les routes dynamiques sont documentées par un exemple canonique par pattern.
- Les routes alias ou redirections restent inventoriées mais ne sont pas traitées comme des pages UI autonomes.
- Les captures disponibles ne sont pas obligatoires pour exister dans l'inventaire.
- Les incohérences de couleurs sont évaluées par comparaison entre la règle attendue et la teinte actuellement résolue par le code.
- La charte complémentaire des pages hors blocs vit dans \`charte-pages-hors-blocs.md\` ([lien](./charte-pages-hors-blocs.md)).

## Inventaire complet

${familySections}
`;
}

function renderLandingReadme() {
  return `# Pages Site

Point d'entrée du registre documentaire route-first.

- [Index maître](./INDEX.md)
- [Charte des pages hors blocs](./charte-pages-hors-blocs.md)
- L'arborescence canonique vit dans \`./routes/\`

Ce dossier sert de source de vérité documentaire pour les pages du site. Le détail de chaque route vit dans son \`README.md\` canonique.
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
  const sourceMap = await buildSourceMap();
  await fs.mkdir(canonicalRoot, { recursive: true });

  for (const family of familyMap.values()) {
    const familyRoot = path.join(canonicalRoot, family.key);
    await fs.mkdir(familyRoot, { recursive: true });

    const familyReadmePath = path.join(familyRoot, "README.md");
    await writeFile(familyReadmePath, renderFamilyIndex(family, family.entries, sourceMap));

    for (const entry of family.entries) {
      const routeDir = path.join(familyRoot, entry.slug);
      await fs.mkdir(routeDir, { recursive: true });
      await fs.mkdir(path.join(routeDir, "photo"), { recursive: true });

      const routeReadmePath = path.join(routeDir, "README.md");
      await writeFile(routeReadmePath, renderRouteDoc(entry, family, routeReadmePath, sourceFilesFor(entry, sourceMap)));
    }
  }

  await writeFile(path.join(rootDir, "INDEX.md"), renderIndex([...familyMap.values()], sourceMap));
  await writeFile(path.join(rootDir, "README.md"), renderLandingReadme());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
