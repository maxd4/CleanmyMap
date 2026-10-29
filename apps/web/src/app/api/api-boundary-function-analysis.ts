import * as ts from "typescript";

export function extractLocalFunctionBodies(source: string): Map<string, string> {
  const functions = new Map<string, string>();
  const sourceFile = ts.createSourceFile(
    "api-boundary-module.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      functions.set(node.name.text, node.body.getText(sourceFile));
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
      node.initializer.body
    ) {
      functions.set(node.name.text, node.initializer.body.getText(sourceFile));
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return functions;
}
