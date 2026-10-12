import path from "node:path";
import { createJiti } from "jiti";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const quizRuntime = createJiti(repositoryRoot, {
  alias: { "@": path.join(repositoryRoot, "apps", "web", "src") },
});

export function importQuizModule(relativePath) {
  return quizRuntime.import(path.join(repositoryRoot, relativePath));
}
