export type ParisPressurePoint = {
  latitude: number;
  longitude: number;
};

type ParisPressureCoordinate = readonly [number, number];

export type ParisPressureGeometry =
  | {
      type: "Polygon";
      coordinates: readonly (readonly ParisPressureCoordinate[])[];
    }
  | {
      type: "MultiPolygon";
      coordinates: readonly (readonly (readonly ParisPressureCoordinate[])[])[];
    };
