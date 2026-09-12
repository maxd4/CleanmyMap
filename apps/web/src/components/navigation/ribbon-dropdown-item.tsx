"use client";

import type { MouseEventHandler } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type RibbonDropdownItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
  compact?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function RibbonDropdownItem({
  href,
  label,
  icon: Icon,
  iconClassName,
  compact = false,
  onClick,
}: RibbonDropdownItemProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center rounded-xl text-left text-white transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 focus-visible:ring-inset",
        compact ? "min-h-12 gap-2 px-2 py-2" : "min-h-14 gap-3 px-3.5 py-3",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.06]",
          compact ? "h-8 w-8" : "h-10 w-10",
          iconClassName,
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      </span>
      <span className={cn("min-w-0 flex-1 text-sm font-bold text-white", compact && "text-[13px] leading-snug")}>
        {label}
      </span>
      <ChevronRight
        className={cn(
          "h-5 w-5 shrink-0 text-white/65 transition-colors group-hover:text-white",
          compact && "h-4 w-4",
        )}
        aria-hidden="true"
      />
    </Link>
  );
}
