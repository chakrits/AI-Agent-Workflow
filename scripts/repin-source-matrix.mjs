import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { sha256 } from './lib/context-compatibility-v1.mjs';

const MATRIX_RELATIVE_PATH = 'test/fixtures/context-pack-v1/required-source-matrix.json';

/**
 * Re-pins `required-source-matrix.json`'s sha256 fields against the current
 * repository content.
 *
 * Path discovery walks `matrix.rows[].requiredSources[]` directly — it never
 * derives the path set from `CANONICAL_SOURCE_PATHS` or any validator-side
 * list, since path discovery is this script's own job. It never adds,
 * removes, or reorders entries; it only rewrites `sha256` values for paths
 * already present.
 *
 * Fails closed (throws, writes nothing) when:
 *  - the same path is pinned with disagreeing sha256 values across rows
 *    (a pre-existing inconsistency this script must not silently "fix"), or
 *  - the matrix file does not round-trip byte-for-byte through
 *    `JSON.stringify(JSON.parse(raw), null, 2) + '\n'` (the formatting
 *    invariant this script's write strategy depends on), or
 *  - a pinned source path cannot be read from disk.
 *
 * Idempotent: if no pinned path's computed hash differs from what is
 * currently recorded, no filesystem write occurs at all (bytes and mtime
 * both stay unchanged).
 *
 * @param {string} rootDir - repository root to resolve pinned paths against
 * @param {string} [matrixRelativePath] - override for testing
 * @returns {Promise<{changedPaths: string[], written: boolean}>}
 */
export async function repinSourceMatrix(rootDir, matrixRelativePath = MATRIX_RELATIVE_PATH) {
  const matrixPath = path.join(rootDir, matrixRelativePath);
  const raw = await readFile(matrixPath, 'utf8');

  let matrix;
  try {
    matrix = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Refusing to repin: ${matrixRelativePath} is not valid JSON: ${error.message}`);
  }

  // Defensive guard (SA-mandated): confirm the write strategy's formatting
  // assumption still holds against the file as it exists right now, before
  // mutating anything. If a hand edit ever drifts the fixture's formatting
  // away from this invariant, fail loudly rather than silently reformatting
  // the whole file on the next write.
  const reserialized = `${JSON.stringify(matrix, null, 2)}\n`;
  if (reserialized !== raw) {
    throw new Error(
      `Refusing to repin: ${matrixRelativePath} does not round-trip byte-for-byte through ` +
        "JSON.stringify(JSON.parse(raw), null, 2) + '\\n'. This script's write strategy assumes that " +
        'invariant holds; investigate the fixture\'s formatting before re-running.'
    );
  }

  // Group every occurrence of each unique path across all rows.
  const occurrencesByPath = new Map();
  for (const row of matrix.rows ?? []) {
    for (const source of row.requiredSources ?? []) {
      if (!occurrencesByPath.has(source.path)) occurrencesByPath.set(source.path, []);
      occurrencesByPath.get(source.path).push(source);
    }
  }

  // Fail-closed guard: refuse to proceed if any path's existing pinned
  // occurrences already disagree with each other. Normalizing over a
  // pre-existing inconsistency is explicitly out of scope for this tool.
  const nonUniformPaths = [...occurrencesByPath.entries()]
    .filter(([, occurrences]) => new Set(occurrences.map((occurrence) => occurrence.sha256)).size > 1)
    .map(([sourcePath]) => sourcePath);
  if (nonUniformPaths.length > 0) {
    throw new Error(
      'Refusing to repin: the following path(s) are pinned with non-uniform sha256 values across rows in ' +
        `${matrixRelativePath}. This is a pre-existing inconsistency that needs its own investigation, not a ` +
        `silent fix by this tool:\n${nonUniformPaths.map((sourcePath) => `  - ${sourcePath}`).join('\n')}`
    );
  }

  // Compute fresh hashes for every unique path and mark which ones changed.
  const changedPaths = [];
  for (const [sourcePath, occurrences] of occurrencesByPath) {
    const currentHash = occurrences[0].sha256;
    let freshHash;
    try {
      const bytes = await readFile(path.join(rootDir, sourcePath));
      freshHash = sha256(bytes);
    } catch (error) {
      throw new Error(`Refusing to repin: could not read pinned source path "${sourcePath}": ${error.message}`);
    }
    if (freshHash !== currentHash) {
      changedPaths.push(sourcePath);
      for (const occurrence of occurrences) occurrence.sha256 = freshHash;
    }
  }

  if (changedPaths.length === 0) {
    return { changedPaths: [], written: false };
  }

  changedPaths.sort();
  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  return { changedPaths, written: true };
}

export async function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const rootDir = cwd;
  const { changedPaths, written } = await repinSourceMatrix(rootDir);
  if (!written) {
    console.log('No changes: every pinned sha256 hash already matches the repository content.');
    return;
  }
  console.log(`Updated sha256 for ${changedPaths.length} path(s):`);
  for (const changedPath of changedPaths) console.log(`  - ${changedPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
