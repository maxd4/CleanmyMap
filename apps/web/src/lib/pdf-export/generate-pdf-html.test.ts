import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { generatePdfHtml } from "./generate-pdf-html";
import type { ReportModel } from "@/lib/reports/report-model/types";

class FakeElement {
  className = "";
  id = "";
  innerHTML = "";
  style: Record<string, string> = {};
  children: FakeElement[] = [];

  constructor(private readonly tagName: string) {}

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  get outerHTML(): string {
    const attributes = [
      this.className ? `class="${this.className}"` : "",
      this.id ? `id="${this.id}"` : "",
      Object.keys(this.style).length > 0
        ? `style="${Object.entries(this.style)
            .map(([key, value]) => `${key}: ${value};`)
            .join(" ")}"`
        : "",
    ].filter(Boolean);
    const openingTag = attributes.length > 0
      ? `<${this.tagName} ${attributes.join(" ")}>`
      : `<${this.tagName}>`;

    return `${openingTag}${this.innerHTML}${this.children.map((child) => child.outerHTML).join("")}</${this.tagName}>`;
  }
}

const report = {
  generatedAt: "23/08/2026",
  totals: { actions: 12, kg: 48.5, butts: 23, volunteers: 7, hours: 18 },
  map: {
    points: 12,
    traces: 3,
    polylines: 2,
    polygons: 1,
    geoCoverage: 84.2,
    traceCoverage: 71.5,
  },
  moderation: {
    availability: "available",
    pending: 2,
    approved: 12,
    rejected: 1,
    conversion: 80,
    delayDays: 1.5,
  },
  quality: {
    completenessScore: 92,
    coherenceScore: 88,
    freshnessDays: 3,
    geolocRate: 96,
  },
  areas: [
    { area: "1er arrondissement", actions: 5, kg: 20, butts: 10, recurrence: 1.2, score: 80 },
  ],
  trendPercent: 4,
  monthRows6: [
    { month: "2026-03", actions: 2, kg: 8, butts: 4, volunteers: 2, minutes: 60 },
    { month: "2026-04", actions: 3, kg: 12, butts: 5, volunteers: 2, minutes: 90 },
  ],
  monthRows12: [],
  routeSteps: [],
  routeDistance: 6.4,
  terrain: { actionCount: 12, spotCount: 4, cleanPlaceCount: 2 },
  recycling: { recyclableKg: 32, triIndex: 76 },
  climate: {
    six: { actions: 8, kg: 32, butts: 15 },
    twelve: { actions: 12, kg: 48.5, butts: 23 },
    waterProtectedLiters: 1450,
    co2AvoidedKg: 24.25,
  },
  community: {
    totalEvents: 3,
    upcomingEvents: 1,
    pastEvents: 2,
    rsvp: { yes: 4, maybe: 1, no: 0 },
    participationRate: 67,
    topLeaderboard: [{ name: "Camille", actions: 4, kg: 16, butts: 7 }],
    badgeConfirmed: 5,
    badgeExpert: 2,
    sourceBuckets: { citoyen: 8, associatif: 3, institutionnel: 1 },
  },
  impactMethodology: {} as ReportModel["impactMethodology"],
  annualRows: [],
  calendar: [],
  highlightPhotos: [
    { url: "https://example.test/before-after.jpg", label: "Quai de Seine", date: "2026-08-01" },
  ],
  highlightActions: [],
  executive: {
    readinessScore: 90,
    readinessLabel: "Prêt",
    headline: "Impact suivi",
    summary: "Résumé du rapport.",
    evidence: ["12 interventions validées"],
    budgetUseCases: [],
    watchouts: [],
  },
} as ReportModel;

describe("generatePdfHtml", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T12:34:00.000Z"));
    globalThis.document = {
      createElement: (tagName: string) => new FakeElement(tagName),
      querySelectorAll: () => [],
    } as unknown as Document;
  });

  afterAll(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "document");
  });

  it("keeps the HTML output, sections and print styles stable", () => {
    const html = generatePdfHtml(report, "Ville de Paris", "paris", "RPT-2026-001");
    const hash = createHash("sha256").update(html).digest("hex");

    expect(hash).toBe("6d3924c13016cc7066f218ac9b770968ee138aac511213102b7065ea5dcca67c");
    expect(html).toContain("LIVRABLE OFFICIEL #RPT-2026-001");
    expect(html).toContain("Sommaire");
    expect(html).toContain('id="chapter-executif"');
    expect(html).toContain('id="chapter-pilotage"');
    expect(html).toContain('id="chapter-terrain"');
    expect(html).toContain('id="chapter-contexte"');
    expect(html).toContain('id="chapter-communaute"');
    expect(html).toContain('id="chapter-gouvernance"');
    expect(html).toContain('id="chapter-annexes"');
    expect(html).toContain("@page { size: A4; margin: 0; }");
    expect(html).toContain(".master-pack-container { background: #fff; }");
    expect(html).toContain("window.addEventListener(\"afterprint\"");
  });
});
