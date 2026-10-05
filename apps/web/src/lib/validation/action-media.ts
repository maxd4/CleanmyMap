import { z } from "zod";

export const photoAssetSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(80),
  size: z.number().int().min(0).max(25_000_000),
  width: z.number().int().min(0).max(20_000).nullable().optional(),
  height: z.number().int().min(0).max(20_000).nullable().optional(),
  dataUrl: z.string().min(8).max(10_000_000),
});
