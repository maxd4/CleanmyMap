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
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function RibbonDropdownItem({
  href,
  label,
  icon: Icon,
  iconClassName,
  onClick,
}: RibbonDropdownItemProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className="group flex min-h-14 w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-white transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 focus-visible:ring-inset"
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.06]",
          iconClassName,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold text-white">{label}</span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-white/65 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
        aria-hidden="true"
      />
    </Link>
  );
}
