export type WasteCategorySlug =
  | "cigarette_butt"
  | "nicotine_pouch"
  | "plastic"
  | "glass"
  | "broken_glass"
  | "metal"
  | "mixed_residual"
  | "bulky_furniture"
  | "wood"
  | "electrical_equipment"
  | "battery"
  | "medicine"
  | "sharps"
  | "other";

export type WasteFamily =
  | "nicotine"
  | "packaging"
  | "glass"
  | "metal"
  | "residual"
  | "bulky"
  | "wood"
  | "electrical"
  | "hazardous"
  | "unknown";

export type WasteHazardLevel = "low" | "caution" | "high" | "critical" | "unknown";

export type WastePickupPolicy =
  | "basic_ppe_ok"
  | "basic_ppe_with_care"
  | "trained_only"
  | "no_pickup";

export type WasteDisposalRoute =
  | "cigarette_waste"
  | "municipal_recycling"
  | "glass_container"
  | "residual_waste"
  | "bulky_collection"
  | "wood_collection"
  | "e_waste_collection"
  | "battery_dropoff"
  | "pharmacy_takeback"
  | "sharps_collection"
  | "local_authority_route";

export type WasteLocalizedText = {
  fr: string;
  en: string;
};

export type WasteCategoryDefinition = {
  slug: WasteCategorySlug;
  family: WasteFamily;
  labels: WasteLocalizedText;
  examples: WasteLocalizedText[];
  aliases?: WasteLocalizedText[];
  hazardLevel: WasteHazardLevel;
  pickupPolicy: WastePickupPolicy;
  disposalRoute: WasteDisposalRoute;
  ppe: WasteLocalizedText[];
  fieldInstructions: WasteLocalizedText[];
  prohibitions: WasteLocalizedText[];
  pedagogicalTags: readonly string[];
};
