"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PublicCleanlinessOrganizationNode, PublicCleanlinessOrganizationRelation } from "@/lib/partners/public-cleanliness-organization";
import { getOrgChartFitScale, layoutPublicCleanlinessForest, ORG_NODE_HEIGHT, ORG_NODE_WIDTH } from "./public-cleanliness-org-chart.model";

export interface PublicCleanlinessOrgChartProps {
  fr?: boolean;
  administrativeRoots: PublicCleanlinessOrganizationNode[];
  childrenById: Map<string, string[]>;
  nodeById: Map<string, PublicCleanlinessOrganizationNode>;
  relations: readonly PublicCleanlinessOrganizationRelation[];
  includedIds: Set<string>;
  selectedId: string | null;
  collapsed: Record<string, boolean>;
  isSearching: boolean;
  zoom: number;
  treeLabel: string;
  expandLabel: string;
  collapseLabel: string;
  fitLabel: string;
  legendLabels: {
    confirmed: string;
    historical: string;
    unknown: string;
    nonHierarchyNote: string;
  };
  displayName: (node: PublicCleanlinessOrganizationNode) => string;
  kindLabel: (kind: PublicCleanlinessOrganizationNode["kind"]) => string;
  statusLabel: (status: PublicCleanlinessOrganizationNode["assignment"]) => string;
  statusStyle: Record<PublicCleanlinessOrganizationNode["assignment"], string>;
  onSelect: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string, nextCollapsed: boolean) => void;
  onResetView: () => void;
  onZoomChange: (zoom: number) => void;
}


const STATUS_COLOR = { confirmed: "#15803d", historical: "#b45309", unknown: "#64748b" } as const;
const STATUS_DASH = { confirmed: undefined, historical: "8 5", unknown: "2 5" } as const;
const RELATION_COLORS = { hierarchy: "#64748b", mandate: "#a21caf", assignment: "#be185d", coordination: "#0369a1", cooperation: "#0f766e", programme: "#b45309", service: "#4338ca" } as const;

