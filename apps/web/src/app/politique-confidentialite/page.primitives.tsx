import type { ReactNode } from "react";

export function Pill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{children}</span>;
}

export function DataList({ items }: { items: string[] }) {
  return <ul className="cmm-text-body space-y-2">{items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /><span>{item}</span></li>)}</ul>;
}
