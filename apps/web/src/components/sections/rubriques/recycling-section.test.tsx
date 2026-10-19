import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { PublicSectionBreakdown } from "@/lib/sections/public-section-snapshot-contract";

const authState = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: true,
  userId: "user-a" as string | null,
}));
const callbacks = vi.hoisted(() => ({
  breakdownLoaded: null as ((data: PublicSectionBreakdown, identityKey: string) => void) | null,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => authState,
}));

vi.mock("swr", () => ({
  default: (key: unknown) => ({
    data: Array.isArray(key) && key[0] === "section-recycling-actions" ? { items: [] } : { items: [] },
    error: undefined,
    isLoading: false,
  }),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

vi.mock("@/components/sections/rubriques/recycling-question-assistant/index", () => ({
  RecyclingQuestionAssistant: () => <div>assistant</div>,
}));

vi.mock("@/components/ui/cmm-skeleton", () => ({
  CmmSkeleton: () => <div>skeleton</div>,
}));

vi.mock("@/components/ui/rubrique-card", () => ({
  RubriqueCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/sections/rubriques/shared", () => ({
  RUBRIQUE_CONTAINER_VARIANTS: {},
  RUBRIQUE_ITEM_VARIANTS: {},
  SectionShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock("lucide-react", () => ({
  AlertCircle: () => <span />,
  MapPin: () => <span />,
  Recycle: () => <span />,
  Search: () => <span />,
  Sparkles: () => <span />,
}));

vi.mock("./recycling-components", () => ({
  RecyclingDataUsageCard: () => <div>usage</div>,
  RecyclingKpiGrid: ({ stats }: { stats: { totalKg: number | null; wasteCoverageRate: number | null; mixedIndex: number | null } }) => (
    <output data-total-kg={String(stats.totalKg)} data-coverage={String(stats.wasteCoverageRate)} data-mixed-index={String(stats.mixedIndex)}>
      {String(stats.totalKg)}
    </output>
  ),
  RecyclingWorkflowCard: () => <div>workflow</div>,
}));

vi.mock("./recycling-breakdown-details", () => ({
  RecyclingBreakdownDetails: ({ onLoaded }: { onLoaded: (data: PublicSectionBreakdown, identityKey: string) => void }) => {
    callbacks.breakdownLoaded = onLoaded;
    return <div>breakdown</div>;
  },
}));

import { RecyclingSection } from "./recycling-section";

const snapshot: PublicSectionBreakdown = {
  totalKg: 6,
  wasteCoverageRate: 66.7,
  lines: [{ category: "recyclables", kg: 3, sharePercent: 50, entries: 1 }],
  triQuality: { elevee: 1, moyenne: 0, faible: 0 },
  generatedAt: "2026-10-19T12:00:00.000Z",
};

function totalKg(renderer: ReactTestRenderer) {
  return renderer.root.findByType("output").props["data-total-kg"];
}

describe("RecyclingSection private snapshot isolation", () => {
  beforeEach(() => {
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = "user-a";
    callbacks.breakdownLoaded = null;
  });

  it("does not hydrate private KPIs from public initial data", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <RecyclingSection
          initialData={{ actions: null, map: null, breakdown: snapshot }}
        />,
      );
    });

    expect(totalKg(renderer)).toBe("null");
  });

  it("clears private KPIs on sign-out and rejects a late old-session response", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<RecyclingSection />);
    });
    const oldHandler = callbacks.breakdownLoaded;
    expect(oldHandler).not.toBeNull();

    act(() => oldHandler?.(snapshot, "user-a"));
    expect(totalKg(renderer)).toBe("6");

    authState.isSignedIn = false;
    authState.userId = null;
    act(() => renderer.update(<RecyclingSection />));
    expect(totalKg(renderer)).toBe("null");

    act(() => oldHandler?.(snapshot, "user-a"));
    expect(totalKg(renderer)).toBe("null");
  });

  it("does not inherit account A data or the open state in account B", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<RecyclingSection />);
    });
    const oldHandler = callbacks.breakdownLoaded;
    act(() => oldHandler?.(snapshot, "user-a"));
    expect(totalKg(renderer)).toBe("6");

    authState.userId = "user-b";
    act(() => renderer.update(<RecyclingSection />));
    expect(totalKg(renderer)).toBe("null");

    act(() => oldHandler?.(snapshot, "user-a"));
    expect(totalKg(renderer)).toBe("null");
  });
});
