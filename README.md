# oro-behat-mcp

Minimal MCP server for running Behat tests inside the Oro monolith.

## What it does

- Exposes MCP tools to run Behat tests from `application/commerce-crm-ee`
- Returns parsed JSON output from Behat
- Supports a helper mode to extract failed scenarios

## Requirements

- Node.js 20+
- Clone `oro-behat-mcp` into monolith root
- Behat available in target app (`application/commerce-crm-ee/bin/behat`)

## Installation

From `oro-behat-mcp` directory (installs local dependencies only):

```bash
npm install
cp .env.example .env
```

No global `npm install -g` is required. The MCP client runs the server with **`node` and the path to `src/server.js`** (see below).

## Configuration

Configuration is loaded from `.env` (in `oro-behat-mcp`) with optional fallback to monolith root `.env`.

| Variable | Default | Description |
| --- | --- | --- |
| `ORO_PATH` | `../application/commerce-crm-ee` | Path to Oro application, relative to `oro-behat-mcp` |
| `BEHAT_BIN` | `bin/behat` | Behat executable |
| `BEHAT_FORMAT` | `json` | Output format |
| `BEHAT_OUTPUT_FILE` | `behat.json` | Output file name |
| `BEHAT_TIMEOUT` | `600000` | Timeout in ms |
| `MCP_DEBUG` | unset | Set to `1` to log command output to **stderr** only (never stdout) |

## MCP usage (Cursor / Copilot)

Point the MCP server at **Node** and the **entry file** (absolute path recommended):

```json
"behat-runner": {
  "command": "node",
  "args": ["/absolute/path/to/monolith/oro-behat-mcp/src/server.js"]
}
```

If your IDE does not resolve `node` from PATH, use the full path to the Node binary (for example from nvm):

```json
"behat-runner": {
  "command": "/home/you/.nvm/versions/node/v24.12.0/bin/node",
  "args": ["/absolute/path/to/monolith/oro-behat-mcp/src/server.js"]
}
```

Use a **single JSON-RPC line per message** on stdin; do not print anything else to stdout from this process (the server follows that rule).

### After `git pull`

Restart the `behat-runner` MCP server in the IDE so it loads the updated `server.js`.

Sanity check (empty tool args must be rejected, no Behat run):

```bash
cd /path/to/monolith/oro-behat-mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"run-tests","arguments":{}}}' | node src/server.js
```

You should see `Refusing to run full suite` inside the JSON response.

### Troubleshooting

- **`node` not found in MCP** — use the full path to `node` in `command` (same as in your shell `which node`).
- **Wrong old behavior after code changes** — ensure `args` points at the repo copy of `src/server.js` you just updated, then restart MCP.

## Tools

- `run-tests` — runs Behat with provided arguments
- `debug-failures` — runs Behat and returns failed scenarios
- Safety guard: full suite run is blocked if `feature`, `tags`, and `name` are all missing or only whitespace
- Feature path accepts monolith-root-relative value (example: `package/.../file.feature`)
- **Stdio rule:** MCP must not print anything to **stdout** except JSON-RPC lines. Debug logging goes to stderr when `MCP_DEBUG=1`.
- **Test failures:** Behat often exits with a non-zero code when scenarios fail, but the server still reads `behat.json` and returns `success: true` with `data`, plus `behatExitCode` and `testsFailed` so agents get structured results.
- **Isolation / MailCatcher / kernel log:** Behat prints most of that to **stdout**. The `run-tests` response includes `behatStdout` (and `stderr` when present). The `debug-failures` tool includes the same fields next to `failures`.

## Example `.env`

```env
ORO_PATH=../application/commerce-crm-ee
BEHAT_TIMEOUT=900000
```

## Notes

- `ORO_PATH` is resolved to an absolute path internally.
- If `ORO_PATH` is not set, the default monolith-relative path is used.
