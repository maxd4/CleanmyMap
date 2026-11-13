import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionGpxImportMetadata,
  ActionGpxImportRemovalTarget,
} from "@/lib/actions/types";
import type { CountryCode } from "@/lib/user-location-preference";
import type { FormState } from "./model";
import type { UpdateFormField } from "./types";

export type ActionStepLocationProps = {
  form: FormState;
  updateField: UpdateFormField;
  updateFields: (updates: Partial<FormState>) => void;
  recordType: FormState["recordType"];
  manualDrawing: ActionDrawing | null;
  setManualDrawing: (
    drawing: ActionDrawing | null,
    geometrySource?: ActionGeometrySource | null,
  ) => void;
  manualDrawingSource: ActionGeometrySource | null;
  routePreviewDrawing: ActionDrawing | null;
  routePreviewSource: ActionGeometrySource | null;
  gpxImport: ActionGpxImportMetadata | null;
  gpxError: string | null;
  onImportGpx: (files: FileList | readonly File[] | null) => Promise<void>;
  onRemoveGpx: (target?: ActionGpxImportRemovalTarget | string) => void;
  onSetGpxIntent: (intent: "planned" | "observed") => void;
  onResetManualDrawing?: () => void;
  gpsStatus: "idle" | "locating" | "success" | "error";
  gpsMessage: string | null;
  onAutofillGps: () => void;
  mode?: "all" | "primary" | "details";
  countryCode?: CountryCode;
};

export type ActionLocationGeometryInput = Pick<
  ActionStepLocationProps,
  | "form"
  | "manualDrawing"
  | "manualDrawingSource"
  | "routePreviewDrawing"
  | "routePreviewSource"
  | "gpxImport"
>;

export type ActionLocationGeometryPanelProps = ActionLocationGeometryInput &
  Pick<
    ActionStepLocationProps,
    | "updateField"
    | "setManualDrawing"
    | "onImportGpx"
    | "onRemoveGpx"
    | "onSetGpxIntent"
    | "onResetManualDrawing"
    | "gpxError"
  > & {
    compact?: boolean;
  };

export type ActionLocationInputProps = Pick<
  ActionStepLocationProps,
  | "form"
  | "updateField"
  | "updateFields"
  | "recordType"
  | "gpsStatus"
  | "gpsMessage"
  | "onAutofillGps"
  | "mode"
  | "countryCode"
> & {
  manualDrawingSource?: ActionGeometrySource | null;
  routePreviewSource?: ActionGeometrySource | null;
  gpxImport?: ActionGpxImportMetadata | null;
};