export function PublicCleanlinessOrgChart({
  fr = true, administrativeRoots, childrenById, nodeById, relations, includedIds,
  selectedId, collapsed, isSearching, zoom, treeLabel, expandLabel, collapseLabel,
  fitLabel, legendLabels, displayName, kindLabel, statusLabel, statusStyle, onSelect,
  onToggleCollapse, onResetView, onZoomChange,
}: PublicCleanlinessOrgChartProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [relationMode, setRelationMode] = useState<"selected" | "all" | "hierarchy">("selected");
  const [fullscreen, setFullscreen] = useState(false); const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const layout = layoutPublicCleanlinessForest(administrativeRoots, childrenById, includedIds, collapsed, isSearching);
  const fitScale = getOrgChartFitScale(viewport.width, viewport.height, layout.width, layout.height);
  const scale = fitScale * zoom;
  const offset = {
    x: Math.max(0, (viewport.width - layout.width * scale) / 2) + pan.x,
    y: Math.max(0, (viewport.height - layout.height * scale) / 2) + pan.y,
  };

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const measure = () => setViewport({ width: element.clientWidth, height: element.clientHeight });
    const onFullscreen = () => setFullscreen(document.fullscreenElement === frameRef.current);
    measure(); setFullscreenSupported(Boolean(document.fullscreenEnabled));
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);

  const fit = () => { setPan({ x: 0, y: 0 }); onResetView(); };
  const center = (x: number, y: number, targetScale: number) => {
    const nextZoom = Math.max(0.2, Math.min(60, targetScale / fitScale));
    const s = fitScale * nextZoom;
    onZoomChange(nextZoom);
    setPan({
      x: viewport.width / 2 - x * s - Math.max(0, (viewport.width - layout.width * s) / 2),
      y: viewport.height / 2 - y * s - Math.max(0, (viewport.height - layout.height * s) / 2),
    });
  };
  const focusNode = () => {
    const node = selectedId ? layout.positions.get(selectedId) : null;
    if (node) center(node.x + ORG_NODE_WIDTH / 2, node.y + ORG_NODE_HEIGHT / 2, Math.max(scale, 0.8));
  };

  const renderBranch = (node: PublicCleanlinessOrganizationNode): ReactNode => {
    const position = layout.positions.get(node.id);
    if (!position) return null;
    const children = (childrenById.get(node.id) ?? []).filter(id => includedIds.has(id)).map(id => nodeById.get(id)).filter((item): item is PublicCleanlinessOrganizationNode => Boolean(item));
    const isCollapsed = !isSearching && (collapsed[node.id] ?? false);
    return <li key={node.id} className="contents">
      <div data-org-node-id={node.id} className={cn("absolute flex flex-col overflow-hidden rounded-xl border p-2.5 bg-[var(--cmm-surface-background)]", selectedId === node.id ? "border-violet-500 ring-2 ring-violet-500/40" : "border-[var(--cmm-surface-border)]")} style={{ left: position.x, top: position.y, width: ORG_NODE_WIDTH, height: ORG_NODE_HEIGHT }}>
        <button type="button" aria-current={selectedId === node.id ? "true" : undefined} data-assignment={node.assignment} title={displayName(node)} onClick={() => onSelect(node.id)} className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500">
          <span className="block truncate text-xs font-semibold cmm-text-secondary">{kindLabel(node.kind)}</span>
          <span className="line-clamp-2 text-sm font-bold leading-tight cmm-text-primary">{displayName(node)}</span>
          <span className={cn("mt-1 inline-block rounded-full border px-1.5 text-xs font-semibold", statusStyle[node.assignment])}>{statusLabel(node.assignment)}</span>
        </button>
        {children.length > 0 && !isSearching ? <button type="button" aria-label={(isCollapsed ? expandLabel : collapseLabel) + " " + displayName(node)} aria-expanded={!isCollapsed} aria-controls={"org-children-" + node.id} onClick={() => onToggleCollapse(node.id, !isCollapsed)} className="absolute bottom-2 right-2 rounded border bg-[var(--cmm-surface-background)] px-1.5 text-xs cmm-text-primary">{isCollapsed ? "+ (" + children.length + ")" : "−"}</button> : null}
      </div>
      {children.length > 0 && !isCollapsed ? <ul id={"org-children-" + node.id} className="contents">{children.map(renderBranch)}</ul> : null}
    </li>;
  };
  const visibleRelations = relations.filter(edge => layout.positions.has(edge.from) && layout.positions.has(edge.to) && (edge.kind === "hierarchy" || relationMode === "all" || (relationMode === "selected" && (edge.from === selectedId || edge.to === selectedId))));
  return <div ref={frameRef} className={cn("space-y-3 bg-[var(--cmm-surface-background)]", fullscreen && "flex h-screen flex-col p-4")}>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="cmm-text-secondary">{layout.positions.size} {fr ? "entités affichées" : "entities shown"}</span>
      <span className="cmm-text-secondary">{legendLabels.confirmed} / {legendLabels.historical} / {legendLabels.unknown}</span>
      <label className="cmm-text-primary">{fr ? "Relations" : "Relationships"} <select value={relationMode} onChange={event => setRelationMode(event.target.value as typeof relationMode)} className="cmm-input"><option value="selected">{fr ? "Hiérarchie + sélection" : "Hierarchy + selection"}</option><option value="all">{fr ? "Toutes" : "All"}</option><option value="hierarchy">{fr ? "Hiérarchie seule" : "Hierarchy only"}</option></select></label>
      <button type="button" onClick={fit} className="rounded-lg border px-3 py-1.5 cmm-text-primary">{fitLabel}</button>
      <button type="button" onClick={focusNode} disabled={!selectedId || !layout.positions.has(selectedId)} className="rounded-lg border px-3 py-1.5 cmm-text-primary">{fr ? "Centrer la sélection" : "Center selection"}</button>
      {fullscreenSupported ? <button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); else void frameRef.current?.requestFullscreen().catch(() => undefined); }} className="rounded-lg border px-3 py-1.5 cmm-text-primary">{fullscreen ? fr ? "Quitter le plein écran" : "Exit fullscreen" : fr ? "Plein écran" : "Fullscreen"}</button> : null}
      <button type="button" aria-label={fr ? "Dézoomer le graphique" : "Zoom out chart"} onClick={() => onZoomChange(Math.max(0.2, zoom / 1.4))} className="rounded-lg border px-3 py-1.5 cmm-text-primary">−</button>
      <button type="button" aria-label={fr ? "Zoomer le graphique" : "Zoom in chart"} onClick={() => onZoomChange(Math.min(60, zoom * 1.4))} className="rounded-lg border px-3 py-1.5 cmm-text-primary">+</button>
    </div>
    <div className="flex flex-wrap gap-2 text-xs cmm-text-secondary">
      {Object.entries(RELATION_COLORS).map(([kind, color]) => <span key={kind} className="inline-flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: color, borderStyle: kind === "hierarchy" ? "solid" : "dashed" }} />{kind}</span>)}
    </div>
    <div ref={viewportRef} role="region" aria-label={treeLabel} tabIndex={0} onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      const delta = ({ ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] } as Record<string, number[]>)[event.key];
      if (delta) { event.preventDefault(); setPan(current => ({ x: current.x + delta[0], y: current.y + delta[1] })); }
    }} onPointerDown={event => {
      if (event.button !== 0 || (event.target as Element).closest("button,select")) return;
      dragRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y, id: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }} onPointerMove={event => {
      const drag = dragRef.current;
      if (drag && drag.id === event.pointerId) setPan({ x: event.clientX - drag.x, y: event.clientY - drag.y });
    }} onPointerUp={() => { dragRef.current = null; setDragging(false); }} onPointerCancel={() => { dragRef.current = null; setDragging(false); }} onLostPointerCapture={() => { dragRef.current = null; setDragging(false); }} className={cn("relative min-h-[24rem] overflow-hidden touch-none rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)]", fullscreen ? "flex-1" : "h-[65vh] max-h-[46rem]", dragging ? "cursor-grabbing select-none" : "cursor-grab")}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: layout.width, height: layout.height, transform: "translate(" + offset.x + "px," + offset.y + "px) scale(" + scale + ")" }}>
        <svg aria-hidden="true" width={layout.width} height={layout.height} className="pointer-events-none absolute inset-0 overflow-visible">
          {visibleRelations.map(edge => {
            const from = layout.positions.get(edge.from)!, to = layout.positions.get(edge.to)!;
            const x1 = from.x + ORG_NODE_WIDTH / 2, y1 = from.y + ORG_NODE_HEIGHT;
            const x2 = to.x + ORG_NODE_WIDTH / 2, y2 = to.y;
            const mid = (y1 + y2) / 2;
            const hierarchy = edge.kind === "hierarchy";
            const d = hierarchy ? "M "+x1+" "+y1+" V "+mid+" H "+x2+" V "+y2 : "M "+x1+" "+(from.y+ORG_NODE_HEIGHT/2)+" Q "+(Math.min(x1,x2)-35)+" "+(mid-40)+" "+x2+" "+(to.y+ORG_NODE_HEIGHT/2);
            return <path key={edge.id} data-connector-status={edge.status} data-relation-kind={edge.kind} d={d} fill="none" stroke={hierarchy ? STATUS_COLOR[edge.status] : RELATION_COLORS[edge.kind]} strokeDasharray={hierarchy ? STATUS_DASH[edge.status] : "7 5"} strokeWidth={hierarchy ? 2 : 1.5} vectorEffect="non-scaling-stroke" opacity={hierarchy ? 0.9 : 0.7} />;
          })}
        </svg>
        <ul aria-label={treeLabel} className="contents">{administrativeRoots.map(renderBranch)}</ul>
      </div>
      <svg aria-label={fr ? "Mini-carte de l’organigramme" : "Organization overview"} role="img" viewBox={"0 0 "+layout.width+" "+layout.height} className="pointer-events-none absolute bottom-3 right-3 h-24 w-32 rounded-lg border bg-[var(--cmm-surface-background)] shadow">
        {[...layout.positions.values()].map(position => <rect key={position.id} x={position.x} y={position.y} width={ORG_NODE_WIDTH} height={ORG_NODE_HEIGHT} fill={position.id === selectedId ? "#db2777" : "#64748b"} />)}
        {scale > 0 ? <rect x={-offset.x/scale} y={-offset.y/scale} width={viewport.width/scale} height={viewport.height/scale} stroke="#db2777" strokeWidth={3} vectorEffect="non-scaling-stroke" fill="none"/> : null}
      </svg>
    </div>
  </div>;
}
