import test from "node:test";
import assert from "node:assert/strict";
import {
  auditCanonicalConsumer,
  auditCmmIconSource,
} from "./check-icons-governance.mjs";

const canonicalIcon = `
import type { LucideIcon } from "lucide-react";
export type CmmIconSize = "xs" | "sm" | "md" | "lg" | "xl";
export interface CmmIconProps {
  icon: LucideIcon;
  size?: CmmIconSize;
  className?: string;
  label?: string;
}
const sizeClasses = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-7 w-7",
};
export function CmmIcon({ icon: Icon, size = "md", className, label }: CmmIconProps) {
  const isDecorative = !label;
  return <Icon className={cn("shrink-0", sizeClasses[size], className)} data-cmm-icon-size={size}
    aria-hidden={isDecorative ? true : undefined} role={isDecorative ? undefined : "img"}
    aria-label={label} focusable="false" />;
}
`;

test("accepts the canonical CmmIcon contract", () => {
  assert.deepEqual(auditCmmIconSource(canonicalIcon), []);
});

test("rejects use client on CmmIcon", () => {
  const violations = auditCmmIconSource(`${canonicalIcon}\n"use client";`);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /Server-compatible/);
});

test("rejects a forbidden strokeWidth prop", () => {
  const violations = auditCmmIconSource(canonicalIcon.replace(
    "label?: string;",
    "label?: string;\n  strokeWidth?: number;",
  ));

  assert.equal(violations.length, 1);
  assert.match(violations[0], /forbidden/);
});

test("rejects a canonical consumer that renders Lucide directly", () => {
  const violations = auditCanonicalConsumer(
    "apps/web/src/components/ui/cmm-disclosure.tsx",
    `import { ChevronDown } from "lucide-react";\n<ChevronDown className="cmm-disclosure__icon" />`,
  );

  assert.ok(violations.some((violation) => /CmmIcon/.test(violation)));
});
