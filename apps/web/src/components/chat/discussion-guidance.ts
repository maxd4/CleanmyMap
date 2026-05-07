import type { ChatChannelType } from "@/lib/chat/channels";

export type DiscussionLocale = "fr" | "en";

export type DiscussionGuidance = {
  cardTitle: string;
  cardSummary: string;
  visibilityLabel: string;
  audienceLabel: string;
  purposeTags: string[];
  messagePattern: string;
  emptyTitle: string;
  emptyDescription: string;
  starterTitle: string;
  starterPrompts: string[];
  composerHint: string;
  channelGoal: string;
};

type GuidanceOptions = {
  locale: DiscussionLocale;
  territoryLabel?: string | null;
  recipientLabel?: string | null;
};

const GUIDANCE: Record<
  ChatChannelType,
  Record<
    DiscussionLocale,
    {
      cardTitle: string;
      cardSummary: string;
      visibilityLabel: (options: GuidanceOptions) => string;
      audienceLabel: (options: GuidanceOptions) => string;
      purposeTags: string[];
      messagePattern: string;
      emptyTitle: string;
      emptyDescription: string;
      starterTitle: string;
      starterPrompts: string[];
      composerHint: string;
      channelGoal: string;
    }
  >
> = {
  community: {
    fr: {
      cardTitle: "Communauté",
      cardSummary: "Questions ouvertes, relais associatif, coordination visible et retours terrain.",
      visibilityLabel: () => "Visible par tous les membres connectés",
      audienceLabel: () => "Conversation collective",
      purposeTags: [
        "Besoin de relais associatif",
        "Besoin de bénévoles",
        "Besoin de diffusion",
        "Coordination",
      ],
      messagePattern: "Contexte → besoin → relais souhaité",
      emptyTitle: "Lancez la discussion collective",
      emptyDescription:
        "Partagez ce que vous voyez, ce que vous cherchez, ou demandez un relais associatif pour un cleanup.",
      starterTitle: "Premiers messages utiles",
      starterPrompts: [
        "Besoin de relais associatif: j'organise un cleanup et je cherche une association...",
        "Besoin de bénévoles: il me manque du monde pour le prochain cleanup...",
        "Besoin de diffusion: merci de relayer cette annonce spontanée...",
      ],
      composerHint: "Une phrase courte suffit: ce que vous observez, ce dont vous avez besoin, et le relais recherché.",
      channelGoal: "Coordination et relais associatif",
    },
    en: {
      cardTitle: "Community",
      cardSummary: "Open questions, association relay, visible coordination and field feedback.",
      visibilityLabel: () => "Visible to all signed-in members",
      audienceLabel: () => "Group conversation",
      purposeTags: [
        "Need association relay",
        "Need volunteers",
        "Need distribution",
        "Coordination",
      ],
      messagePattern: "Context → need → requested relay",
      emptyTitle: "Start the group discussion",
      emptyDescription:
        "Share what you see, what you need, or ask for an association relay for a cleanup.",
      starterTitle: "Useful first messages",
      starterPrompts: [
        "I am coordinating a cleanup and need help relaying it...",
        "I am looking for an association to spread the word...",
        "Here is a spontaneous announcement to share in the network...",
      ],
      composerHint: "A short sentence is enough: what you observed, what you need, and the relay you are seeking.",
      channelGoal: "Coordination and association relay",
    },
  },
  dm: {
    fr: {
      cardTitle: "Messages privés",
      cardSummary: "Échange direct, confidentiel et ciblé avec une personne.",
      visibilityLabel: ({ recipientLabel }) =>
        recipientLabel ? `Visible seulement à ${recipientLabel}` : "Visible seulement au destinataire choisi",
      audienceLabel: () => "Conversation directe",
      purposeTags: ["Direct", "Confidentiel", "Pièce jointe", "Suivi"],
      messagePattern: "Objet → contexte → réponse attendue",
      emptyTitle: "Choisissez un membre puis écrivez",
      emptyDescription:
        "Le message privé sert aux échanges courts, ciblés et confidentiels.",
      starterTitle: "Idées pour démarrer",
      starterPrompts: [
        "Peux-tu me dire...",
        "Je te partage...",
        "J'aurais besoin d'un retour sur...",
      ],
      composerHint: "Allez droit au point: demande, contexte et délai éventuel.",
      channelGoal: "Échange confidentiel",
    },
    en: {
      cardTitle: "Private messages",
      cardSummary: "Direct, confidential and focused exchange with one person.",
      visibilityLabel: ({ recipientLabel }) =>
        recipientLabel ? `Visible only to ${recipientLabel}` : "Visible only to the chosen recipient",
      audienceLabel: () => "Direct conversation",
      purposeTags: ["Direct", "Confidential", "Attachment", "Follow-up"],
      messagePattern: "Subject → context → expected answer",
      emptyTitle: "Choose a member and write",
      emptyDescription:
        "Private messages are for short, targeted and confidential exchanges.",
      starterTitle: "Ideas to get started",
      starterPrompts: [
        "Could you tell me...",
        "I am sharing...",
        "I would like feedback on...",
      ],
      composerHint: "Get to the point: request, context and any deadline.",
      channelGoal: "Confidential exchange",
    },
  },
  admin_elu: {
    fr: {
      cardTitle: "Admin & élus",
      cardSummary: "Arbitrages, priorités et décisions de pilotage.",
      visibilityLabel: () => "Réservé aux rôles de coordination",
      audienceLabel: () => "Pilotage",
      purposeTags: ["Décision", "Arbitrage", "Priorité", "Suivi"],
      messagePattern: "Décision attendue → options → impact",
      emptyTitle: "Ouvrez un sujet de pilotage",
      emptyDescription:
        "Ce canal sert aux arbitrages, aux priorités et aux échanges de décision.",
      starterTitle: "Sujets de départ",
      starterPrompts: [
        "Je remonte un arbitrage sur...",
        "Je propose une décision sur...",
        "Je partage un point de pilotage sur...",
      ],
      composerHint: "Commencez par la décision attendue, puis donnez les éléments utiles.",
      channelGoal: "Décision et arbitrage",
    },
    en: {
      cardTitle: "Admin & elected",
      cardSummary: "Trade-offs, priorities and steering decisions.",
      visibilityLabel: () => "Restricted to steering roles",
      audienceLabel: () => "Steering",
      purposeTags: ["Decision", "Trade-off", "Priority", "Follow-up"],
      messagePattern: "Decision needed → options → impact",
      emptyTitle: "Open a steering topic",
      emptyDescription:
        "This channel is for trade-offs, priorities and decision-oriented exchange.",
      starterTitle: "Starting topics",
      starterPrompts: [
        "I am raising an arbitration on...",
        "I am proposing a decision on...",
        "I am sharing a steering point on...",
      ],
      composerHint: "Start with the decision you need, then add the useful context.",
      channelGoal: "Decision and arbitration",
    },
  },
  territory: {
    fr: {
      cardTitle: "Territoire",
      cardSummary: "Sujets locaux d'un arrondissement ou d'une commune et de ses voisines.",
      visibilityLabel: ({ territoryLabel }) =>
        territoryLabel ? `Visible pour ${territoryLabel}` : "Visible pour votre zone de territoire",
      audienceLabel: () => "Sujet local",
      purposeTags: ["Arrondissement", "Quartier", "Commune", "Voisinage"],
      messagePattern: "Lieu → constat → action souhaitée",
      emptyTitle: "Partagez un point local",
      emptyDescription:
        "Ce canal sert aux informations liées à votre zone et aux zones voisines.",
      starterTitle: "Premiers messages utiles",
      starterPrompts: [
        "Ce point concerne...",
        "Voici ce que j'ai observé dans...",
        "Qui peut confirmer ce secteur ?",
      ],
      composerHint: "Précisez la rue, le quartier ou la commune pour être utile tout de suite.",
      channelGoal: "Ancrage territorial",
    },
    en: {
      cardTitle: "Territory",
      cardSummary: "Local topics for a district, a suburb and nearby areas.",
      visibilityLabel: ({ territoryLabel }) =>
        territoryLabel ? `Visible for ${territoryLabel}` : "Visible for your territory zone",
      audienceLabel: () => "Local topic",
      purposeTags: ["District", "Neighborhood", "Municipality", "Nearby area"],
      messagePattern: "Place → observation → desired action",
      emptyTitle: "Share a local point",
      emptyDescription:
        "This channel is for information tied to your zone and nearby areas.",
      starterTitle: "Useful first messages",
      starterPrompts: [
        "This point concerns...",
        "Here is what I observed in...",
        "Who can confirm this area?",
      ],
      composerHint: "Specify the street, neighborhood or town so it is useful right away.",
      channelGoal: "Territorial context",
    },
  },
  bug_report: {
    fr: {
      cardTitle: "Feedback",
      cardSummary: "Bug, suggestion ou collaboration pour améliorer le produit via le formulaire structuré.",
      visibilityLabel: () => "Visible à l'équipe feedback",
      audienceLabel: () => "Retour produit",
      purposeTags: ["Bug", "Idée", "Collaboration", "Reproduction"],
      messagePattern: "Problème → étapes → résultat attendu",
      emptyTitle: "Ouvrez un retour utile",
      emptyDescription:
        "Ce canal sert à signaler un bug, proposer une amélioration ou initier une collaboration structurée.",
      starterTitle: "Idées de départ",
      starterPrompts: [
        "J'ai repéré un bug sur...",
        "Je propose une amélioration pour...",
        "Je veux collaborer sur...",
      ],
      composerHint: "Décrivez le problème, l'effet observé et si possible le chemin pour le reproduire.",
      channelGoal: "Amélioration produit",
    },
    en: {
      cardTitle: "Feedback",
      cardSummary: "Bug, suggestion or collaboration to improve the product through the structured form.",
      visibilityLabel: () => "Visible to the feedback team",
      audienceLabel: () => "Product feedback",
      purposeTags: ["Bug", "Idea", "Collaboration", "Reproduction"],
      messagePattern: "Problem → steps → expected result",
      emptyTitle: "Open a useful feedback item",
      emptyDescription:
        "Use this channel to report a bug, suggest an improvement or start a structured collaboration.",
      starterTitle: "Starting ideas",
      starterPrompts: [
        "I spotted a bug on...",
        "I suggest an improvement for...",
        "I want to collaborate on...",
      ],
      composerHint: "Describe the issue, the effect you observed and, if possible, how to reproduce it.",
      channelGoal: "Product improvement",
    },
  },
};

