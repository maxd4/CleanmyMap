"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Boundary {
  id: string;
  name: string;
  icon: LucideIcon;
  status: 'safe' | 'increasing-risk' | 'high-risk' | 'transgressed';
  color: string;
  radiusRatio: number;
}

interface PlanetaryRadarChartProps {
  boundaries: Boundary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PlanetaryRadarChart({ boundaries, selectedId, onSelect }: PlanetaryRadarChartProps) {
  const centerX = 200;
  const centerY = 200;
  const maxRadius = 150;
  const total = boundaries.length;
  const angleStep = (Math.PI * 2) / total;

  return (
    <div className="relative aspect-square w-full max-w-[500px] mx-auto group/radar">
      <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible drop-shadow-2xl">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Fond décoratif */}
        <circle cx={centerX} cy={centerY} r={maxRadius + 40} fill="url(#centerGradient)" className="animate-pulse" />

        {/* Cercles de référence (Radar Grid) */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, i) => (
          <circle
            key={`grid-${i}`}
            cx={centerX}
            cy={centerY}
            r={maxRadius * ratio}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray={i === 4 ? "0" : "4 4"}
          />
        ))}

        {/* Rayons de séparation */}
        {boundaries.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = centerX + Math.cos(angle) * maxRadius;
          const y = centerY + Math.sin(angle) * maxRadius;
          return (
            <line
              key={`ray-${i}`}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-200 dark:text-slate-800"
            />
          );
        })}

        {/* Segments de données */}
        {boundaries.map((boundary, i) => {
          const startAngle = i * angleStep - Math.PI / 2 - 0.05; // Petit overlap
          const endAngle = (i + 1) * angleStep - Math.PI / 2 + 0.05;
          
          const radius = maxRadius * boundary.radiusRatio;
          const isSelected = selectedId === boundary.id;
          
          const x1 = centerX + Math.cos(startAngle) * radius;
          const y1 = centerY + Math.sin(startAngle) * radius;
          const x2 = centerX + Math.cos(endAngle) * radius;
          const y2 = centerY + Math.sin(endAngle) * radius;

          const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

          // Position de l'icône
          const midAngle = startAngle + (endAngle - startAngle) / 2;
          const iconRadius = maxRadius + 35;
          const iconX = centerX + Math.cos(midAngle) * iconRadius;
          const iconY = centerY + Math.sin(midAngle) * iconRadius;

          return (
            <g 
              key={boundary.id} 
              onClick={() => onSelect(boundary.id)} 
              className="cursor-pointer"
            >
              {/* Segment principal */}
              <motion.path
                d={pathData}
                fill={boundary.color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: isSelected ? 0.9 : 0.4,
                  filter: isSelected ? "url(#glow)" : "none"
                }}
                whileHover={{ opacity: 0.7 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 100 }}
                className="transition-all duration-500"
                style={{ transformOrigin: `${centerX}px ${centerY}px` }}
              />

              {/* Cercle indicateur d'icône */}
              <motion.foreignObject
                x={iconX - 22}
                y={iconY - 22}
                width="44"
                height="44"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                <div 
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 border backdrop-blur-xl",
                    isSelected 
                      ? "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xl scale-110 z-20" 
                      : "bg-white/40 dark:bg-slate-900/40 border-white/20 hover:bg-white/60 dark:hover:bg-slate-800/60"
                  )}
                >
                  <boundary.icon 
                    size={20} 
                    className={cn(
                      "transition-colors duration-500",
                      isSelected ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                    )}
                    style={isSelected ? { color: boundary.color } : {}}
                  />
                </div>
              </motion.foreignObject>

              {/* Lueur de sélection */}
              {isSelected && (
                <motion.circle
                  cx={iconX}
                  cy={iconY}
                  r={2}
                  fill={boundary.color}
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 15], opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="pointer-events-none"
                />
              )}
            </g>
          );
        })}
        
        {/* Noyau central */}
        <g className="pointer-events-none">
          <circle cx={centerX} cy={centerY} r={18} fill="#0f172a" className="dark:fill-white" />
          <circle cx={centerX} cy={centerY} r={14} fill="white" className="dark:fill-slate-950 shadow-inner" />
          <motion.circle 
            cx={centerX} cy={centerY} r={6} 
            fill="currentColor" 
            className="text-emerald-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </g>
      </svg>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
