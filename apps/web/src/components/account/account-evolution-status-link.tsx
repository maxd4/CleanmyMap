"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { ACCOUNT_EVOLUTION_ROUTE } from "@/lib/accueil-pilotage-routes";
import { cn } from "@/lib/utils";

type PromotionRequestStatusItem = {
  status?: unknown;
};

type PromotionRequestStatusResponse = {
  items?: PromotionRequestStatusItem[];
};

export type AccountEvolutionStatusLinkProps = {
  label?: string;
  pendingLabel?: string;
  pendingInitially?: boolean;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function AccountEvolutionStatusLink({
  label = "Faire évoluer mon compte",
  pendingLabel = "Voir ma demande",
  pendingInitially = false,
  className,
  onClick,
}: AccountEvolutionStatusLinkProps) {
  const [isPending, setIsPending] = useState(pendingInitially);

  useEffect(() => {
    let isMounted = true;

    void fetch("/api/account/promotion-requests", {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as PromotionRequestStatusResponse;
      })
      .then((payload) => {
        if (!isMounted || !payload) {
          return;
        }
        setIsPending(payload.items?.[0]?.status === "pending_owner_review");
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Link
      href={ACCOUNT_EVOLUTION_ROUTE}
      prefetch={false}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70",
        "border-amber-200/30 bg-amber-100/12 text-amber-50 hover:border-amber-200/50 hover:bg-amber-100/20",
        className,
      )}
    >
      {isPending ? pendingLabel : label}
    </Link>
  );
}
