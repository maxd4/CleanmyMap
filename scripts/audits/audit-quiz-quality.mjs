import { importQuizModule } from "./quiz-audit-runtime.mjs";

const { QUIZ_QUESTIONS } = await importQuizModule(
  "apps/web/src/lib/learning/quiz/quiz-question-bank.ts",
);
const { auditQuizBank, formatQuizQualityReport } = await importQuizModule(
  "apps/web/src/lib/learning/quiz/quiz-quality-audit.ts",
);

const report = auditQuizBank(QUIZ_QUESTIONS);

console.log(formatQuizQualityReport(report));

if (report.totalErrors > 0) {
  process.exitCode = 1;
}
