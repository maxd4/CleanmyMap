export type SpotType = "clean_place" | "spot";
export type SpotFormStatus = "idle" | "pending" | "success" | "error";

export interface SpotFormState {
  type: SpotType;
  label: string;
  latitude: string;
  longitude: string;
  notes: string;
  status: SpotFormStatus;
  message: string | null;
}
