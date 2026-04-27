"use client";

import { BadgeSurface, type BadgeSurfaceTone } from"@/components/gamification/badge-surface";

type IdentityBadgeProps = {
 icon: string;
 label: string;
 tone: BadgeSurfaceTone;
 className?: string;
};

export function IdentityBadge({
 icon,
 label,
 tone,
 className,
}: IdentityBadgeProps) {
 return (
 <BadgeSurface icon={icon} label={label} tone={tone} className={className} />
 );
}
