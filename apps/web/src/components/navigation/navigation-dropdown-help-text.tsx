"use client";

import { cn } from "@/lib/utils";
import { NAVIGATION_DROPDOWN_HELP_TEXT_CLASS_NAME } from "./navigation-dropdown-help-text-theme";

type NavigationDropdownHelpTextProps = {
  id?: string;
  text: string;
  className?: string;
};

export function NavigationDropdownHelpText({
  id,
  text,
  className,
}: NavigationDropdownHelpTextProps) {
  return (
    <>
      <span aria-hidden="true" className={cn(NAVIGATION_DROPDOWN_HELP_TEXT_CLASS_NAME, className)}>
        {text}
      </span>
      {id ? (
        <span id={id} className="sr-only">
          {text}
        </span>
      ) : null}
    </>
  );
}
