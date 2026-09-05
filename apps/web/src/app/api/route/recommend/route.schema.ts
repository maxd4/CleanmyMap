import { z } from "zod";
import type { RouteRecommendationRequest } from "@/lib/route/route-response-contract";
import type { RoutePlanningMode } from "@/lib/route/route-planning-mode";

export const routeRecommendationRequestSchema = z
  .object({
    origin: z
      .object({
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
        source: z.enum(["browser", "map"]),
      })
      .optional(),
    travelBudgetMinutes: z.number().finite().min(0).default(60),
    maxStops: z.number().int().min(1).max(12).default(6),
    priorityVsTravel: z.number().finite().min(0).max(100).optional(),
    priorityVsDistance: z.number().finite().min(0).max(100).optional(),
    planningMode: z
      .discriminatedUnion("type", [
        z.object({ type: z.literal("free") }),
        z.object({ type: z.literal("event-centered"), eventId: z.string().uuid() }),
      ])
      .default({ type: "free" }),
    riskFocus: z.enum(["all", "waste", "cigaretteButts"]).default("all"),
  })
  .strip() satisfies z.ZodType<RouteRecommendationRequest>;

export const ROUTE_RECOMMENDATION_RATE_LIMIT = {
  limit: 6,
  window: 60,
} as const;

export type RouteRecommendationOptions = z.output<
  typeof routeRecommendationRequestSchema
>;

export type { RoutePlanningMode };

export function parseRouteRecommendationRequest(rawPayload: unknown) {
  return routeRecommendationRequestSchema.safeParse(rawPayload);
}

export function resolvePriorityVsTravel(
  options: RouteRecommendationOptions,
): number {
  return options.priorityVsTravel ?? options.priorityVsDistance ?? 65;
}
