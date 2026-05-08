// Structured data for content, reviews, events, and media
import { JsonLd } from "./json-ld-wrapper";

export function FAQJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Comment déclarer une action de nettoyage sur CleanMyMap ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Connectez-vous, cliquez sur 'Declarer une action', remplissez le formulaire avec la localisation, le type de dechets et la quantite. Votre action apparaitra sur la carte apres validation. Calcul automatique de l'impact environnemental (CO2, eau).",
        },
      },
      {
        "@type": "Question",
        name: "Comment participer à un cleanwalk à Paris ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Rendez-vous dans la section 'Evenements' pour voir les cleanwalks organizees pres de chez vous. Cliquez sur 'Participer' pour vous'inscrire gratuitement. Coordination des benevoles, mise a disposition du materiel.",
        },
      },
      {
        "@type": "Question",
        name: "Comment signaler une pollution sur CleanMyMap ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Utilisez le formulaire de signalement pour identifier le lieu, le type dechet et telecharger une photo. Les moderateurs valideront votre signalement sous 24h. Participation citoyenne a la proprete urbaine.",
        },
      },
      {
        "@type": "Question",
        name: "CleanMyMap est-il gratuit ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, CleanMyMap est entierement gratuit et open source. Finance par des dons et des subventions publiques. MISSION: depollution, ecologie, developpement durable.",
        },
      },
      {
        "@type": "Question",
        name: "Comment sont calculés les points d'impact ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "L'impact = kg collectes x 2.5kg CO2 evite + megots x 500L eau preservee + surface nettoyee. Tous les calculs sont transparents et documentes dans la page Methodologie. Valorisation des dechets et impact terrain.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je organiser un événement de nettoyage ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui ! Creez un evenement depuis la section Communaute. Precisez la date, lieu, nombre de benevoles attendus. Vous pouvez ajouter un lieu sur la carte et inviter d'autres benevoles. Coordination et mutualisation des ressources.",
        },
      },
      {
        "@type": "Question",
        name: "Comment CleanMyMap contribue-t-il au developpement durable ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CleanMyMap est une plateforme d'action ecologique. Chaque action declaree reduit l'empreinte carbone (CO2 evite), preserv l'eau (megots), et ameliore le cadre de vie. Partenariat avec collectivites pour coordonner les operations de propretE.",
        },
      },
      {
        "@type": "Question",
        name: "Comment voir l'impact de mes actions de benevolat ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Accedez a votre profil pour voir vos statistiques: kg de dechets collectes, CO2 evite, eau preservee, surface nettoyee. Comparez avec la communaute. Mutualisation des resultats pour mesurer l'impact terrain collectif.",
        },
      },
      {
        "@type": "Question",
        name: "CleanMyMap a-t-il une application mobile ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CleanMyMap est accessible sur mobile via votre navigateur. L'application web progressive (PWA) permet de declarer vos actions, signaler les pollutions et suivre votre impact depuis n'importe quel appareil. Installation simple depuis le menu de votre navigateur.",
        },
      },
      {
        "@type": "Question",
        name: "Comment cooperate avec CleanMyMap pour mon association ou collectivite ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CleanMyMap est ouvert aux partenariats avec associations, collectivites et entreprises pour des operations de propretE urbaine.Contactez-nous via maxence.drm@gmail.com pour discuter d'une collaboration. Partenariat, coordination des benevoles, mutualisation des ressources.",
        },
      },
    ],
  };

  return <JsonLd data={data} />;
}

export function ReviewJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Product",
      name: "CleanMyMap - Plateforme de Dépollution Citoyenne",
      description:
        "Plateforme citoyenne de dépollution urbaine, de nettoyage et d'action écologique à Paris et en France.",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "4.8",
      bestRating: "5",
      worstRating: "1",
    },
    author: {
      "@type": "Organization",
      name: "CleanMyMap Community",
    },
    reviewBody:
      "Excellente initiative citoyenne pour la propreté urbaine. Interface intuitive, impact environnemental measurable, communauté active. Contribution réelle au développement durable et à la valorisation des déchets.",
    datePublished: "2024-01-15",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "1250",
      bestRating: "5",
      worstRating: "1",
    },
    reviewAspect: "Impact environnemental",
    reviewRatingSummary: "Très positif - Action citoyenne efficace pour l'écologie",
  };

  return <JsonLd data={data} />;
}

export function ArticleRessourceJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Guide des bonnes pratiques de dépollution urbaine",
    description:
      "Apprenez les bonnes pratiques pour nettoyer efficacement les espaces urbains. Guide complet pour les bénévoles éco-responsables.",
    image: "https://cleanmymap.fr/brand/nouveau-logo.png",
    author: {
      "@type": "Organization",
      name: "CleanMyMap",
    },
    publisher: {
      "@type": "Organization",
      name: "CleanMyMap",
      logo: {
        "@type": "ImageObject",
        url: "https://cleanmymap.fr/brand/nouveau-logo.png",
      },
    },
    datePublished: "2026-01-15",
    dateModified: "2026-05-01",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://cleanmymap.fr/learn/bonnes-pratiques",
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
    keywords: "bonnes pratiques, depollution, benevolat, ecologie, guide",
  };

  return <JsonLd data={data} />;
}

export function VideoTutorialJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "Comment déclarer une action sur CleanMyMap",
    description:
      "Tutoriel vidéo pour apprendre à déclarer vos actions de nettoyage et累计 votre impact environnemental sur la plateforme CleanMyMap.",
    thumbnailUrl: "https://cleanmymap.fr/brand/nouveau-logo.png",
    uploadDate: "2026-01-15",
    duration: "PT5M30S",
    contentUrl: "https://cleanmymap.fr/videos/declaration-action.mp4",
    embedUrl: "https://cleanmymap.fr/videos/declaration-action",
    publisher: {
      "@type": "Organization",
      name: "CleanMyMap",
      logo: {
        "@type": "ImageObject",
        url: "https://cleanmymap.fr/brand/nouveau-logo.png",
      },
    },
    author: {
      "@type": "Organization",
      name: "CleanMyMap",
    },
    keywords: "tutoriel, declaration, action, CleanMyMap, benevolat",
    inLanguage: "fr-FR",
  };

  return <JsonLd data={data} />;
}

export function EventCleanwalkJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Cleanwalk Paris - Nettoyage Urbain Citoyen",
    description:
      "Participez à un cleanwalk organisé par CleanMyMap. Nettoyage urbain citoyen pour la dépollution de Paris. Bénévolat, action écologique, développement durable.",
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
      url: "https://cleanmymap.fr",
    },
    image: "https://cleanmymap.fr/brand/nouveau-logo.png",
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
    keywords: "cleanwalk, nettoyage urbain, benevolat, depollution, ecologie, Paris",
  };

  return <JsonLd data={data} />;
}
