import { z } from "zod";

export const mediaUploadIntentSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().max(10000).nullable().optional(),
  height: z.number().int().positive().max(10000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(2).optional(),
  clientUploadId: z.string().trim().min(1).max(128),
});
