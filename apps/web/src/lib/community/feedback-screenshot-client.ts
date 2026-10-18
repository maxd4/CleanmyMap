"use client";

import { compressImageFile, readImageDimensions } from "@/lib/media/image-compression";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildStorageBusinessMetadata } from "@/lib/supabase/storage-business-classification";
import {
  BUG_REPORT_SCREENSHOT_ALLOWED_MIME_TYPES,
  BUG_REPORT_SCREENSHOT_BUCKET,
  BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES,
} from "@/lib/community/bug-report-screenshot-contract";

export const FEEDBACK_SCREENSHOT_ACCEPT = BUG_REPORT_SCREENSHOT_ALLOWED_MIME_TYPES.join(",");

/** Return only a same-origin object URL created for this page's local preview. */
export function getSafeFeedbackScreenshotPreviewUrl(value: unknown): string | null {
  if (typeof value !== "string" || typeof window === "undefined") return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "blob:" && parsed.origin === window.location.origin ? value : null;
  } catch {
    return null;
  }
}

class FeedbackScreenshotUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackScreenshotUploadError";
  }
}

export function validateFeedbackScreenshotFile(file: File): string | null {
  if (!(BUG_REPORT_SCREENSHOT_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Sélectionnez une image JPEG, PNG ou WebP. Les vidéos ne sont pas prises en charge.";
  }
  if (file.size <= 0 || file.size > BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES) {
    return "La capture dépasse la taille autorisée de 5 Mo.";
  }
  return null;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    const message = body.error ?? body.message;
    return typeof message === "string" && message.trim() ? message : fallback;
  } catch {
    return fallback;
  }
}

async function cleanupFailedUpload(feedbackId: string, attemptId: string): Promise<void> {
  await fetch(`/api/community/bug-reports/${encodeURIComponent(feedbackId)}/screenshot`, {
    method: "DELETE",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId }),
  }).catch(() => undefined);
}

export async function uploadFeedbackScreenshot(
  feedbackId: string,
  file: File,
): Promise<void> {
  const initialValidationError = validateFeedbackScreenshotFile(file);
  if (initialValidationError) {
    throw new FeedbackScreenshotUploadError(initialValidationError);
  }

  const preparedFile = await compressImageFile(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
  });
  const preparedValidationError = validateFeedbackScreenshotFile(preparedFile);
  if (preparedValidationError) {
    throw new FeedbackScreenshotUploadError(preparedValidationError);
  }
  const dimensions = await readImageDimensions(preparedFile).catch(() => ({
    width: null,
    height: null,
  }));

  const intentResponse = await fetch(
    `/api/community/bug-reports/${encodeURIComponent(feedbackId)}/screenshot/intent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalName: preparedFile.name,
        mimeType: preparedFile.type,
        sizeBytes: preparedFile.size,
        width: dimensions.width,
        height: dimensions.height,
      }),
    },
  );
  if (!intentResponse.ok) {
    throw new FeedbackScreenshotUploadError(
      await readError(intentResponse, "La préparation de la capture a échoué."),
    );
  }
  const intentBody = (await intentResponse.json()) as {
    intent?: {
      feedbackId: string;
      attemptId: string;
      bucket: string;
      path: string;
      token: string;
      uploadState: "pending" | "ready";
    };
  };
  const intent = intentBody.intent;
  if (!intent) {
    if ((intentBody as { uploadState?: string }).uploadState === "ready") return;
    throw new FeedbackScreenshotUploadError("La réponse d'upload est incomplète.");
  }
  if (intent.uploadState === "ready") return;
  if (
    intent.bucket !== BUG_REPORT_SCREENSHOT_BUCKET ||
    intent.feedbackId !== feedbackId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(intent.attemptId)
  ) {
    throw new FeedbackScreenshotUploadError("La destination privée de la capture est invalide.");
  }

  try {
    const storage = getSupabaseBrowserClient();
    const upload = await storage.storage
      .from(BUG_REPORT_SCREENSHOT_BUCKET)
      .uploadToSignedUrl(intent.path, intent.token, preparedFile, {
        upsert: false,
        contentType: preparedFile.type,
        cacheControl: "3600",
        metadata: buildStorageBusinessMetadata({
          businessDomain: "pieces_jointes_photo",
          sourceTable: "community_bug_reports",
          businessContext: "feedback_screenshot",
          extra: { feedbackId },
        }),
      });
    if (upload.error) {
      throw new FeedbackScreenshotUploadError("La transmission de la capture a échoué.");
    }

    const finalizeResponse = await fetch(
      `/api/community/bug-reports/${encodeURIComponent(feedbackId)}/screenshot/finalize`,
      {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: intent.attemptId }),
      },
    );
    if (!finalizeResponse.ok) {
      throw new FeedbackScreenshotUploadError(
        await readError(finalizeResponse, "La vérification de la capture a échoué."),
      );
    }
  } catch (error) {
    await cleanupFailedUpload(feedbackId, intent.attemptId);
    if (error instanceof FeedbackScreenshotUploadError) throw error;
    throw new FeedbackScreenshotUploadError("La transmission de la capture a échoué.");
  }
}
