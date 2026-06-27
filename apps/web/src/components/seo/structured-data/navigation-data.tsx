// Structured data for website navigation and breadcrumbs
import { JsonLd } from "./json-ld-wrapper";

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: "https://cleanmymap.fr",
    name: "CleanMyMap - Carte de dépollution citoyenne",
    description:
      "La carte citoyenne de dépollution urbaine partout en France. Signalez, nettoyez, agissez pour l'environnement. Bénévolat, écologie, développement durable, coordination, impact terrain, valorisation des déchets.",
    keywords: "dépollution, écologie, propreté, cleanwalk, bénévole, action citoyenne, développement durable, coordination bénévoles, impact terrain, valorisation déchets, France, région, département, commune",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://cleanmymap.fr/explorer?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd id="json-ld-website" data={data} />;
}

export function WebPageJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "CleanMyMap - Carte de dépollution citoyenne",
    description:
      "Plateforme citoyenne de dépollution urbaine et d'action écologique partout en France. Signalez les pollutions, organisez des cleanwalks, déclarez vos actions pour votre impact environnemental.",
    url: "https://cleanmymap.fr",
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: "https://cleanmymap.fr/brand/nouveau-logo.svg",
    },
    inLanguage: "fr-FR",
    datePublished: "2024-01-01",
    dateModified: "2026-05-01",
    author: {
      "@type": "Organization",
      name: "CleanMyMap",
    },
    publisher: {
      "@type": "Organization",
      name: "CleanMyMap",
      logo: {
        "@type": "ImageObject",
        url: "https://cleanmymap.fr/brand/nouveau-logo.svg",
      },
    },
    about: {
      "@type": "Thing",
      name: "Dépollution urbaine",
      description:
        "Action citoyenne de nettoyage urbain et de dépollution pour le développement durable.",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Citoyens engagés",
    },
    genre: "Web Application",
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: 1250,
    },
  };

  return <JsonLd id="json-ld-webpage" data={data} />;
}

export function SiteNavigationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: "CleanMyMap Navigation",
    description: "Navigation principale du site CleanMyMap - Plateforme de dépollution citoyenne",
    mainEntityOfPage: "https://cleanmymap.fr",
    navigationItems: [
      {
        "@type": "SiteNavigationElement",
        name: "Accueil",
        description: "Page d'accueil CleanMyMap",
        url: "https://cleanmymap.fr/",
      },
      {
        "@type": "SiteNavigationElement",
        name: "Sommaire",
        description: "Carte interactive des signalements et actions de dépollution",
        url: "https://cleanmymap.fr/explorer",
      },
      {
        "@type": "SiteNavigationElement",
        name: "Méthodologie",
        description: "Méthodologie de calcul d'impact et transparence des métriques",
        url: "https://cleanmymap.fr/methodologie",
      },
      {
        "@type": "SiteNavigationElement",
        name: "Apprendre",
        description: "Ressources et formations sur l'écologie et le développement durable",
        url: "https://cleanmymap.fr/learn",
      },
      {
        "@type": "SiteNavigationElement",
        name: "Déclarer une action",
        description: "Formulaire de déclaration d'action de nettoyage",
        url: "https://cleanmymap.fr/actions/new",
      },
    ],
  };

  return <JsonLd id="json-ld-site-navigation" data={data} />;
}

export function BreadcrumbJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://cleanmymap.fr",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sommaire",
        item: "https://cleanmymap.fr/explorer",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Déclarer une action",
        item: "https://cleanmymap.fr/actions/new",
      },
    ],
  };

  return <JsonLd id="json-ld-breadcrumb" data={data} />;
}
