import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  appendPartnerOnboardingRequest,
  countPartnerOnboardingRequests,
  listPartnerOnboardingRequests,
} from "@/lib/partners/onboarding-requests-store";
import { getResendClient } from "@/lib/services/resend";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  organizationType: z.enum(["association", "commerce", "entreprise", "collectif"]),
  legalIdentity: z.string().trim().min(5).max(300),
  coverage: z.string().trim().min(2).max(200),
  contributionTypes: z
    .array(
      z.enum([
        "materiel",
        "logistique",
        "accueil",
        "financement",
        "communication",
      ]),
    )
    .min(1)
    .max(5),
  availability: z.string().trim().min(2).max(200),
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
  const html = `
    <h2>Nouvelle demande onboarding commercant engage</h2>
    <p><strong>Organisation:</strong> ${payload.organizationName}</p>
    <p><strong>Type:</strong> ${payload.organizationType}</p>
    <p><strong>Identite legale:</strong> ${payload.legalIdentity}</p>
    <p><strong>Zone:</strong> ${payload.coverage}</p>
    <p><strong>Contributions:</strong> ${payload.contributionTypes.join(", ")}</p>
    <p><strong>Disponibilite:</strong> ${payload.availability}</p>
    <p><strong>Contact:</strong> ${payload.contactName} - ${payload.contactChannel} (${payload.contactDetails})</p>
    <p><strong>Motivation:</strong> ${payload.motivation}</p>
  `;

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `[CleanMyMap] Demande onboarding partenaire - ${payload.organizationName}`,
    html,
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
