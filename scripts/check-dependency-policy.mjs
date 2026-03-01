#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { logError, logInfo, runCommand, writeJsonReport } from "./lib/logger.mjs";

const PACKAGE_JSON_PATH = resolve(process.cwd(), "package.json");
const REPORTS_DIR = resolve(process.cwd(), "reports");

const POLICY = {
  maxMajorLag: 1, // N-1 is allowed, N-2 and older fails
};

function parseJsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function extractMajor(versionSpec) {
  if (typeof versionSpec !== "string") return null;
  const match = versionSpec.match(/(\d+)(?:\.\d+)?(?:\.\d+)?/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function isLocalOrWorkspaceSpec(versionSpec) {
  if (typeof versionSpec !== "string") return true;
  return (
    versionSpec.startsWith("workspace:") ||
    versionSpec.startsWith("file:") ||
    versionSpec.startsWith("link:") ||
    versionSpec.startsWith("git+") ||
    versionSpec.startsWith("http://") ||
    versionSpec.startsWith("https://")
  );
}

function getLatestVersion(pkgName) {
  const command = `npm view ${JSON.stringify(pkgName)} version --json`;
  const output = runCommand(command);

  const parsed = JSON.parse(output);
  if (Array.isArray(parsed)) return parsed[parsed.length - 1];
  return parsed;
}

function collectDependencies(packageJson) {
  const sections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  const entries = [];

  for (const section of sections) {
    const deps = packageJson[section] ?? {};
    for (const [name, spec] of Object.entries(deps)) {
      entries.push({ name, spec, section });
    }
  }

  return entries;
}

function main() {
  logInfo("dependency_policy.start", { packageJson: PACKAGE_JSON_PATH, maxMajorLag: POLICY.maxMajorLag });

  const packageJson = parseJsonFile(PACKAGE_JSON_PATH);
  const deps = collectDependencies(packageJson);
  const results = [];
  const failures = [];

  for (const dep of deps) {
    if (isLocalOrWorkspaceSpec(dep.spec)) {
      results.push({
        ...dep,
        status: "skipped-local",
        reason: "local/workspace dependency",
      });
      continue;
    }

    const currentMajor = extractMajor(dep.spec);
    if (currentMajor === null) {
      results.push({
        ...dep,
        status: "unknown",
        reason: `cannot parse current version from "${dep.spec}"`,
      });
      continue;
    }

    let latestVersion;
    let latestMajor;
    try {
      latestVersion = getLatestVersion(dep.name);
      latestMajor = extractMajor(latestVersion);
    } catch (error) {
      results.push({
        ...dep,
        status: "unknown",
        reason: `failed to query registry: ${error.message}`,
      });
      continue;
    }

    if (latestMajor === null) {
      results.push({
        ...dep,
        status: "unknown",
        reason: `cannot parse latest version "${latestVersion}"`,
      });
      continue;
    }

    const lag = latestMajor - currentMajor;
    if (lag > POLICY.maxMajorLag) {
      const violation = {
        ...dep,
        status: "violation",
        currentMajor,
        latestVersion,
        latestMajor,
        lag,
      };
      results.push(violation);
      failures.push(violation);
      continue;
    }

    results.push({
      ...dep,
      status: lag === 1 ? "n-1" : "ok",
      currentMajor,
      latestVersion,
      latestMajor,
      lag,
    });
  }

  console.log("Dependency policy report (N/N-1 target):");
  for (const result of results) {
    if (result.status === "skipped-local" || result.status === "unknown") {
      console.log(`- ${result.name} [${result.section}] ${result.status}: ${result.reason}`);
      continue;
    }
    console.log(
      `- ${result.name} [${result.section}] ${result.status} (spec=${result.spec}, latest=${result.latestVersion}, lag=${result.lag})`,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    policy: POLICY,
    totalDependencies: deps.length,
    failures: failures.length,
    results,
  };
  const reportPath = join(REPORTS_DIR, `dependency-policy-${new Date().toISOString().slice(0, 10)}.json`);
  writeJsonReport(reportPath, report);

  if (failures.length > 0) {
    const message = `Policy failed: ${failures.length} dependency(ies) are older than N-1.`;
    logError("dependency_policy.failed", { failures: failures.length });
    console.error(`\n${message}`);
    process.exit(1);
  }

  logInfo("dependency_policy.passed", { dependencyCount: deps.length });
  console.log("\nPolicy passed: dependencies are within N/N-1 major range.");
}

main();
