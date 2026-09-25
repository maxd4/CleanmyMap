"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LearnPracticeThemeTabs } from "@/components/learn/learn-practice-theme-tabs";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import type { LearnPracticeThemeId } from "@/lib/learning/practice/themes";

const VALID_THEMES: LearnPracticeThemeId[] = ["tri", "compost", "reduire", "numerique"];

function normalizeTheme(theme: string | null): LearnPracticeThemeId {
  return VALID_THEMES.includes(theme as LearnPracticeThemeId)
    ? (theme as LearnPracticeThemeId)
    : "tri";
}

export function LearnPracticeThemeSelection({ locale }: { locale: LearnLocale }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTheme = normalizeTheme(searchParams.get("theme"));

  const handleThemeChange = (theme: LearnPracticeThemeId) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("theme", theme);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <LearnPracticeThemeTabs
      locale={locale}
      activeTheme={activeTheme}
      onThemeChange={handleThemeChange}
    />
  );
}
