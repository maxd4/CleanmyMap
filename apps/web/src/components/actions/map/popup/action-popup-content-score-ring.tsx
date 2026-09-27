import { SCORE_SCALE } from "@/lib/formatters/score";

export function ScoreRing({
  color,
  score,
  scoreLoading,
  label = "Score",
  showValue = true,
}: {
  color: string;
  score: number;
  scoreLoading: boolean;
  label?: string;
  showValue?: boolean;
}) {
  return (
    <div
      className="relative h-14 w-14 flex-shrink-0"
      role="img"
      aria-label={scoreLoading ? "Score en chargement" : `${label} ${Math.round(score)} %`}
    >
      <svg className="h-full w-full -rotate-90 transform drop-shadow-sm">
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="4"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="transparent"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={2 * Math.PI * 24}
          strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min(SCORE_SCALE, score) / SCORE_SCALE)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      {showValue ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold leading-none" style={{ color }}>
            {scoreLoading ? "…" : Math.round(score)}
          </span>
          <span className="cmm-text-caption font-bold uppercase tracking-tighter opacity-50">
            {label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
