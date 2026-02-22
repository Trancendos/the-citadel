#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { ensureDirectory, logInfo, runCommand, runJsonCommand, writeJsonReport } from "./lib/logger.mjs";

const DATE = new Date().toISOString().slice(0, 10);

function parseArgs() {
  const [org = "Trancendos", limitArg = "200", outDirArg = "reports"] = process.argv.slice(2);
  const limit = Number.parseInt(limitArg, 10);
  return {
    org,
    limit: Number.isNaN(limit) ? 200 : limit,
    outDir: resolve(process.cwd(), outDirArg),
  };
}

function hasRepoPath(org, repo, path) {
  const command = `gh api repos/${org}/${repo}/contents/${path}`;
  return (
    runCommand(command, {
      allowFailure: true,
      logFailures: false,
      stdout: "ignore",
      stderr: "ignore",
    }) !== null
  );
}

function repoPackageManifest(org, repo) {
  const encoded = runCommand(`gh api repos/${org}/${repo}/contents/package.json --jq '.content'`, {
    allowFailure: true,
    logFailures: false,
  });
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded.replace(/\n/g, ""), "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getRepoTree(org, repo, defaultBranch) {
  return (
    runJsonCommand(`gh api repos/${org}/${repo}/git/trees/${defaultBranch}?recursive=1`, {
      allowFailure: true,
    }) ?? { tree: [] }
  );
}

function classifyRepo(name) {
  if (name === "trancendos-ecosystem") return "platform-monorepo";
  if (name === "shared-core") return "shared-library";
  if (name === "infrastructure") return "infrastructure";
  if (name === "secrets-portal") return "security-utility";
  if (name === "central-plexus") return "orchestration-hub";
  if (name.startsWith("the-")) return "domain-service";
  if (name.endsWith("-ai")) return "agent-service";
  return "application";
}

function readinessScore(signals) {
  let score = 0;
  if (signals.hasWorkflows) score += 15;
  if (signals.hasDependabot) score += 10;
  if (signals.hasSecurityMd) score += 10;
  if (signals.hasCodeowners) score += 10;
  if (signals.hasLockfile) score += 10;
  if (signals.hasTests) score += 10;
  if (signals.hasBranchProtection) score += 15;
  if (signals.hasSecurityPolicyEnabled) score += 10;
  if (signals.hasReadme) score += 5;
  if (signals.hasLicenseFile) score += 5;
  return score;
}

function recommendation(repo, fileCount) {
  const keepSeparate = new Set([
    "trancendos-ecosystem",
    "secrets-portal",
    "infrastructure",
    "shared-core",
    "central-plexus",
    "the-cryptex",
    "the-citadel",
  ]);

  if (keepSeparate.has(repo) || fileCount >= 50) {
    return "keep-separate-harden";
  }

  if (fileCount <= 8) {
    return "merge-candidate-into-platform-monorepo";
  }

  return "evaluate-by-ownership-and-deployment-boundary";
}

function detectGaps(repoSignal) {
  const gaps = [];
  if (!repoSignal.hasWorkflows) gaps.push("missing-ci-security-workflows");
  if (!repoSignal.hasDependabot) gaps.push("missing-dependency-automation");
  if (!repoSignal.hasSecurityMd) gaps.push("missing-security-policy-doc");
  if (!repoSignal.hasCodeowners) gaps.push("missing-codeowners");
  if (!repoSignal.hasLockfile) gaps.push("missing-lockfile");
  if (!repoSignal.hasTests) gaps.push("missing-tests");
  if (!repoSignal.hasBranchProtection) gaps.push("missing-branch-protection");
  if (!repoSignal.hasNodeEngines && repoSignal.hasPackageJson) gaps.push("missing-node-engines-policy");
  return gaps;
}

