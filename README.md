# gridprims

**Where new load or generation can connect to the US grid, how much, and how long, from public federal data.**

### [gridprims.com](https://gridprims.com)

Enter a place and a size. Get the utilities that could serve it, how that size compares with their own peak and annual sales, what is already queued in the county, how long those requests have waited, how many were withdrawn, and which federal interconnection process applies. Every figure carries its publisher and date, and the math runs in your browser.

Built from LBNL's Queued Up, FERC Form 714, EIA-861 and the federal Small Generator Interconnection Procedures.

**How close in we can see.** Feeder and substation headroom is Critical Energy/Electric Infrastructure Information, so it is not public and we never estimate it. Answers are for the utility, the balancing authority, and the county. For a feeder, ask the serving utility for its hosting-capacity map.

## Everything else it does

Reached from the search bar and the All tools page, not the front page.

- **Your meter file, read on your device.** Drop a CSV, Excel, or Green Button export and get peaks, load factor, a line-by-line bill on any of the 26,000-plus OpenEI rates, every cheaper rate in the class, coincident-peak exposure, and a battery and solar screen.
- **Hourly emissions** from that same file, from EIA's hourly grid data, beside the annual averages most reports use.
- **One cited page per entity.** Every utility, power plant, state, balancing authority, and eGRID subregion, from EIA, EPA, FERC, and LBNL.
- **Household tools.** Check a bill from its printed totals, find the cheapest plan, see whether a change was the weather, and find your utility from a ZIP code.
- **Grid and large-load math.** Interconnection screens, large-load tariff terms, a plant-retirement screening model, and calculators with their constants and sources shown.
- **Clean data downloads.** Versioned tables with checksums, licenses, and a citation to copy.

## Private by design

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
