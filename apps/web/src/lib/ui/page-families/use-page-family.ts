"use client";

import { usePathname } from "next/navigation";
import { resolvePageFamily } from "@/lib/ui/page-families/resolve-page-family";
import type { ResolvedPageFamily } from "@/lib/ui/page-families/types";

export function usePageFamily(): ResolvedPageFamily {
  const pathname = usePathname();
  return resolvePageFamily(pathname);
}
