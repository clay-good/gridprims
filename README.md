# gridprims

**The US power grid's math, files, and public data, free in one browser tab.**

### [gridprims.com](https://gridprims.com)

## For energy professionals

Built for utility engineers, energy managers, solar and storage developers, siting teams, commission staff, ratepayer advocates, and reporters.

- **Interval data in seconds.** Drop a meter export (CSV, Excel, or Green Button) and get peaks, load factor, and monthly demand. Every parsing choice is shown and can be edited.
- **Line-by-line bills on any tariff.** Price a load on any OpenEI rate, with time-of-use, tiers, demand windows, ratchets, and power factor. Then rank every rate in the same class.
- **Hourly emissions from your own file.** Your load's CO₂ hour by hour from EIA's hourly grid data, beside the annual averages most reports use, and how much of it a solar array or clean contract covers hour by hour. Plus the cleanest hours in your region for shifting flexible load.
- **One cited page per entity.** Every utility, power plant, state, and eGRID subregion, built from EIA, EPA, FERC, and LBNL data. Each page names its source and how current it is.
- **Interconnection queues** by state and county, by type, with time in queue and withdrawal rates.
- **Clean data downloads.** Versioned tables with checksums, licenses, and a citation to copy.

## For homes

- **Check your electric bill** and see what you should have paid.
- **Find the cheapest rate plan** for how your home actually uses power.
- **See how much of a change was the weather.** Compare this year's bills with last year's, and see how much of the change came from a colder winter or a hotter summer, from the nearest NOAA station.
- **See if your use is high** compared with the average home at your utility and in your state.
- **Find your utility** from a ZIP code.

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
