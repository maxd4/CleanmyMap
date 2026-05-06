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

export const SUPPORT_EMAIL = "maxence.drm@gmail.com";
export const DEFAULT_SIGN_IN_HREF = "/sign-in";
export const DEFAULT_DASHBOARD_HREF = "/profil";

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
        { type: "support", label: "Contacter le support", href: `mailto:${SUPPORT_EMAIL}` },
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
