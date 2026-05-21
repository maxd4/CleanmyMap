export type StorageBusinessDomainId =
  | "socle_estimateur_impact"
  | "emails"
  | "messages"
  | "pieces_jointes_photo"
  | "pieces_jointes_document"
  | "actions_terrain"
  | "donnees_utilisateur"
  | "badges_gamification"
  | "autres";

export type StorageBusinessDomain = {
  id: StorageBusinessDomainId;
  label: string;
  description: string;
};

export type StorageBusinessDomainMatch = {
  id: StorageBusinessDomainId;
  label: string;
  signal: "bucket" | "prefix" | "keyword" | "mime" | "extension";
  evidence: string;
};

type StorageBusinessDomainRule = StorageBusinessDomain & {
  bucketIds: string[];
  pathPrefixes: string[];
  keywords: string[];
  mimeTypes: string[];
  extensions: string[];
};

const STORAGE_BUSINESS_DOMAINS: StorageBusinessDomainRule[] = [
  {
    id: "socle_estimateur_impact",
    label: "Socle d’estimateur d’impact",
    description: "Exports, rapports et livrables du socle d’estimation.",
    bucketIds: ["reports", "prints", "methodology", "impact", "environmental-impact"],
    pathPrefixes: ["reports/", "prints/", "methodology/", "impact/", "exports/"],
    keywords: ["rapport", "rapports", "methodologie", "méthodologie", "estimator", "estimateur", "impact"],
    mimeTypes: [
      "application/pdf",
      "text/markdown",
      "application/json",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    extensions: ["pdf", "md", "json", "csv", "xlsx"],
  },
  {
    id: "emails",
    label: "Emails",
    description: "Courriels, pièces de mail et artefacts d’envoi.",
    bucketIds: ["emails", "email", "service-email-events", "mailer"],
    pathPrefixes: ["emails/", "email/", "mailer/", "notifications/email/"],
    keywords: ["email", "courriel", "mailer", "notification"],
    mimeTypes: ["message/rfc822", "text/plain"],
    extensions: ["eml", "txt"],
  },
  {
    id: "messages",
    label: "Messages",
    description: "Échanges conversationnels et fils de discussion.",
    bucketIds: ["messages", "chat", "dm", "conversations"],
    pathPrefixes: ["messages/", "chat/", "dm/", "conversation/", "threads/"],
    keywords: ["message", "conversation", "thread", "chat", "dm"],
    mimeTypes: ["application/json", "text/plain"],
    extensions: ["json", "txt"],
  },
  {
    id: "donnees_utilisateur",
    label: "Données utilisateur",
    description: "Profils, avatars et contenus attachés aux comptes.",
    bucketIds: ["users", "profiles", "avatars", "user-assets"],
    pathPrefixes: ["users/", "profiles/", "avatars/", "account/", "users-assets/"],
    keywords: ["user", "profile", "avatar", "account", "profil"],
    mimeTypes: ["application/json", "text/plain"],
    extensions: ["json", "txt"],
  },
  {
    id: "badges_gamification",
    label: "Badges gamification",
    description: "Récompenses, avatars de progression et badges.",
    bucketIds: ["badges", "gamification", "progression"],
    pathPrefixes: ["badges/", "gamification/", "progression/", "achievements/"],
    keywords: ["badge", "gamification", "progression", "achievement", "reward"],
    mimeTypes: ["application/json", "text/plain"],
    extensions: ["json", "txt"],
  },
  {
    id: "pieces_jointes_photo",
    label: "Pièces jointes photo",
    description: "Images jointes aux conversations ou aux formulaires.",
    bucketIds: ["action-photos", "photos", "photo-attachments", "attachments-images"],
    pathPrefixes: ["photos/", "photo/", "attachments/photos/", "attachments/images/"],
    keywords: ["photo", "image", "snapshot", "capture"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml"],
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"],
  },
  {
    id: "pieces_jointes_document",
    label: "Pièces jointes document",
    description: "PDF, tableurs et documents partagés.",
    bucketIds: ["chat-attachments", "attachments", "documents", "file-attachments"],
    pathPrefixes: ["attachments/", "documents/", "files/", "uploads/documents/"],
    keywords: ["document", "attachment", "piece-jointe", "pièce-jointe"],
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/markdown",
      "text/csv",
    ],
    extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv"],
  },
  {
    id: "actions_terrain",
    label: "Actions terrain",
    description: "Données et médias liés aux missions terrain.",
    bucketIds: ["actions", "terrain", "missions", "mission-assets", "field-data"],
    pathPrefixes: ["actions/", "terrain/", "missions/", "mission/", "field/", "spot/"],
    keywords: ["action", "terrain", "mission", "field", "spot"],
    mimeTypes: ["video/mp4", "video/webm", "text/csv", "application/json"],
    extensions: ["mp4", "webm", "csv", "json"],
  },
  {
    id: "autres",
    label: "Autres",
    description: "Objets non classés par les règles métier.",
    bucketIds: [],
    pathPrefixes: [],
    keywords: [],
    mimeTypes: [],
    extensions: [],
  },
];

const STORAGE_BUSINESS_DOMAIN_DISPLAY_ORDER: StorageBusinessDomainId[] = [
  "socle_estimateur_impact",
  "emails",
  "messages",
  "pieces_jointes_photo",
  "pieces_jointes_document",
  "actions_terrain",
  "donnees_utilisateur",
  "badges_gamification",
  "autres",
];

function toAsciiLower(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizePath(value: string): string {
  return toAsciiLower(value).replace(/[^a-z0-9/_-]+/g, "");
}

function extractExtension(name: string): string {
  const fileName = name.split("/").pop() ?? name;
  const index = fileName.lastIndexOf(".");
  if (index <= 0 || index === fileName.length - 1) {
    return "";
  }
  return fileName.slice(index + 1).toLowerCase();
}

function isImageMimeOrExtension(mimeType: string | null, extension: string): boolean {
  const normalizedMime = mimeType?.trim().toLowerCase() ?? null;
  return (
    (normalizedMime !== null && normalizedMime.startsWith("image/")) ||
    ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"].includes(extension)
  );
}

function isDocumentMimeOrExtension(mimeType: string | null, extension: string): boolean {
  const normalizedMime = mimeType?.trim().toLowerCase() ?? null;
  return (
    normalizedMime === "application/pdf" ||
    normalizedMime === "application/msword" ||
    normalizedMime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedMime === "application/vnd.ms-excel" ||
    normalizedMime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    normalizedMime === "text/plain" ||
    normalizedMime === "text/markdown" ||
    normalizedMime === "text/csv" ||
    ["pdf", "doc", "docx", "xls", "xlsx", "txt", "md", "csv"].includes(extension)
  );
}

function scoreRule(rule: StorageBusinessDomainRule, context: {
  bucketId: string;
  name: string;
  mimeType: string | null;
  extension: string;
}): StorageBusinessDomainMatch | null {
  const normalizedBucket = normalizePath(context.bucketId);
  const normalizedName = normalizePath(context.name);
  const normalizedMime = context.mimeType?.trim().toLowerCase() ?? null;
  const extension = context.extension.toLowerCase();

  if (rule.bucketIds.some((bucketId) => normalizedBucket === normalizePath(bucketId))) {
    return {
      id: rule.id,
      label: rule.label,
      signal: "bucket",
      evidence: context.bucketId,
    };
  }

  if (rule.pathPrefixes.some((prefix) => normalizedName.startsWith(normalizePath(prefix)))) {
    return {
      id: rule.id,
      label: rule.label,
      signal: "prefix",
      evidence: context.name,
    };
  }

  if (rule.keywords.some((keyword) => normalizedName.includes(normalizePath(keyword)))) {
    return {
      id: rule.id,
      label: rule.label,
      signal: "keyword",
      evidence: context.name,
    };
  }

  if (normalizedMime && rule.mimeTypes.some((mimeType) => normalizedMime === mimeType.toLowerCase())) {
    return {
      id: rule.id,
      label: rule.label,
      signal: "mime",
      evidence: normalizedMime,
    };
  }

  if (extension && rule.extensions.includes(extension)) {
    return {
      id: rule.id,
      label: rule.label,
      signal: "extension",
      evidence: extension,
    };
  }

  return null;
}

export function classifyStorageBusinessDomain(input: {
  bucketId: string;
  name: string;
  mimeType?: string | null;
}): StorageBusinessDomainMatch {
  const context = {
    bucketId: input.bucketId,
    name: input.name,
    mimeType: input.mimeType ?? null,
    extension: extractExtension(input.name),
  };

  const normalizedBucket = normalizePath(context.bucketId);
  const normalizedName = normalizePath(context.name);

  if (
    normalizedBucket === "chat-attachments" ||
    normalizedBucket === "attachments" ||
    normalizedBucket === "file-attachments" ||
    normalizedName.includes("chat-attachments/") ||
    normalizedName.includes("attachments/")
  ) {
    if (isImageMimeOrExtension(context.mimeType, context.extension)) {
      return {
        id: "pieces_jointes_photo",
        label: "Pièces jointes photo",
        signal: "mime",
        evidence: context.mimeType ?? context.extension,
      };
    }

    if (isDocumentMimeOrExtension(context.mimeType, context.extension)) {
      return {
        id: "pieces_jointes_document",
        label: "Pièces jointes document",
        signal: "mime",
        evidence: context.mimeType ?? context.extension,
      };
    }
  }

  for (const rule of STORAGE_BUSINESS_DOMAINS) {
    if (rule.id === "autres") {
      continue;
    }

    const match = scoreRule(rule, context);
    if (match) {
      return match;
    }
  }

  return {
    id: "autres",
    label: "Autres",
    signal: "keyword",
    evidence: input.bucketId,
  };
}

export function listStorageBusinessDomains(): StorageBusinessDomain[] {
  const byId = new Map(
    STORAGE_BUSINESS_DOMAINS.map(({ id, label, description }) => [
      id,
      { id, label, description },
    ] as const),
  );

  return STORAGE_BUSINESS_DOMAIN_DISPLAY_ORDER.map((domainId) => {
    const domain = byId.get(domainId);
    if (!domain) {
      throw new Error(`Missing storage business domain: ${domainId}`);
    }
    return domain;
  });
}
