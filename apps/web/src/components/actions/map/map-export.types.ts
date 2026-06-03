export type MapViewportState = {
  center: [number, number];
  zoom: number;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
};
