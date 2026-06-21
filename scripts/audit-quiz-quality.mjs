import { QUIZ_QUESTIONS } from "../apps/web/src/lib/learning/quiz-question-bank.ts";
import { auditQuizBank, formatQuizQualityReport } from "../apps/web/src/lib/learning/quiz-quality-audit.ts";

const report = auditQuizBank(QUIZ_QUESTIONS);

console.log(formatQuizQualityReport(report));

if (report.totalErrors > 0) {
  process.exitCode = 1;
}
