"use client";

import Script from "next/script";

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CleanMyMap",
    url: "https://cleanmymap.fr",
    logo: "https://cleanmymap.fr/brand/nouveau-logo.png",
    description:
      "Plateforme citoyenne de depollution urbaine, d'action ecologique et de developpement durable a Paris et en France. Coordination benevoles, mutualisation resultats, valorisation dechets.",
    sameAs: [
      "https://twitter.com/cleanmymap",
      "https://github.com/cleanmymap",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "maxence.drm@gmail.com",
      contactType: "Customer Service",
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    serviceType: "Citizen participation platform",
    keywords: "depollution, ecologie, developpement durable, benevolat, action citoyenne, nettoyage urbain, coordination, partenariat, impact terrain, valorisation dechets",
  };

  return <JsonLd data={data} />;
}

export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "CleanMyMap",
    image: "https://cleanmymap.fr/brand/nouveau-logo.png",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Paris",
      addressCountry: "FR",
    },
    areaServed: {
      "@type": "City",
      name: "Paris",
    },
    serviceType: "Environmental cleanup platform",
    description:
      "Plateforme citoyenne de nettoyage urbain et de depollution a Paris.",
  };

  return <JsonLd data={data} />;
}

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: "https://cleanmymap.fr",
    name: "CleanMyMap - Carte Dépollution Paris & Écologie Action",
    description:
      "La carte citoyenne de proprete et de depollution urbaine. Signalez, nettoyez, agissez pour l'environnement. Benevolat, ecologie, developpement durable, coordination, impact terrain, valorisation des dechets.",
    keywords: "depollution, ecologie, proprete Paris, cleanwalk, benevole, action citoyenne, developpement durable, coordination benevoles, impact terrain, valorisation dechets",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://cleanmymap.fr/explorer?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={data} />;
}

export function HowToDeclareActionJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Déclarer une action de nettoyage sur CleanMyMap",
    description: "Guide étape par étape pour déclarer votre action de dépollution et calculer votre impact environnemental.",
    step: [
      {
        "@type": "HowToStep",
        name: "1. Se connecter ou créer un compte",
        text: "Rendez-vous sur cleanmymap.fr et cliquez sur 'Se connecter'. Créez un compte gratuitement avec votre email.",
      },
      {
        "@type": "HowToStep",
        name: "2. Accéder au formulaire de déclaration",
        text: "Cliquez sur 'Déclarer une action' dans le menu principal ou accédez directement à /actions/new.",
      },
      {
        "@type": "HowToStep",
        name: "3. Remplir les détails de l'action",
        text: "Indiquez la date de l'action, la durée, le lieu exact (adresse ou positionnement sur la carte), le type de déchets collectés et la quantité estimée en kg.",
      },
      {
        "@type": "HowToStep",
        name: "4. Ajouter des photos (optionnel)",
        text: "Vous pouvez ajouter des photos avant/après pour illustrer votre action et renforcer la crédibilité du signalement.",
      },
      {
        "@type": "HowToStep",
        name: "5. Valider et soumettre",
        text: "Cliquez sur 'Soumettre'. Votre action sera examinée par l'équipe de modération sous 24-72h puis apparaitre sur la carte.",
      },
    ],
    totalTime: "PT10M",
    supply: ["Gants", "Sacs poubelle", "Pince de collecte"],
    tool: ["Application CleanMyMap"],
  };

  return <JsonLd data={data} />;
}

export function HowToSignalPollutionJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Signaler une pollution sur CleanMyMap",
    description: "Guide pour signaler un point de pollution afin qu'il soit traité par la communauté ou les services municipaux.",
    step: [
      {
        "@type": "HowToStep",
        name: "1. Localiser le point",
        text: "Ouvrez la carte sur cleanmymap.fr/explorer et localizez le lieu problématique en déplaçant la carte ou en entrant une adresse.",
      },
      {
        "@type": "HowToStep",
        name: "2. Cliquer sur 'Signaler'",
        text: "Utilisez le bouton de signalement pour ouvrir le formulaire.",
      },
      {
        "@type": "HowToStep",
        name: "3. Prendre une photo",
        text: "Capturez une photo du point de pollution pour documenter le problème.",
      },
      {
        "@type": "HowToStep",
        name: "4. Décrire le type de déchet",
        text: "Sélectionnez le type de déchet ( mégots, plastique, verre, autres) et ajoutez une description si nécessaire.",
      },
      {
        "@type": "HowToStep",
        name: "5. Soumettre le signalement",
        text: "Validez le signalement. Il sera examiné par la modération sous 24h.",
      },
    ],
    totalTime: "PT5M",
  };

  return <JsonLd data={data} />;
}

export function HowToJoinCleanwalkJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Participer à un cleanwalk avec CleanMyMap",
    description: "Guide pour rejoindre un événement de nettoyage urbain et contribuer à la dépollution de votre ville.",
    step: [
      {
        "@type": "HowToStep",
        name: "1. Découvrir les événements",
        text: "Rendez-vous sur la section événements ou consultez la carte pour trouver les cleanwalks organisés près de chez vous.",
      },
      {
        "@type": "HowToStep",
        name: "2. Choisir un événement",
        text: "Sélectionnez un événement qui vous convient selon la date, le lieu et le type de nettoyage prévu.",
      },
      {
        "@type": "HowToStep",
        name: "3. S'inscrire gratuitement",
        text: "Cliquez sur 'Participer' et créez un compte ou connectez-vous. L'inscription est entièrement gratuite.",
      },
      {
        "@type": "HowToStep",
        name: "4. Se préparer",
        text: "Venez avec des vêtements confortables. Le matériel (gants, sacs, pinces) est généralement fourni par l'organisateur.",
      },
      {
        "@type": "HowToStep",
        name: "5. Participer et déclarer",
        text: "Participez au cleanwalk, puis déclarez votre action pour累计 votre impact environnemental (CO2 évite, eau préservée).",
      },
    ],
    totalTime: "PT2H",
    event: {
      "@type": "Event",
      name: "Cleanwalk CleanMyMap",
      eventStatus: "EventScheduled",
    },
    attendanceMode: "OfflineEventAttendanceMode",
  };

  return <JsonLd data={data} />;
}

export function HowToJoinCommunityJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Rejoindre la communauté CleanMyMap",
    description: "Guide pour rejoindre la communauté de bénévoles et participer activement à la dépollution urbaine.",
    step: [
      {
        "@type": "HowToStep",
        name: "1. Créer un compte",
        text: "Inscrivez-vous sur cleanmymap.fr avec votre email. C'est gratuit et rapide.",
      },
      {
        "@type": "HowToStep",
        name: "2. Choisir votre profil",
        text: "Sélectionnez votre profil (bénévole, coordinateur, élu, scientifique) pour personnaliser votre expérience.",
      },
      {
        "@type": "HowToStep",
        name: "3. Explorer la carte",
        text: "Découvrez les signalements et actions près de chez vous sur la carte interactive.",
      },
      {
        "@type": "HowToStep",
        name: "4. Declarer vos actions",
        text: "Déclarez vos actions de nettoyage pour累计 votre impact et rejoindre les statistiques collectives.",
      },
      {
        "@type": "HowToStep",
        name: "5. Participer aux événements",
        text: "Rejoignez les cleanwalks et rencontr d'autres citoyens engagés pour l'écologie et le développement durable.",
      },
    ],
    totalTime: "PT15M",
    tool: ["Application CleanMyMap", "Email"],
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
        name: "Explorer la carte",
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

  return <JsonLd data={data} />;
}

export function WebPageJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "CleanMyMap - Carte de Dépollution Urbaine Paris",
    description:
      "Plateforme citoyenne de dépollution urbaine et d'action écologique à Paris. Signalez les pollutions, organisez des cleanwalks, déclarez vos actions pour累计 votre impact environnemental.",
    url: "https://cleanmymap.fr",
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: "https://cleanmymap.fr/brand/nouveau-logo.png",
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
        url: "https://cleanmymap.fr/brand/nouveau-logo.png",
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

  return <JsonLd data={data} />;
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
        name: "Explorer",
        description: "Carte interactive des signalements et actions de dépollution",
        url: "https://cleanmymap.fr/explorer",
      },
      {
        "@type": "SiteNavigationElement",
        name: "Observatoire",
        description: "Données publiques et statistiques d'impact environnemental",
        url: "https://cleanmymap.fr/observatoire",
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

  return <JsonLd data={data} />;
}

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