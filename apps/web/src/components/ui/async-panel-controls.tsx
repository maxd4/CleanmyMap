import { RefreshCcw } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";

export function AsyncPanelRefreshButton({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <CmmButton
      type="button"
      tone="tertiary"
      size="sm"
      loading={isRefreshing}
      onClick={onRefresh}
      className="!border-white/10 !bg-white/5 !text-white hover:!bg-white/10"
    >
      <RefreshCcw
        size={12}
        aria-hidden="true"
        className={isRefreshing ? "motion-safe:animate-spin" : undefined}
      />
      {isRefreshing ? "Rafraîchissement" : "Rafraîchir"}
    </CmmButton>
  );
}

export function AsyncPanelCardLoadingState({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div
      className="grid gap-4 md:grid-cols-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <CmmSkeleton
          key={index}
          variant="card"
          animation="pulse"
          className="h-28 rounded-3xl bg-white/5"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
