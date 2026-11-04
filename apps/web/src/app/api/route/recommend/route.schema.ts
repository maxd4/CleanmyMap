import { z } from "zod";
import type { RouteRecommendationRequest } from "@/lib/route/route-response-contract";
import {
  MAX_ROUTE_GROUP_COUNT,
  MAX_ROUTE_VOLUNTEERS,
} from "@/lib/route/route-group-partition";
import {
  MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES,
  MAX_ROUTE_GUIDED_GROUP_LABEL_LENGTH,
  MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM,
  MAX_ROUTE_GUIDED_WAYPOINT_ID_LENGTH,
  MAX_ROUTE_GUIDED_WAYPOINT_LABEL_LENGTH,
  MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP,
  ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
  ROUTE_TERRITORIAL_GUIDED_VERSION,
} from "@/lib/route/route-planning-mode";
import { routeDistanceKm } from "@/lib/route/route-planner";

const routeCoordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

const routeEndpointSchema = routeCoordinateSchema.extend({
  source: z.enum(["browser", "map", "address", "gps"]),
});

const routeStartZoneSchema = z.object({
  label: z.string().trim().min(1).max(160),
  center: routeCoordinateSchema,
  radiusKm: z.number().finite().gt(0).max(25),
  bounds: z.object({
    south: z.number().finite().min(-90).max(90),
    west: z.number().finite().min(-180).max(180),
    north: z.number().finite().min(-90).max(90),
    east: z.number().finite().min(-180).max(180),
  }),
  provenance: z.enum(["geocoded", "bounded-search", "user-adjusted"]),
  source: z.enum(["geoplateforme", "local-territory", "user"]),
  confirmed: z.literal(true),
});

const routeStartSelectionSchema = z.union([
  z.object({
    mode: z.literal("precise"),
    label: z.string().trim().min(1).max(160),
    origin: routeEndpointSchema,
  }),
  z.object({
    mode: z.literal("zone"),
    label: z.string().trim().min(1).max(160),
    zone: routeStartZoneSchema,
  }),
]);

const guidedGroupSchema = z.object({
  label: z.string().trim().min(1).max(MAX_ROUTE_GUIDED_GROUP_LABEL_LENGTH).optional(),
  volunteerCount: z.number().int().min(1).max(MAX_ROUTE_VOLUNTEERS).optional(),
  sector: z.object({
    center: routeCoordinateSchema,
    radiusKm: z.number().finite().gt(0).max(MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM),
  }),
  waypoints: z.array(
    routeCoordinateSchema.extend({
      id: z.string().trim().min(1).max(MAX_ROUTE_GUIDED_WAYPOINT_ID_LENGTH),
      label: z.string().trim().min(1).max(MAX_ROUTE_GUIDED_WAYPOINT_LABEL_LENGTH),
    }),
  ).min(1).max(MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP),
});

const guidedBudgetSchema = z.object({
  totalMinutes: z.number().finite().gt(0).max(MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES),
  organizationMarginMinutes: z.number().finite().nonnegative(),
  minimumCollectionMinutes: z.number().finite().gt(0),
  travelMaxMinutes: z.number().finite().gt(0),
});

export const routeRecommendationRequestSchema = z
  .object({
    searchMode: z.enum(["standard", "nearest_relevant"]).default("standard"),
    origin: routeEndpointSchema.optional(),
    startLocation: routeStartSelectionSchema.optional(),
    arrival: routeEndpointSchema.optional(),
    routeTopology: z.enum(["loop", "open"]).default("loop"),
    travelBudgetMinutes: z.number().finite().min(0).default(60),
    maxStops: z.number().int().min(1).max(12).default(6),
    priorityVsTravel: z.number().finite().min(0).max(100).optional(),
    priorityVsDistance: z.number().finite().min(0).max(100).optional(),
    planningMode: z
      .union([
        z.object({ type: z.literal("free") }),
        z.object({ type: z.literal("event-centered"), eventId: z.string().uuid() }),
        z.object({
          type: z.literal("territorial-guided"),
          version: z.literal(ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION),
          groups: z.array(guidedGroupSchema).min(1).max(MAX_ROUTE_GROUP_COUNT),
        }),
        z.object({
          type: z.literal("territorial-guided"),
          version: z.literal(ROUTE_TERRITORIAL_GUIDED_VERSION),
          groups: z.array(guidedGroupSchema).min(1).max(MAX_ROUTE_GROUP_COUNT),
          budget: guidedBudgetSchema,
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
    if (value.startLocation?.mode === "zone") {
      const { center, bounds } = value.startLocation.zone;
      if (center.latitude < bounds.south || center.latitude > bounds.north ||
        center.longitude < bounds.west || center.longitude > bounds.east) {
        context.addIssue({
          code: "custom",
          path: ["startLocation", "zone", "center"],
          message: "The confirmed zone center must be inside its bounds",
        });
      }
    }
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
    const guidedGroups = value.planningMode.groups;
    const hasExplicitVolunteerCounts = guidedGroups.some(
      ({ volunteerCount }) => volunteerCount !== undefined,
    );
    if (hasExplicitVolunteerCounts && guidedGroups.some(
      ({ volunteerCount }) => volunteerCount === undefined,
    )) {
      context.addIssue({
        code: "custom",
        path: ["planningMode", "groups"],
        message: "guided groups must either all declare volunteerCount or none",
      });
    }
    const guidedVolunteerCount = guidedGroups.reduce(
      (total, group) => total + (group.volunteerCount ?? 0),
      0,
    );
    if ((hasExplicitVolunteerCounts && guidedVolunteerCount !== value.volunteers) ||
      (!hasExplicitVolunteerCounts && value.volunteers % value.groupCount !== 0)) {
      context.addIssue({
        code: "custom",
        path: ["volunteers"],
        message: hasExplicitVolunteerCounts
          ? "guided group volunteer counts must match volunteers"
          : "territorial-guided groups require an equal volunteer split",
      });
    }
    if (value.planningMode.version === ROUTE_TERRITORIAL_GUIDED_VERSION) {
      const { budget } = value.planningMode;
      const allocatedMinutes = budget.organizationMarginMinutes +
        budget.travelMaxMinutes + budget.minimumCollectionMinutes;
      if (Math.abs(allocatedMinutes - budget.totalMinutes) >
        Number.EPSILON * Math.max(1, Math.abs(budget.totalMinutes))) {
        context.addIssue({
          code: "custom",
          path: ["planningMode", "budget"],
          message: "guided budget must equal organization + travel + collection",
        });
      }
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
