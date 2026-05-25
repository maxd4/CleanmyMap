"use client";

import { RefreshCw } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

type SystemStateRetryButtonProps = {
  label?: string;
};

export function SystemStateRetryButton({ label = "Réessayer" }: SystemStateRetryButtonProps) {
  return (
    <CmmButton tone="primary" onClick={() => window.location.reload()}>
      <RefreshCw className="h-4 w-4" />
      {label}
    </CmmButton>
  );
}

