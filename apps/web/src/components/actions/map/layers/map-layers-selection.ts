import { useCallback, useEffect, useRef } from "react";

export type SelectableMapLayer = {
  openPopup?: () => void;
};

export type MapSelectableLayerRefs = {
  register: (id: string, layer: SelectableMapLayer | null) => void;
  openSelected: (id: string | null | undefined) => void;
};

export function createMapSelectableLayerRefs(): MapSelectableLayerRefs {
  const layers = new Map<string, SelectableMapLayer>();

  return {
    register(id, layer) {
      if (layer) {
        layers.set(id, layer);
      } else {
        layers.delete(id);
      }
    },
    openSelected(id) {
      if (!id) {
        return;
      }

      layers.get(id)?.openPopup?.();
    },
  };
}

export function useMapSelectableLayerRefs(
  selectedActionId: string | null | undefined,
) {
  const layerRefs = useRef<MapSelectableLayerRefs | null>(null);
  if (layerRefs.current == null) {
    layerRefs.current = createMapSelectableLayerRefs();
  }

  const registerLayerRef = useCallback(
    (id: string, layer: SelectableMapLayer | null) => {
      layerRefs.current?.register(id, layer);
    },
    [],
  );

  useEffect(() => {
    layerRefs.current?.openSelected(selectedActionId);
  }, [selectedActionId]);

  return { registerLayerRef };
}
