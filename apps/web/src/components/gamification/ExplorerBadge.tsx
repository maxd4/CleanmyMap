import React from "react";

type Tier = {
  id: string;
  title: string;
  icon: string;
  min: number;
  max: number;
  texture?: string;
};

export default function ExplorerBadge({
  tiers,
  current,
  onTierReached,
}: {
  tiers: Tier[];
  current: number;
  onTierReached?: (tier: Tier) => void;
}) {
  const activeTier = tiers.length ? (tiers.slice().reverse().find((t) => current >= t.min) || tiers[0]) : null;
  const activeTierId = activeTier?.id ?? "none";
  const didMountRef = React.useRef(false);
  const previousTierIdRef = React.useRef<string | null>(null);
  const previousCurrentRef = React.useRef<number | null>(null);
  const [isCelebrating, setIsCelebrating] = React.useState(false);

  React.useEffect(() => {
    const previousTierId = previousTierIdRef.current;
    const previousCurrent = previousCurrentRef.current;
    previousTierIdRef.current = activeTier?.id ?? null;
    previousCurrentRef.current = current;

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (activeTier && current > (previousCurrent ?? -1) && previousTierId !== activeTier.id) {
      onTierReached?.(activeTier);
      setIsCelebrating(true);
      const timeout = window.setTimeout(() => setIsCelebrating(false), 900);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [activeTierId, current, onTierReached]);

  return activeTier ? (
    <div
      className={`explorer-badge explorer-badge--${activeTier.id} ${isCelebrating ? "cmm-gamification-celebrate" : ""}`}
      style={{ padding: 12, textAlign: "center" }}
    >
      <div
        className="explorer-badge__texture"
        style={{ backgroundImage: `url(${activeTier.texture || ""})`, borderRadius: 12, padding: 18 }}
      >
        <div className="explorer-badge__icon" style={{ fontSize: 40 }}>
          {activeTier.icon}
        </div>
        <div className="explorer-badge__title" style={{ marginTop: 8, fontWeight: 700 }}>
          {activeTier.title}
        </div>
        <div className="explorer-badge__progress" style={{ marginTop: 10 }}>
          <div
            className="cmm-gamification-dots"
            aria-hidden="true"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(
                1,
                activeTier.max === Number.MAX_SAFE_INTEGER
                  ? Math.max(100, activeTier.min)
                  : activeTier.max - activeTier.min + 1,
              )}, minmax(0, 1fr))`,
              gap: 4,
              alignItems: "center",
            }}
          >
            {Array.from({
              length:
                activeTier.max === Number.MAX_SAFE_INTEGER
                  ? Math.max(100, activeTier.min)
                  : activeTier.max - activeTier.min + 1,
            }).map((_, i) => {
              const tierProgress = Math.max(
                0,
                Math.min(current - activeTier.min + 1, activeTier.max - activeTier.min + 1),
              );
              const filled = i < tierProgress;
              const activeDot = i === tierProgress - 1;
              return (
                <span
                  key={`explorer-dot-${activeTier.id}-${i}`}
                  className={[
                    "cmm-gamification-dot",
                    filled ? "cmm-gamification-dot--filled" : "cmm-gamification-dot--empty",
                    activeDot ? "cmm-gamification-dot--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ animationDelay: `${i * 18}ms` }}
                />
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            {`${Math.min(current, activeTier.max)} / ${activeTier.max === Number.MAX_SAFE_INTEGER ? "∞" : activeTier.max}`}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="explorer-badge" style={{ padding: 12, textAlign: "center" }}>
      <div className="explorer-badge__texture" style={{ borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#666" }}>
          Progression d&apos;exploration en attente
        </div>
      </div>
    </div>
  );
}
