import {
  Activity,
  Bot,
  CreditCard,
  Database,
  Fingerprint,
  Globe,
  GitBranch,
  Mail,
  PieChart,
  Plug,
  Radar,
  Server,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { EnvironmentalImpactInfrastructureServiceKey } from "@/lib/environmental-impact-estimator/types";

export type FreePlanVisualMeta = {
  icon: LucideIcon;
  color: string;
  glow: string;
};

export const SERVICE_VISUALS: Record<EnvironmentalImpactInfrastructureServiceKey, FreePlanVisualMeta> = {
  vercel: {
    icon: Server,
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.18)",
  },
  supabase: {
    icon: Database,
    color: "#34d399",
    glow: "rgba(52, 211, 153, 0.18)",
  },
  github: {
    icon: GitBranch,
    color: "#1f2937",
    glow: "rgba(31, 41, 55, 0.18)",
  },
  resend: {
    icon: Mail,
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.18)",
  },
  chatgpt: {
    icon: Sparkles,
    color: "#fb7185",
    glow: "rgba(251, 113, 133, 0.18)",
  },
  codex: {
    icon: Bot,
    color: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.18)",
  },
  clerk: {
    icon: Fingerprint,
    color: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.18)",
  },
  posthog: {
    icon: Activity,
    color: "#f97316",
    glow: "rgba(249, 115, 22, 0.18)",
  },
  sentry: {
    icon: ShieldAlert,
    color: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.18)",
  },
  upstash: {
    icon: Plug,
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.18)",
  },
  pinecone: {
    icon: Radar,
    color: "#14b8a6",
    glow: "rgba(20, 184, 166, 0.18)",
  },
  stripe: {
    icon: CreditCard,
    color: "#c084fc",
    glow: "rgba(192, 132, 252, 0.18)",
  },
  lwsDomain: {
    icon: Globe,
    color: "#eab308",
    glow: "rgba(234, 179, 8, 0.18)",
  },
};

export const TOTAL_VISUAL: FreePlanVisualMeta = {
  icon: PieChart,
  color: "#f59e0b",
  glow: "rgba(245, 158, 11, 0.24)",
};

export const CHART_COLORS = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#a78bfa",
  "#f97316",
  "#22c55e",
  "#f472b6",
  "#60a5fa",
  "#14b8a6",
  "#eab308",
  "#c084fc",
] as const;
