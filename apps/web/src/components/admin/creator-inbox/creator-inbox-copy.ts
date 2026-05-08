"use client";

export type CreatorInboxLocale = "fr" | "en";

export const PARTNER_CONFIRM_PHRASE = "CONFIRMER PARTENAIRE";

type CreatorInboxCopy = {
  panel: {
    badge: string;
    title: string;
    description: string;
    itemCountSuffix: string;
    feedbackLabel: string;
    promotionLabel: string;
    partnerLabel: string;
    eventLabel: string;
  };
  filters: {
    searchLabel: string;
    searchPlaceholder: string;
    sourceLabel: string;
    statusLabel: string;
    partnerPhraseLabel: string;
    partnerPhrasePlaceholder: string;
    loadingLabel: string;
    yesLabel: string;
    noLabel: string;
    refreshLabel: string;
    refreshingLabel: string;
  };
  states: {
    emptyTitle: string;
    emptySubtitle: string;
    pageNotProvided: string;
    highPriority: string;
    normalPriority: string;
    copied: string;
    copySummary: string;
    replyByEmail: string;
    approve: string;
    approving: string;
    reject: string;
    processing: string;
    markTreated: string;
    markResponded: string;
    deleting: string;
    delete: string;
  };
  messages: {
    refreshSuccess: string;
    actionSuccess: string;
    refreshError: string;
    actionError: string;
    approvalError: string;
    rejectionError: string;
    clipboardError: string;
    unexpectedError: string;
    partnerConfirmMismatch: string;
  };
};

const COPY: Record<CreatorInboxLocale, CreatorInboxCopy> = {
  fr: {
    panel: {
      badge: "Inbox créateur",
      title: "File de traitement unifiée",
      description:
        "Feedback, promotion, partenariat et événements arrivent dans le même espace, avec les bons contacts, les bonnes dates et les bons statuts.",
      itemCountSuffix: "élément(s)",
      feedbackLabel: "Feedback",
      promotionLabel: "Promo",
      partnerLabel: "Partenariat",
      eventLabel: "Événement",
    },
    filters: {
      searchLabel: "Rechercher",
      searchPlaceholder: "Auteur, email, titre, statut, source...",
      sourceLabel: "Source",
      statusLabel: "Statut",
      partnerPhraseLabel: "Phrase partenaire",
      partnerPhrasePlaceholder: PARTNER_CONFIRM_PHRASE,
      loadingLabel: "Chargement",
      yesLabel: "oui",
      noLabel: "non",
      refreshLabel: "Rafraîchir",
      refreshingLabel: "Rafraîchissement...",
    },
    states: {
      emptyTitle: "Aucun élément à afficher.",
      emptySubtitle: "Essaie un autre filtre ou rafraîchis la file.",
      pageNotProvided: "Page non communiquée",
      highPriority: "Priorité haute",
      normalPriority: "Priorité normale",
      copied: "Copié",
      copySummary: "Copier le résumé",
      replyByEmail: "Répondre par mail",
      approve: "Accepter",
      approving: "Validation...",
      reject: "Refuser",
      processing: "Traitement...",
      markTreated: "Marquer traité",
      markResponded: "Marquer répondu",
      deleting: "Suppression...",
      delete: "Supprimer",
    },
    messages: {
      refreshSuccess: "File rafraîchie.",
      actionSuccess: "Action enregistrée.",
      refreshError: "Impossible de rafraîchir la file.",
      actionError: "Action impossible.",
      approvalError: "Validation impossible.",
      rejectionError: "Refus impossible.",
      clipboardError: "Copie impossible dans le presse-papiers.",
      unexpectedError: "Une erreur inattendue est survenue.",
      partnerConfirmMismatch:
        'Renseigne exactement "CONFIRMER PARTENAIRE" pour valider cette revue.',
    },
  },
  en: {
    panel: {
      badge: "Creator inbox",
      title: "Unified processing queue",
      description:
        "Feedback, promotion, partnerships and events arrive in one space with the right contacts, dates and statuses.",
      itemCountSuffix: "item(s)",
      feedbackLabel: "Feedback",
      promotionLabel: "Promo",
      partnerLabel: "Partner",
      eventLabel: "Event",
    },
    filters: {
      searchLabel: "Search",
      searchPlaceholder: "Author, email, title, status, source...",
      sourceLabel: "Source",
      statusLabel: "Status",
      partnerPhraseLabel: "Partner phrase",
      partnerPhrasePlaceholder: PARTNER_CONFIRM_PHRASE,
      loadingLabel: "Loading",
      yesLabel: "yes",
      noLabel: "no",
      refreshLabel: "Refresh",
      refreshingLabel: "Refreshing...",
    },
    states: {
      emptyTitle: "No items to show.",
      emptySubtitle: "Try another filter or refresh the inbox.",
      pageNotProvided: "Page not provided",
      highPriority: "High priority",
      normalPriority: "Normal priority",
      copied: "Copied",
      copySummary: "Copy summary",
      replyByEmail: "Reply by email",
      approve: "Approve",
      approving: "Approving...",
      reject: "Reject",
      processing: "Processing...",
      markTreated: "Mark treated",
      markResponded: "Mark responded",
      deleting: "Deleting...",
      delete: "Delete",
    },
    messages: {
      refreshSuccess: "Inbox refreshed.",
      actionSuccess: "Action saved.",
      refreshError: "Unable to refresh inbox.",
      actionError: "Action failed.",
      approvalError: "Approval failed.",
      rejectionError: "Rejection failed.",
      clipboardError: "Unable to copy to clipboard.",
      unexpectedError: "An unexpected error occurred.",
      partnerConfirmMismatch:
        'Type exactly "CONFIRMER PARTENAIRE" to confirm this review.',
    },
  },
};

export function getCreatorInboxCopy(locale: CreatorInboxLocale): CreatorInboxCopy {
  return COPY[locale];
}

export type { CreatorInboxCopy };
