"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { MouseEvent, ReactNode } from "react";

export function Badge3D({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseXPos = event.clientX - rect.left;
    const mouseYPos = event.clientY - rect.top;

    const xPct = mouseXPos / width - 0.5;
    const yPct = mouseYPos / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const rotateX = useMotionTemplate`${mouseY} * -20deg`;
  const rotateY = useMotionTemplate`${mouseX} * 20deg`;

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative rounded-xl transition-shadow hover:shadow-2xl ${className}`}
    >
      {/* Glossy overlay effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(
            circle at ${useMotionTemplate`calc(50% + ${mouseX} * 100%)`} ${useMotionTemplate`calc(50% + ${mouseY} * 100%)`},
            rgba(255, 255, 255, 0.4) 0%,
            transparent 50%
          )`,
        }}
      />
      {children}
    </motion.div>
  );
}
