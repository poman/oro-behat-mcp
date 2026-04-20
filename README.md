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

From `oro-behat-mcp` directory:

```bash
npm install
cp .env.example .env
npm install -g --prefix "$HOME/.local" .
```

### Troubleshooting local install

If `npm install -g --prefix "$HOME/.local" .` fails or command is not found:

1) `EACCES` / permission denied

- Use user prefix exactly as above (`$HOME/.local`), not system global prefix.
- Verify current npm prefix:

```bash
npm config get prefix
```

2) `oro-behat-mcp: command not found`

- Ensure `$HOME/.local/bin` is in `PATH`:

```bash
echo "$PATH"
```

- If missing, add to `~/.bashrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

- Reload shell:

```bash
source ~/.bashrc
```

3) Installed but old version still runs

- Reinstall from package directory:

```bash
cd /oro-behat-mcp
npm install -g --prefix "$HOME/.local" .
```

- Verify resolved binary:

```bash
command -v oro-behat-mcp
```

4) Wrong Node/npm in current shell

- Check versions and location:

```bash
node -v
npm -v
which node
which npm
```

5) After `git pull` the guard or tool behavior does not change (still runs full suite)

- Cursor runs the **globally installed** `oro-behat-mcp` binary, not the repo copy. Reinstall and restart MCP:

```bash
cd <monolith-root>/oro-behat-mcp
npm install -g --prefix "$HOME/.local" .
```

- Then restart the `behat-runner` MCP server in Cursor (or reload the window).

- Sanity check without starting Behat (empty args must be rejected):

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"run-tests","arguments":{}}}' | node src/server.js
```

You should see `Refusing to run full suite` in the JSON response.

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

## MCP usage (Cursor/Copilot)

Use command-only configuration after local install:

```json
"behat-runner": {
  "command": "oro-behat-mcp"
}
```

Optional smoke check (manual run):

```bash
oro-behat-mcp
```

The server uses stdio JSON-RPC and supports tools:

- `run-tests` - runs Behat with provided arguments
- `debug-failures` - runs Behat and returns failed scenarios
- Safety guard: full suite run is blocked if `feature`, `tags`, and `name` are all missing or only whitespace (after reinstalling the global binary)
- Feature path accepts monolith-root-relative value (example: `package/.../file.feature`)
- **Stdio rule:** MCP must not print anything to **stdout** except JSON-RPC lines. Debug logging goes to stderr when `MCP_DEBUG=1`.
- **Test failures:** Behat often exits with a non-zero code when scenarios fail, but the server still reads `behat.json` and returns `success: true` with `data`, plus `behatExitCode` and `testsFailed` so agents get structured results.
- **Isolation / MailCatcher / kernel log:** Behat prints most of that to **stdout**. The `run-tests` response includes `behatStdout` (and `stderr` when present) so agents can see warnings before or after scenarios (for example MailCatcher not running). The `debug-failures` tool includes the same fields next to `failures`.

## Example `.env`

```env
ORO_PATH=../application/commerce-crm-ee
BEHAT_TIMEOUT=900000
```

## Notes

- `ORO_PATH` is resolved to an absolute path internally.
- If `ORO_PATH` is not set, the default monolith-relative path is used.
