#!/usr/bin/env node
import readline from "readline";
import { runBehat, extractFailures, hasRunnableSelection, normalizeToolArgs } from "./behatRunner.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function send(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

function asToolResponse(payload) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  const isError = Boolean(payload && typeof payload === "object" && payload.success === false);

  return {
    content: [{ type: "text", text }],
    structuredContent: payload,
    isError
  };
}

rl.on("line", async (line) => {
  try {
    const request = JSON.parse(line);

    if (request.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2025-11-25",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "oro-behat-mcp",
            version: "1.0.0"
          }
        }
      });
      return;
    }

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
                  feature: { type: "string" },
                  tags: { type: "string" },
                  name: { type: "string" }
                },
                anyOf: [
                  { required: ["feature"] },
                  { required: ["tags"] },
                  { required: ["name"] }
                ]
              }
            },
            {
              name: "debug-failures",
              description: "Run Behat and return failed scenarios",
              inputSchema: {
                type: "object",
                properties: {
                  feature: { type: "string" },
                  tags: { type: "string" },
                  name: { type: "string" }
                },
                anyOf: [
                  { required: ["feature"] },
                  { required: ["tags"] },
                  { required: ["name"] }
                ]
              }
            }
          ]
        }
      });
      return;
    }

    if (request.method === "tools/call") {
      const toolName = request.params?.name;
      const rawArgs = request.params?.arguments;

      let result;

      if (toolName === "run-tests" || toolName === "debug-failures") {
        const merged = normalizeToolArgs(rawArgs);
        if (!hasRunnableSelection(merged)) {
          result = {
            success: false,
            error: "Refusing to run full suite. Provide a non-empty value for at least one of: feature, tags, name."
          };
        } else if (toolName === "run-tests") {
          result = await runBehat(rawArgs);
        } else {
          const r = await runBehat(rawArgs);

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
      error: { message: e.message }
    });
  }
});
