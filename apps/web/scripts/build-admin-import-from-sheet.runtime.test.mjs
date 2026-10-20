import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { main } from "./build-admin-import-from-sheet.mjs";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/synthetic-sheet/export?format=csv&gid=7";
const SHEET_EDIT_URL =
  "https://docs.google.com/spreadsheets/d/synthetic-sheet/edit?gid=7";
const ASSOCIATION_OPTIONS_PATH = fileURLToPath(
  new URL("../src/lib/actions/association-options.ts", import.meta.url),
);

function csvRow(values) {
  return values
    .map((value) => {
      const raw = String(value ?? "");
      return /[",\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
    })
    .join(",");
}

function csv(headers, rows) {
  return [csvRow(headers), ...rows.map(csvRow)].join("\n") + "\n";
}

function response(body, { status = 200, contentType = "text/csv" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? contentType : null;
      },
    },
    async text() {
      return body;
    },
  };
}

const fullHeaders = [
  "action_date",
  "depart",
  "arrivee",
  "association",
  "entreprise",
  "type de lieu",
  "city",
  "latitude",
  "longitude",
  "waste_kg",
  "megots (kg)",
  "qualite megots",
  "participants",
  "duree",
  "actor",
  "status",
  "notes",
  "lieux propres",
  "lieu propre ?",
];

const fullCsv = csv(fullHeaders, [
  [
    "2026-03-21",
    "48.8566 2.3522",
    "48.8570 2.3530",
    "Action spontanée",
    "",
    "Parc",
    "Paris",
    "48.8566",
    "2.3522",
    "20",
    "1,2",
    "humide",
    "0",
    "0",
    "Alice",
    "validated",
    "Collecte principale",
    "Parc Nord;Parc Nord",
    "Oui",
  ],
  [
    "22/04/2026",
    "12.341667,2.341667",
    "48.8610,2.3610",
    "Collectif Ã‰tranger",
    "Acme",
    "",
    "CafÃƒÂ©",
    "",
    "",
    "-3",
    "2",
    "mouillÃƒÂ©",
    "-2",
    "abc",
    "Bob",
    "unknown",
    "",
    "Parc Nord|Rue A",
    "Non",
  ],
  [
    "not-a-date",
    "Adresse sans coordonnee",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ],
]);

async function createHarness({ rawCsv = null, existingPayload = null } = {}) {
  const root = await mkdtemp(join(tmpdir(), "cleanmymap-admin-import-"));
  const paths = {
    rawPath: join(root, "snapshot.csv"),
    outPath: join(root, "admin-import.json"),
    outFormCsvPath: join(root, "form-like.csv"),
    outCleanPlacesPath: join(root, "clean-places.json"),
    outCleanPlacesFormCsvPath: join(root, "clean-places-form-like.csv"),
    associationOptionsPath: ASSOCIATION_OPTIONS_PATH,
  };
  if (rawCsv !== null) {
    await writeFile(paths.rawPath, rawCsv, "utf8");
  }
  if (existingPayload !== null) {
    await writeFile(paths.outPath, JSON.stringify(existingPayload), "utf8");
  }
  return { root, paths };
}

