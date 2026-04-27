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
      const hash = entry.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
        
        // Share a tag?
        const sharedTags = n1.tags?.filter(t => n2.tags?.includes(t)) || [];
        
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
      case 'environnemental': return 'fill-emerald-500 stroke-emerald-400';
      case 'social': return 'fill-sky-500 stroke-sky-400';
      case 'humanitaire': return 'fill-rose-500 stroke-rose-400';
      default: return 'fill-violet-500 stroke-violet-400';
    }
  };

  const getGlowClass = (type: string) => {
    switch (type) {
      case 'environnemental': return 'shadow-emerald-500/50';
      case 'social': return 'shadow-sky-500/50';
      case 'humanitaire': return 'shadow-rose-500/50';
      default: return 'shadow-violet-500/50';
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950/50 backdrop-blur-3xl overflow-hidden rounded-[2rem] border border-white/5">
      {/* Background Grid / Grid Lines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
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
            {nodes.map((node) => (
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
                  className={cn("opacity-0 group-hover:opacity-40 transition-opacity duration-500", getColorClass(node.engagementType))}
                  filter="url(#glow)"
                />
                
                {/* Main Node Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="1.2"
                  className={cn("transition-all duration-500 stroke-[0.2]", getColorClass(node.engagementType))}
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
                    <span className="text-[1.8px] font-black tracking-widest text-white/90 uppercase whitespace-nowrap drop-shadow-md">
                      {node.name}
                    </span>
                    <span className={cn("text-[1.2px] font-bold opacity-0 group-hover:opacity-70 transition-opacity uppercase tracking-tighter", 
                      node.engagementType === 'environnemental' ? 'text-emerald-400' :
                      node.engagementType === 'social' ? 'text-sky-400' :
                      node.engagementType === 'humanitaire' ? 'text-rose-400' : 'text-violet-400'
                    )}>
                      {node.location}
                    </span>
                  </div>
                </foreignObject>
              </motion.g>
            ))}
          </AnimatePresence>
        </g>
      </svg>

      {/* Stats / Info Overlay */}
      <div className="absolute bottom-6 right-6 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Maillage</span>
            <span className="text-xl font-black text-white">{links.length} Liens</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Densité</span>
            <span className="text-xl font-black text-white">Organique</span>
          </div>
        </div>
      </div>
    </div>
  );
}
