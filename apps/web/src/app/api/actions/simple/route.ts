import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { photoUploadService } from "@/lib/photo-upload";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import {
  createPublicRateLimitResponse,
  hasHoneypotSignal,
  hasRecentSubmission,
  isIsoDateString,
} from "@/lib/security/validation";

type SimpleActionInsertRow = {
  action_date: string;
  location_label: string;
  waste_kg: number;
  volunteers_count: number;
  actor_name: string;
  notes: string;
  created_by_clerk_id: string;
  status: string;
};

type ActionsTableClient = {
  from(table: "actions"): {
    insert(values: SimpleActionInsertRow[]): {
      select(): {
        single(): Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
    update(values: { notes: string }): {
      eq(column: "id", value: string): Promise<{ error: unknown }>;
    };
  };
};

const payloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(3000).default(""),
  location: z.string().trim().min(1).max(240),
  date: z.string().trim().refine(isIsoDateString, "Date attendue au format YYYY-MM-DD"),
  participantCount: z.number().int().min(1),
  wasteAmount: z.number().min(0).default(0),
  photos: z.array(z.any()).max(10).default([]),
  organizerName: z.string().trim().min(1).max(200),
  organizerEmail: z.string().trim().email(),
  isPublic: z.boolean(),
  honeypot: z.string().optional().default(""),
  submittedAt: z.number().int().positive().optional(),
});

async function readRawPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const photos = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0)
      .slice(0, 10);

    return {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      location: String(formData.get("location") ?? ""),
      date: String(formData.get("date") ?? ""),
      participantCount: Number(formData.get("participantCount") ?? 0),
      wasteAmount: Number(formData.get("wasteAmount") ?? 0),
      photos,
      organizerName: String(formData.get("organizerName") ?? ""),
      organizerEmail: String(formData.get("organizerEmail") ?? ""),
      isPublic: String(formData.get("isPublic") ?? "true").toLowerCase() === "true",
      honeypot: String(formData.get("honeypot") ?? ""),
      submittedAt: Number(formData.get("submittedAt") ?? Date.now()),
    };
  }

  return await request.json();
}

export async function POST(request: Request) {
  try {
    let rawData: unknown;
    try {
      rawData = await readRawPayload(request);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }
    const parsed = payloadSchema.safeParse(rawData);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 },
      );
    }

    if (hasHoneypotSignal(parsed.data.honeypot)) {
      return createPublicRateLimitResponse("Impossible d'enregistrer l'action pour le moment.");
    }

    if (hasRecentSubmission(parsed.data.submittedAt)) {
      return createPublicRateLimitResponse("Impossible d'enregistrer l'action pour le moment.");
    }

    const rateLimit = await verifyRateLimit({
      limit: 3,
      window: 300,
      key: parsed.data.organizerEmail.toLowerCase(),
    });
    const rateLimitResponse = createServerRateLimitResponse(
      rateLimit.allowed,
      rateLimit.retryAfter,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = getSupabaseBrowserClient() as unknown as ActionsTableClient;

    const actionData: SimpleActionInsertRow = {
      action_date: parsed.data.date,
      location_label: parsed.data.location,
      waste_kg: parsed.data.wasteAmount || 0,
      volunteers_count: parsed.data.participantCount,
      actor_name: parsed.data.organizerName,
      notes: `${parsed.data.title}\n\n${parsed.data.description}\n\nContact: ${parsed.data.organizerEmail}\nPublic: ${parsed.data.isPublic}`,
      created_by_clerk_id: "anonymous",
      status: "pending",
    };

    const { data, error } = await supabase
      .from("actions")
      .insert([actionData])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Impossible de créer l'action" },
        { status: 500 },
      );
    }

    let photoUrls: string[] = [];
    let photoWarning: string | null = null;
    if (parsed.data.photos && parsed.data.photos.length > 0) {
      try {
        const uploadResults = await photoUploadService.uploadMultiplePhotos(
          parsed.data.photos,
          data.id,
        );

        const firstUploadError = uploadResults.find((result) => result.error)?.error ?? null;
        if (firstUploadError) {
          photoWarning = firstUploadError;
        }

        photoUrls = uploadResults
          .filter((result) => !result.error)
          .map((result) => result.url);

        if (photoUrls.length > 0) {
          await supabase
            .from("actions")
            .update({
              notes: `${actionData.notes}\n\nPhotos: ${photoUrls.join(", ")}`,
            })
            .eq("id", data.id);
        }
      } catch (photoError) {
        console.error("Photo upload error:", photoError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Action déclarée avec succès",
      id: data.id,
      photoCount: photoUrls.length,
      ...(photoWarning ? { photoWarning } : {}),
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
  }
}
