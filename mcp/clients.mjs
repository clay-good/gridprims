// Client setup snippets from one source (agent/mcp-server, "Setup from one
// source"): the README section, the website's developer page, and the smoke
// test that launches each snippet's command all read this file.

/** The launch arguments every client uses, with placeholders a reader replaces. */
export const CLONE = '/path/to/gridprims';
export const DATA_DIR = '/path/to/your/meter-files';

/** The command and arguments: Node's permission model limits reads to the clone and the allowed folder. */
export function launch(clone = CLONE, dir = DATA_DIR) {
  return {
    command: 'node',
    // One --allow-fs-read per path: Node 24 and 26 no longer accept a comma-separated list.
    args: ['--permission', `--allow-fs-read=${clone}`, `--allow-fs-read=${dir}`, `${clone}/mcp/server.mjs`, '--allow-dir', dir],
  };
}

/** Each client's configuration, as the client documents it. */
export function snippets(clone = CLONE, dir = DATA_DIR) {
  const { command, args } = launch(clone, dir);
  const server = { command, args };
  return [
    { client: 'Claude Code', file: 'terminal', language: 'sh', text: `claude mcp add gridprims -- ${[command, ...args].join(' ')}` },
    { client: 'Claude Desktop', file: 'claude_desktop_config.json', language: 'json', text: JSON.stringify({ mcpServers: { gridprims: server } }, null, 2) },
    { client: 'VS Code', file: '.vscode/mcp.json', language: 'json', text: JSON.stringify({ servers: { gridprims: { type: 'stdio', ...server } } }, null, 2) },
    { client: 'Cursor', file: '~/.cursor/mcp.json', language: 'json', text: JSON.stringify({ mcpServers: { gridprims: server } }, null, 2) },
  ];
}

/** The README section, between its markers. */
export function readmeSection() {
  const parts = snippets().map((s) => `**${s.client}** (${s.file}):\n\n\`\`\`${s.language}\n${s.text}\n\`\`\``);
  return `<!-- mcp-snippets:start (generated from mcp/clients.mjs; do not edit) -->\nReplace \`${CLONE}\` with your clone and \`${DATA_DIR}\` with a folder of meter files the server may read.\n\n${parts.join('\n\n')}\n<!-- mcp-snippets:end -->`;
}
