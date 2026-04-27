"use client";

import Link from "next/link";
import {
  ArrowRight,
  PlusCircle,
  AlertTriangle,
  Map,
  BarChart3,
  ShieldCheck,
  Search,
  UserPlus,
  LayoutDashboard,
  Handshake,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavigationGridItem {
  icon: LucideIcon | string;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  accent: string;
  ring: string;
  dot: string;
  href: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck,
  Search,
  UserPlus,
  LayoutDashboard,
  ArrowRight,
  Handshake,
  Users,
};

interface NavigationGridProps {
  items: NavigationGridItem[];
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

type GridCols = 1 | 2 | 3 | 4 | 5 | 6;

function clampGridCols(value: number | undefined, fallback: GridCols): GridCols {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded === 2) return 2;
  if (rounded === 3) return 3;
  if (rounded === 4) return 4;
  if (rounded === 5) return 5;
  return 6;
}

function gridColsClass(prefix: "" | "sm:" | "md:" | "lg:" | "xl:", cols: GridCols) {
  const map = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  } as const;
  return `${prefix}${map[cols]}`;
}

export function NavigationGrid({
  items,
  columns = { default: 1, sm: 2, md: 3, xl: 4 },
}: NavigationGridProps) {
  const colsDefault = clampGridCols(columns.default, 1);
  const colsSm = clampGridCols(columns.sm, 2);
  const colsMd = clampGridCols(columns.md, 3);
  const colsLg = clampGridCols(columns.lg ?? columns.md, 3);
  const colsXl = clampGridCols(columns.xl, 4);

  const gridCols = [
    gridColsClass("", colsDefault),
    gridColsClass("sm:", colsSm),
    gridColsClass("md:", colsMd),
    gridColsClass("lg:", colsLg),
    gridColsClass("xl:", colsXl),
  ].join(" ");

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {items.map((item) => {
        const IconComponent =
          typeof item.icon === "string"
            ? ICON_MAP[item.icon] || PlusCircle
            : item.icon;

        return (
          <Link
            key={item.title}
            href={item.href}
            className={`group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${item.accent} ring-1 ${item.ring} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2`}
          >
            {/* coin accent dot */}
            <span
              className={`absolute right-5 top-5 h-2 w-2 rounded-full ${item.dot} opacity-60 group-hover:opacity-100 transition-opacity`}
            />

            {/* icône */}
            <div
              className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconBg} ${item.iconColor} transition-transform duration-300 group-hover:scale-110 shadow-lg`}
            >
              <IconComponent size={24} />
            </div>

            {/* titre */}
            <h3 className="mb-2 text-base font-bold cmm-text-primary leading-tight">
              {item.title}
            </h3>

            {/* description — 2 lignes max */}
            <p
              className="flex-1 text-[13px] leading-relaxed cmm-text-secondary group-hover:cmm-text-primary transition-colors"
              style={{ textWrap: "pretty" }}
            >
              {item.desc}
            </p>

            {/* lien */}
            <div
              className={`mt-5 flex items-center gap-2 cmm-text-caption font-bold uppercase tracking-widest ${item.iconColor} opacity-70 group-hover:opacity-100 transition-opacity whitespace-nowrap`}
            >
              Accéder{" "}
              <ArrowRight
                size={12}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
