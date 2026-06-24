import { QUIZ_QUESTIONS } from "../apps/web/src/lib/learning/quiz-question-bank.ts";
import { auditQuizSources, formatQuizSourceAuditReport } from "../apps/web/src/lib/learning/quiz-source-audit.ts";

const report = auditQuizSources(QUIZ_QUESTIONS);

console.log(formatQuizSourceAuditReport(report));

if (report.blockingIssuesCount > 0) {
  process.exitCode = 1;
}
