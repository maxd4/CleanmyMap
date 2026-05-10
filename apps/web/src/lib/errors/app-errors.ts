export type AppErrorKind = "validation" | "network" | "server" | "permission";

export type AppErrorSurface = "inline" | "toast" | "card" | "modal";

export type AppErrorActionType =
  | "fix-field"
  | "retry"
  | "refresh"
  | "reconnect"
  | "support"
  | "dashboard";

export type AppErrorAction = {
  type: AppErrorActionType;
  label: string;
  href?: string;
};

export type SupportIssueContext = {
  message?: string | null;
  code?: string | null;
  referenceCode?: string | null;
  pagePath?: string | null;
  timestamp?: string | Date | null;
  userId?: string | null;
  sessionId?: string | null;
  source?: string | null;
};

export type AppErrorOptions = {
  kind: AppErrorKind;
  message: string;
  title?: string;
  status?: number;
  code?: string;
  referenceCode?: string;
  retryable?: boolean;
  actions?: AppErrorAction[];
  details?: Record<string, unknown>;
  cause?: unknown;
  source?: string;
};

const SUPPORT_FORM_PATH = "/sections/feedback";
export const DEFAULT_SIGN_IN_HREF = "/sign-in";
export const DEFAULT_DASHBOARD_HREF = "/profil";

function sanitizeSupportValue(value: string, maxLength = 220): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatSupportTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function buildSupportIssuePrefill(context: SupportIssueContext = {}): {
  subject: string;
  context: string;
  steps: string;
  expected: string;
} {
  const pagePath = context.pagePath ? sanitizeSupportValue(context.pagePath, 180) : "";
  const message = context.message ? sanitizeSupportValue(context.message, 260) : "";
  const code = context.code ? sanitizeSupportValue(context.code, 100) : "";
  const referenceCode = context.referenceCode
    ? sanitizeSupportValue(context.referenceCode, 100)
    : "";
  const userId = context.userId ? sanitizeSupportValue(context.userId, 120) : "";
  const sessionId = context.sessionId ? sanitizeSupportValue(context.sessionId, 120) : "";
  const source = context.source ? sanitizeSupportValue(context.source, 120) : "";
  const timestamp =
    context.timestamp instanceof Date || typeof context.timestamp === "string"
      ? formatSupportTimestamp(context.timestamp)
      : "";

  const subject = pagePath
    ? `Erreur technique sur ${pagePath}`
    : "Erreur technique sur le site";

  const contextLines = [
    message ? `Message: ${message}` : null,
    code ? `Code: ${code}` : null,
    referenceCode ? `Référence: ${referenceCode}` : null,
    pagePath ? `Page: ${pagePath}` : null,
    userId ? `Identifiant utilisateur: ${userId}` : null,
    sessionId ? `Identifiant session: ${sessionId}` : null,
    timestamp ? `Date / heure: ${timestamp}` : null,
    source ? `Source: ${source}` : null,
  ].filter(Boolean) as string[];

  return {
    subject,
    context: contextLines.join("\n"),
    steps: [
      "1. Ouvrir la page indiquée ci-dessus.",
      "2. Reproduire l'action qui a déclenché le problème.",
      "3. Ajouter une capture ou un détail complémentaire si nécessaire.",
    ].join("\n"),
    expected: pagePath
      ? "La page devrait fonctionner normalement sans erreur technique."
      : "Le support devrait pouvoir reproduire et diagnostiquer le problème rapidement.",
  };
}

export function buildSupportHref(context: SupportIssueContext = {}): string {
  const prefill = buildSupportIssuePrefill(context);
  const hasMeaningfulContext =
    Boolean(context.message) ||
    Boolean(context.code) ||
    Boolean(context.referenceCode) ||
    Boolean(context.pagePath) ||
    Boolean(context.userId) ||
    Boolean(context.sessionId) ||
    Boolean(context.source) ||
    Boolean(context.timestamp);

  if (!hasMeaningfulContext) {
    return `${SUPPORT_FORM_PATH}#bug`;
  }

  const params = new URLSearchParams();
  params.set("subject", prefill.subject);
  params.set("context", prefill.context);
  params.set("steps", prefill.steps);
  params.set("expected", prefill.expected);
  params.set("source", context.source ?? "runtime_error");
  return `${SUPPORT_FORM_PATH}?${params.toString()}#bug`;
}

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly title: string | null;
  readonly status: number | null;
  readonly code: string | null;
  readonly referenceCode: string | null;
  readonly retryable: boolean;
  readonly actions: AppErrorAction[];
  readonly details: Record<string, unknown> | null;
  readonly source: string | null;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.kind = options.kind;
    this.title = options.title ?? null;
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.referenceCode = options.referenceCode ?? null;
    this.retryable =
      options.retryable ?? (options.kind === "network" || options.kind === "server");
    this.actions = options.actions ?? defaultActionsForKind(options.kind);
    this.details = options.details ?? null;
    this.source = options.source ?? null;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getRecommendedErrorSurface(kind: AppErrorKind): AppErrorSurface {
  switch (kind) {
    case "validation":
      return "inline";
    case "network":
      return "toast";
    case "permission":
      return "card";
    case "server":
    default:
      return "card";
  }
}

export function defaultTitleForKind(kind: AppErrorKind): string {
  switch (kind) {
    case "validation":
      return "Vérifiez les champs";
    case "network":
      return "Connexion perdue";
    case "permission":
      return "Accès refusé";
    case "server":
    default:
      return "Erreur technique";
  }
}

