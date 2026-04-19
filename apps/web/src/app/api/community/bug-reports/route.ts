import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendCommunityBugReport } from "@/lib/community/bug-reports-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  reserveDiscussionMessageSlot,
  toDiscussionRateLimitErrorPayload,
} from "@/lib/community/discussion-rate-limit";

export const runtime = "nodejs";

const payloadSchema = z.object({
  reportType: z.enum(["bug", "idea"]),
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(3000),
  pagePath: z.string().trim().min(1).max(240).optional().nullable(),
});

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

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const quota = await reserveDiscussionMessageSlot(supabase, {
    userId,
    channel: "bug_report",
  });
  if (!quota.allowed) {
    return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), {
      status: 429,
    });
  }

  const created = await appendCommunityBugReport({
    submittedByUserId: userId,
    input: {
      reportType: parsed.data.reportType,
      title: parsed.data.title,
      description: parsed.data.description,
      pagePath: parsed.data.pagePath ?? null,
    },
  });

  return NextResponse.json(
    {
      status: "queued",
      requestId: created.id,
      item: created,
    },
    { status: 201 },
  );
}
