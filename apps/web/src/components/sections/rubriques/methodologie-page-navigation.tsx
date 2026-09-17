"use client";

import type { ReactNode } from "react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { NavigationSpace } from "@/lib/navigation";

export type MethodologyContentRegistry = Partial<Record<string, ReactNode>>;

export function MethodologyNavigationDocumentation({
  spaces,
  locale,
  contentByRouteId,
}: {
  spaces: NavigationSpace[];
  locale: "fr" | "en";
  contentByRouteId: MethodologyContentRegistry;
}) {
  return (
    <div
      data-testid="methodology-navigation-documentation"
      data-methodology-display-mode="exhaustif"
      className="methodology-page__navigation space-y-8"
    >
      {spaces.map((space) => (
        <section
          key={space.id}
          data-methodology-space-id={space.id}
          className="methodology-page__space space-y-6 rounded-[2.5rem] p-6 sm:p-8 lg:p-10"
        >
          <div className="methodology-page__space-heading flex items-center gap-4">
            <span aria-hidden="true" className="methodology-page__space-icon text-2xl">
              {space.icon}
            </span>
            <h2 className="methodology-page__space-title text-2xl font-black tracking-tight sm:text-3xl">
              Méthodologie — {space.label[locale]}
            </h2>
          </div>

          <div className="space-y-3">
            {space.items.map((item) => {
              const content = contentByRouteId[item.routeId];
              return (
                <div
                  key={item.routeId}
                  data-methodology-route-id={item.routeId}
                  data-methodology-content={content ? "present" : "empty"}
                >
                  <CmmDisclosure
                    summary={item.label[locale]}
                    defaultOpen={false}
                    tone="rose"
                    size="lg"
                    className="methodology-page__disclosure"
                  >
                    {content ?? null}
                  </CmmDisclosure>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
