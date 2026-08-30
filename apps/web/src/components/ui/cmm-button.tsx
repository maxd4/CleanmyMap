"use client";

import Link from"next/link";
import type { MouseEvent, ReactElement, ReactNode, Ref } from"react";
import { isValidElement, cloneElement } from"react";
import { cn } from"@/lib/utils";

export type ButtonTone ="primary" |"secondary" |"tertiary" |"destructive";
export type ButtonSize ="sm" |"md" |"lg";
export type ButtonVariant ="default" |"pill" |"ghost";

export interface CmmButtonProps {
 children: ReactNode;
 href?: string;
 prefetch?: boolean;
 onClick?: () => void;
 tone?: ButtonTone;
 size?: ButtonSize;
 variant?: ButtonVariant;
 className?: string;
 disabled?: boolean;
 loading?: boolean;
 ariaLabel?: string;
 title?: string;
 type?:"button" |"submit" |"reset";
 asChild?: boolean;
 ref?: Ref<HTMLButtonElement>;
}

type CmmButtonChildProps = {
 className?: string;
 onClick?: (event: MouseEvent<HTMLElement>) => void;
 disabled?: boolean;
 tabIndex?: number;
 title?: string;
 "aria-label"?: string;
 "aria-busy"?: boolean;
 "aria-disabled"?: boolean;
};

export function CmmButton({
 children,
 href,
 prefetch = false,
 onClick,
 tone ="secondary",
 size ="md",
 variant ="default",
 className,
 disabled,
 ariaLabel,
 title,
 type ="button",
 asChild = false,
 loading = false,
 ref,
}: CmmButtonProps) {
 const blocked = Boolean(disabled || loading);
 const classes = cn("cmm-button", className);
 const handleClick = (event: MouseEvent<HTMLElement>) => {
  if (blocked) {
   event.preventDefault();
   event.stopPropagation();
   return;
  }

  onClick?.();
 };
 const stateProps = {
  "data-cmm-button-tone": tone,
  "data-cmm-button-size": size,
  "data-cmm-button-variant": variant,
  "data-cmm-button-disabled": disabled ? "true" : undefined,
  "data-cmm-button-loading": loading ? "true" : undefined,
  "aria-busy": loading || undefined,
  "aria-disabled": blocked || undefined,
 };

 if (href) {
 return (
 <Link
  href={href}
  prefetch={prefetch}
  className={classes}
  onClick={handleClick}
  aria-label={ariaLabel}
  title={title}
  tabIndex={blocked ? -1 : undefined}
  {...stateProps}
 >
 {children}
 </Link>
 );
 }

 if (asChild && isValidElement(children)) {
   const child = children as ReactElement<CmmButtonChildProps>;
   const childOnClick = child.props.onClick;
   const childProps: Partial<CmmButtonChildProps> & Record<string, unknown> = {
    ...stateProps,
    className: cn(classes, child.props.className),
    onClick: (event: MouseEvent<HTMLElement>) => {
     if (blocked) {
      event.preventDefault();
      event.stopPropagation();
      return;
     }

     childOnClick?.(event);
     onClick?.();
    },
    "aria-label": ariaLabel ?? child.props["aria-label"],
    title: title ?? child.props.title,
    "aria-busy": loading || child.props["aria-busy"] || undefined,
    "aria-disabled": blocked || child.props["aria-disabled"] || undefined,
    tabIndex: blocked ? -1 : child.props.tabIndex,
   };

   if (child.type === "button") {
    childProps.disabled = blocked;
   }

   return cloneElement(child, childProps);
 }

 return (
 <button
  ref={ref}
  type={type}
  onClick={handleClick}
  disabled={blocked}
  className={classes}
  aria-label={ariaLabel}
  title={title}
  {...stateProps}
 >
 {children}
 </button>
 );
}

// Groupe de boutons
export interface CmmButtonGroupProps {
 children: ReactNode;
 className?: string;
}

export function CmmButtonGroup({ children, className }: CmmButtonGroupProps) {
 return (
 <div className={cn("flex flex-wrap items-center gap-2", className)}>
 {children}
 </div>
 );
}
