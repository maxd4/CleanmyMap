// Structured data for content, reviews, events, and media
import { JsonLd } from "./json-ld-wrapper";
import { env } from "@/lib/env";
import { resolvePublicContactEmail } from "@/lib/email-config";

const appUrl = env["NEXT_PUBLIC_APP_URL"] || "https://cleanmymap.fr";

export function FAQJsonLd() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Comment déclarer une action de nettoyage sur CleanMyMap ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Connectez-vous, ouvrez le formulaire de déclaration et renseignez la localisation, le type de déchets et les informations utiles. L'action rejoint ensuite l'historique du site selon les règles de publication.",
        },
      },
      {
        "@type": "Question",
        name: "Comment participer à un cleanwalk à Paris ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Consultez la carte ou les pages de réseau pour repérer les cleanwalks disponibles, puis inscrivez-vous via le bouton prévu par l'organisateur.",
        },
      },
      {
        "@type": "Question",
        name: "Comment signaler une pollution sur CleanMyMap ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Utilisez le formulaire de signalement pour préciser le lieu, le type de déchet et ajouter une photo si possible. Le signalement est ensuite traité par l'équipe de modération.",
        },
      },
      {
        "@type": "Question",
        name: "CleanMyMap est-il gratuit ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, l'accès aux pages publiques et aux outils de base est gratuit pour les personnes qui souhaitent découvrir, participer ou signaler une action.",
        },
      },
      {
        "@type": "Question",
        name: "Comment sont calculés les points d'impact ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Les règles de calcul sont détaillées dans la page Méthodologie. Elles traduisent les quantités collectées et les indicateurs de terrain en métriques lisibles pour l'utilisateur.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je organiser un événement de nettoyage ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Vous pouvez créer ou préparer un événement depuis les pages prévues à cet effet et y préciser la date, le lieu et le nombre de bénévoles attendus.",
        },
      },
      {
        "@type": "Question",
        name: "Comment CleanMyMap contribue-t-il au developpement durable ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En rendant les actions visibles, mesurables et partageables, la plateforme aide à mieux coordonner les initiatives locales de dépollution et de sensibilisation.",
        },
      },
      {
        "@type": "Question",
        name: "Comment voir l'impact de mes actions de benevolat ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ouvrez votre profil pour consulter vos statistiques, l'historique de vos actions et les indicateurs associés à vos contributions.",
        },
      },
      {
        "@type": "Question",
        name: "CleanMyMap a-t-il une application mobile ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CleanMyMap est accessible depuis un navigateur mobile et peut être utilisé sur la plupart des téléphones sans installation spécifique.",
        },
      },
      {
        "@type": "Question",
        name: "Comment cooperate avec CleanMyMap pour mon association ou collectivite ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Les associations et collectivités peuvent nous contacter via ${contactEmail} pour étudier un partenariat ou un usage terrain adapté à leur besoin.`,
        },
      },
    ],
  };

  return <JsonLd id="json-ld-faq" data={data} />;
}

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
    image: `${appUrl}/brand/nouveau-logo.svg`,
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
    thumbnailUrl: `${appUrl}/brand/nouveau-logo.svg`,
    uploadDate: "2026-01-15",
    duration: "PT5M30S",
    contentUrl: `${appUrl}/videos/declaration-action.mp4`,
    embedUrl: `${appUrl}/videos/declaration-action`,
    publisher: {
      "@type": "Organization",
      name: "CleanMyMap",
      logo: {
        "@type": "ImageObject",
        url: `${appUrl}/brand/nouveau-logo.svg`,
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
    image: `${appUrl}/brand/nouveau-logo.svg`,
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
