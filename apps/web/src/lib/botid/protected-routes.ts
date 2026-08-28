export const BOT_ID_BASIC_PROTECTED_PATHS = [
  "/api/contact",
  "/api/newsletter/subscribe",
  "/api/gamification/quiz/pedagogical-metrics",
] as const;

export const BOT_ID_BASIC_PROTECTED_ROUTES = BOT_ID_BASIC_PROTECTED_PATHS.map(
  (path) => ({
    path,
    method: "POST",
    advancedOptions: { checkLevel: "basic" as const },
  }),
);
