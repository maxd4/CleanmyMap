import { z } from "zod";

export const createActionSchema = z.object({
  actorName: z.string().min(1).max(120).optional(),
  actionDate: z.string().date(),
  locationLabel: z.string().min(2).max(200),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  wasteKg: z.number().min(0).max(100000),
  cigaretteButts: z.number().int().min(0).max(5000000).default(0),
  volunteersCount: z.number().int().min(1).max(500).default(1),
  durationMinutes: z.number().int().min(0).max(24 * 60).default(0),
  notes: z.string().max(1000).optional(),
});

export type CreateActionInput = z.infer<typeof createActionSchema>;
