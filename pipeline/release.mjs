// Release integrity (platform/privacy-and-security, "Supply-chain integrity";
// task 5.5): digests of every deployed file, a deterministic MCP archive and
// its digest, and an SBOM listing zero third-party packages and every
// self-hosted font. Every date comes from the tagged commit, so two rebuilds
// of one tag produce identical bytes.
//   node pipeline/release.mjs <tag> [dist] [outDir]

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tableRows, walk } from '../verify/lib/walk.mjs';
import { writeZip } from '../verify/lib/zip-writer.mjs';
import { ROOT } from './run.mjs';

const sha256 = (b) => createHash('sha256').update(b).digest('hex');

/** The commit time of HEAD (or of the tag), the one clock a release may use. */
export function commitTime(root = ROOT, ref = 'HEAD') {
  return execFileSync('git', ['log', '-1', '--format=%cI', ref], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** Files the MCP archive carries: the server, the shared core, parsers, data, and what they need to run. */
export function mcpFiles(root = ROOT) {
  const keep = (f) => /^(mcp|core|parsers)\//.test(f) || /^data\/(?!health\/)/.test(f) || ['package.json', '.node-version', 'LICENSE', 'README.md'].includes(f);
  return walk(root).filter((f) => keep(f) && !f.endsWith('.test.mjs'));
}

/**
 * @param {{tag: string, dist: string, outDir: string, root?: string, created?: string}} o
 */
export function release({ tag, dist, outDir, root = ROOT, created = commitTime(root) }) {
  mkdirSync(outDir, { recursive: true });
  const digests = walk(dist).map((f) => `${sha256(readFileSync(join(dist, f)))}  ${f}`);
  const archiveName = `gridprims-mcp-${tag}.zip`;
  const archive = writeZip(mcpFiles(root).map((f) => ({ name: `gridprims-${tag}/${f}`, data: readFileSync(join(root, f)) })));
  writeFileSync(join(outDir, archiveName), archive);
  digests.push(`${sha256(archive)}  ${archiveName}`);
  writeFileSync(join(outDir, 'SHA256SUMS'), digests.join('\n') + '\n');

  // SBOM (SPDX 2.3): gridprims itself, zero third-party packages, and each self-hosted font and reference artifact.
  const artifacts = existsSync(join(root, 'docs/reference-artifacts.md')) ? [...tableRows(readFileSync(join(root, 'docs/reference-artifacts.md'), 'utf8'))] : [];
  const sbom = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `gridprims ${tag}`,
    documentNamespace: `https://gridprims.com/spdx/${tag}`,
    creationInfo: { created, creators: ['Tool: gridprims pipeline/release.mjs'], comment: 'No third-party packages: only JavaScript, web platform APIs, and Node.js built-ins.' },
    packages: [{ SPDXID: 'SPDXRef-gridprims', name: 'gridprims', versionInfo: tag, licenseConcluded: 'MIT', licenseDeclared: 'MIT', downloadLocation: 'https://github.com/clay-good/gridprims', filesAnalyzed: false, comment: 'Page text and derived data: CC BY 4.0 unless a table says otherwise.' }],
    files: artifacts.map(([path, cells], i) => ({
      SPDXID: `SPDXRef-artifact-${i + 1}`, fileName: path, checksums: [{ algorithm: 'SHA256', checksumValue: cells[cells.length - 1].replace(/`/g, '') }],
      licenseConcluded: 'NOASSERTION', licenseInfoInFiles: ['NOASSERTION'], copyrightText: cells[0], comment: `License as recorded: ${cells[1]}. Read or compared, never executed.`,
    })),
    relationships: [{ spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: 'SPDXRef-gridprims' }],
  };
  writeFileSync(join(outDir, 'sbom.spdx.json'), JSON.stringify(sbom, null, 2) + '\n');
  return { files: digests.length, archive: archiveName, thirdPartyPackages: sbom.packages.length - 1 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [tag, dist = join(ROOT, 'dist'), outDir = join(ROOT, 'release')] = process.argv.slice(2);
  const r = release({ tag, dist, outDir });
  console.log(`release ${tag}: ${r.files} digests, ${r.archive}, ${r.thirdPartyPackages} third-party packages`);
}
