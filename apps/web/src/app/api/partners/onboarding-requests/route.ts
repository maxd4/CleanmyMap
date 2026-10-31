import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { z } from"zod";
import { requireCreatorAccess } from"@/lib/authz";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import {
 CONTRIBUTION_TYPES,
 ENGAGEMENT_TYPE_VALUES,
 formatAvailabilitySummary,
 formatCoverageSummary,
 formatPartnerScopeLabel,
 normalizePublicWebUrl,
 ORGANIZATION_TYPES,
 PARTNER_SCOPES,
 WEEKDAY_OPTIONS,
} from"@/lib/partners/onboarding-types";
import {
 appendPartnerOnboardingRequestWithResult,
 countPartnerOnboardingRequests,
 listPartnerOnboardingRequests,
 PartnerOnboardingIdempotencyConflictError,
} from"@/lib/partners/onboarding-requests-store";
import { getCurrentUserIdentity } from"@/lib/authz";
import { sendCreatorInboxEmail } from"@/lib/community/creator-inbox-email";
import { ensureEmailQuotaAvailable, sendEmail } from "@/lib/services/email";
import { withServerRateLimit } from"@/lib/rate-limit/server";
import { parsePositiveInteger } from"@/lib/reports/csv";
import {
 is24HourTimeString,
 parseJsonBodyWithSchema,
 rejectPublicFormAbuse,
} from"@/lib/security/validation";
import { escapeHtml } from "@/lib/security/html-escape";

export const runtime ="nodejs";

const IDEMPOTENCY_KEY_MIN_LENGTH = 16;
const IDEMPOTENCY_KEY_MAX_LENGTH = 160;

const WEEKDAY_VALUES = WEEKDAY_OPTIONS.map((option) => option.value) as [
 (typeof WEEKDAY_OPTIONS)[number]["value"],
 ...Array<(typeof WEEKDAY_OPTIONS)[number]["value"]>,
];

const timeSchema = z.string().trim().refine(is24HourTimeString, "Format attendu: HH:MM");

const slotSchema = z
 .object({
 day: z.enum(WEEKDAY_VALUES),
 start: timeSchema,
 end: timeSchema,
 })
 .refine((slot) => slot.start < slot.end, {
 message:"end must be after start",
 path: ["end"],
 });

const onboardingSchema = z.object({
 organizationName: z.string().trim().min(2).max(200),
 organizationType: z.enum(ORGANIZATION_TYPES),
 partnerScope: z.enum(PARTNER_SCOPES),
 legalIdentity: z.string().trim().min(5).max(300),
 coverage: z.object({
 arrondissements: z.array(z.number().int().min(1).max(20)).max(20).default([]),
 quartiers: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
 }),
 contributionTypes: z.array(z.enum(CONTRIBUTION_TYPES))
 .min(1)
 .max(5),
 engagementTypes: z.array(z.enum(ENGAGEMENT_TYPE_VALUES)).max(3).optional().default([]),
 relayActions: z.string().trim().max(800),
 availability: z.object({
 slots: z.array(slotSchema).min(1).max(10),
 note: z.string().trim().max(240).optional(),
 }),
 contactName: z.string().trim().min(2).max(120),
 contactChannel: z.string().trim().min(2).max(120),
 contactDetails: z.string().trim().min(3).max(240),
 motivation: z.string().trim().min(10).max(1200),
 publicWebsiteUrl: z.string().trim().max(2048).optional().default(""),
 publicWebsiteConsent: z.boolean().optional().default(false),
 honeypot: z.string().optional().default(""),
 submittedAt: z.number().int().positive().optional(),
}).superRefine((data, context) => {
 if (data.partnerScope === "local" && data.coverage.arrondissements.length === 0) {
 context.addIssue({
 code: z.ZodIssueCode.custom,
 message: "Sélectionne au moins un arrondissement pour un partenaire local.",
 path: ["coverage", "arrondissements"],
 });
 }
 const publicWebsiteUrl = data.publicWebsiteUrl.trim();
 if (publicWebsiteUrl && !data.publicWebsiteConsent) {
  context.addIssue({
   code: z.ZodIssueCode.custom,
   message: "Autorisez la publication du site web public pour continuer.",
   path: ["publicWebsiteConsent"],
  });
 }
 if (new Set(data.engagementTypes).size !== data.engagementTypes.length) {
  context.addIssue({
   code: z.ZodIssueCode.custom,
   message: "Chaque domaine d'engagement ne peut être sélectionné qu'une seule fois.",
   path: ["engagementTypes"],
  });
 }
 if (!publicWebsiteUrl && data.publicWebsiteConsent) {
  context.addIssue({
   code: z.ZodIssueCode.custom,
   message: "Renseignez un site web public avant d'autoriser sa publication.",
   path: ["publicWebsiteUrl"],
  });
 }
 if (publicWebsiteUrl && !normalizePublicWebUrl(publicWebsiteUrl)) {
  context.addIssue({
   code: z.ZodIssueCode.custom,
   message: "Le site web doit être une URL HTTP(S) publique valide.",
   path: ["publicWebsiteUrl"],
  });
 }
});

