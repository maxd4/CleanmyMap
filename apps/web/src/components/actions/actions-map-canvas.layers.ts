export type VisibleMapLayers = {
  points: boolean;
  shapes: boolean;
  infrastructure: boolean;
  trashSpotter: boolean;
};

export const DEFAULT_VISIBLE_MAP_LAYERS: VisibleMapLayers = {
  points: true,
  shapes: true,
  infrastructure: true,
  trashSpotter: true,
};

export type VisibleMapLayerKey = keyof VisibleMapLayers;

export const MAP_LAYER_LABELS = {
  points: "Points",
  shapes: "Parcours & zones",
  infrastructure: "Infras",
  trashSpotter: "Trash Spotter",
} as const satisfies Record<VisibleMapLayerKey, string>;

export function toggleVisibleMapLayer(
  layers: VisibleMapLayers,
  key: VisibleMapLayerKey,
): VisibleMapLayers {
  return {
    ...layers,
    [key]: !layers[key],
  };
}
