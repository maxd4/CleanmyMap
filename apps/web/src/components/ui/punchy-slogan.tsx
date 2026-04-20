"use client";

import { motion } from "framer-motion";
import { useSitePreferences } from "./site-preferences-provider";

export function PunchySlogan() {
  const { displayMode } = useSitePreferences();
  const isSober = displayMode === "sobre";
  const words = ["Agir.", "Cartographier.", "Préserver."];

  if (isSober) {
    return (
      <header className="mb-4 mt-2 px-2 border-l-4 border-emerald-500 pl-6">
        <div className="flex flex-col gap-0.5">
          {words.map((word) => (
            <span
              key={word}
              className="text-4xl font-black leading-[0.85] tracking-tighter text-slate-900 md:text-6xl"
            >
              {word}
            </span>
          ))}
        </div>
      </header>
    );
  }

  return (
    <header className="mb-8 mt-4 px-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col gap-1 sm:gap-2"
      >
        {words.map((word, i) => (
          <motion.span
            key={word}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="text-4xl font-black leading-[0.9] tracking-tighter text-emerald-950 sm:text-6xl md:text-7xl"
            style={{
              fontFamily: 'var(--font-outfit), sans-serif',
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.05))"
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="mt-6 h-1 w-24 origin-left rounded-full bg-emerald-500"
      />
    </header>
  );
}
