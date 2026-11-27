"use client";

import { useId } from "react";
import type { PlanetaryBoundary } from "./planetary-boundaries-data";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type Props = { boundaries: PlanetaryBoundary[]; selectedId: string | null; onSelect: (id: string) => void; locale: LearnLocale };

// All wedges have equal area. This is a categorical wheel, not a comparison
// of numeric distances from boundaries with different control variables.
export function PlanetaryRadarChart({ boundaries, selectedId, onSelect, locale }: Props) {
  const titleId = useId();
  const fr = locale === "fr";
  const center = 160;
  const radius = 125;
  const crossed = boundaries.filter((boundary) => boundary.status === "transgressed").length;
  return (
    <svg viewBox="0 0 320 320" className="mx-auto w-full max-w-[360px]" role="group" aria-labelledby={titleId}>
      <title id={titleId}>{fr ? "Roue des limites planétaires, statuts catégoriels" : "Planetary boundary wheel, categorical status"}</title>
      {boundaries.map((boundary, index) => {
        const step = 2 * Math.PI / boundaries.length;
        const start = index * step - Math.PI / 2 + 0.025;
        const end = (index + 1) * step - Math.PI / 2 - 0.025;
        const point = (angle: number, distance: number) => `${center + Math.cos(angle) * distance} ${center + Math.sin(angle) * distance}`;
        const middle = (start + end) / 2;
        const selected = selectedId === boundary.id;
        return (
          <g key={boundary.id} role="button" tabIndex={0} aria-pressed={selected}
            aria-label={`${fr ? boundary.name : boundary.nameEn}: ${boundary.status === "transgressed" ? (fr ? "franchie" : "transgressed") : (fr ? "non franchie globalement" : "not globally transgressed")}`}
            onClick={() => onSelect(boundary.id)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(boundary.id); } }}
            className="cursor-pointer outline-none focus-visible:[&>path]:stroke-slate-950 dark:focus-visible:[&>path]:stroke-white">
            <path d={`M ${center} ${center} L ${point(start, radius)} A ${radius} ${radius} 0 0 1 ${point(end, radius)} Z`} fill={boundary.status === "transgressed" ? "#BE123C" : "#047857"} stroke={selected ? "#D97706" : "transparent"} strokeWidth={selected ? 4 : 2} />
            <g transform={`translate(${center + Math.cos(middle) * 94 - 12},${center + Math.sin(middle) * 94 - 12})`} aria-hidden="true"><boundary.icon size={24} className="text-white" /></g>
          </g>
        );
      })}
      <circle cx={center} cy={center} r="45" fill="white" stroke="#FCD34D" strokeWidth="3" pointerEvents="none" />
      <text x={center} y={center - 1} fill="#0F172A" fontSize="25" fontWeight="700" textAnchor="middle" pointerEvents="none">{crossed}/{boundaries.length}</text>
      <text x={center} y={center + 18} fill="#475569" fontSize="10" textAnchor="middle" pointerEvents="none">{fr ? "franchies" : "transgressed"}</text>
    </svg>
  );
}
