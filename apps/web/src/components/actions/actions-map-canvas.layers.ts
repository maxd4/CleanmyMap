export type VisibleMapLayers = {
  points: boolean;
  shapes: boolean;
  infrastructure: boolean;
};

export const DEFAULT_VISIBLE_MAP_LAYERS: VisibleMapLayers = {
  points: true,
  shapes: true,
  infrastructure: true,
};

export type VisibleMapLayerKey = keyof VisibleMapLayers;

export function toggleVisibleMapLayer(
  layers: VisibleMapLayers,
  key: VisibleMapLayerKey,
): VisibleMapLayers {
  return {
    ...layers,
    [key]: !layers[key],
  };
}
