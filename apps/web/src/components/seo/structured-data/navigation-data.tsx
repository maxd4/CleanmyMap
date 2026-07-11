// Structured data for website navigation and breadcrumbs
import { JsonLd } from "./json-ld-wrapper";
import { env } from "@/lib/env";

const appUrl = env["NEXT_PUBLIC_APP_URL"] || "https://cleanmymap.fr";

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: appUrl,
    name: "CleanMyMap",
    description:
      "La carte citoyenne de dépollution urbaine partout en France. CleanMyMap centralise les signalements, les cleanwalks et les actions de terrain.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl}/explorer?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd id="json-ld-website" data={data} />;
}

export function WebPageJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "CleanMyMap",
    description:
      "Plateforme citoyenne de dépollution urbaine et d'action écologique partout en France.",
    url: appUrl,
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${appUrl}/brand/nouveau-logo.svg`,
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
        url: `${appUrl}/brand/nouveau-logo.svg`,
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
    name: "Navigation CleanMyMap",
    description: "Navigation principale du site CleanMyMap.",
    mainEntityOfPage: appUrl,
    navigationItems: [
      {
        "@type": "SiteNavigationElement",
        name: "Accueil",
        description: "Page d'accueil CleanMyMap.",
        url: `${appUrl}/`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Sommaire",
        description: "Carte interactive des signalements et actions de dépollution.",
        url: `${appUrl}/explorer`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Méthodologie",
        description: "Méthodologie de calcul d'impact et transparence des métriques.",
        url: `${appUrl}/methodologie`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Apprendre",
        description: "Ressources et formations sur l'écologie et le développement durable.",
        url: `${appUrl}/learn`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Déclarer une action",
        description: "Formulaire de déclaration d'action de nettoyage.",
        url: `${appUrl}/actions/new`,
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
        item: appUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sommaire",
        item: `${appUrl}/explorer`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Déclarer une action",
        item: `${appUrl}/actions/new`,
      },
    ],
  };

  return <JsonLd id="json-ld-breadcrumb" data={data} />;
}