function summaryByRisk(repos) {
  return {
    critical: repos.filter((r) => r.riskLevel === "critical").length,
    high: repos.filter((r) => r.riskLevel === "high").length,
    medium: repos.filter((r) => r.riskLevel === "medium").length,
    low: repos.filter((r) => r.riskLevel === "low").length,
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push(`# Platform Gap Analysis (${report.org})`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Source repos audited: **${report.summary.totalSourceRepos}**`);
  lines.push(`- Critical risk repos: **${report.summary.risk.critical}**`);
  lines.push(`- High risk repos: **${report.summary.risk.high}**`);
  lines.push(`- Missing workflows: **${report.summary.missingWorkflows}**`);
  lines.push(`- Missing Dependabot: **${report.summary.missingDependabot}**`);
  lines.push(`- Missing SECURITY.md: **${report.summary.missingSecurityMd}**`);
  lines.push(`- Missing CODEOWNERS: **${report.summary.missingCodeowners}**`);
  lines.push(`- Missing lockfiles: **${report.summary.missingLockfiles}**`);
  lines.push(`- Missing tests: **${report.summary.missingTests}**`);
  lines.push(`- Missing branch protection: **${report.summary.missingBranchProtection}**`);
  lines.push("");
  lines.push("## Highest Risk Repositories");
  lines.push("");
  lines.push("| Repo | Score | Risk | Files | Key gaps | Recommendation |");
  lines.push("|---|---:|---|---:|---|---|");

  for (const repo of report.repos.slice(0, 20)) {
    lines.push(
      `| ${repo.repo} | ${repo.readinessScore} | ${repo.riskLevel} | ${repo.fileCount} | ${repo.gaps.slice(0, 4).join(", ")} | ${repo.recommendation} |`,
    );
  }

  lines.push("");
  lines.push("## Brainstorming / Solutionization Tracks");
  lines.push("");
  lines.push("1. **Security Baseline Factory**: apply a standardized workflow/dependabot/security/CODEOWNERS template to all source repos.");
  lines.push("2. **Monorepo Rationalization**: merge template-level repos into `trancendos-ecosystem/apps` or `packages` until each has independent runtime and deployment needs.");
  lines.push("3. **Critical Boundary Hardening**: keep and harden dedicated security/infrastructure repos with stronger controls, threat models, and incident response SLAs.");
  lines.push("4. **Compliance Evidence Pipeline**: export recurring reports (security, dependency freshness, SBOM, control coverage) as artifacts for audit readiness.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs();
  logInfo("org_gap_analysis.start", args);

  const repos = runJsonCommand(
    `gh repo list ${JSON.stringify(args.org)} --limit ${args.limit} --json name,isFork,defaultBranchRef,description,updatedAt,url`,
  );
  const sourceRepos = (repos ?? []).filter((repo) => repo.isFork === false);

  const analyzed = [];
  for (const repoMeta of sourceRepos) {
    const repo = repoMeta.name;
    const defaultBranch = repoMeta.defaultBranchRef?.name ?? "main";
    logInfo("org_gap_analysis.repo_scan", { repo, defaultBranch });

    const hasWorkflows = hasRepoPath(args.org, repo, ".github/workflows");
    const hasDependabot = hasRepoPath(args.org, repo, ".github/dependabot.yml");
    const hasSecurityMd = hasRepoPath(args.org, repo, "SECURITY.md");
    const hasCodeowners = hasRepoPath(args.org, repo, ".github/CODEOWNERS");
    const hasReadme = hasRepoPath(args.org, repo, "README.md");
    const hasLicenseFile = hasRepoPath(args.org, repo, "LICENSE");
    const hasPackageJson = hasRepoPath(args.org, repo, "package.json");
    const packageManifest = hasPackageJson ? repoPackageManifest(args.org, repo) : null;
    const hasNodeEngines = Boolean(packageManifest?.engines?.node);

    const hasLockfile =
      hasRepoPath(args.org, repo, "pnpm-lock.yaml") ||
      hasRepoPath(args.org, repo, "package-lock.json") ||
      hasRepoPath(args.org, repo, "yarn.lock");

    const hasBranchProtection =
      runCommand(`gh api repos/${args.org}/${repo}/branches/${defaultBranch}/protection`, {
        allowFailure: true,
        logFailures: false,
        stdout: "ignore",
        stderr: "ignore",
      }) !== null;

    const repoView =
      runJsonCommand(`gh repo view ${args.org}/${repo} --json isSecurityPolicyEnabled,isPrivate,visibility`, {
        allowFailure: true,
      }) ?? {};

    const tree = getRepoTree(args.org, repo, defaultBranch);
    const blobs = (tree.tree ?? []).filter((node) => node.type === "blob");
    const fileCount = blobs.length;
    const hasTests = blobs.some((node) =>
      /(^|\/)(test|tests|__tests__|spec)(\/|$)|\.test\.|\.spec\./.test(node.path),
    );

    const signals = {
      hasWorkflows,
      hasDependabot,
      hasSecurityMd,
      hasCodeowners,
      hasLockfile,
      hasTests,
      hasBranchProtection,
      hasSecurityPolicyEnabled: Boolean(repoView.isSecurityPolicyEnabled),
      hasReadme,
      hasLicenseFile,
      hasPackageJson,
      hasNodeEngines,
    };

    const score = readinessScore(signals);
    const riskLevel = score < 30 ? "critical" : score < 50 ? "high" : score < 70 ? "medium" : "low";
    analyzed.push({
      repo,
      url: repoMeta.url,
      category: classifyRepo(repo),
      recommendation: recommendation(repo, fileCount),
      description: repoMeta.description ?? "",
      updatedAt: repoMeta.updatedAt,
      fileCount,
      readinessScore: score,
      riskLevel,
      defaultBranch,
      ...signals,
      gaps: detectGaps(signals),
    });
  }

  const sorted = analyzed.sort((a, b) => a.readinessScore - b.readinessScore);
  const report = {
    generatedAt: new Date().toISOString(),
    org: args.org,
    summary: {
      totalSourceRepos: sorted.length,
      risk: summaryByRisk(sorted),
      missingWorkflows: sorted.filter((r) => !r.hasWorkflows).length,
      missingDependabot: sorted.filter((r) => !r.hasDependabot).length,
      missingSecurityMd: sorted.filter((r) => !r.hasSecurityMd).length,
      missingCodeowners: sorted.filter((r) => !r.hasCodeowners).length,
      missingLockfiles: sorted.filter((r) => !r.hasLockfile).length,
      missingTests: sorted.filter((r) => !r.hasTests).length,
      missingBranchProtection: sorted.filter((r) => !r.hasBranchProtection).length,
      mergeCandidates: sorted.filter((r) => r.recommendation === "merge-candidate-into-platform-monorepo").length,
    },
    repos: sorted,
  };

  const jsonPath = join(args.outDir, `platform-gap-analysis-${args.org}-${DATE}.json`);
  const mdPath = join(args.outDir, `platform-gap-analysis-${args.org}-${DATE}.md`);
  writeJsonReport(jsonPath, report);

  const markdown = toMarkdown(report);
  ensureDirectory(args.outDir);
  writeFileSync(mdPath, markdown, "utf8");
  logInfo("org_gap_analysis.completed", {
    jsonReport: jsonPath,
    markdownReport: mdPath,
    totalRepos: sorted.length,
  });
}

main();
