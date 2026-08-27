export const BOT_ID_BASIC_PROTECTED_PATHS = [
  "/api/chat",
  "/api/contact",
  "/api/newsletter/subscribe",
  "/api/community/bug-reports",
  "/api/community/promotion-requests",
  "/api/partners/onboarding-requests",
  "/api/gamification/quiz/pedagogical-metrics",
  "/api/actions",
  "/api/community/events",
  "/api/legal-content-reports",
] as const;

export const BOT_ID_BASIC_PROTECTED_ROUTES = BOT_ID_BASIC_PROTECTED_PATHS.map(
  (path) => ({
    path,
    method: "POST",
    advancedOptions: { checkLevel: "basic" as const },
  }),
);
