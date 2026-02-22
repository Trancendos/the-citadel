#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { logError, logInfo, runJsonCommand, writeJsonReport } from "./lib/logger.mjs";

const DATE = new Date().toISOString().slice(0, 10);

function fileExists(path) {
  return existsSync(resolve(process.cwd(), path));
}

function fileContains(path, needle) {
  if (!fileExists(path)) return false;
  const content = readFileSync(resolve(process.cwd(), path), "utf8");
  return content.includes(needle);
}

function getOriginCoordinates() {
  const configPath = resolve(process.cwd(), ".git/config");
  if (!fileExists(".git/config")) return null;

  const content = readFileSync(configPath, "utf8");
  const line = content
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("url = "));
  if (!line) return null;

  const url = line.replace("url = ", "").trim();
  const match = url.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function branchProtectionEnabled() {
  const coords = getOriginCoordinates();
  if (!coords) return { status: "unknown", details: "unable to resolve origin coordinates" };

  const repoData = runJsonCommand(`gh repo view ${coords.owner}/${coords.repo} --json defaultBranchRef`, {
    allowFailure: true,
  });
  const branch = repoData?.defaultBranchRef?.name ?? "main";

  const protectedBranch = runJsonCommand(
    `gh api repos/${coords.owner}/${coords.repo}/branches/${branch}/protection`,
    { allowFailure: true, logFailures: false },
  );

  if (!protectedBranch) {
    return { status: "fail", details: `branch protection not detected on ${branch}` };
  }

  return { status: "pass", details: `branch protection detected on ${branch}` };
}

function main() {
  logInfo("regulatory_alignment.start");

  const controls = [
    {
      id: "REG-01",
      control: "Automated dependency vulnerability scanning",
      required: true,
      frameworks: ["EU CRA", "NIS2", "SOC2-CC7"],
      pass: fileExists(".github/dependabot.yml") && fileContains(".github/workflows/security-and-cve.yml", "pnpm audit"),
      details: "Dependabot + audit gate",
    },
    {
      id: "REG-02",
      control: "Static application security testing",
      required: true,
      frameworks: ["NIST SSDF", "SOC2-CC7"],
      pass: fileContains(".github/workflows/security-and-cve.yml", "codeql-action/analyze"),
      details: "CodeQL in CI",
    },
    {
      id: "REG-03",
      control: "Secret scanning in CI",
      required: true,
      frameworks: ["NIS2", "SOC2-CC6"],
      pass: fileContains(".github/workflows/security-and-cve.yml", "gitleaks"),
      details: "gitleaks action enabled",
    },
    {
      id: "REG-04",
      control: "SBOM generation",
      required: true,
      frameworks: ["EU CRA", "US EO 14028 aligned practices"],
      pass: fileExists(".github/workflows/sbom.yml"),
      details: "CycloneDX SBOM workflow",
    },
    {
      id: "REG-05",
      control: "Security disclosure and response process",
      required: true,
      frameworks: ["NIS2", "SOC2-CC2"],
      pass: fileExists("SECURITY.md"),
      details: "Security policy in repo",
    },
    {
      id: "REG-06",
      control: "Ownership/accountability over code changes",
      required: true,
      frameworks: ["SOC2-CC1", "ISO27001 A.5"],
      pass: fileExists(".github/CODEOWNERS"),
      details: "CODEOWNERS configured",
    },
    {
      id: "REG-07",
      control: "Dependency lifecycle (N/N-1)",
      required: true,
      frameworks: ["NIST SSDF", "SOC2-CC8"],
      pass: fileExists("scripts/check-dependency-policy.mjs") && fileContains("package.json", "\"deps:policy\""),
      details: "dependency freshness policy script + package command",
    },
    {
      id: "REG-08",
      control: "Runtime support window policy",
      required: true,
      frameworks: ["NIS2", "SOC2-CC8"],
      pass: fileContains("package.json", "\"engines\""),
      details: "Node engines policy",
    },
    {
      id: "REG-09",
      control: "Automated production-readiness verification",
      required: true,
      frameworks: ["NIST SSDF", "SOC2-CC7"],
      pass: fileExists(".github/workflows/production-readiness.yml"),
      details: "production readiness workflow",
    },
  ];

  const branchProtection = branchProtectionEnabled();
  controls.push({
    id: "REG-10",
    control: "Protected default branch with required checks",
    required: false,
    frameworks: ["SOC2-CC5", "NIS2"],
    pass: branchProtection.status === "pass",
    details: branchProtection.details,
  });

  const requiredFailures = controls.filter((control) => control.required && !control.pass);
  const report = {
    generatedAt: new Date().toISOString(),
    legalDisclaimer:
      "This is a technical control-alignment check and not legal advice. Validate obligations with legal/compliance counsel.",
    controls,
    summary: {
      totalControls: controls.length,
      passed: controls.filter((control) => control.pass).length,
      requiredFailures: requiredFailures.length,
      recommendedFailures: controls.filter((control) => !control.required && !control.pass).length,
    },
  };

  const reportPath = join(resolve(process.cwd(), "reports"), `regulatory-alignment-${DATE}.json`);
  writeJsonReport(reportPath, report);
  logInfo("regulatory_alignment.completed", report.summary);

  if (requiredFailures.length > 0) {
    logError("regulatory_alignment.failed", {
      failedControlIds: requiredFailures.map((control) => control.id),
    });
    process.exit(1);
  }
}

main();