export function getDiscussionGuidance(
  channelType: ChatChannelType,
  options: GuidanceOptions,
): DiscussionGuidance {
  const localeData = GUIDANCE[channelType][options.locale];
  let emptyTitle = localeData.emptyTitle;
  let emptyDescription = localeData.emptyDescription;

  if (channelType === "dm" && options.recipientLabel) {
    emptyTitle =
      options.locale === "fr"
        ? `Aucun message privé avec ${options.recipientLabel}`
        : `No private messages with ${options.recipientLabel}`;
    emptyDescription =
      options.locale === "fr"
        ? "Votre conversation démarre ici. Envoyez un premier message pour lancer l'échange."
        : "Your conversation starts here. Send the first message to begin the exchange.";
  }

  if (channelType === "territory" && options.territoryLabel) {
    emptyTitle =
      options.locale === "fr"
        ? `Aucun message pour ${options.territoryLabel}`
        : `No messages for ${options.territoryLabel}`;
    emptyDescription =
      options.locale === "fr"
        ? "Partagez ici les sujets liés à votre zone et aux zones limitrophes."
        : "Share topics tied to your zone and nearby areas here.";
  }

  return {
    cardTitle: localeData.cardTitle,
    cardSummary: localeData.cardSummary,
    visibilityLabel: localeData.visibilityLabel(options),
    audienceLabel: localeData.audienceLabel(options),
    purposeTags: localeData.purposeTags,
    messagePattern: localeData.messagePattern,
    emptyTitle,
    emptyDescription,
    starterTitle: localeData.starterTitle,
    starterPrompts: localeData.starterPrompts,
    composerHint: localeData.composerHint,
    channelGoal: localeData.channelGoal,
  };
}

export function getDiscussionChannelOrder(): ChatChannelType[] {
  return ["community", "dm", "admin_elu", "territory", "bug_report"];
}
