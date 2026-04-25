type CondensedMarkProps = {
  className?: string;
};

export function CondensedMark({ className = "" }: CondensedMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-500 text-sm font-black text-white shadow-md shadow-cyan-950/20 ring-1 ring-white/40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-brand-mark="condensed"
    >
      CM
    </span>
  );
}
