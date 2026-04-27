"use client";

import { motion } from"framer-motion";
import { useSitePreferences } from"./site-preferences-provider";

export function PunchySlogan() {
 const { displayMode } = useSitePreferences();
 const isSober = displayMode ==="sobre";
 const words = ["Dépolluer","Cartographier","Impacter"];

 if (isSober) {
 return (
 <header className="mb-4 mt-2 px-2 border-l-4 border-emerald-500 pl-6">
 <div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto scrollbar-none">
 {words.map((word, index) => (
 <span
 key={word}
 className="text-3xl font-bold leading-none tracking-tighter cmm-text-primary md:text-5xl"
 >
 {word}
 {index < words.length - 1 ? <span className="mx-2 text-emerald-500">-</span> : null}
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
 transition={{ duration: 0.6, ease:"easeOut" }}
 className="flex items-center gap-2 whitespace-nowrap overflow-x-auto scrollbar-none sm:gap-3"
 >
 {words.map((word, i) => (
 <motion.span
 key={word}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.5, delay: i * 0.15 }}
 className="text-3xl font-bold leading-none tracking-tighter text-emerald-950 sm:text-5xl md:text-6xl"
 style={{
 fontFamily: 'var(--font-outfit), sans-serif',
 filter:"drop-shadow(0 1px 1px rgba(0,0,0,0.05))"
 }}
 >
 {word}
 {i < words.length - 1 ? <span className="mx-2 text-emerald-500">-</span> : null}
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
