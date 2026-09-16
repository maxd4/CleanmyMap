import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type NavigationItemTextProps = {
  label: ReactNode;
  description?: ReactNode;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  labelStyle?: CSSProperties;
};

/** Shared typography wrapper for navigation labels and optional descriptions. */
export function NavigationItemText({
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  labelStyle,
}: NavigationItemTextProps) {
  return (
    <span className={cn("flex min-w-0 flex-1 flex-col items-start gap-1", className)}>
      <span
        className={cn("block min-w-0 break-words cmm-text-small", labelClassName)}
        style={labelStyle}
      >
        {label}
      </span>
      {description !== undefined && description !== null ? (
        <span
          className={cn(
            "block min-w-0 w-full whitespace-normal break-words cmm-text-caption text-left leading-snug",
            descriptionClassName,
          )}
        >
          {description}
        </span>
      ) : null}
    </span>
  );
}
