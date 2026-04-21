#!/usr/bin/env node
import readline from "readline";
import {
  runBehat,
  extractFailures,
  hasRunnableSelection,
  normalizeToolArgs
} from "./behatRunner.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function send(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

function asToolResponse(payload) {
  const text =
    typeof payload === "string"
      ? payload
      : JSON.stringify(payload, null, 2);

  const isError =
    Boolean(payload && typeof payload === "object" && payload.success === false);

  return {
    content: [{ type: "text", text }],
    structuredContent: payload,
    isError
  };
}

rl.on("line", async (line) => {
  try {
    const request = JSON.parse(line);

    // ---------------- INIT ----------------
    if (request.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "oro-behat-mcp",
            version: "1.0.1"
          }
        }
      });
      return;
    }

    // ---------------- NOTIFICATIONS (fire-and-forget, no response needed) ----------------
    if (request.method?.startsWith("notifications/")) {
      return;
    }

    // ---------------- TOOLS LIST ----------------
    if (request.method === "tools/list") {
      send({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "run-tests",
              description: "Run Behat tests",
              inputSchema: {
                type: "object",
                properties: {
                  feature: {
                    type: "string",
                    description: "Path to feature file"
                  },
                  tags: {
                    type: "string",
                    description: "Behat tags (e.g. @smoke)"
                  },
                  name: {
                    type: "string",
                    description: "Scenario name"
                  }
                },
                additionalProperties: false
              }
            },
            {
              name: "debug-failures",
              description: "Run Behat and return failed scenarios",
              inputSchema: {
                type: "object",
                properties: {
                  feature: {
                    type: "string",
                    description: "Path to feature file"
                  },
                  tags: {
                    type: "string",
                    description: "Behat tags"
                  },
                  name: {
                    type: "string",
                    description: "Scenario name"
                  }
                },
                additionalProperties: false
              }
            }
          ]
        }
      });
      return;
    }

    // ---------------- TOOLS CALL ----------------
    if (request.method === "tools/call") {
      const toolName = request.params?.name;
      const rawArgs = request.params?.arguments ?? {};
      const args = normalizeToolArgs(rawArgs);

      let result;

      if (toolName === "run-tests" || toolName === "debug-failures") {
        // runtime validation (replacement for anyOf)
        if (!hasRunnableSelection(args)) {
          result = {
            success: false,
            error:
              "Provide at least one of: feature, tags, name (empty run is blocked)"
          };
        } else if (toolName === "run-tests") {
          result = await runBehat(args);
        } else {
          const r = await runBehat(args);

          result = r.success
            ? {
              success: true,
              failures: extractFailures(r.data),
              behatExitCode: r.behatExitCode,
              testsFailed: r.testsFailed,
              behatStdout: r.behatStdout,
              stderr: r.stderr,
            }
            : r;
        }
      } else {
        result = {
          success: false,
          error: `Unknown tool: ${String(toolName)}`
        };
      }

      send({
        jsonrpc: "2.0",
        id: request.id,
        result: asToolResponse(result)
      });

      return;
    }

  } catch (e) {
    send({
      jsonrpc: "2.0",
      error: {
        message: e.message,
      }
    });
  }
});
