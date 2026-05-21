"use client";

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnnuaireEntry } from './annuaire-helpers';

interface AnnuaireNetworkGraphProps {
  entries: AnnuaireEntry[];
  onSelectPartner: (entry: AnnuaireEntry) => void;
}

/**
 * Renders a stylized organic network graph of associations.
 * Nodes are connected if they share common tags or same arrondissement.
 */
export function AnnuaireNetworkGraph({ entries, onSelectPartner }: AnnuaireNetworkGraphProps) {
  // Generate pseudo-random positions that stay somewhat stable
  const nodes = useMemo(() => {
    return entries.slice(0, 40).map((entry, i) => {
      // Use index and name hash for deterministic positions
      const hash = entry.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      return {
        ...entry,
        x: 15 + (hash % 70) + (Math.sin(i) * 5), // 15% to 85% range
        y: 15 + ((hash * 7) % 70) + (Math.cos(i) * 5),
        size: 40 + (hash % 40)
      };
    });
  }, [entries]);

  // Generate links between associations sharing tags
  const links = useMemo(() => {
    const l: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        if (!n1 || !n2) {
          continue;
        }
        
        // Share a tag?
        const sharedTags = n1.tags?.filter((t: string) => n2.tags?.includes(t)) || [];
        
        if (sharedTags.length > 0) {
          l.push({
            id: `${n1.id}-${n2.id}`,
            x1: n1.x,
            y1: n1.y,
            x2: n2.x,
            y2: n2.y
        });
      }
    }
    }
    // Limit links to keep it clean
    return l.slice(0, 60);
  }, [nodes]);

  const getColorClass = (type: string) => {
    switch (type) {
      case 'environnemental': return 'fill-violet-500 stroke-violet-300';
      case 'social': return 'fill-indigo-500 stroke-indigo-300';
      case 'humanitaire': return 'fill-fuchsia-500 stroke-fuchsia-300';
      default: return 'fill-violet-500 stroke-violet-400';
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-violet-300/14 bg-[rgba(20,14,48,0.96)] backdrop-blur-3xl">
      {/* Background Grid / Grid Lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(196,181,253,0.06)" />
            <stop offset="50%" stopColor="rgba(196,181,253,0.18)" />
            <stop offset="100%" stopColor="rgba(196,181,253,0.06)" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Connections */}
        <g className="links">
          <AnimatePresence>
            {links.map((link) => (
              <motion.line
                key={link.id}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                x1={link.x1}
                y1={link.y1}
                x2={link.x2}
                y2={link.y2}
                stroke="url(#linkGradient)"
                strokeWidth="0.15"
                strokeDasharray="0.5 0.5"
              />
            ))}
          </AnimatePresence>
        </g>

        {/* Nodes */}
        <g className="nodes">
          <AnimatePresence>
        {nodes.map((node) => {
          const primaryType = node.types?.[0] ?? "autre";
          const nodeName = typeof node.name === "string" && node.name.trim().length > 0
            ? node.name
            : "Association";
          const nodeLocation = typeof node.location === "string" && node.location.trim().length > 0
            ? node.location
            : "";

          return (
                <motion.g
                  key={node.id}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="cursor-pointer group"
                  onClick={() => onSelectPartner(node)}
                >
                  {/* Outer Glow Halo */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="1.8"
                    className={cn("opacity-0 group-hover:opacity-40 transition-opacity duration-500", getColorClass(primaryType))}
                    filter="url(#glow)"
                  />
                  
                  {/* Main Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="1.2"
                    className={cn("transition-all duration-500 stroke-[0.2]", getColorClass(primaryType))}
                  />

                  {/* Internal Dot */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="0.4"
                    fill="white"
                    className="opacity-50 group-hover:opacity-100 transition-opacity"
                  />

                  {/* Label */}
                  <foreignObject
                    x={node.x + 1.8}
                    y={node.y - 1.5}
                    width="20"
                    height="10"
                    className="pointer-events-none overflow-visible"
                  >
                    <div className="flex flex-col">
                  <span className="whitespace-nowrap text-[1.8px] font-black uppercase tracking-widest text-white/90 drop-shadow-md">
                        {nodeName}
                      </span>
                      <span className={cn("text-[1.2px] font-bold opacity-0 group-hover:opacity-70 transition-opacity uppercase tracking-tighter", 
                        primaryType === "environnemental" ? "text-violet-300" :
                        primaryType === "social" ? "text-indigo-300" :
                        primaryType === "humanitaire" ? "text-fuchsia-300" : "text-violet-300"
                      )}>
                        {nodeLocation}
                      </span>
                    </div>
                  </foreignObject>
                </motion.g>
              );
            })}
          </AnimatePresence>
        </g>
      </svg>

      {/* Stats / Info Overlay */}
      <div className="pointer-events-none absolute bottom-6 right-6 rounded-2xl border border-violet-300/14 bg-[rgba(24,17,54,0.92)] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-violet-100/42 uppercase">Maillage</span>
            <span className="text-xl font-black text-white">{links.length} Liens</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-violet-100/42 uppercase">Densité</span>
            <span className="text-xl font-black text-white">Organique</span>
          </div>
        </div>
      </div>
    </div>
  );
}
