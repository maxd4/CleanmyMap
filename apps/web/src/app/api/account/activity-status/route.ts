import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";

const activityStatusRequestSchema = z
  .object({
    activityStatus: z.enum(["active", "inactive"]),
  })
  .strict();

export async function PATCH(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const parsed = activityStatusRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Le statut d’activité doit être actif ou inactif." },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const currentUser = await client.users.getUser(access.userId);
  const currentUnsafeMetadata =
    currentUser.unsafeMetadata as Record<string, unknown>;
  const updatedUser = await client.users.updateUser(access.userId, {
    unsafeMetadata: {
      ...currentUnsafeMetadata,
      activity_status: parsed.data.activityStatus,
    },
  });

  return NextResponse.json({
    activityStatus:
      updatedUser.unsafeMetadata?.["activity_status"] === "inactive"
        ? "inactive"
        : "active",
  });
}
