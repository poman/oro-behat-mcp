import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { CONFIG } from "./config.js";

/**
 * Run Behat
 */
export function runBehat(params = {}) {
  return new Promise((resolve) => {
    let cmd = CONFIG.BEHAT_BIN;

    if (params.feature) {
      cmd += ` ${params.feature}`;
    }

    if (params.tags) {
      cmd += ` --tags=${params.tags}`;
    }

    if (params.name) {
      cmd += ` --name="${params.name}"`;
    }

    cmd += ` --format=${CONFIG.FORMAT} --out=${CONFIG.OUTPUT_FILE} --no-interaction`;

    console.log("RUN CMD:", cmd);

    exec(cmd, {
      cwd: CONFIG.ORO_PATH,
      timeout: CONFIG.TIMEOUT,
      maxBuffer: 1024 * 1024 * 50,
    }, (err, stdout, stderr) => {

      console.log("STDOUT:\n", stdout);
      console.log("STDERR:\n", stderr);

      if (err) {
        return resolve({
          success: false,
          error: stderr || err.message,
        });
      }

      try {
        const filePath = path.join(CONFIG.ORO_PATH, CONFIG.OUTPUT_FILE);
        const content = fs.readFileSync(filePath, "utf-8");

        resolve({
          success: true,
          data: JSON.parse(content),
        });
      } catch (e) {
        resolve({
          success: false,
          error: "Cannot read behat output file",
          raw: stdout,
        });
      }
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
