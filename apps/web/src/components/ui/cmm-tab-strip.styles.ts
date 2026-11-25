import { cn } from "@/lib/utils";

const STRIP = "grid w-full gap-2 rounded-2xl border p-2";
const ITEM =
  "inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-bold tracking-normal transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:text-base";

/** Presentation shared by linked and local tabs; navigation and ARIA stay with callers. */
export function tabStripClassName(tone: "emerald" | "family", columns: string): string {
  return cn(STRIP, tone === "emerald" ? "border-emerald-100 bg-white shadow-sm" : "cmm-family-tab-strip", columns);
}

export function tabItemClassName(tone: "emerald" | "family", active: boolean): string {
  if (tone === "family") return cn(ITEM, "cmm-family-tab-item", active && "cmm-family-tab-item--active");
  return cn(
    ITEM,
    "focus-visible:ring-emerald-300",
    active ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900",
  );
}
