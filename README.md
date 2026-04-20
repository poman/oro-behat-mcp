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

## Configuration

Configuration is loaded from `.env` (in `oro-behat-mcp`) with optional fallback to monolith root `.env`.

| Variable | Default | Description |
| --- | --- | --- |
| `ORO_PATH` | `../application/commerce-crm-ee` | Path to Oro application, relative to `oro-behat-mcp` |
| `BEHAT_BIN` | `bin/behat` | Behat executable |
| `BEHAT_FORMAT` | `json` | Output format |
| `BEHAT_OUTPUT_FILE` | `behat.json` | Output file name |
| `BEHAT_TIMEOUT` | `600000` | Timeout in ms |

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

## Example `.env`

```env
ORO_PATH=../application/commerce-crm-ee
BEHAT_TIMEOUT=900000
```

## Notes

- `ORO_PATH` is resolved to an absolute path internally.
- If `ORO_PATH` is not set, the default monolith-relative path is used.
