#!/usr/bin/env node
import readline from "readline";
import { runBehat, extractFailures } from "./behatRunner.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function send(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
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
                  feature: { type: "string" }
                },
                required: ["feature"]
              }
            },
            {
              name: "debug-failures",
              description: "Run Behat and return failed scenarios",
              inputSchema: {
                type: "object",
                properties: {
                  feature: { type: "string" }
                },
                required: ["feature"]
              }
            }
          ]
        }
      });
      return;
    }

    if (request.method === "tools/call") {
      const { name, arguments: args } = request.params;

      let result;

      if (name === "run-tests") {
        result = await runBehat(args);
      }

      if (name === "debug-failures") {
        const r = await runBehat(args);

        result = r.success
          ? { success: true, failures: extractFailures(r.data) }
          : r;
      }

      send({
        jsonrpc: "2.0",
        id: request.id,
        result
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
