import ts from "typescript";

import { listFunctionSyntaxMetadata } from "./complexity-policy.mjs";

const SUPPORTED_EXTENSIONS = /\.(?:c|m)?(?:js|jsx|ts|tsx)$/;
const LOGICAL_OPERATORS = new Map([
  [ts.SyntaxKind.AmpersandAmpersandToken, "&&"],
  [ts.SyntaxKind.BarBarToken, "||"],
  [ts.SyntaxKind.QuestionQuestionToken, "??"],
]);

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}
function syntaxKindName(node) {
  return ts.SyntaxKind[node.kind] ?? "Unknown";
}

function decisionKind(node) {
  if (ts.isIfStatement(node)) return "if";
  if (ts.isSwitchStatement(node)) return "switch";
  if (ts.isCaseClause(node)) return "case";
  if (ts.isDefaultClause(node)) return "default";
  if (ts.isForStatement(node)) return "for";
  if (ts.isForInStatement(node)) return "for-in";
  if (ts.isForOfStatement(node)) return "for-of";
  if (ts.isWhileStatement(node)) return "while";
  if (ts.isDoStatement(node)) return "do-while";
  if (ts.isConditionalExpression(node)) return "ternary";
  if (ts.isCatchClause(node)) return "catch";
  if (ts.isBinaryExpression(node)) return LOGICAL_OPERATORS.get(node.operatorToken.kind) ?? null;
  return null;
}

function location(node, sourceFile) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.end);
  return {
    line: start.line + 1,
    endLine: end.line + 1,
    column: start.character + 1,
    endColumn: end.character + 1,
  };
}

function rootSubtrees(functionNode) {
  const body = functionNode.body;
  if (!body) return [];
  if (ts.isBlock(body)) return [...body.statements];
  return [body];
}

function visitDecisions(functionNode) {
  const decisions = [];
  const visit = (node, parentDecisionDepth) => {
    if (node !== functionNode && isFunctionLike(node)) return;
    const kind = decisionKind(node);
    const decisionDepth = kind ? parentDecisionDepth + 1 : parentDecisionDepth;
    if (kind) decisions.push({ node, kind, decisionDepth });
    ts.forEachChild(node, (child) => visit(child, decisionDepth));
  };
  ts.forEachChild(functionNode, (child) => visit(child, 0));
  return decisions;
}

function summarizeDecisions(decisions, sourceFile) {
  const byKind = Object.fromEntries([...new Set(decisions.map((decision) => decision.kind))]
    .sort((left, right) => left.localeCompare(right))
    .map((kind) => [kind, decisions.filter((decision) => decision.kind === kind).length]));
  return {
    decisionPoints: decisions.length,
    maxDecisionNestingDepth: decisions.reduce((max, decision) => Math.max(max, decision.decisionDepth), 0),
    nestedDecisionCount: decisions.filter((decision) => decision.decisionDepth > 1).length,
    decisionKinds: byKind,
    locations: decisions.map(({ node, kind, decisionDepth }) => ({ kind, depth: decisionDepth, ...location(node, sourceFile) })),
  };
}

function subtreeProfile(statement, index, decisions, sourceFile) {
  const local = decisions.filter(({ node }) => node.getStart(sourceFile) >= statement.getStart(sourceFile) && node.end <= statement.end);
  return {
    index,
    kind: syntaxKindName(statement),
    ...location(statement, sourceFile),
    ...summarizeDecisions(local, sourceFile),
  };
}

function profileFunction(entry) {
  const { node, sourceFile, ...metadata } = entry;
  const decisions = visitDecisions(node);
  const summary = summarizeDecisions(decisions, sourceFile);
  const subtrees = rootSubtrees(node).map((statement, index) => subtreeProfile(statement, index, decisions, sourceFile));
  const busiestSubtree = [...subtrees]
    .filter((subtree) => subtree.decisionPoints > 0)
    .sort((left, right) => right.decisionPoints - left.decisionPoints || left.index - right.index)[0] ?? null;
  return {
    ...metadata,
    status: "PRESENT",
    decisionPoints: summary.decisionPoints,
    maxDecisionNestingDepth: summary.maxDecisionNestingDepth,
    nestedDecisionCount: summary.nestedDecisionCount,
    decisionKinds: summary.decisionKinds,
    decisionLocations: summary.locations,
    decisionSubtrees: subtrees,
    busiestSubtree,
  };
}

export function profileFunctionControlFlow(file, source) {
  if (!SUPPORTED_EXTENSIONS.test(file.replaceAll("\\", "/"))) {
    return { status: "NOT_MEASURED", reason: "UNSUPPORTED_FILE_TYPE", functions: [], diagnostics: [] };
  }
  try {
    return {
      status: "PRESENT",
      reason: null,
      functions: listFunctionSyntaxMetadata(file, source).map((entry) => ({ path: file.replaceAll("\\", "/"), ...profileFunction(entry) })),
      diagnostics: [],
    };
  } catch (error) {
    return {
      status: "NOT_MEASURED",
      reason: "PARSER_FAILED",
      functions: [],
      diagnostics: [{ message: error.message, severity: "error" }],
    };
  }
}
