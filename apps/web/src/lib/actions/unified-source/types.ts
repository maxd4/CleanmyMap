import type {
  ActionDataContract,
  ActionEntityType,
} from "@/lib/actions/contracts/contract-model";
import type {
  ActionMapViewportQuery,
  ActionSourceName,
  ActionStatus,
} from "@/lib/actions/types";
import type { ActionRow } from "@/types/database";

export type UnifiedActionContractsParams = {
  /** Explicit public deep-link target. It is loaded without viewport filtering. */
  actionId?: string | null;
  /** null means the caller explicitly requests the complete source result. */
  limit: number | null;
  status: ActionStatus | null;
  includeFuturePublicActions?: boolean;
  futureOnly?: boolean;
  floorDate: string | null;
  requireCoordinates: boolean;
  types: ActionEntityType[] | null;
  viewport?: ActionMapViewportQuery;
};

export type UnifiedSourceHealth = {
  partial: boolean;
  failedSources: ActionSourceName[];
  availableSources: ActionSourceName[];
  warnings: string[];
};

export type TrashSpotterSpotRow = {
  id: string;
  created_at: string;
  created_by_clerk_id?: string | null;
  label: string;
  spot_type: string | null;
  latitude: number | null;
  longitude: number | null;
  derived_geometry_kind?: "point" | "polyline" | "polygon" | null;
  derived_geometry_geojson?: string | null;
  geometry_confidence?: number | null;
  geometry_source?:
    | "manual"
    | "reference"
    | "routed"
    | "estimated_route"
    | "estimated_area"
    | "fallback_point"
    | null;
  status: "new" | "validated" | "cleaned";
  notes: string | null;
};

export type UnifiedActionSourceLoadResult = {
  remoteRows: ActionRow[];
  remoteSpots: TrashSpotterSpotRow[];
  localContracts: ActionDataContract[];
  failedSources: ActionSourceName[];
  availableSources: ActionSourceName[];
};

export type UnifiedContractOrigin = "remote" | "local";

export type UnifiedContractCandidate = {
  contract: ActionDataContract;
  origin: UnifiedContractOrigin;
};
