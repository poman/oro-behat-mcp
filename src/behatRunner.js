import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { CONFIG } from "./config.js";

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function asOptionalNonEmptyString(value) {
  if (value == null) {
    return undefined;
  }
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

export function normalizeToolArgs(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return {
    feature: asOptionalNonEmptyString(raw.feature ?? raw.path ?? raw.file),
    tags: asOptionalNonEmptyString(raw.tags),
    name: asOptionalNonEmptyString(raw.name),
  };
}

export function hasRunnableSelection(params) {
  return Boolean(params.feature || params.tags || params.name);
}

function normalizeFeaturePath(feature) {
  if (!feature) {
    return feature;
  }

  if (path.isAbsolute(feature)) {
    return feature;
  }

  // Allow passing monolith-root-relative path like "package/...".
  if (feature.startsWith("package/") || feature.startsWith("application/")) {
    const monolithRoot = path.resolve(CONFIG.ORO_PATH, "..", "..");
    const absoluteFeature = path.resolve(monolithRoot, feature);
    return path.relative(CONFIG.ORO_PATH, absoluteFeature);
  }

  return feature;
}

function readBehatJsonFile() {
  const filePath = path.join(CONFIG.ORO_PATH, CONFIG.OUTPUT_FILE);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function hasAnyScenarioFailure(data) {
  if (!data || !Array.isArray(data.suites)) {
    return false;
  }
  for (const suite of data.suites) {
    for (const feature of suite.features || []) {
      for (const scenario of feature.scenarios || []) {
        if (scenario.status === "failed") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Run Behat
 */
export function runBehat(params) {
  return new Promise((resolve) => {
    const merged = normalizeToolArgs(params);

    if (!hasRunnableSelection(merged)) {
      return resolve({
        success: false,
        error: "Refusing to run full suite. Provide a non-empty value for at least one of: feature, tags, name."
      });
    }

    let cmd = CONFIG.BEHAT_BIN;

    if (merged.feature) {
      cmd += ` ${shellEscape(normalizeFeaturePath(merged.feature))}`;
    }

    if (merged.tags) {
      cmd += ` --tags=${shellEscape(merged.tags)}`;
    }

    if (merged.name) {
      cmd += ` --name=${shellEscape(merged.name)}`;
    }

    cmd += ` --format=${CONFIG.FORMAT} --out=${CONFIG.OUTPUT_FILE} --no-interaction`;

    exec(cmd, {
      cwd: CONFIG.ORO_PATH,
      timeout: CONFIG.TIMEOUT,
      maxBuffer: 1024 * 1024 * 50,
    }, (err, stdout, stderr) => {
      // MCP stdio transport: never write to stdout except JSON-RPC lines (see server.js).
      if (process.env.MCP_DEBUG === "1") {
        process.stderr.write(`[oro-behat-mcp] RUN CMD: ${cmd}\n`);
        if (stdout) {
          process.stderr.write(`[oro-behat-mcp] STDOUT:\n${stdout}\n`);
        }
        if (stderr) {
          process.stderr.write(`[oro-behat-mcp] STDERR:\n${stderr}\n`);
        }
      }

      const data = readBehatJsonFile();

      if (data) {
        const exitCode = err && typeof err.code === "number" ? err.code : 0;
        return resolve({
          success: true,
          data,
          behatExitCode: exitCode,
          testsFailed: hasAnyScenarioFailure(data),
          // Behat prints isolation / MailCatcher / kernel messages to stdout; include for agents.
          behatStdout: stdout || undefined,
          stderr: stderr || undefined,
        });
      }

      resolve({
        success: false,
        error: stderr || err?.message || "Cannot read or parse behat output file",
        raw: stdout,
      });
    });
  });
}

/**
 * Extract failures
 */
export function extractFailures(data) {
  const failures = [];

  data.suites.forEach((suite) => {
    suite.features.forEach((feature) => {
      feature.scenarios.forEach((scenario) => {
        if (scenario.status === "failed") {
          failures.push({
            feature: feature.name,
            scenario: scenario.name,
            file: scenario.file,
            line: scenario.line,
            error: scenario.failures?.[0]?.message || "Unknown error"
          });
        }
      });
    });
  });

  return failures;
}
