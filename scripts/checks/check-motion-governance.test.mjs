import test from "node:test";
import assert from "node:assert/strict";
import {
  auditActionCard,
  auditDisplayModesCss,
  auditMotionCss,
  auditPageTransition,
  auditPunchySlogan,
} from "./check-motion-governance.mjs";

const canonicalMotionCss = `
.cmm-hover-lift { transition: transform 0.15s ease; }
.cmm-active-press:active { transform: translateY(1px); }
.cmm-icon-nudge-x { transition: transform 0.2s ease; }
@media (prefers-reduced-motion: reduce) {
  .cmm-hover-lift, .cmm-active-press, .cmm-icon-nudge-x {
    transition: none !important;
    transform: none !important;
  }
}
`;

test("accepts the canonical Motion helper contract", () => {
  assert.deepEqual(auditMotionCss(canonicalMotionCss), []);
});

test("rejects a Motion stylesheet without prefers-reduced-motion", () => {
  const violations = auditMotionCss(canonicalMotionCss.replace(
    "@media (prefers-reduced-motion: reduce)",
    "@media (prefers-contrast: more)",
  ));

  assert.ok(violations.some((violation) => /prefers-reduced-motion/.test(violation)));
});

test("accepts a static sobre helper contract", () => {
  const source = `
  [data-display-mode="minimaliste"] .cmm-hover-lift:hover { transform: none; }
  [data-display-mode="minimaliste"] .group:hover .cmm-icon-nudge-x { transform: none; }
  [data-display-mode="sobre"] .cmm-hover-lift { transition: none !important; transform: none !important; }
  [data-display-mode="sobre"] .cmm-icon-nudge-x { transition: none !important; transform: none !important; }
  [data-display-mode="sobre"] .cmm-sober-animate { animation: none !important; transition: none !important; }
  `;

  assert.deepEqual(auditDisplayModesCss(source), []);
});

test("rejects PageTransition without useReducedMotion", () => {
  const source = `
  import { motion } from "framer-motion";
  import { useSitePreferences } from "./site-preferences-provider";
  const { displayMode } = useSitePreferences();
  const isMinimal = displayMode === "minimaliste";
  const isStatic = displayMode === "sobre";
  <motion.div animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0 }} />;
  `;
  const violations = auditPageTransition(source);

  assert.ok(violations.some((violation) => /useReducedMotion/.test(violation)));
});

test("rejects PunchySlogan without displayMode", () => {
  const source = `
  import { motion, useReducedMotion } from "framer-motion";
  const shouldReduceMotion = useReducedMotion();
  const isSober = shouldReduceMotion;
  const isMinimal = false;
  <motion.div />;
  `;
  const violations = auditPunchySlogan(source);

  assert.ok(violations.some((violation) => /displayMode/.test(violation)));
});

test("rejects reduced motion being assimilated to the sobre display mode", () => {
  const source = `
  const shouldReduceMotion = useReducedMotion();
  const isSober = displayMode === "sobre" || shouldReduceMotion;
  const isMinimal = displayMode === "minimaliste";
  `;
  const violations = auditPunchySlogan(source);

  assert.ok(violations.some((violation) => /assimilated to isSober/.test(violation)));
});

test("rejects ActionCard local lift and icon nudge recipes", () => {
  const source = `
  export function ActionCard() {
    return <Link className="group transition-all duration-300 hover:-translate-y-0.5">
      <CmmIcon size="lg" />
      <CmmIcon size="sm" className="transition-transform duration-300 group-hover:translate-x-1" />
    </Link>;
  }
  export type CTAGroupProps = {};
  `;
  const violations = auditActionCard(source);

  assert.ok(violations.some((violation) => /local lift recipe/.test(violation)));
  assert.ok(violations.some((violation) => /local icon nudge recipe/.test(violation)));
});
