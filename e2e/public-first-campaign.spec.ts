import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

function parseCsvRecords(csv: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      record.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      record.push(field);
      field = "";
      if (record.some((value) => value.length > 0)) {
        records.push(record);
      }
      record = [];
      continue;
    }

    field += character;
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

test.describe("campaign 1 - public reading and late authentication", () => {
  test("public map renders anonymously", async ({ page }) => {
    await page.goto("/actions/map");
    await expect(page.getByText("Cartographie des actions", { exact: true })).toBeVisible();
  });

  test("public directory renders anonymously", async ({ page }) => {
    await page.goto("/sections/annuaire");
    await expect(page.getByPlaceholder(/rechercher une structure/i)).toBeVisible();
    await expect(page.getByText("Connexion requise", { exact: true })).toHaveCount(0);
  });

  test("public partner network renders anonymously", async ({ page }) => {
    await page.goto("/partners/network");
    await expect(page).toHaveURL(/\/partners\/network$/);
    await expect(page.getByPlaceholder(/rechercher un partenaire/i)).toBeVisible();
  });

  test("public group join form renders anonymously", async ({ page }) => {
    await page.goto("/sections/rejoindre-un-formulaire");
    await expect(page.getByRole("heading", { name: "Rejoindre un formulaire de groupe" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /rechercher une action/i })).toBeVisible();
  });

  test("action declaration exposes the guided pre-form before authentication", async ({ page }) => {
    await page.goto("/actions/new");
    await expect(page.getByRole("heading", { name: "Organiser une action" })).toBeVisible();

    await page.getByRole("button", { name: /Essentiel/i }).click();
    await expect(page.getByRole("heading", { name: "Les informations essentielles" })).toBeVisible();
    await expect(page.getByLabel("Titre de l’action")).toBeVisible();
  });

  test("pre-action section stays ordered and usable on desktop and mobile", async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/actions/new");
      await page.getByRole("button", { name: /Essentiel/i }).click();

      await expect(page.getByRole("heading", { name: "Les informations essentielles" })).toBeVisible();
      await expect(page.getByLabel("Titre de l’action")).toBeVisible();
      await expect(page.getByLabel("Date prévue")).toBeVisible();
      await expect(page.getByLabel("Heure de rendez-vous")).toBeVisible();
      await expect(page.getByLabel("Heure de départ")).toBeVisible();
      await expect(page.getByLabel("Durée estimée")).toBeVisible();
      await expect(page.getByText("Durée non renseignée", { exact: true })).toBeVisible();
      await expect(page.getByText("Accueil des bénévoles au point de rendez-vous.", { exact: true })).toBeVisible();
      await expect(page.getByText("Départ effectif après le rendez-vous.", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Commune ou secteur")).toBeVisible();
      await expect(page.getByRole("combobox", { name: /Point de rendez-vous/ })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Type d’action" })).toHaveValue("");

      await page.getByText("Créneau global", { exact: true }).click();
      await expect(page.getByLabel("Début du créneau global")).toBeVisible();
      await expect(page.getByLabel("Fin du créneau global")).toBeVisible();
      await page.getByLabel("Début du créneau global").fill("08:30");
      await page.getByLabel("Fin du créneau global").fill("11:00");

      await page.getByRole("button", { name: /Terrain/i }).click();
      await expect(page.getByRole("heading", { name: "Terrain" })).toBeVisible();
      await expect(page.getByLabel("Point de rendez-vous précis")).toBeVisible();
      await page.getByLabel("Départ → arrivée").check();
      await page.getByRole("combobox", { name: "Arrivée" }).fill("Place de la République");
      await expect(page.getByRole("combobox", { name: "Arrivée" })).toHaveValue("Place de la République");
      await page.getByRole("button", { name: /Équipe et logistique/i }).click();
      await expect(page.getByRole("heading", { name: "Inscriptions des bénévoles" })).toBeVisible();
      await expect(page.getByLabel("Nombre de bénévoles attendus")).toBeVisible();
      await page.getByLabel("Nombre de bénévoles attendus").fill("12");
      await page.getByLabel("Message complémentaire aux participants").fill("Merci d’arriver dix minutes avant.");
      await expect(page.getByRole("heading", { name: "Préparation et sécurité" })).toBeVisible();
      await expect(page.getByText("Matériel à prévoir", { exact: true })).toBeVisible();
      await expect(page.getByText("Accessibilité", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: /Essentiel/i }).click();
      await page.getByText("Créneau global", { exact: true }).click();
      await expect(page.getByLabel("Début du créneau global")).toHaveValue("08:30");
      await page.getByRole("button", { name: /Terrain/i }).click();
      await expect(page.getByRole("combobox", { name: "Arrivée" })).toHaveValue("Place de la République");
      await page.getByRole("button", { name: /Équipe et logistique/i }).click();
      await expect(page.getByLabel("Nombre de bénévoles attendus")).toHaveValue("12");
      await expect(page.getByLabel("Message complémentaire aux participants")).toHaveValue("Merci d’arriver dix minutes avant.");

      const width = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth + 1);
    }
  });

  test("signalement exposes location and entry controls before authentication", async ({ page }) => {
    const privateObservationResponses: number[] = [];
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.pathname === "/api/signalements/me") {
        privateObservationResponses.push(response.status());
      }
    });
    await page.goto("/signalement?lat=48.8566&lng=2.3522");
    await page.waitForTimeout(500);
    if (privateObservationResponses.length > 0) {
      expect(privateObservationResponses).toContain(401);
    }
    await expect(page.getByText("Mettre à jour l’état du lieu", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "État observé du lieu" })).toBeVisible();
    await expect(page.getByText("Position Certifiée", { exact: true })).toBeVisible();

    const category = page.locator('button[id^="quick-signalement-waste-"]').first();
    await category.click();
    await expect(category).toHaveAttribute("aria-pressed", "true");

    const submit = page.getByRole("button", { name: "Signaler la pollution" });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByRole("link", { name: /Se connecter et reprendre/i })).toBeVisible();
    const draft = await page.evaluate(() =>
      JSON.parse(window.sessionStorage.getItem("cmm:signalement:pending-draft:v1") ?? "null"),
    );
    expect(draft).toMatchObject({
      recordType: "spot",
      selectedCategories: [expect.any(String)],
      location: { lat: 48.8566, lng: 2.3522 },
    });
  });

  test("map exports produce inspectable files matching the public map response", async ({ page }) => {
    const mapResponsePromise = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/actions/map" && response.status() === 200;
      },
      { timeout: 30_000 },
    );

    await page.goto("/actions/map");
    const mapPayload = (await (await mapResponsePromise).json()) as {
      items?: Array<{ id?: string }>;
      count?: number;
    };
    const expectedIds = (mapPayload.items ?? [])
      .map((item) => item.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    expect(mapPayload.count).toBe(expectedIds.length);
    expect(expectedIds.length).toBeGreaterThan(0);

    const exportButton = page.getByRole("button", { name: "Exporter la vue de la carte" });
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();

    const downloadDirectory = path.join(
      process.cwd(),
      "artifacts",
      "playwright",
      "downloads",
      "campaign-1b",
    );
    await mkdir(downloadDirectory, { recursive: true });

    async function downloadFormat(format: "CSV" | "GeoJSON" | "PNG") {
      await exportButton.click();
      const menuItem = page.getByRole("menuitem", { name: new RegExp(`^${format}`) });
      await expect(menuItem).toBeVisible();
      const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
      await menuItem.click();
      const download = await downloadPromise;
      const filename = download.suggestedFilename();
      const filePath = path.join(downloadDirectory, filename);
      await download.saveAs(filePath);
      const fileStats = await stat(filePath);
      return {
        filename,
        filePath,
        size: fileStats.size,
      };
    }

    const csvFile = await downloadFormat("CSV");
    const geoJsonFile = await downloadFormat("GeoJSON");
    const pngFile = await downloadFormat("PNG");

    const csv = (await readFile(csvFile.filePath, "utf8")).replace(/^\uFEFF/, "");
    const csvRecords = parseCsvRecords(csv);
    const csvHeader = csvRecords[0] ?? [];
    const csvIds = csvRecords.slice(1).map((record) => record[0] ?? "");
    expect(csvHeader[0]).toBe("id");
    expect(csvFile.filename).toMatch(/\.csv$/i);
    expect(csvFile.size).toBeGreaterThan(0);
    expect(csvIds).toEqual(expectedIds);

    const geoJson = JSON.parse(await readFile(geoJsonFile.filePath, "utf8")) as {
      type?: string;
      metadata?: { itemsCount?: number };
      features?: Array<{ id?: string; geometry?: unknown }>;
    };
    expect(geoJsonFile.filename).toMatch(/\.geojson$/i);
    expect(geoJsonFile.size).toBeGreaterThan(0);
    expect(geoJson.type).toBe("FeatureCollection");
    expect(geoJson.metadata?.itemsCount).toBe(expectedIds.length);
    expect(geoJson.features?.map((feature) => feature.id)).toEqual(expectedIds);
    expect(geoJson.features?.every((feature) => feature.geometry !== undefined)).toBe(true);

    const png = await readFile(pngFile.filePath);
    expect(pngFile.filename).toMatch(/\.png$/i);
    expect(pngFile.size).toBeGreaterThan(100);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.readUInt32BE(16)).toBeGreaterThan(0);
    expect(png.readUInt32BE(20)).toBeGreaterThan(0);

    await writeFile(
      path.join(downloadDirectory, "evidence.json"),
      JSON.stringify(
        {
          campaign: "1B",
          surface: "/actions/map",
          source: {
            endpoint: "/api/actions/map",
            count: mapPayload.count,
            itemIds: expectedIds,
          },
          files: [
            { ...csvFile, mime: "text/csv", content: "header id + exact item id sequence" },
            {
              ...geoJsonFile,
              mime: "application/geo+json",
              content: "FeatureCollection with matching feature ids",
            },
            {
              ...pngFile,
              mime: "image/png",
              content: "PNG signature and positive IHDR dimensions",
            },
          ],
          checks: {
            csv: {
              header: csvHeader[0],
              rowCount: csvIds.length,
              ids: csvIds,
              idsMatch: true,
            },
            geojson: {
              type: geoJson.type,
              itemsCount: geoJson.metadata?.itemsCount,
              featureCount: geoJson.features?.length,
              ids: geoJson.features?.map((feature) => feature.id),
              idsMatch: true,
              geometriesPresent: true,
            },
            png: {
              signature: [...png.subarray(0, 8)],
              width: png.readUInt32BE(16),
              height: png.readUInt32BE(20),
              validSignature: true,
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );
  });
});
