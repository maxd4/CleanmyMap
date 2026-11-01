import { z } from "zod";
import type { RouteRecommendationRequest } from "@/lib/route/route-response-contract";
import {
  MAX_ROUTE_GROUP_COUNT,
  MAX_ROUTE_VOLUNTEERS,
} from "@/lib/route/route-group-partition";
import {
  MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM,
  MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP,
  ROUTE_TERRITORIAL_GUIDED_VERSION,
} from "@/lib/route/route-planning-mode";
import { routeDistanceKm } from "@/lib/route/route-planner";

const routeCoordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

const guidedGroupSchema = z.object({
  sector: z.object({
    center: routeCoordinateSchema,
    radiusKm: z.number().finite().gt(0).max(MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM),
  }),
  waypoints: z.array(
    routeCoordinateSchema.extend({
      id: z.string().trim().min(1).max(80),
      label: z.string().trim().min(1).max(120),
    }),
  ).min(1).max(MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP),
});

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
        z.object({
          type: z.literal("territorial-guided"),
          version: z.literal(ROUTE_TERRITORIAL_GUIDED_VERSION),
          groups: z.array(guidedGroupSchema).min(1).max(MAX_ROUTE_GROUP_COUNT),
        }),
      ])
      .default({ type: "free" }),
    riskFocus: z.enum(["all", "waste", "cigaretteButts"]).default("all"),
    pickupPreference: z
      .enum(["balanced", "waste", "cigarette_butts"])
      .default("balanced"),
    volunteers: z.number().int().min(1).max(MAX_ROUTE_VOLUNTEERS).default(1),
    groupCount: z.number().int().min(1).max(MAX_ROUTE_GROUP_COUNT).default(1),
    scheduledStartAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use a local datetime without seconds.")
      .or(z.literal(""))
      .optional(),
    scheduledEndAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use a local datetime without seconds.")
      .or(z.literal(""))
      .optional(),
  })
  .strip()
  .superRefine((value, context) => {
    if (value.groupCount > value.volunteers) {
      context.addIssue({
        code: "custom",
        path: ["groupCount"],
        message: "groupCount cannot exceed volunteers",
      });
    }
    if (value.planningMode.type !== "territorial-guided") return;
    if (value.planningMode.groups.length !== value.groupCount) {
      context.addIssue({
        code: "custom",
        path: ["planningMode", "groups"],
        message: "territorial-guided groups must match groupCount",
      });
    }
    if (value.volunteers % value.groupCount !== 0) {
      context.addIssue({
        code: "custom",
        path: ["volunteers"],
        message: "territorial-guided groups require an equal volunteer split",
      });
    }
    const waypointIds = new Set<string>();
    value.planningMode.groups.forEach((group, groupIndex) => {
      group.waypoints.forEach((waypoint, waypointIndex) => {
        if (waypointIds.has(waypoint.id)) {
          context.addIssue({
            code: "custom",
            path: ["planningMode", "groups", groupIndex, "waypoints", waypointIndex, "id"],
            message: "guided waypoint ids must be unique",
          });
        }
        waypointIds.add(waypoint.id);
        if (routeDistanceKm(group.sector.center, waypoint) > group.sector.radiusKm) {
          context.addIssue({
            code: "custom",
            path: ["planningMode", "groups", groupIndex, "waypoints", waypointIndex],
            message: "guided waypoints must be inside their sector",
          });
        }
      });
    });
  }) satisfies z.ZodType<RouteRecommendationRequest>;

export const ROUTE_RECOMMENDATION_RATE_LIMIT = {
  limit: 6,
  window: 60,
} as const;

export type RouteRecommendationOptions = z.output<
  typeof routeRecommendationRequestSchema
>;

export function parseRouteRecommendationRequest(rawPayload: unknown) {
  return routeRecommendationRequestSchema.safeParse(rawPayload);
}

export function resolvePriorityVsTravel(
  options: RouteRecommendationOptions,
): number {
  return options.priorityVsTravel ?? options.priorityVsDistance ?? 65;
}
