"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { getNavigationLabels, NAVIGATION_CATEGORIES } from "@/lib/navigation";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();
  const { locale } = useSitePreferences();
  const labels = getNavigationLabels(locale);

  return (
    <nav className="mt-4 space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{labels.navTitle}</p>
        <p className="text-xs text-slate-500">{labels.summary}</p>
      </div>

      <div className="hidden gap-3 lg:grid lg:grid-cols-2">
        {NAVIGATION_CATEGORIES.map((category) => (
          <section key={category.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{category.label[locale]}</h2>
            <ul className="mt-2 space-y-2">
              {category.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg border px-3 py-2 transition ${
                        active
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      <p className="text-sm font-semibold">{item.label[locale]}</p>
                      <p className="text-xs text-slate-500">{item.description[locale]}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="space-y-2 lg:hidden">
        {NAVIGATION_CATEGORIES.map((category) => (
          <details key={category.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">{category.label[locale]}</summary>
            <ul className="mt-2 space-y-2">
              {category.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg border px-3 py-2 transition ${
                        active
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      <p className="text-sm font-semibold">{item.label[locale]}</p>
                      <p className="text-xs text-slate-500">{item.description[locale]}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </nav>
  );
}
