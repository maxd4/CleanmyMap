export const COMMUNITY_CREDIBILITY_TITLE_STYLE = {
  textWrap: "balance",
  fontSize: "clamp(2.05rem, 3vw, 3.35rem)",
  lineHeight: 0.94,
  letterSpacing: "-0.055em",
  fontWeight: 900,
} as const;

export function CommunityCredibilityLandscape({
  variant,
}: {
  variant: "community" | "credibility";
}) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute right-[-1.5rem] top-[-1rem] h-48 w-64 opacity-60 sm:h-56 sm:w-80 ${
        variant === "credibility" ? "text-violet-200/80" : "text-emerald-200/90"
      }`}
      fill="none"
      focusable="false"
      viewBox="0 0 320 220"
    >
      <circle cx="258" cy="42" fill="currentColor" opacity="0.48" r="30" />
      <path
        d="M0 183c42-38 76-45 112-23 35 21 55-8 87-22 35-15 70-10 121 26v56H0v-37Z"
        fill="currentColor"
        opacity="0.32"
      />
      <path
        d="M26 182c32-47 67-49 102-8 25 29 47 28 70 5 24-24 48-30 76-15 18 10 31 17 46 20"
        stroke="currentColor"
        strokeDasharray="4 7"
        strokeLinecap="round"
        strokeWidth="2"
        opacity="0.72"
      />
      <path
        d="M245 145 262 98l17 47h-10v35h-14v-35h-10Zm35 35 16-42 16 42h-9v28h-14v-28h-9Z"
        fill="currentColor"
        opacity="0.58"
      />
      {variant === "credibility" ? (
        <path
          d="m188 82 16-10 16 10-16 10-16-10Zm5 7v14c7 5 15 5 22 0V89"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          opacity="0.7"
        />
      ) : (
        <path
          d="M165 94c20-16 43-5 46 17-22 9-38 2-46-17Zm14 7c-8 8-13 17-14 28"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          opacity="0.68"
        />
      )}
    </svg>
  );
}
