import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  CONTRIBUTION_TYPES,
  formatAvailabilitySummary,
  formatCoverageSummary,
  ORGANIZATION_TYPES,
  WEEKDAY_OPTIONS,
} from "@/lib/partners/onboarding-types";
import {
  appendPartnerOnboardingRequest,
  countPartnerOnboardingRequests,
  listPartnerOnboardingRequests,
} from "@/lib/partners/onboarding-requests-store";
import { getResendClient } from "@/lib/services/resend";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const WEEKDAY_VALUES = WEEKDAY_OPTIONS.map((option) => option.value) as [
  (typeof WEEKDAY_OPTIONS)[number]["value"],
  ...Array<(typeof WEEKDAY_OPTIONS)[number]["value"]>,
];

const timeSchema = z.string().trim().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

const slotSchema = z
  .object({
    day: z.enum(WEEKDAY_VALUES),
    start: timeSchema,
    end: timeSchema,
  })
  .refine((slot) => slot.start < slot.end, {
    message: "end must be after start",
    path: ["end"],
  });

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  organizationType: z.enum(ORGANIZATION_TYPES),
  legalIdentity: z.string().trim().min(5).max(300),
  coverage: z.object({
    arrondissements: z.array(z.number().int().min(1).max(20)).min(1).max(20),
    quartiers: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  }),
  contributionTypes: z.array(z.enum(CONTRIBUTION_TYPES))
    .min(1)
    .max(5),
  availability: z.object({
    slots: z.array(slotSchema).min(1).max(10),
    note: z.string().trim().max(240).optional(),
  }),
  contactName: z.string().trim().min(2).max(120),
  contactChannel: z.string().trim().min(2).max(120),
  contactDetails: z.string().trim().min(3).max(240),
  motivation: z.string().trim().min(10).max(1200),
});

async function tryNotifyAdmins(payload: z.infer<typeof onboardingSchema>) {
  const resend = getResendClient();
  if (!resend || !env.RESEND_FROM_EMAIL) {
    return;
  }

  const to = "partenaires@cleanmymap.fr";
  const replyTo = env.RESEND_REPLY_TO || env.RESEND_FROM_EMAIL;
  const html = `
    <h2>Nouvelle demande onboarding commercant engage</h2>
    <p><strong>Organisation:</strong> ${payload.organizationName}</p>
    <p><strong>Type:</strong> ${payload.organizationType}</p>
    <p><strong>Identité légale :</strong> ${payload.legalIdentity}</p>
    <p><strong>Zone:</strong> ${formatCoverageSummary(payload.coverage)}</p>
    <p><strong>Contributions:</strong> ${payload.contributionTypes.join(", ")}</p>
    <p><strong>Disponibilité :</strong> ${formatAvailabilitySummary(payload.availability)}</p>
    <p><strong>Contact:</strong> ${payload.contactName} - ${payload.contactChannel} (${payload.contactDetails})</p>
    <p><strong>Motivation:</strong> ${payload.motivation}</p>
  `;

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `[CleanMyMap] Demande onboarding partenaire - ${payload.organizationName}`,
    html,
    replyTo,
  });
}

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(rawLimit) ? rawLimit : 50;
  const items = await listPartnerOnboardingRequests(limit);
  const totalCount = await countPartnerOnboardingRequests();
  return NextResponse.json({
    status: "ok",
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const created = await appendPartnerOnboardingRequest({
    submittedByUserId: userId,
    input: parsed.data,
  });

  try {
    await tryNotifyAdmins(parsed.data);
  } catch (error) {
    console.warn("Partner onboarding admin notification failed", error);
  }

  return NextResponse.json(
    { status: "queued", requestId: created.id, item: created },
    { status: 201 },
  );
}
