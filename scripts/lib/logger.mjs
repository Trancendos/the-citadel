#!/usr/bin/env node

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function emit(level, message, context = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
  };

  if (Object.keys(context).length > 0) {
    payload.context = context;
  }

  const line = JSON.stringify(payload);
  if (level === "ERROR" || level === "WARN") {
    console.error(line);
    return;
  }
  console.log(line);
}

export function logInfo(message, context = {}) {
  emit("INFO", message, context);
}

export function logWarn(message, context = {}) {
  emit("WARN", message, context);
}

export function logError(message, context = {}) {
  emit("ERROR", message, context);
}

export function ensureDirectory(path) {
  mkdirSync(path, { recursive: true });
}

export function writeJsonReport(path, data) {
  ensureDirectory(dirname(path));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  logInfo("report.written", { path });
}

export function runCommand(
  command,
  {
    workingDirectory = process.cwd(),
    allowFailure = false,
    logFailures = true,
    stdout = "pipe",
    stderr = "pipe",
  } = {},
) {
  try {
    const output = execSync(command, {
      cwd: workingDirectory,
      encoding: "utf8",
      stdio: ["ignore", stdout, stderr],
    });
    return output?.trim() ?? "";
  } catch (error) {
    if (allowFailure) {
      if (logFailures) {
        logWarn("command.failed", { command, error: error.message });
      }
      return null;
    }

    logError("command.failed", { command, error: error.message });
    throw error;
  }
}

export function runJsonCommand(command, options = {}) {
  const output = runCommand(command, options);
  if (output === null || output === "") return null;

  try {
    return JSON.parse(output);
  } catch (error) {
    logError("command.json_parse_failed", { command, error: error.message });
    if (options.allowFailure) return null;
    throw error;
  }
}
