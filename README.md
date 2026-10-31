# gridprims

**The US power grid's math and public data, free in one browser tab.**

### 👉 [gridprims.com](https://gridprims.com)

- **Check your electric bill** line by line, and see what you should have paid.
- **Find the cheapest rate plan** for how your home actually uses power.
- **Drop in a meter file** and get your peaks, costs, and emissions in seconds.
- **Find your utility** from a ZIP code.
- **Look up any utility, power plant, state, or grid region** on one cited, dated page.

Your files never leave your device. No accounts, ads, or tracking. It works offline after your first visit.

## Use it from your AI agent

The same tools run on your own machine as a local MCP server. It never touches the network, and it reads only the folder you allow.

```sh
git clone https://github.com/clay-good/gridprims.git
node gridprims/mcp/server.mjs --allow-dir ~/meter-data
```

<details>
<summary>Setup for Claude Code, Claude Desktop, VS Code, and Cursor</summary>

<!-- mcp-snippets:start (generated from mcp/clients.mjs; do not edit) -->
Replace `/path/to/gridprims` with your clone and `/path/to/your/meter-files` with a folder of meter files the server may read.

**Claude Code** (terminal):

```sh
claude mcp add gridprims -- node --permission --allow-fs-read=/path/to/gridprims --allow-fs-read=/path/to/your/meter-files /path/to/gridprims/mcp/server.mjs --allow-dir /path/to/your/meter-files
```

**Claude Desktop** (claude_desktop_config.json):

```json
{
  "mcpServers": {
    "gridprims": {
      "command": "node",
      "args": [
        "--permission",
        "--allow-fs-read=/path/to/gridprims",
        "--allow-fs-read=/path/to/your/meter-files",
        "/path/to/gridprims/mcp/server.mjs",
        "--allow-dir",
        "/path/to/your/meter-files"
      ]
    }
  }
}
```

**VS Code** (.vscode/mcp.json):

```json
{
  "servers": {
    "gridprims": {
      "type": "stdio",
      "command": "node",
      "args": [
        "--permission",
        "--allow-fs-read=/path/to/gridprims",
        "--allow-fs-read=/path/to/your/meter-files",
        "/path/to/gridprims/mcp/server.mjs",
        "--allow-dir",
        "/path/to/your/meter-files"
      ]
    }
  }
}
```

**Cursor** (~/.cursor/mcp.json):

```json
{
  "mcpServers": {
    "gridprims": {
      "command": "node",
      "args": [
        "--permission",
        "--allow-fs-read=/path/to/gridprims",
        "--allow-fs-read=/path/to/your/meter-files",
        "/path/to/gridprims/mcp/server.mjs",
        "--allow-dir",
        "/path/to/your/meter-files"
      ]
    }
  }
}
```
<!-- mcp-snippets:end -->

</details>

See [mcp/README.md](mcp/README.md) for what each tool does.

## Build it yourself

You need Node.js 24.12 or later. Nothing to install.

```sh
npm test                        # run every test
npm run build && npm run serve  # site at http://127.0.0.1:8080
```

## License

Code: MIT. Page text and derived data: CC BY 4.0, unless a source's terms say otherwise.
