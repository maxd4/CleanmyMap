import { cn } from "@/lib/utils";

type TabStripTone = "emerald" | "pink";

const SURFACE = {
  emerald: "border-emerald-100 bg-white shadow-sm",
  pink: "border-pink-200 bg-white shadow-[0_6px_24px_rgba(131,24,67,0.08)]",
} as const;

const ITEM = {
  emerald: {
    focus: "focus-visible:ring-emerald-300",
    active: "bg-emerald-700 text-white shadow-sm",
    inactive: "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900",
  },
  pink: {
    focus: "focus-visible:ring-pink-700",
    active: "bg-gradient-to-br from-pink-800 to-pink-900 text-white shadow-md",
    inactive: "text-pink-900 hover:bg-pink-100",
  },
} as const;

/** Shared presentation only; callers retain their own link/button navigation. */
export function tabStripClassName(tone: TabStripTone, columns: string) {
  return cn("grid w-full gap-2 rounded-2xl border p-2", SURFACE[tone], columns);
}

export function tabItemClassName(tone: TabStripTone, active: boolean) {
  const item = ITEM[tone];
  return cn(
    "inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-bold tracking-normal transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:text-base",
    item.focus,
    active ? item.active : item.inactive,
  );
}
