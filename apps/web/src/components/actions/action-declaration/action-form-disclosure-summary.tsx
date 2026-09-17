import type { ReactNode } from "react";

export function ActionFormDisclosureSummary({
  label,
  detail,
}: {
  label: string;
  detail?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-semibold text-emerald-950">{label}</span>
      {detail ? (
        <span className="break-words text-sm font-medium text-emerald-800/70">
          {detail}
        </span>
      ) : null}
    </span>
  );
}
