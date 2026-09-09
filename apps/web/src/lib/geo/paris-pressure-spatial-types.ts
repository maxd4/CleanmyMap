export type ParisPressurePoint = {
  latitude: number;
  longitude: number;
};

export type ParisPressureCoordinate = readonly [number, number];

export type ParisPressureGeometry =
  | {
      type: "Polygon";
      coordinates: readonly (readonly ParisPressureCoordinate[])[];
    }
  | {
      type: "MultiPolygon";
      coordinates: readonly (readonly (readonly ParisPressureCoordinate[])[])[];
    };
