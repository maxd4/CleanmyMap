import dynamic from "next/dynamic";
import type { ActionsMapLayoutCommonProps } from "../map-feed.types";
import { ImmersiveLayoutIntro, ImmersiveLayoutMapFrame } from "./immersive-layout-sections";
import { resolveMapEmptyStateMode } from "./map-data-status";

const ActionStoriesCarousel = dynamic(
  () => import("@/components/map/ActionStoriesCarousel").then((mod) => mod.ActionStoriesCarousel),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] rounded-[2rem] border border-sky-200/60 bg-white/80" />
    ),
  },
);

type ImmersiveLayoutProps = ActionsMapLayoutCommonProps & {
  onOpenAction: (actionId: string) => void;
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
};

function resolveImmersiveLayoutState(
  tone: "sky" | "emerald",
  itemCount: number,
  allItemCount: number,
  isTruncated: boolean,
) {
  return {
    isEmerald: tone === "emerald",
    hasItems: itemCount > 0,
    emptyMode: resolveMapEmptyStateMode(allItemCount, isTruncated),
  };
}

export function ImmersiveLayout(props: ImmersiveLayoutProps) {
  const {
    items,
    allItems,
    hasPartialSource,
    isTruncated,
    partialSourcesLabel,
    freshnessLabel,
    isValidating,
    onReload,
    onOpenAction,
    tone = "sky",
    showIntro = true,
    fullViewport = false,
    showStoriesCarousel = true,
  } = props;
  const { isEmerald, emptyMode } = resolveImmersiveLayoutState(
    tone,
    items.length,
    allItems.length,
    isTruncated,
  );

  return (
    <>
      <div className={`pointer-events-none absolute inset-0 ${isEmerald ? "bg-[radial-gradient(circle_at_top_left,rgba(134,239,172,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(187,247,208,0.22),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0))]" : "bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.26),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.24),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0))]"}`} />
      <div className="relative z-10 flex flex-col gap-6">
        <ImmersiveLayoutIntro
          hasPartialSource={hasPartialSource}
          partialSourcesLabel={partialSourcesLabel}
          freshnessLabel={freshnessLabel}
          isValidating={isValidating}
          onReload={onReload}
          isEmerald={isEmerald}
          isTruncated={isTruncated}
          showIntro={showIntro}
          tone={tone}
        />

        <div className="grid gap-6">
          <ImmersiveLayoutMapFrame
            layoutProps={props}
            emptyMode={emptyMode}
            fullViewport={fullViewport}
            isEmerald={isEmerald}
          />
        </div>

        {showStoriesCarousel ? (
          <div className={`rounded-[2.75rem] p-6 text-slate-950 backdrop-blur-3xl border ${isEmerald ? "border-emerald-200/80 bg-emerald-50 shadow-[0_24px_56px_-32px_rgba(34,197,94,0.16)]" : "border-sky-200/80 bg-sky-50 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]"}`}>
            <ActionStoriesCarousel items={items} onOpenAction={onOpenAction} />
          </div>
        ) : null}
      </div>
    </>
  );
}
