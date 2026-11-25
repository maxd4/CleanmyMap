"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  PublicCleanlinessOrganizationNode,
  PublicCleanlinessOrganizationRelation,
} from "@/lib/partners/public-cleanliness-organization";

const CONNECTOR_STYLE = {
  confirmed: "border-emerald-500/60 border-solid",
  historical: "border-amber-500/70 border-dashed",
  unknown: "border-slate-400/60 border-dotted",
} as const;

export interface PublicCleanlinessOrgChartProps {
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
}

/**
 * Organigramme graphique 2D interactif construit exclusivement à partir des
 * relations `hierarchy`. Les relations historiques et inconnues sont
 * distinguées visuellement par le style du connecteur (plein / tireté / pointillé).
 */
export function PublicCleanlinessOrgChart({
  administrativeRoots,
  childrenById,
  nodeById,
  relations,
  includedIds,
  selectedId,
  collapsed,
  isSearching,
  zoom,
  treeLabel,
  expandLabel,
  collapseLabel,
  fitLabel,
  legendLabels,
  displayName,
  kindLabel,
  statusLabel,
  statusStyle,
  onSelect,
  onToggleCollapse,
  onResetView,
}: PublicCleanlinessOrgChartProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(null);

  const hierarchyStatus = (parentId: string, childId: string): "confirmed" | "historical" | "unknown" => {
    const rel = relations.find(
      (item) => item.kind === "hierarchy" && item.from === parentId && item.to === childId,
    );
    return rel?.status ?? "confirmed";
  };

  const renderBranch = (
    node: PublicCleanlinessOrganizationNode,
    parentId: string | null,
  ): ReactNode => {
    const children = (childrenById.get(node.id) ?? [])
      .filter((id) => includedIds.has(id))
      .map((id) => nodeById.get(id))
      .filter((value): value is PublicCleanlinessOrganizationNode => Boolean(value));
    const isCollapsed = !isSearching && (collapsed[node.id] ?? false);
    const isSelected = selectedId === node.id;
    const edgeStatus = parentId ? hierarchyStatus(parentId, node.id) : null;

    return (
      <li key={node.id} className="flex flex-col items-center">
        {edgeStatus ? (
          <div
            aria-hidden="true"
            data-connector-status={edgeStatus}
            className={cn("h-4 w-0 border-l-2", CONNECTOR_STYLE[edgeStatus])}
          />
        ) : null}

        <div className="flex flex-col items-center">
          <div
            className={cn(
              "flex w-52 flex-col gap-1.5 rounded-2xl border p-3 transition",
              isSelected
                ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30"
                : "border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background)]",
            )}
          >
            <button
              type="button"
              aria-current={isSelected ? "true" : undefined}
              data-assignment={node.assignment}
              onClick={() => onSelect(node.id)}
              className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              <span className="block text-xs font-semibold cmm-text-secondary">
                {kindLabel(node.kind)}
              </span>
              <span className="mt-0.5 block text-sm font-bold leading-snug cmm-text-primary">
                {displayName(node)}
              </span>
              <span
                className={cn(
                  "mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold",
                  statusStyle[node.assignment],
                )}
              >
                {statusLabel(node.assignment)}
              </span>
            </button>

            {children.length > 0 && !isSearching ? (
              <button
                type="button"
                aria-label={`${isCollapsed ? expandLabel : collapseLabel} ${displayName(node)}`}
                aria-expanded={!isCollapsed}
                aria-controls={`org-children-${node.id}`}
                onClick={() => onToggleCollapse(node.id, !isCollapsed)}
                className="self-end rounded-lg border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] px-2 py-0.5 text-xs font-semibold cmm-text-primary hover:border-violet-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              >
                {isCollapsed ? `+ (${children.length})` : "−"}
              </button>
            ) : null}
          </div>
        </div>

        {children.length > 0 && !isCollapsed ? (
          <>
            <div
              aria-hidden="true"
              className="h-4 w-0 border-l-2 border-[var(--cmm-surface-border)]"
            />
            <ul
              id={`org-children-${node.id}`}
              className="m-0 flex list-none items-start justify-center gap-4 border-t-2 border-[var(--cmm-surface-border)] p-0"
            >
              {children.map((child) => renderBranch(child, node.id))}
            </ul>
          </>
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3 cmm-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-solid border-emerald-500/70" aria-hidden="true" />
            {legendLabels.confirmed}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dashed border-amber-500/80" aria-hidden="true" />
            {legendLabels.historical}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dotted border-slate-400/70" aria-hidden="true" />
            {legendLabels.unknown}
          </span>
          <span>· {legendLabels.nonHierarchyNote}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setPan({ x: 0, y: 0 });
            onResetView();
          }}
          className="rounded-lg border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] px-2.5 py-1 text-xs font-semibold cmm-text-primary hover:border-violet-500/50"
        >
          {fitLabel}
        </button>
      </div>

      <div
        role="region"
        aria-label={treeLabel}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          setDragOrigin({ x: event.clientX - pan.x, y: event.clientY - pan.y });
        }}
        onPointerMove={(event) => {
          if (!dragOrigin) return;
          setPan({ x: event.clientX - dragOrigin.x, y: event.clientY - dragOrigin.y });
        }}
        onPointerUp={() => setDragOrigin(null)}
        onPointerLeave={() => setDragOrigin(null)}
        className={cn(
          "max-h-[42rem] min-h-[20rem] overflow-auto rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4",
          dragOrigin ? "cursor-grabbing select-none" : "cursor-grab",
        )}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
          }}
          className="inline-block min-w-full"
        >
          <ul aria-label={treeLabel} className="m-0 flex list-none items-start justify-center gap-6 p-0">
            {administrativeRoots.map((rootNode) => renderBranch(rootNode, null))}
          </ul>
        </div>
      </div>
    </div>
  );
}
