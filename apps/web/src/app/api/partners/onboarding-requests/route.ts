import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { z } from"zod";
import { requireCreatorAccess } from"@/lib/authz";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import {
 CONTRIBUTION_TYPES,
 formatAvailabilitySummary,
 formatCoverageSummary,
 formatPartnerScopeLabel,
 ORGANIZATION_TYPES,
 PARTNER_SCOPES,
 WEEKDAY_OPTIONS,
} from"@/lib/partners/onboarding-types";
import {
 appendPartnerOnboardingRequest,
 countPartnerOnboardingRequests,
 listPartnerOnboardingRequests,
} from"@/lib/partners/onboarding-requests-store";
import { getCurrentUserIdentity } from"@/lib/authz";
import { sendCreatorInboxEmail } from"@/lib/community/creator-inbox-email";
import { resolveContactEmail, resolveEmailFrom } from "@/lib/email-config";
import { getResendClient } from"@/lib/services/resend";
import { createServerRateLimitResponse, verifyRateLimit } from"@/lib/rate-limit/server";
import {
  createPublicRateLimitResponse,
  hasHoneypotSignal,
  hasRecentSubmission,
  is24HourTimeString,
} from"@/lib/security/validation";

export const runtime ="nodejs";

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
 relayActions: z.string().trim().max(800),
 availability: z.object({
 slots: z.array(slotSchema).min(1).max(10),
 note: z.string().trim().max(240).optional(),
 }),
 contactName: z.string().trim().min(2).max(120),
 contactChannel: z.string().trim().min(2).max(120),
 contactDetails: z.string().trim().min(3).max(240),
 motivation: z.string().trim().min(10).max(1200),
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
});

async function tryNotifyAdmins(payload: z.infer<typeof onboardingSchema>) {
 const resend = getResendClient();
 const from = resolveEmailFrom();
 if (!resend || !from) {
 return;
 }

 const to ="partenaires@cleanmymap.fr";
 const replyTo = resolveContactEmail();
const html = `
<h2>Nouvelle demande onboarding commercant engage</h2>
<p><strong>Organisation:</strong> ${payload.organizationName}</p>
<p><strong>Type:</strong> ${payload.organizationType}</p>
 <p><strong>Portée:</strong> ${formatPartnerScopeLabel(payload.partnerScope)}</p>
<p><strong>Identité légale :</strong> ${payload.legalIdentity}</p>
 <p><strong>Zone:</strong> ${payload.partnerScope === "local" ? formatCoverageSummary(payload.coverage) : formatPartnerScopeLabel(payload.partnerScope)}</p>
<p><strong>Contributions:</strong> ${payload.contributionTypes.join(",")}</p>
 <p><strong>Actions de relais:</strong> ${payload.relayActions}</p>
<p><strong>Disponibilité :</strong> ${formatAvailabilitySummary(payload.availability)}</p>
<p><strong>Contact:</strong> ${payload.contactName} - ${payload.contactChannel} (${payload.contactDetails})</p>
<p><strong>Motivation:</strong> ${payload.motivation}</p>
 `;

 await resend.emails.send({
 from,
 to,
 subject: `[CleanMyMap] Demande onboarding partenaire - ${payload.organizationName}`,
 html,
 replyTo,
 });
}

export async function GET(request: Request) {
 const access = await requireCreatorAccess();
 if (!access.ok) {
 return NextResponse.json({ error: "Forbidden" }, { status: access.status });
 }

 const url = new URL(request.url);
 const rawLimit = Number(url.searchParams.get("limit") ??"50");
 const limit = Number.isFinite(rawLimit) ? rawLimit : 50;
 const items = await listPartnerOnboardingRequests(limit);
 const totalCount = await countPartnerOnboardingRequests();
 return NextResponse.json({
 status:"ok",
 count: items.length,
 totalCount,
 items,
 });
}

export async function POST(request: Request) {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }
 const identity = await getCurrentUserIdentity();

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json({ error:"Invalid JSON payload" }, { status: 400 });
 }

 const parsed = onboardingSchema.safeParse(payload);
 if (!parsed.success) {
 return NextResponse.json(
 {
 error:"Invalid payload",
 details: parsed.error.flatten().fieldErrors,
    },
    { status: 400 },
   );
 }

  if (hasHoneypotSignal(parsed.data.honeypot)) {
    return createPublicRateLimitResponse("Impossible d'envoyer la demande pour le moment.");
  }

  if (hasRecentSubmission(parsed.data.submittedAt)) {
    return createPublicRateLimitResponse("Impossible d'envoyer la demande pour le moment.");
  }

  const writeRateLimit = await verifyRateLimit({ limit: 3, window: 300, key: userId });
  const writeRateLimitResponse = createServerRateLimitResponse(
    writeRateLimit.allowed,
    writeRateLimit.retryAfter,
  );
  if (writeRateLimitResponse) {
    return writeRateLimitResponse;
  }

 const created = await appendPartnerOnboardingRequest({
  submittedByUserId: userId,
  submittedByEmail: identity?.email ?? null,
  input: parsed.data,
 });

 try {
  await tryNotifyAdmins(parsed.data);
  await sendCreatorInboxEmail({
   actorUserId: userId,
   subject: `[CleanMyMap] Nouvelle demande partenaire - ${parsed.data.organizationName}`,
   title: "Nouvelle demande partenaire",
   intro: "Une demande d'onboarding partenaire vient d'arriver dans la file créateur.",
  lines: [
    { label: "Organisation", value: parsed.data.organizationName },
    { label: "Type", value: parsed.data.organizationType },
    { label: "Portée", value: formatPartnerScopeLabel(parsed.data.partnerScope) },
    { label: "Identité", value: parsed.data.legalIdentity },
    { label: "Source", value: "Formulaire partenaires" },
    { label: "Zone", value: parsed.data.partnerScope === "local" ? formatCoverageSummary(parsed.data.coverage) : formatPartnerScopeLabel(parsed.data.partnerScope) },
    { label: "Contributions", value: parsed.data.contributionTypes.join(", ") },
    { label: "Actions de relais", value: parsed.data.relayActions },
    { label: "Disponibilité", value: formatAvailabilitySummary(parsed.data.availability) },
    { label: "Contact", value: `${parsed.data.contactName} - ${parsed.data.contactChannel} (${parsed.data.contactDetails})` },
    { label: "Motivation", value: parsed.data.motivation },
    { label: "Statut", value: created.status },
   ],
   footer: "La demande est synchronisée avec la revue annuaire partenaire.",
   extraRecipients: ["partenaires@cleanmymap.fr"],
  });
 } catch (error) {
  console.warn("Partner onboarding admin notification failed", error);
 }

 return NextResponse.json(
 { status:"queued", requestId: created.id, item: created },
 { status: 201 },
 );
}
