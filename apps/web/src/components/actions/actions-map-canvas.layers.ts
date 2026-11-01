export type VisibleMapLayers = {
  points: boolean;
  shapes: boolean;
  infrastructure: boolean;
  trashSpotter: boolean;
  plasticOrigins: boolean;
  predictiveHeatmap: boolean;
};

export const DEFAULT_VISIBLE_MAP_LAYERS: VisibleMapLayers = {
  points: true,
  shapes: true,
  infrastructure: true,
  trashSpotter: true,
  plasticOrigins: false,
  predictiveHeatmap: false,
};

export type VisibleMapLayerKey = keyof VisibleMapLayers;

export const MAP_LAYER_LABELS = {
  points: "Points",
  shapes: "Parcours & zones",
  infrastructure: "Infras",
  trashSpotter: "Trash Spotter",
  plasticOrigins: "Plastic Origins | Observations historiques",
  predictiveHeatmap: "Heatmap prédictive Paris 5e/6e",
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