async function withHarness(options, callback) {
  const harness = await createHarness(options);
  try {
    return await callback(harness);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
}

function mainOptions(paths, fetchImpl, extra = {}) {
  return {
    args: [SHEET_URL],
    env: {},
    paths,
    fetchImpl,
    ...extra,
  };
}

test("main transforms rows, routes, associations, quantities and deduplicated clean places", async () => {
  await withHarness({}, async ({ paths }) => {
    const calls = [];
    const result = await main(
      mainOptions(paths, async (url) => {
        calls.push(url);
        return response(fullCsv);
      }, {
        geocodeResolverFactory: () => async () => {
          throw new Error("geocoding must stay disabled");
        },
      }),
    );

    assert.equal(result, undefined);
    assert.equal(calls.length, 1);
    const payload = JSON.parse(await readFile(paths.outPath, "utf8"));
    assert.equal(payload.items.length, 2);
    assert.deepEqual(payload.items[0], {
      actorName: "Alice",
      associationName: "Action spontanée",
      actionDate: "2026-03-21",
      locationLabel: "48.8566 2.3522 → 48.8570 2.3530",
      departureLocationLabel: "48.8566 2.3522",
      arrivalLocationLabel: "48.8570 2.3530",
      routeStyle: "souple",
      routeAdjustmentMessage: "Itinéraire reconstitué depuis les colonnes Départ / Arrivée",
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.8566, 2.3522],
          [48.8568, 2.3526],
          [48.857, 2.353],
        ],
      },
      derivedGeometryKind: "polyline",
      derivedGeometryGeoJson: JSON.stringify({
        type: "LineString",
        coordinates: [
          [2.3522, 48.8566],
          [2.3526, 48.8568],
          [2.353, 48.857],
        ],
      }),
      geometryConfidence: 0.78,
      geometrySource: "routed",
      placeType: "Parc",
      cleanPlaceFlag: true,
      megotsKg: 1.2,
      megotsQuality: "humide",
      latitude: 48.8568,
      longitude: 2.3526,
      wasteKg: 20,
      cigaretteButts: 2100,
      volunteersCount: 1,
      durationMinutes: 1,
      notes: "Collecte principale || Type de lieu: Parc | Ville: Paris | Lieu propre: oui | Qualité mégots: humide",
      status: "approved",
    });
    assert.equal(payload.items[1].associationName, "Entreprise - Acme");
    assert.equal(payload.items[1].actionDate, "2026-04-22");
    assert.equal(payload.items[1].latitude, 30.601333);
    assert.equal(payload.items[1].longitude, 2.351333);
    assert.equal(payload.items[1].wasteKg, 0);
    assert.equal(payload.items[1].cigaretteButts, 2000);
    assert.equal(payload.items[1].volunteersCount, 1);
    assert.equal(payload.items[1].durationMinutes, 60);
    assert.match(payload.items[1].notes, /Café/);

    const cleanPlaces = JSON.parse(await readFile(paths.outCleanPlacesPath, "utf8"));
    assert.deepEqual(cleanPlaces.items.map((item) => item.label), [
      "Parc Nord",
      "48.8566 2.3522 → 48.8570 2.3530",
      "Rue A",
    ]);
    const formCsv = await readFile(paths.outFormCsvPath, "utf8");
    const cleanPlacesCsv = await readFile(paths.outCleanPlacesFormCsvPath, "utf8");
    assert.match(formCsv, /Départ,Arrivée/);
    assert.match(formCsv, /48\.8566 2\.3522,48\.8570 2\.3530/);
    assert.match(cleanPlacesCsv, /type,label,latitude,longitude,status,notes/);
  });
});

test("uses the next Google CSV candidate after HTTP or HTML responses", async () => {
  await withHarness({}, async ({ paths }) => {
    const calls = [];
    await main(
      mainOptions(paths, async (url) => {
        calls.push(url);
        if (calls.length === 1) return response("unavailable", { status: 503 });
        if (calls.length === 2) {
          return response(
            "action_date,location_label\n2026-05-01,48.9 2.4\n",
            { contentType: "text/html" },
          );
        }
        return response(
          "action_date,location_label\n2026-05-01,48.9 2.4\n",
        );
      }, { args: [SHEET_EDIT_URL] }),
    );
    assert.equal(calls.length, 3);

    const fallbackCalls = [];
    await main(
      mainOptions(paths, async (url) => {
        fallbackCalls.push(url);
        if (fallbackCalls.length === 1) return response("unavailable", { status: 503 });
        return response("action_date,location_label\n2026-05-01,48.9 2.4\n");
      }),
    );
    assert.equal(fallbackCalls.length, 2);
    assert.match(fallbackCalls[1], /gviz\/tq\?tqx=out:csv&gid=7/);
  });
});

