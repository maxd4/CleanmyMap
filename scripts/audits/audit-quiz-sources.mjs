import { importQuizModule } from "./quiz-audit-runtime.mjs";

const { QUIZ_QUESTIONS } = await importQuizModule(
  "apps/web/src/lib/learning/quiz/quiz-question-bank.ts",
);
const { auditQuizSources, formatQuizSourceAuditReport } = await importQuizModule(
  "apps/web/src/lib/learning/quiz/quiz-source-audit.ts",
);

const report = auditQuizSources(QUIZ_QUESTIONS);

console.log(formatQuizSourceAuditReport(report));

if (report.blockingIssuesCount > 0) {
  process.exitCode = 1;
}