type OnboardingPayload = z.infer<typeof onboardingSchema>;

async function tryNotifyAdmins(
 payload: z.infer<typeof onboardingSchema>,
 actorUserId: string,
) {
const html = `
<h2>Nouvelle demande onboarding commercant engage</h2>
<p><strong>Organisation:</strong> ${escapeHtml(payload.organizationName)}</p>
<p><strong>Type:</strong> ${escapeHtml(payload.organizationType)}</p>
 <p><strong>Portée:</strong> ${escapeHtml(formatPartnerScopeLabel(payload.partnerScope))}</p>
<p><strong>Identité légale :</strong> ${escapeHtml(payload.legalIdentity)}</p>
 <p><strong>Zone:</strong> ${escapeHtml(payload.partnerScope === "local" ? formatCoverageSummary(payload.coverage) : formatPartnerScopeLabel(payload.partnerScope))}</p>
<p><strong>Contributions:</strong> ${escapeHtml(payload.contributionTypes.join(","))}</p>
<p><strong>Domaines déclarés:</strong> ${escapeHtml(payload.engagementTypes.length > 0 ? payload.engagementTypes.join(",") : "Aucun")}</p>
 <p><strong>Actions de relais:</strong> ${escapeHtml(payload.relayActions)}</p>
<p><strong>Disponibilité :</strong> ${escapeHtml(formatAvailabilitySummary(payload.availability))}</p>
<p><strong>Contact:</strong> ${escapeHtml(`${payload.contactName} - ${payload.contactChannel} (${payload.contactDetails})`)}</p>
<p><strong>Site web public proposé:</strong> ${escapeHtml(payload.publicWebsiteUrl || "Aucun")}</p>
<p><strong>Autorisation de publication:</strong> ${payload.publicWebsiteConsent ? "Oui" : "Non"}</p>
<p><strong>Motivation:</strong> ${escapeHtml(payload.motivation)}</p>
 `;

 await sendEmail({
  to: "partenaires@cleanmymap.fr",
  subject: `[CleanMyMap] Demande onboarding partenaire - ${payload.organizationName}`,
  html,
  actorUserId,
 });
}

export async function GET(request: Request) {
 const access = await requireCreatorAccess();
 if (!access.ok) {
 return NextResponse.json({ error: "Forbidden" }, { status: access.status });
 }

 const url = new URL(request.url);
 const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 200, 50);
 const items = await listPartnerOnboardingRequests(limit);
 const totalCount = await countPartnerOnboardingRequests();
 return NextResponse.json({
 status:"ok",
 count: items.length,
 totalCount,
 items,
 });
}

function resolveIdempotencyKey(
  request: Request,
  userId: string,
  submittedAt: number | undefined,
): string | Response {
  const headerKey = request.headers.get("Idempotency-Key")?.trim();
  if (headerKey && (headerKey.length < IDEMPOTENCY_KEY_MIN_LENGTH || headerKey.length > IDEMPOTENCY_KEY_MAX_LENGTH)) {
    return NextResponse.json({ error: "invalid_idempotency_key", message: "La clé d'idempotence doit contenir entre 16 et 160 caractères." }, { status: 422 });
  }
  const key = headerKey || (typeof submittedAt === "number" ? `${userId}:${submittedAt}` : null);
  return key ?? NextResponse.json({ error: "missing_idempotency_key", message: "Une clé stable est requise pour enregistrer la demande." }, { status: 422 });
}