test("falls back to a local snapshot, then to an existing payload, without inventing success", async () => {
  await withHarness({ rawCsv: "action_date,location_label\n2026-05-02,48.91 2.41\n" }, async ({ paths }) => {
    await main(mainOptions(paths, async () => response("", { status: 403 })));
    const payload = JSON.parse(await readFile(paths.outPath, "utf8"));
    assert.equal(payload.items[0].actionDate, "2026-05-02");
  });

  const existing = { items: [{ actionDate: "2026-01-01", locationLabel: "Existing" }] };
  await withHarness({ existingPayload: existing }, async ({ paths }) => {
    const result = await main(mainOptions(paths, async () => response("<html>login</html>", { contentType: "text/html" })));
    assert.equal(result, undefined);
    assert.deepEqual(JSON.parse(await readFile(paths.outPath, "utf8")), existing);
  });
});

test("rejects empty, malformed and unusable sources, and requires the date column", async () => {
  await withHarness({}, async ({ paths }) => {
    await assert.rejects(
      main(mainOptions(paths, async () => response(""))),
      /Google Sheet appears empty or inaccessible/,
    );
    await assert.rejects(
      main(mainOptions(paths, async () => response('"broken,quote'))),
      /Google Sheet appears empty or inaccessible/,
    );
    await assert.rejects(
      main(mainOptions(paths, async () => response("location_label\n48.9 2.4\n"))),
      /Missing required columns: action_date\/date/,
    );
  });
});

test("keeps optional columns nullable and rejects invalid numeric values", async () => {
  await withHarness({}, async ({ paths }) => {
    await main(mainOptions(paths, async () => response("action_date,location_label\n2026-05-03,Adresse\n")));
    const payload = JSON.parse(await readFile(paths.outPath, "utf8"));
    assert.equal(payload.items[0].wasteKg, null);
    assert.equal(payload.items[0].megotsKg, null);
    assert.equal(payload.items[0].cigaretteButts, null);
    assert.equal(payload.items[0].volunteersCount, 1);
    assert.equal(payload.items[0].durationMinutes, 60);
    assert.equal(payload.items[0].latitude, null);
    assert.equal(payload.items[0].longitude, null);

    const invalidCsv = "action_date,location_label,waste_kg\n2026-05-03,Adresse,not-a-number\n";
    await assert.rejects(
      main(mainOptions(paths, async () => response(invalidCsv))),
      /Déchets \(kg\) invalide/,
    );
  });
});

test("uses a simulated geocoder only when enabled and preserves nulls on geocoder failure", async () => {
  await withHarness({}, async ({ paths }) => {
    const calls = [];
    const geocodeResolverFactory = () => async (address) => {
      calls.push(address);
      if (address === "Rue inconnue") return { latitude: 48.9, longitude: 2.4 };
      return { latitude: null, longitude: null };
    };
    const source = "action_date,location_label,lieux propres\n2026-05-04,Rue inconnue,Rue inconnue|Rue sans résultat\n";

    await main(mainOptions(paths, async () => response(source), { geocodeResolverFactory }));
    assert.deepEqual(calls, []);

    await main(mainOptions(paths, async () => response(source), {
      args: ["--geocode", SHEET_URL],
      geocodeResolverFactory,
    }));
    assert.deepEqual(calls, ["Rue inconnue", "Rue inconnue", "Rue sans résultat"]);
    const payload = JSON.parse(await readFile(paths.outPath, "utf8"));
    assert.deepEqual([payload.items[0].latitude, payload.items[0].longitude], [48.9, 2.4]);
    const cleanPlaces = JSON.parse(await readFile(paths.outCleanPlacesPath, "utf8"));
    assert.deepEqual(cleanPlaces.items.map((item) => [item.label, item.latitude, item.longitude]), [
      ["Rue inconnue", 48.9, 2.4],
      ["Rue sans résultat", null, null],
    ]);
  });
});

test("propagates filesystem write failures instead of printing success", async () => {
  await withHarness({}, async ({ paths }) => {
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      await assert.rejects(
        main(mainOptions(paths, async () => response("action_date,location_label\n2026-05-05,48.9 2.4\n"), {
          writeFileImpl: async () => {
            throw new Error("disk full");
          },
        })),
        /disk full/,
      );
    } finally {
      console.log = originalLog;
    }
    assert.deepEqual(logs, []);
  });
});