export function defaultMessageForKind(kind: AppErrorKind): string {
  switch (kind) {
    case "validation":
      return "Certaines informations doivent être corrigées avant de continuer.";
    case "network":
      return "Connexion perdue. Nouvelle tentative dans 5 secondes.";
    case "permission":
      return "Vous n'avez pas accès à cette page.";
    case "server":
    default:
      return "Une erreur est survenue de notre côté. Vous pouvez réessayer.";
  }
}

export function defaultActionsForKind(kind: AppErrorKind): AppErrorAction[] {
  switch (kind) {
    case "validation":
      return [{ type: "fix-field", label: "Corriger le champ" }];
    case "network":
      return [
        { type: "retry", label: "Réessayer maintenant" },
        { type: "refresh", label: "Rafraîchir" },
      ];
    case "permission":
      return [
        { type: "reconnect", label: "Se connecter", href: DEFAULT_SIGN_IN_HREF },
        { type: "dashboard", label: "Retour au tableau de bord", href: DEFAULT_DASHBOARD_HREF },
      ];
    case "server":
    default:
      return [
        { type: "retry", label: "Réessayer" },
        { type: "support", label: "Contacter le support", href: buildSupportHref() },
      ];
  }
}

export function normalizeErrorKindFromMessage(message: string): AppErrorKind {
  const lower = message.toLowerCase();

  if (
    lower.includes("validation") ||
    lower.includes("invalid") ||
    lower.includes("invalide") ||
    lower.includes("champ") ||
    lower.includes("required") ||
    lower.includes("doit")
  ) {
    return "validation";
  }

  if (
    lower.includes("permission") ||
    lower.includes("forbidden") ||
    lower.includes("access") ||
    lower.includes("autorisation") ||
    lower.includes("reconnect") ||
    lower.includes("connexion") ||
    lower.includes("session")
  ) {
    return "permission";
  }

  if (
    lower.includes("network") ||
    lower.includes("connexion") ||
    lower.includes("offline") ||
    lower.includes("timeout") ||
    lower.includes("fetch") ||
    lower.includes("reseau") ||
    lower.includes("réseau")
  ) {
    return "network";
  }

  return "server";
}

export function normalizeErrorOptions(
  error: unknown,
  fallback: Omit<AppErrorOptions, "actions" | "retryable"> & {
    actions?: AppErrorAction[];
    retryable?: boolean;
  },
): AppErrorOptions {
  if (isAppError(error)) {
    return {
      kind: error.kind,
      message: error.message,
      title: error.title ?? undefined,
      status: error.status ?? undefined,
      code: error.code ?? undefined,
      referenceCode: error.referenceCode ?? undefined,
      retryable: error.retryable,
      actions: error.actions,
      details: error.details ?? undefined,
      cause: error.cause,
      source: error.source ?? undefined,
    } as AppErrorOptions & { title?: string };
  }

  if (error instanceof Error) {
    return {
      ...fallback,
      kind: fallback.kind ?? normalizeErrorKindFromMessage(error.message),
      message: error.message.trim() || fallback.message,
      cause: error,
    };
  }

  const rawMessage = typeof error === "string" ? error : fallback.message;
  return {
    ...fallback,
    kind: fallback.kind ?? normalizeErrorKindFromMessage(rawMessage),
    message: rawMessage,
    cause: error,
  };
}

export function toAppError(
  error: unknown,
  fallback: Omit<AppErrorOptions, "actions" | "retryable"> & {
    actions?: AppErrorAction[];
    retryable?: boolean;
  },
): AppError {
  return new AppError(normalizeErrorOptions(error, fallback));
}

function parseResponsePayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload as Record<string, unknown>;
}

function messageFromPayload(payload: Record<string, unknown> | null): string | null {
  if (!payload) {
    return null;
  }
  const candidate = payload["error"] ?? payload["message"] ?? payload["hint"];
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}

function kindFromPayload(
  payload: Record<string, unknown> | null,
  status: number,
  fallback: AppErrorKind,
): AppErrorKind {
  const rawKind = payload?.["kind"];
  if (
    rawKind === "validation" ||
    rawKind === "network" ||
    rawKind === "server" ||
    rawKind === "permission"
  ) {
    return rawKind;
  }

  if (status === 400 || status === 422) {
    return "validation";
  }
  if (status === 401 || status === 403) {
    return "permission";
  }
  if (status >= 500) {
    return "server";
  }
  if (status === 429) {
    return "network";
  }
  return fallback;
}

export async function readAppErrorResponse(
  response: Response,
  fallbackMessage: string,
  fallbackKind: AppErrorKind = "server",
): Promise<AppError> {
  let payload: Record<string, unknown> | null = null;
  try {
    payload = parseResponsePayload(await response.json());
  } catch {
    payload = null;
  }

  const message =
    messageFromPayload(payload) ?? fallbackMessage;
  const kind = kindFromPayload(payload, response.status, fallbackKind);

  return new AppError({
    kind,
    message,
    status: response.status,
    code: (() => {
      const value = payload?.["code"];
      return typeof value === "string" && value.trim().length > 0 ? value : undefined;
    })(),
    referenceCode: (() => {
      const value = payload?.["referenceCode"];
      return typeof value === "string" && value.trim().length > 0 ? value : undefined;
    })(),
    retryable: kind === "network" || kind === "server",
    details: (() => {
      const value = payload?.["details"];
      return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : undefined;
    })(),
    cause: payload?.["cause"],
  });
}

export function appErrorMessageFromKind(kind: AppErrorKind, locale: "fr" | "en" = "fr"): string {
  if (locale === "en") {
    switch (kind) {
      case "validation":
        return "Some fields need to be corrected before you can continue.";
      case "network":
        return "Connection lost. Retrying in 5 seconds.";
      case "permission":
        return "You don't have access to this page.";
      case "server":
      default:
        return "A server-side problem occurred. Please try again.";
    }
  }

  return defaultMessageForKind(kind);
}
