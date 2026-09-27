import { z } from "zod";
import type { ResolvedActionTerritory } from "@/lib/geo/action-territory-resolver";
import type {
  ActionFormalitiesFacts,
  FormalitiesTerritory,
} from "./formalities-qualification";

export const actionFormalitiesFactsSchema = z
  .object({
    territory: z
      .object({
        countryCode: z.literal("FR"),
        code: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(120),
        commune: z
          .object({ codeInsee: z.string().trim().min(1).max(20), label: z.string().trim().min(1).max(120) })
          .nullable()
          .optional(),
        department: z
          .object({ code: z.string().trim().min(1).max(20), label: z.string().trim().min(1).max(120) })
          .nullable()
          .optional(),
        region: z
          .object({ code: z.string().trim().min(1).max(20), label: z.string().trim().min(1).max(120) })
          .nullable()
          .optional(),
        specialTerritory: z
          .object({ code: z.string().trim().min(1).max(40), label: z.string().trim().min(1).max(120) })
          .nullable()
          .optional(),
      })
      .strict(),
    publicSpace: z.enum(["public_domain", "private_domain", "unknown"]),
    manager: z
      .object({
        kind: z.enum([
          "paris_city",
          "state",
          "sncf",
          "haropa",
          "other_public",
          "private",
          "unknown",
        ]),
        label: z.string().trim().max(200).nullable(),
      })
      .strict(),
    isCleanwalk: z.boolean(),
    isPublicRoadwayActivity: z.union([z.boolean(), z.literal("unknown")]),
    isItinerant: z.union([z.boolean(), z.literal("unknown")]),
    isClaiming: z.union([z.boolean(), z.literal("unknown")]),
    hasInstallations: z.union([z.boolean(), z.literal("unknown")]),
    requiresPhysicalOccupation: z.union([z.boolean(), z.literal("unknown")]),
    localCustomaryUse: z.union([z.boolean(), z.literal("unknown")]),
    largeCrowdOrComplexInstallations: z.union([
      z.boolean(),
      z.literal("unknown"),
    ]),
  })
  .strict();

export type FormalitiesFactsSnapshot = Pick<
  ActionFormalitiesFacts,
  | "territory"
  | "publicSpace"
  | "manager"
  | "isCleanwalk"
  | "isPublicRoadwayActivity"
  | "isItinerant"
  | "isClaiming"
  | "hasInstallations"
  | "requiresPhysicalOccupation"
  | "localCustomaryUse"
  | "largeCrowdOrComplexInstallations"
>;

function buildCommuneTerritoryPart(
  resolved: ResolvedActionTerritory | null | undefined,
): FormalitiesTerritory["commune"] {
  return resolved?.commune
    ? { codeInsee: resolved.commune.code, label: resolved.commune.name }
    : null;
}

function buildDepartmentTerritoryPart(
  code: string,
  name: string,
): FormalitiesTerritory["department"] {
  return code ? { code, label: name || code } : null;
}

function buildRegionTerritoryPart(
  resolved: ResolvedActionTerritory | null | undefined,
): FormalitiesTerritory["region"] {
  return resolved?.region
    ? { code: resolved.region.code, label: resolved.region.name }
    : null;
}

function buildSpecialTerritoryPart(
  resolved: ResolvedActionTerritory | null | undefined,
  isParis: boolean,
): FormalitiesTerritory["specialTerritory"] {
  if (isParis) {
    return {
      code: resolved?.specialTerritory?.code ?? "FR-PARIS",
      label: resolved?.specialTerritory?.name ?? "Paris",
    };
  }
  return resolved?.specialTerritory
    ? { code: resolved.specialTerritory.code, label: resolved.specialTerritory.name }
    : null;
}

function buildTerritoryLabel(
  resolved: ResolvedActionTerritory | null | undefined,
  departmentName: string,
  isParis: boolean,
): string {
  if (isParis) {
    return "Paris (75)";
  }
  return (resolved?.commune?.name ?? departmentName) || "Territoire à préciser";
}

function resolveDepartment(params: {
  departmentCode?: string | null;
  departmentName?: string | null;
  resolvedTerritory?: ResolvedActionTerritory | null;
}): { code: string; name: string } {
  return {
    code: params.resolvedTerritory?.department?.code ?? params.departmentCode?.trim() ?? "",
    name: params.resolvedTerritory?.department?.name ?? params.departmentName?.trim() ?? "",
  };
}

function isParisTerritory(
  resolved: ResolvedActionTerritory | null | undefined,
  departmentCode: string,
): boolean {
  return resolved?.specialTerritory?.code === "FR-PARIS" || departmentCode === "75";
}

function buildTerritoryCode(departmentCode: string, isParis: boolean): string {
  if (isParis) {
    return "FR-75";
  }
  return departmentCode ? `FR-${departmentCode}` : "FR-unknown";
}

function buildFormalitiesTerritory(params: {
  departmentCode?: string | null;
  departmentName?: string | null;
  resolvedTerritory?: ResolvedActionTerritory | null;
}): FormalitiesTerritory {
  const resolved = params.resolvedTerritory;
  const department = resolveDepartment(params);
  const isParis = isParisTerritory(resolved, department.code);

  return {
    countryCode: "FR",
    code: buildTerritoryCode(department.code, isParis),
    label: buildTerritoryLabel(resolved, department.name, isParis),
    commune: buildCommuneTerritoryPart(resolved),
    department: buildDepartmentTerritoryPart(department.code, department.name),
    region: buildRegionTerritoryPart(resolved),
    specialTerritory: buildSpecialTerritoryPart(resolved, isParis),
  };
}

export function snapshotFormalitiesFacts(
  facts: ActionFormalitiesFacts,
): FormalitiesFactsSnapshot {
  return structuredClone(facts);
}

export function deriveActionFormalitiesFacts(params: {
  departmentCode?: string | null;
  departmentName?: string | null;
  resolvedTerritory?: ResolvedActionTerritory | null;
  placeType?: string | null;
  plannedObjective?: string | null;
}): ActionFormalitiesFacts {
  const objective = params.plannedObjective?.trim().toLowerCase() ?? "";

  return {
    territory: buildFormalitiesTerritory(params),
    publicSpace: "unknown",
    manager: { kind: "unknown", label: null },
    isCleanwalk: ["nettoyage", "collecte_mégots", "action_mixte"].includes(objective),
    isPublicRoadwayActivity: "unknown",
    isItinerant: "unknown",
    isClaiming: "unknown",
    hasInstallations: "unknown",
    requiresPhysicalOccupation: "unknown",
    localCustomaryUse: "unknown",
    largeCrowdOrComplexInstallations: "unknown",
  };
}
