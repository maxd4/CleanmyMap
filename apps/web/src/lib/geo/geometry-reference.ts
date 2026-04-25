import type { ActionDrawing } from "../actions/types.ts";

export type GeoReference = {
  keywords: string[];
  type: "clean_place" | "action";
  drawing: ActionDrawing;
};

// Coordonnées approximatives pour les grands parcs (Polygones simplifiés)
export const GEOMETRY_REFERENCES: GeoReference[] = [
  {
    keywords: ["vincennes"],
    type: "clean_place",
    drawing: {
      kind: "polygon",
      coordinates: [
        [48.8475, 2.42],
        [48.835, 2.46],
        [48.82, 2.45],
        [48.815, 2.41],
        [48.83, 2.39],
        [48.845, 2.41],
      ],
    },
  },
  {
    keywords: ["boulogne"],
    type: "clean_place",
    drawing: {
      kind: "polygon",
      coordinates: [
        [48.87, 2.22],
        [48.875, 2.25],
        [48.86, 2.28],
        [48.845, 2.26],
        [48.85, 2.22],
      ],
    },
  },
  {
    keywords: ["buttes-chaumont", "buttes chaumont"],
    type: "clean_place",
    drawing: {
      kind: "polygon",
      coordinates: [
        [48.882, 2.38],
        [48.883, 2.385],
        [48.88, 2.39],
        [48.876, 2.385],
        [48.878, 2.378],
      ],
    },
  },
  {
    keywords: ["tuileries"],
    type: "clean_place",
    drawing: {
      kind: "polygon",
      coordinates: [
        [48.865, 2.32],
        [48.863, 2.333],
        [48.861, 2.33],
        [48.862, 2.318],
      ],
    },
  },
  {
    keywords: ["luxembourg"],
    type: "clean_place",
    drawing: {
      kind: "polygon",
      coordinates: [
        [48.849, 2.335],
        [48.849, 2.34],
        [48.844, 2.34],
        [48.843, 2.335],
        [48.846, 2.33],
      ],
    },
  },
];

export function findMatchingGeometry(label: string): ActionDrawing | null {
  const normalized = label.toLowerCase();
  for (const ref of GEOMETRY_REFERENCES) {
    if (ref.keywords.some((k) => normalized.includes(k))) {
      return ref.drawing;
    }
  }
  return null;
}