function buildPersistedOnboardingInput(data: OnboardingPayload) {
  return {
    organizationName: data.organizationName,
    organizationType: data.organizationType,
    partnerScope: data.partnerScope,
    legalIdentity: data.legalIdentity,
    coverage: data.coverage,
    contributionTypes: data.contributionTypes,
    engagementTypes: data.engagementTypes,
    relayActions: data.relayActions,
    availability: data.availability,
    contactName: data.contactName,
    contactChannel: data.contactChannel,
    contactDetails: data.contactDetails,
    motivation: data.motivation,
    publicWebsiteUrl: normalizePublicWebUrl(data.publicWebsiteUrl) ?? undefined,
    publicWebsiteConsent: data.publicWebsiteConsent,
  };
}

async function appendOnboardingRequest(params: {
  userId: string;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  data: OnboardingPayload;
  idempotencyKey: string;
}) {
  try {
    return await appendPartnerOnboardingRequestWithResult({
      submittedByUserId: params.userId,
      submittedByEmail: params.identity?.email ?? null,
      input: buildPersistedOnboardingInput(params.data),
      idempotencyKey: params.idempotencyKey,
    });
  } catch (error) {
    if (error instanceof PartnerOnboardingIdempotencyConflictError) {
      return NextResponse.json({ error: "idempotency_conflict", message: "Cette clé a déjà été utilisée pour une demande différente." }, { status: 409 });
    }
    throw error;
  }
}

async function notifyNewOnboarding(data: OnboardingPayload, userId: string, status: string): Promise<void> {
  await ensureEmailQuotaAvailable(userId, 2);
  await tryNotifyAdmins(data, userId);
  await sendCreatorInboxEmail({
    actorUserId: userId,
    subject: `[CleanMyMap] Nouvelle demande partenaire - ${data.organizationName}`,
    title: "Nouvelle demande partenaire",
    intro: "Une demande d'onboarding partenaire vient d'arriver dans la file créateur.",
    lines: [
      { label: "Organisation", value: data.organizationName },
      { label: "Type", value: data.organizationType },
      { label: "Portée", value: formatPartnerScopeLabel(data.partnerScope) },
      { label: "Identité", value: data.legalIdentity },
      { label: "Source", value: "Formulaire partenaires" },
      { label: "Zone", value: data.partnerScope === "local" ? formatCoverageSummary(data.coverage) : formatPartnerScopeLabel(data.partnerScope) },
      { label: "Contributions", value: data.contributionTypes.join(", ") },
      { label: "Domaines déclarés", value: data.engagementTypes.length > 0 ? data.engagementTypes.join(", ") : "Aucun" },
      { label: "Actions de relais", value: data.relayActions },
      { label: "Disponibilité", value: formatAvailabilitySummary(data.availability) },
      { label: "Contact", value: `${data.contactName} - ${data.contactChannel} (${data.contactDetails})` },
      { label: "Motivation", value: data.motivation },
      { label: "Statut", value: status },
    ],
    footer: "La demande est synchronisée avec la revue annuaire partenaire.",
    extraRecipients: ["partenaires@cleanmymap.fr"],
  });
}

async function handlePartnerOnboardingPost(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  const identity = await getCurrentUserIdentity();
  const parsed = await parseJsonBodyWithSchema(request, onboardingSchema);
  if (!parsed.ok) return parsed.response;
  const abuseResponse = rejectPublicFormAbuse(parsed.data);
  if (abuseResponse) return abuseResponse;
  const idempotencyKey = resolveIdempotencyKey(request, userId, parsed.data.submittedAt);
  if (idempotencyKey instanceof Response) return idempotencyKey;
  const appendResult = await appendOnboardingRequest({ userId, identity, data: parsed.data, idempotencyKey });
  if (appendResult instanceof Response) return appendResult;
  if (!appendResult.replayed) {
    try {
      await notifyNewOnboarding(parsed.data, userId, appendResult.record.status);
    } catch (error) {
      console.warn("Partner onboarding admin notification failed", error);
    }
  }
  return NextResponse.json({ status: "queued", replayed: appendResult.replayed, requestId: appendResult.record.id, item: appendResult.record }, { status: appendResult.replayed ? 200 : 201 });
}

export async function POST(request: Request) {
 return withServerRateLimit(request, { limit: 3, window: 300 }, () => handlePartnerOnboardingPost(request));
}
