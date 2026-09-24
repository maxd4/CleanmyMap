// Structured data for content, reviews, events, and media
import { JsonLd } from "./json-ld-wrapper";
import { env } from "@/lib/env";
import { BRAND_ASSET_PATHS } from "@/components/brand/brand-assets";

const appUrl = env["NEXT_PUBLIC_APP_URL"] || "https://cleanmymap.fr";

export function ReviewJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Product",
      name: "CleanMyMap",
      description:
        "Plateforme citoyenne de dépollution urbaine, de nettoyage et d'action écologique en France.",
    },
    author: {
      "@type": "Organization",
      name: "CleanMyMap Community",
    },
    reviewBody:
      "Schéma réservé aux cas où un avis réel et publié doit être décrit de manière structurée.",
    datePublished: "2024-01-15",
  };

  return <JsonLd id="json-ld-review" data={data} />;
}

export function ArticleRessourceJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Bonnes pratiques",
    description:
      "Repères courts pour bien trier, composter et éviter les déchets abandonnés.",
    image: `${appUrl}${BRAND_ASSET_PATHS.lightSurface}`,
    author: {
      "@type": "Organization",
      name: "CleanMyMap",
    },
    publisher: {
      "@type": "Organization",
      name: "CleanMyMap",
      logo: {
        "@type": "ImageObject",
        url: `${appUrl}${BRAND_ASSET_PATHS.lightSurface}`,
      },
    },
    datePublished: "2026-01-15",
    dateModified: "2026-05-01",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${appUrl}/learn/bonnes-pratiques`,
    },
    articleSection: "Écologie et environnement",
    wordCount: 1500,
    inLanguage: "fr-FR",
    about: [
      {
        "@type": "Thing",
        name: "Dépollution urbaine",
      },
      {
        "@type": "Thing",
        name: "Développement durable",
      },
    ],
    keywords: "tri, compostage, comportements, dépollution, bénévolat, écologie, guide",
  };

  return <JsonLd id="json-ld-article" data={data} />;
}

export function VideoTutorialJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "Comment déclarer une action sur CleanMyMap",
    description:
      "Tutoriel vidéo pour apprendre à déclarer vos actions de nettoyage et suivre leur impact sur CleanMyMap.",
    thumbnailUrl: `${appUrl}${BRAND_ASSET_PATHS.lightSurface}`,
    uploadDate: "2026-01-15",
    duration: "PT5M30S",
    contentUrl: `${appUrl}/videos/declaration-action.mp4`,
    embedUrl: `${appUrl}/videos/declaration-action`,
    publisher: {
      "@type": "Organization",
      name: "CleanMyMap",
      logo: {
        "@type": "ImageObject",
        url: `${appUrl}${BRAND_ASSET_PATHS.lightSurface}`,
      },
    },
    author: {
      "@type": "Organization",
      name: "CleanMyMap",
    },
    keywords: "tutoriel, declaration, action, CleanMyMap, benevolat",
    inLanguage: "fr-FR",
  };

  return <JsonLd id="json-ld-video" data={data} />;
}

export function EventCleanwalkJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Cleanwalk Paris - Nettoyage Urbain Citoyen",
    description:
      "Participez à un cleanwalk organisé par CleanMyMap pour contribuer à la dépollution urbaine et à la sensibilisation citoyenne.",
    startDate: "2026-05-15T09:00:00+02:00",
    endDate: "2026-05-15T13:00:00+02:00",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Paris, France",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Paris",
        addressCountry: "FR",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "CleanMyMap",
      url: appUrl,
    },
    image: `${appUrl}${BRAND_ASSET_PATHS.lightSurface}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      validFrom: "2026-04-01",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Bénévoles et citoyens engagés",
    },
    keywords: "cleanwalk, nettoyage urbain, bénévolat, dépollution, écologie, Paris",
  };

  return <JsonLd id="json-ld-event" data={data} />;
}
