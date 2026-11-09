"use client";

import type {
  CSSProperties,
  ReactElement,
  ReactNode,
} from "react";

import {
  CmmDropdown,
  type CmmDropdownTriggerProps,
} from "./cmm-dropdown";

export type CmmPopoverTriggerProps = CmmDropdownTriggerProps;

export interface CmmPopoverProps {
  id: string;
  ariaLabel: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  renderTrigger: (props: CmmPopoverTriggerProps) => ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  panelAlignment?: "center" | "start";
  wrapperClassName?: string;
  verticalGap?: number;
  openOnHover?: boolean;
}

/**
 * Panneau contextuel riche non modal : le comportement de placement, de
 * fermeture et de restauration du focus reste porté par CmmDropdown.
 */
export function CmmPopover({
  id,
  ariaLabel,
  ariaLabelledBy,
  children,
  renderTrigger,
  open,
  defaultOpen = false,
  onOpenChange,
  panelClassName,
  panelStyle,
  panelAlignment = "center",
  wrapperClassName,
  verticalGap,
  openOnHover = false,
}: CmmPopoverProps) {
  return (
    <CmmDropdown
      id={id}
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy}
      renderTrigger={renderTrigger}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      panelRole="dialog"
      triggerHasPopup="dialog"
      panelClassName={panelClassName}
      panelStyle={panelStyle}
      panelAlignment={panelAlignment}
      wrapperClassName={wrapperClassName}
      verticalGap={verticalGap}
      openOnHover={openOnHover}
    >
      {children}
    </CmmDropdown>
  );
}
