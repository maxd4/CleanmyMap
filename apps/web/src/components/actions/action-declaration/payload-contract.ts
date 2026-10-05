import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionMegotsCondition,
  ActionPhotoAsset,
  ActionRouteTopology,
  ActionVisionEstimate,
} from "../../../lib/actions/types";
import type { FinalActionGeometry } from "../../../lib/actions/geometry/final-geometry";
import type { VolunteerParticipationInput } from "../../../lib/actions/volunteer-participation";
import type { DeclarationMode, FormState } from "./types";

export const OTHER_VOLUNTEER_ASSOCIATION_VALUE = "__autre_benevole__";

export type CreateActionPayloadParams = {
  form: FormState;
  declarationMode: DeclarationMode;
  effectiveManualDrawingEnabled: boolean;
  drawingIsValid: boolean;
  manualDrawing: ActionDrawing | null;
  manualDrawingSource?: ActionGeometrySource | null;
  routePreviewDrawing?: ActionDrawing | null;
  routePreviewSource?: ActionGeometrySource | null;
  isEntrepriseMode: boolean;
  linkedEventId?: string;
  photos?: ActionPhotoAsset[];
  visionEstimate?: ActionVisionEstimate | null;
  userMetadata?: {
    userId: string;
    handle?: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
};

export type CreateActionPayloadParts = {
  departureLocationLabel: string;
  arrivalLocationLabel: string;
  routeTopology: ActionRouteTopology;
  routeLocationLabel: string;
  latitude: number | null;
  longitude: number | null;
  finalGeometry: FinalActionGeometry | null;
  normalizedDrawing: ActionDrawing | null;
  resolvedManualDrawingSource: ActionGeometrySource | null;
  isSpontaneousAction: boolean;
  organizerName: string;
  associationName: string;
  enteredMegotsKg: number | null;
  enteredButtsCount: number | null;
  enteredVolumeLiters: number | null;
  cigaretteButtsCondition: ActionMegotsCondition;
  rawCigaretteButtsMeasurements: {
    cigaretteButtsCount: number | null;
    cigaretteButtsMassKg: number | null;
    cigaretteButtsVolumeLiters: number | null;
    cigaretteButtsCondition: ActionMegotsCondition;
  };
  volunteerParticipationInput: VolunteerParticipationInput;
  volunteerParticipation: ReturnType<
    typeof import("../../../lib/actions/volunteer-participation").normalizeVolunteerParticipation
  >;
};
