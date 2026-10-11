import type { QuizQuestion } from "../src/lib/learning/quiz/quiz-question-contract.ts";
import { ACTION_TERRAIN_QUIZ_QUESTIONS } from "./environmental-quiz-bank/action-terrain.ts";
import { CLIMAT_BIODIVERSITE_QUIZ_QUESTIONS } from "./environmental-quiz-bank/climat-biodiversite.ts";
import { IMPACT_METHODOLOGIE_QUIZ_QUESTIONS } from "./environmental-quiz-bank/impact-methodologie.ts";
import { TRI_RECYCLAGE_QUIZ_QUESTIONS } from "./environmental-quiz-bank/tri-recyclage.ts";

// L'ordre historique est un contrat de sélection et d'affichage déterministe.
const QUIZ_QUESTION_ORDER = [
  "e1",
  "e3",
  "e2",
  "n1",
  "n2",
  "n3",
  "n4",
  "n5",
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
  "t1",
  "t2",
  "t3",
  "t4",
  "t5",
  "t6",
  "t7",
  "t8",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "i1",
  "i2",
  "i5",
  "i6",
  "i3",
  "i4",
  "i7",
  "i8",
  "x1",
  "x2",
  "x6",
  "x3",
  "x5",
  "x4",
  "cb1",
  "cb2",
  "cb3",
  "cb4",
  "cb5",
  "cb6",
  "cb7",
  "cb8",
  "cb9",
  "cb10",
  "cb11",
  "cb12",
  "cb13",
  "cb14",
  "cb15",
  "at1",
  "at2",
  "at3",
  "at4",
  "at5",
  "at6",
  "at7",
  "at8",
  "at9",
  "at10",
  "at11",
  "at12",
  "at13",
  "at14",
  "at15",
  "at16",
  "at17",
  "at18",
  "at19",
  "at20",
  "at21",
  "im1",
  "im2",
  "im3",
  "im4",
  "im5",
  "im6",
  "im7",
  "im8",
  "im9",
  "im10",
  "im11",
  "im12",
  "im13",
  "im14",
  "im15",
  "im16",
  "im17",
  "im18",
  "im19",
  "im20",
  "im21",
  "im22",
  "tr1",
  "tr2",
  "tr3",
  "tr4",
  "tr5",
  "tr6",
  "ec1",
  "ec2",
  "rc1",
  "rc2",
  "hb1",
  "hb2",
  "reg1",
  "co1",
  "bd1",
  "cb16",
  "cb17",
  "cb18",
  "cb19",
  "cb20",
  "id1",
] as const;

const QUIZ_QUESTION_CATALOGS: readonly QuizQuestion[][] = [
  TRI_RECYCLAGE_QUIZ_QUESTIONS,
  CLIMAT_BIODIVERSITE_QUIZ_QUESTIONS,
  IMPACT_METHODOLOGIE_QUIZ_QUESTIONS,
  ACTION_TERRAIN_QUIZ_QUESTIONS,
];

const QUIZ_QUESTION_BY_ID = new Map<string, QuizQuestion>();
for (const question of QUIZ_QUESTION_CATALOGS.flat()) {
  if (QUIZ_QUESTION_BY_ID.has(question.id)) {
    throw new Error(`Question de quiz dupliquée : ${question.id}`);
  }
  QUIZ_QUESTION_BY_ID.set(question.id, question);
}
export const QUIZ_QUESTION_BANK: QuizQuestion[] = QUIZ_QUESTION_ORDER.map((questionId) => {
  const question = QUIZ_QUESTION_BY_ID.get(questionId);
  if (!question) {
    throw new Error(`Question de quiz absente du catalogue : ${questionId}`);
  }
  return question;
});

if (QUIZ_QUESTION_BANK.length !== QUIZ_QUESTION_BY_ID.size) {
  throw new Error("Le catalogue de quiz ne correspond pas à son ordre canonique.");
}
