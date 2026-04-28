"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RadialProgressGaugeProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label: string;
  subLabel?: string;
  color?: string;
}

export function RadialProgressGauge({
  value,
  size = 200,
  strokeWidth = 16,
  label,
  subLabel,
  color = "emerald"
}: RadialProgressGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colorClasses = {
    emerald: "stroke-emerald-500",
    blue: "stroke-blue-500",
    violet: "stroke-violet-500",
    amber: "stroke-amber-500"
  };

  const bgClasses = {
    emerald: "stroke-emerald-100 dark:stroke-emerald-950",
    blue: "stroke-blue-100 dark:stroke-blue-950",
    violet: "stroke-violet-100 dark:stroke-violet-950",
    amber: "stroke-amber-100 dark:stroke-amber-950"
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg
          className="transform -rotate-90 w-full h-full"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className={bgClasses[color as keyof typeof bgClasses]}
          />
          {/* Progress Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            className={colorClasses[color as keyof typeof colorClasses]}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-4xl font-black cmm-text-primary tracking-tighter"
          >
            {Math.round(value)}%
          </motion.span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
            Objectif
          </span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <h4 className="text-lg font-bold cmm-text-primary">{label}</h4>
        {subLabel && (
          <p className="text-sm cmm-text-secondary font-medium mt-1 italic">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
}
