"use client";

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import {
  annuaireGraphColorClass,
  buildAnnuaireGraphLinks,
  buildAnnuaireGraphNodes,
  type AnnuaireGraphLink,
  type AnnuaireGraphNode,
} from "./annuaire-network-graph.model";

interface AnnuaireNetworkGraphProps {
  entries: AnnuaireEntry[];
  onSelectPartner: (entry: AnnuaireEntry) => void;
}

function AnnuaireNetworkNode({ node, onSelectPartner }: { node: AnnuaireGraphNode; onSelectPartner: (entry: AnnuaireEntry) => void }) {
  const primaryType = node.types?.[0] ?? "autre";
  const nodeName = typeof node.name === "string" && node.name.trim().length > 0 ? node.name : "Association";
  const nodeLocation = typeof node.location === "string" && node.location.trim().length > 0 ? node.location : "";
  const colorClass = annuaireGraphColorClass(primaryType);

  return <motion.g
    key={node.id}
    data-motion-role="decorative"
    layout
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0, opacity: 0 }}
    transition={{ type: "spring", stiffness: 100, damping: 15 }}
    className="cursor-pointer group"
    role="button"
    tabIndex={0}
    aria-label={`Ouvrir la fiche de ${nodeName}`}
    onClick={() => onSelectPartner(node)}
    onKeyDown={(event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelectPartner(node);
    }}
  >
    <circle cx={node.x} cy={node.y} r="1.8" className={cn("opacity-0 group-hover:opacity-40 transition-opacity duration-500", colorClass)} filter="url(#glow)" />
    <circle cx={node.x} cy={node.y} r="1.2" className={cn("transition-all duration-500 stroke-[0.2]", colorClass)} />
    <circle cx={node.x} cy={node.y} r="0.4" fill="white" className="opacity-50 group-hover:opacity-100 transition-opacity" />
    <foreignObject x={node.x + 1.8} y={node.y - 1.5} width="20" height="10" className="pointer-events-none overflow-visible">
      <div className="flex flex-col">
        <span className="whitespace-nowrap text-xs font-black uppercase tracking-widest text-white drop-shadow-md">{nodeName}</span>
        <span className={cn("text-xs font-bold opacity-0 group-hover:opacity-70 transition-opacity uppercase tracking-tighter", primaryType === "humanitaire" ? "text-fuchsia-300" : "text-violet-300")}>{nodeLocation}</span>
      </div>
    </foreignObject>
  </motion.g>;
}

function AnnuaireGraphLinks({ links }: { links: AnnuaireGraphLink[] }) {
  return <g className="links" aria-label="Similarités thématiques, pas collaborations vérifiées"><AnimatePresence>{links.map((link) => <motion.line key={link.id} data-motion-role="decorative" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5, ease: "easeInOut" }} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} stroke="url(#linkGradient)" strokeWidth="0.15" strokeDasharray="0.5 0.5" />)}</AnimatePresence></g>;
}

/**
 * Renders a thematic similarity graph.
 * A line means that two entries share an editorial tag; it is not evidence of
 * a collaboration, partnership or operational relationship.
 */
export function AnnuaireNetworkGraph({ entries, onSelectPartner }: AnnuaireNetworkGraphProps) {
  const nodes = useMemo(() => buildAnnuaireGraphNodes(entries), [entries]);
  const links = useMemo(() => buildAnnuaireGraphLinks(nodes), [nodes]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-violet-300/14 bg-[rgba(20,14,48,0.96)] backdrop-blur-3xl">
      {/* Background Grid / Grid Lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        role="group"
        aria-label="Graphe de similarités thématiques fondé sur les tags déclarés"
      >
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
        <g className="links" aria-label="Similarités thématiques, pas collaborations vérifiées">
          <AnnuaireGraphLinks links={links} />
        </g>

        {/* Nodes */}
        <g className="nodes">
          <AnimatePresence>
            {nodes.map((node) => <AnnuaireNetworkNode key={node.id} node={node} onSelectPartner={onSelectPartner} />)}
          </AnimatePresence>
        </g>
      </svg>

      {/* Stats / Info Overlay */}
      <div className="pointer-events-none absolute bottom-6 right-6 rounded-2xl border border-violet-300/14 bg-[rgba(24,17,54,0.92)] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-widest text-violet-100/42 uppercase">Similarités thématiques</span>
            <span className="text-xl font-black text-white">{links.length} similarités</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-violet-100/42 uppercase">Densité</span>
            <span className="text-xl font-black text-white">Tags communs</span>
          </div>
        </div>
        <p className="mt-3 max-w-[15rem] text-xs leading-relaxed text-slate-300">
          Un lien signale des thèmes communs, pas une collaboration vérifiée.
        </p>
      </div>
    </div>
  );
}
