import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionGpxImportMetadata,
} from "@/lib/actions/types";
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
  onImportGpx: (file: File | null) => Promise<void>;
  onRemoveGpx: () => void;
  onResetManualDrawing?: () => void;
  gpsStatus: "idle" | "locating" | "success" | "error";
  gpsMessage: string | null;
  onAutofillGps: () => void;
  mode?: "all" | "primary" | "details";
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
    | "onResetManualDrawing"
    | "gpxError"
  >;

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
>;
