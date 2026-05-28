"use client";
import React from "react";
import ExplorerBadge from "./ExplorerBadge";

export default function ExplorerBadgeWrapper({ userId }: { userId: string }) {
  const [tiers, setTiers] = React.useState<any[]>([]);
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetch(`/api/gamification/badges/list`)
      .then((r) => r.json())
      .then((body) => {
        if (!mounted) return;
        const explorerTiers = body.badges.filter((b: any) => b.id.startsWith("explorer-"));
        setTiers(
          explorerTiers.map((t: any) => ({ id: t.id, title: t.name, icon: t.icon, min: 0, max: t.progress?.target ?? 10, texture: t.icon && t.icon.length ? t.icon : undefined })),
        );
        // set current from highest tier progress
        const total = explorerTiers.reduce((acc: number, t: any) => acc + (t.progress?.current || 0), 0);
        setCurrent(total);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [userId]);

  return <ExplorerBadge tiers={tiers} current={current} onTierReached={() => {}} />;
}
