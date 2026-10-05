// scripts/check-require-user.mjs
// Gate: every guarded /api route handler must call `requireUser(<its request>)` as its
// FIRST statement (optionally inside a leading `try`). The proxy lets a Bearer-only
// /api request through UNVERIFIED — requireUser is what verifies it — so a handler that
// skips it (or does work first) is an open door. Public, proxy-exempt routes are listed
// below and must mirror the src/proxy.ts matcher (src/proxy.matcher.test.ts checks).
// Parses with the TypeScript compiler (no regex over code); recursive walk, no glob dep.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const APP_ROOT = path.normalize("src/app");
const METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

export const PUBLIC_API_ROUTES = [
  "/api/health",
  "/api/v1/auth/signup",
  "/api/v1/auth/signin",
  "/api/v1/auth/signout",
  "/api/v1/auth/session",
];

// "api/v1/games/[id]/route.ts" (relative to src/app) → "/api/v1/games/[id]".
// Route groups "(x)" and parallel-route slots "@x" never appear in the URL.
export function routeUrl(relFile) {
  const segments = path
    .dirname(relFile)
    .split(/[\\/]/)
    .filter((s) => s && s !== "." && !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return `/${segments.join("/")}`;
}

function isExported(node) {
  return ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

// `await requireUser(<reqName>)`, bare or as the initializer of a single declaration.
function isRequireUserFirst(statement, reqName) {
  let expr;
  if (ts.isExpressionStatement(statement)) {
    expr = statement.expression;
  } else if (
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.length === 1
  ) {
    expr = statement.declarationList.declarations[0].initializer;
  }
  if (!expr || !ts.isAwaitExpression(expr) || !ts.isCallExpression(expr.expression)) return false;
  const call = expr.expression;
  const [arg] = call.arguments;
  return (
    ts.isIdentifier(call.expression) &&
    call.expression.text === "requireUser" &&
    arg !== undefined &&
    ts.isIdentifier(arg) &&
    arg.text === reqName
  );
}

function checkHandler(name, fn) {
  const reqParam = fn.parameters[0]?.name;
  const reqName = reqParam && ts.isIdentifier(reqParam) ? reqParam.text : null;
  if (!reqName || !fn.body || !ts.isBlock(fn.body)) {
    return `${name}: must take the request and open with \`await requireUser(req)\``;
  }
  let first = fn.body.statements[0];
  if (first && ts.isTryStatement(first)) first = first.tryBlock.statements[0];
  if (!first || !isRequireUserFirst(first, reqName)) {
    return `${name}: first statement must be \`await requireUser(${reqName})\``;
  }
  return null;
}

// Violations for one route module's source, one message per offending handler.
export function handlerViolations(source) {
  const file = ts.createSourceFile(
    "route.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const out = [];
  const report = (msg) => msg && out.push(msg);
  for (const node of file.statements) {
    if (ts.isFunctionDeclaration(node) && isExported(node) && METHODS.has(node.name?.text)) {
      report(checkHandler(node.name.text, node));
    } else if (ts.isVariableStatement(node) && isExported(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !METHODS.has(decl.name.text)) continue;
        const init = decl.initializer;
        report(
          init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))
            ? checkHandler(decl.name.text, init)
            : `${decl.name.text}: declare the handler inline so the gate can inspect it`,
        );
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const spec of node.exportClause.elements) {
        if (METHODS.has(spec.name.text)) {
          report(
            `${spec.name.text}: re-exported handler — declare it inline so the gate can inspect it`,
          );
        }
      }
    }
  }
  return out;
}

function walk(dir, offenders) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p, offenders);
    } else if (name === "route.ts") {
      const url = routeUrl(path.relative(APP_ROOT, p));
      if (!url.startsWith("/api/") || PUBLIC_API_ROUTES.includes(url)) continue;
      for (const v of handlerViolations(readFileSync(p, "utf8"))) offenders.push(`  ${p}  ${v}`);
    }
  }
}

function main() {
  const offenders = [];
  if (existsSync(APP_ROOT)) walk(APP_ROOT, offenders);
  if (offenders.length) {
    console.error(
      "requireUser violation: guarded /api handler(s) must open with `await requireUser(req)`\n" +
        "(the proxy passes Bearer-only requests through unverified):\n" +
        offenders.join("\n"),
    );
    process.exit(1);
  }
  console.log("require-user guards OK");
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}
