import type { ActionDrawing } from "../actions/types.ts";

type GeoReference = {
  keywords: string[];
  type: "clean_place" | "action";
  drawing: ActionDrawing;
};

// Coordonnées approximatives pour les grands parcs (Polygones simplifiés)
const GEOMETRY_REFERENCES: GeoReference[] = [
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
  {
    keywords: ["belleville"],
    type: "clean_place",
    drawing: {
      kind: "polygon",
      // Simplified public contour from the official Ville de Paris DEVE layer.
      // This is an estimated reference area, never a measured cleaned surface.
      coordinates: [
        [48.871832, 2.384922], [48.871692, 2.384963], [48.871605, 2.384939],
        [48.871550, 2.384993], [48.871532, 2.385103], [48.871530, 2.385182],
        [48.871502, 2.385221], [48.871479, 2.385266], [48.871477, 2.385333],
        [48.871517, 2.385363], [48.871519, 2.385437], [48.871500, 2.385500],
        [48.871452, 2.385554], [48.871418, 2.385632], [48.871374, 2.385685],
        [48.871350, 2.385764], [48.871315, 2.385843], [48.871331, 2.385928],
        [48.870891, 2.386480], [48.870387, 2.384727], [48.870457, 2.384459],
        [48.870513, 2.384438], [48.870549, 2.384394], [48.870553, 2.384387],
        [48.870556, 2.384381], [48.870559, 2.384375], [48.870563, 2.384368],
        [48.870544, 2.384148], [48.870587, 2.384135], [48.870625, 2.384132],
        [48.870656, 2.384104], [48.870675, 2.384061], [48.870927, 2.383633],
        [48.870965, 2.383613], [48.870974, 2.383576], [48.870990, 2.383529],
        [48.871019, 2.383498], [48.871052, 2.383490], [48.871085, 2.383505],
        [48.871094, 2.383455], [48.871088, 2.383391], [48.871193, 2.383270],
        [48.871226, 2.383242], [48.871252, 2.383235], [48.872284, 2.383146],
        [48.871717, 2.384410], [48.871895, 2.384918], [48.871832, 2.384922],
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
