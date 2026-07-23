#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const scriptName = "report-local-dev-processes.mjs";
const patterns = [
  "cleanmymap-main",
  "companion-app",
  "dev-with-fallback-port",
  "next dev",
  "expo",
  "react-native",
  "metro",
  "playwright",
  "vitest",
  "clean-workspace-safe",
  "clean-dev-cache",
  "clean-local-temp",
  "npm run dev",
  "npm run test",
  "npm run build",
];

function escapeForSingleQuotes(value) {
  return String(value).replaceAll("'", "''");
}

function classifyProcess(commandLine, name) {
  const haystack = `${name ?? ""} ${commandLine ?? ""}`.toLowerCase();
  if (haystack.includes("companion-app") || haystack.includes("expo") || haystack.includes("react-native") || haystack.includes("metro")) {
    return "companion";
  }
  if (haystack.includes("dev-with-fallback-port") || haystack.includes("next dev")) {
    return "next-dev";
  }
  if (haystack.includes("playwright")) {
    return "playwright";
  }
  if (haystack.includes("vitest")) {
    return "test-watch";
  }
  if (haystack.includes("clean-workspace-safe") || haystack.includes("clean-dev-cache") || haystack.includes("clean-local-temp")) {
    return "cleanup";
  }
  if (haystack.includes("npm run dev") || haystack.includes("npm run build") || haystack.includes("npm run test")) {
    return "npm-script";
  }
  if (haystack.includes("cleanmymap-main")) {
    return "repo-linked";
  }
  return "other";
}

const psScript = [
  "$patterns = @(",
  patterns.map((pattern) => `'${escapeForSingleQuotes(pattern)}'`).join(", "),
  ")",
  "Get-CimInstance Win32_Process |",
  "  Where-Object {",
  "    $cmd = $_.CommandLine",
  "    if (-not $cmd) { return $false }",
  `    if ($cmd -match [regex]::Escape('${escapeForSingleQuotes(scriptName)}')) { return $false }`,
  "    $haystack = ($cmd + ' ' + $_.Name).ToLowerInvariant()",
  "    foreach ($pattern in $patterns) {",
  "      if ($haystack -like ('*' + $pattern.ToLowerInvariant() + '*')) { return $true }",
  "    }",
  "    return $false",
  "  } |",
  "  Select-Object ProcessId, ParentProcessId, Name, CommandLine |",
  "  Sort-Object Name, ProcessId |",
  "  ConvertTo-Json -Depth 4",
].join("\n");

const raw = execFileSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
).trim();

let processes = [];
if (raw.length > 0) {
  const parsed = JSON.parse(raw);
  processes = Array.isArray(parsed) ? parsed : [parsed];
}

if (processes.length === 0) {
  console.log("[local-dev-processes] No likely CleanMyMap dev processes found.");
  process.exit(0);
}

const rows = processes.map((process) => ({
  pid: process.ProcessId,
  parentPid: process.ParentProcessId ?? "",
  name: process.Name ?? "",
  kind: classifyProcess(process.CommandLine, process.Name),
  commandLine: process.CommandLine ?? "",
}));

console.log(`[local-dev-processes] repo=${repoRoot}`);
console.log(`[local-dev-processes] matches=${rows.length}`);
console.log("");

for (const row of rows) {
  console.log(
    [
      String(row.pid).padEnd(7),
      String(row.parentPid).padEnd(7),
      row.name.padEnd(26),
      row.kind.padEnd(12),
      row.commandLine,
    ].join(" | "),
  );
}
