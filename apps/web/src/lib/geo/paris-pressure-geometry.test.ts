import { describe, expect, it } from "vitest";
import {
  isValidParisPressureGeometry,
  parisPressureGeometryAreaKm2,
  pointInParisPressureGeometry,
} from "./paris-pressure-geometry";
import type { ParisPressureGeometry } from "./paris-pressure-geometry";

const polygon: ParisPressureGeometry = {
  type: "Polygon",
  coordinates: [
    [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]],
  ],
};

describe("Paris pressure geometry", () => {
  it("rattache un point au polygone qui le contient, même si un autre centroïde est plus proche", () => {
    expect(pointInParisPressureGeometry({ latitude: 0.3, longitude: 0.95 }, polygon)).toBe(true);
  });

  it("exclut l'intérieur d'un trou et conserve la frontière comme appartenance déterministe", () => {
    const withHole: ParisPressureGeometry = {
      type: "Polygon",
      coordinates: [
        polygon.coordinates[0],
        [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75], [0.25, 0.25]],
      ],
    };
    expect(pointInParisPressureGeometry({ latitude: 0.5, longitude: 0.5 }, withHole)).toBe(false);
    expect(pointInParisPressureGeometry({ latitude: 0.25, longitude: 0.5 }, withHole)).toBe(true);
  });

  it("additionne les polygones d'un MultiPolygon et soustrait les trous de la surface", () => {
    const withHole: ParisPressureGeometry = {
      type: "Polygon",
      coordinates: [
        polygon.coordinates[0],
        [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75], [0.25, 0.25]],
      ],
    };
    const multi: ParisPressureGeometry = {
      type: "MultiPolygon",
      coordinates: [polygon.coordinates, withHole.coordinates],
    };
    const unit = 73 * 111;
    expect(parisPressureGeometryAreaKm2(withHole)).toBeCloseTo(unit * 0.75, 6);
    expect(parisPressureGeometryAreaKm2(multi)).toBeCloseTo(unit * 1.75, 6);
    expect(pointInParisPressureGeometry({ latitude: 0.5, longitude: 1.5 }, {
      type: "MultiPolygon",
      coordinates: [[[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]]],
    } satisfies ParisPressureGeometry)).toBe(true);
  });

  it("est pure et déterministe pour les points hors géométrie", () => {
    const point = { latitude: 2, longitude: 2 };
    expect(pointInParisPressureGeometry(point, polygon)).toBe(false);
    expect(pointInParisPressureGeometry(point, polygon)).toBe(false);
    expect(parisPressureGeometryAreaKm2(null)).toBeNull();
  });

  it("échoue fermement pour une géométrie invalide au lieu d'en utiliser une partie", () => {
    const invalid = {
      type: "Polygon",
      coordinates: [[[0, 0], [1, Number.NaN], [1, 1]]],
    } as unknown as ParisPressureGeometry;
    expect(isValidParisPressureGeometry(invalid)).toBe(false);
    expect(pointInParisPressureGeometry({ latitude: 0.5, longitude: 0.5 }, invalid)).toBe(false);
    expect(parisPressureGeometryAreaKm2(invalid)).toBeNull();
  });

  it("reste déterministe sur une frontière de polygones voisins", () => {
    const right: ParisPressureGeometry = {
      type: "Polygon",
      coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]],
    };
    const left: ParisPressureGeometry = {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    };
    expect(pointInParisPressureGeometry({ latitude: 0.5, longitude: 1 }, left)).toBe(true);
    expect(pointInParisPressureGeometry({ latitude: 0.5, longitude: 1 }, right)).toBe(true);
  });
});
