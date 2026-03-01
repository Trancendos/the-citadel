#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { logError, logInfo, runCommand, writeJsonReport } from "./lib/logger.mjs";

const DATE = new Date().toISOString().slice(0, 10);

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    runCommands: args.includes("--run-commands"),
    outDir: resolve(process.cwd(), "reports"),
  };
}

function hasPath(path) {
  return existsSync(resolve(process.cwd(), path));
}

function readPackageJson() {
  const path = resolve(process.cwd(), "package.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

function pushCheck(checks, id, description, passed, severity = "required", details = "") {
  checks.push({ id, description, passed, severity, details });
}

function main() {
  const args = parseArgs();
  const checks = [];
  const packageJson = readPackageJson();

  logInfo("production_readiness.start", args);

  pushCheck(checks, "PRD-001", "README exists", hasPath("README.md"));
  pushCheck(checks, "PRD-002", "SECURITY.md exists", hasPath("SECURITY.md"));
  pushCheck(checks, "PRD-003", "CODEOWNERS exists", hasPath(".github/CODEOWNERS"));
  pushCheck(checks, "PRD-004", "Dependabot config exists", hasPath(".github/dependabot.yml"));
  pushCheck(checks, "PRD-005", "Security workflow exists", hasPath(".github/workflows/security-and-cve.yml"));
  pushCheck(checks, "PRD-006", "Runtime compliance workflow exists", hasPath(".github/workflows/runtime-compliance.yml"));
  pushCheck(checks, "PRD-007", "SBOM workflow exists", hasPath(".github/workflows/sbom.yml"));
  pushCheck(checks, "PRD-008", "Production readiness workflow exists", hasPath(".github/workflows/production-readiness.yml"));
  pushCheck(checks, "PRD-009", "Org gap analysis workflow exists", hasPath(".github/workflows/org-gap-analysis.yml"));
  pushCheck(checks, "PRD-010", "Lockfile exists", hasPath("pnpm-lock.yaml") || hasPath("package-lock.json") || hasPath("yarn.lock"));
  pushCheck(checks, "PRD-011", "Node engines policy is defined", Boolean(packageJson?.engines?.node));
  pushCheck(checks, "PRD-012", "packageManager is pinned", Boolean(packageJson?.packageManager));
  pushCheck(checks, "PRD-013", "Typecheck script exists", Boolean(packageJson?.scripts?.typecheck));
  pushCheck(checks, "PRD-014", "Test script exists", Boolean(packageJson?.scripts?.test));
  pushCheck(checks, "PRD-015", "security:check script exists", Boolean(packageJson?.scripts?.["security:check"]));
  pushCheck(checks, "PRD-016", "Dependency policy script exists", hasPath("scripts/check-dependency-policy.mjs"));
  pushCheck(checks, "PRD-017", "Regulatory alignment script exists", hasPath("scripts/check-regulatory-alignment.mjs"));
  pushCheck(checks, "PRD-018", "Org gap analysis script exists", hasPath("scripts/analyze-org-platform-gaps.mjs"));
  pushCheck(checks, "PRD-019", "Service test file exists", hasPath("src/index.test.ts"));

  const commandChecks = [];
  if (args.runCommands) {
    const commands = [
      { id: "RUN-001", command: "pnpm typecheck" },
      { id: "RUN-002", command: "pnpm test" },
      { id: "RUN-003", command: "pnpm build" },
      { id: "RUN-004", command: "pnpm security:check" },
      { id: "RUN-005", command: "pnpm compliance:check" },
    ];

    for (const item of commands) {
      logInfo("production_readiness.command_start", { id: item.id, command: item.command });
      const output = runCommand(item.command, { allowFailure: true });
      const passed = output !== null;
      commandChecks.push({
        id: item.id,
        description: item.command,
        passed,
        severity: "required",
      });
    }
  }

  const allChecks = [...checks, ...commandChecks];
  const requiredFailures = allChecks.filter((check) => check.severity === "required" && !check.passed);
  const recommendedFailures = allChecks.filter((check) => check.severity === "recommended" && !check.passed);
  const passed = requiredFailures.length === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    runCommands: args.runCommands,
    checks: allChecks,
    summary: {
      total: allChecks.length,
      passed: allChecks.filter((check) => check.passed).length,
      requiredFailures: requiredFailures.length,
      recommendedFailures: recommendedFailures.length,
      productionReady: passed,
    },
  };

  const reportPath = join(args.outDir, `production-readiness-${DATE}.json`);
  writeJsonReport(reportPath, report);
  logInfo("production_readiness.completed", report.summary);

  if (!passed) {
    logError("production_readiness.failed", {
      requiredFailures: requiredFailures.map((failure) => failure.id),
    });
    process.exit(1);
  }
}

main();
