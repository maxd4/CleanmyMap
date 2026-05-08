// Structured data for HowTo guides and tutorials
import { JsonLd } from "./json-ld-wrapper";

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
