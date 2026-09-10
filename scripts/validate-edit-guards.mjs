import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { CANONICAL_FILES } from './validate-context-budget.mjs';

const MATRIX_RELATIVE_PATH = 'test/fixtures/context-pack-v1/required-source-matrix.json';
const EDIT_TOOLS = new Set(['Edit', 'Write']);

function relativePath(filePath, rootDir) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath);
  return path.relative(rootDir, absolute).split(path.sep).join('/');
}

/**
 * Read the source paths that repin-source-matrix already owns.
 * The hook deliberately discovers this set from the fixture rather than
 * maintaining a second list of pinned files.
 */
export function readPinnedSourcePaths(rootDir) {
  const matrix = JSON.parse(readFileSync(path.join(rootDir, MATRIX_RELATIVE_PATH), 'utf8'));
  return new Set(
    (matrix.rows ?? []).flatMap((row) =>
      (row.requiredSources ?? []).map((source) => source.path).filter((sourcePath) => typeof sourcePath === 'string')
    )
  );
}

function readPinnedSourcePathsWithDiagnostic(rootDir) {
  try {
    return { paths: readPinnedSourcePaths(rootDir), diagnostic: undefined };
  } catch (error) {
    let reason = 'could not be read';
    if (error?.code === 'ENOENT') reason = 'is missing';
    else if (error instanceof SyntaxError) reason = 'is malformed JSON';
    return {
      paths: new Set(),
      diagnostic: `Edit guards advisory: ${MATRIX_RELATIVE_PATH} ${reason}; AC-06 path discovery was skipped.`
    };
  }
}

function isUnder(relative, prefix) {
  return relative === prefix || relative.startsWith(`${prefix}/`);
}

/**
 * Return every advisory validator applicable to an Edit/Write payload.
 * Multiple guards are intentionally retained: a canonical adapter or skill
 * source may need both the budget/parity and source-matrix feedback.
 */
export function planEditGuardsDetailed(payload, rootDir = process.cwd()) {
  const toolName = payload?.tool_name;
  const filePath = payload?.tool_input?.file_path ?? payload?.tool_input?.path;
  if (!EDIT_TOOLS.has(toolName) || typeof filePath !== 'string' || filePath.length === 0) {
    return { guards: [], diagnostics: [] };
  }

  const relative = relativePath(filePath, rootDir);
  const guards = [];
  const { paths: pinnedPaths, diagnostic } = readPinnedSourcePathsWithDiagnostic(rootDir);

  if (pinnedPaths.has(relative)) {
    guards.push({ script: 'repin:source-matrix', reason: 'the edited path is pinned in required-source-matrix.json' });
  }
  if (CANONICAL_FILES.includes(relative)) {
    guards.push({ script: 'validate:context-budget', reason: 'the edited path is a canonical context-budget source' });
  }
  if (isUnder(relative, '.claude/agents') || isUnder(relative, '.claude/skills')) {
    guards.push({ script: 'validate:adapter-parity', reason: 'the edited path is under a Claude adapter or skill tree' });
    guards.push({ script: 'validate:skill-parity', reason: 'the edited path is under a Claude adapter or skill tree' });
  }
  return { guards, diagnostics: diagnostic ? [diagnostic] : [] };
}

export function planEditGuards(payload, rootDir = process.cwd()) {
  return planEditGuardsDetailed(payload, rootDir).guards;
}

function defaultRunner(script, rootDir) {
  const result = spawnSync('npm', ['run', '--silent', script], {
    cwd: rootDir,
    stdio: 'inherit'
  });
  return result.status ?? 1;
}

/**
 * Run all applicable validators. The returned advisory flag is always true:
 * PostToolUse runs after the write and cannot safely undo it or become a
 * commit-time gate. Validators still report their own failures verbatim.
 */
export function runEditGuards(payload, rootDir = process.cwd(), runner = (script) => defaultRunner(script, rootDir)) {
  const { guards, diagnostics } = planEditGuardsDetailed(payload, rootDir);
  const failed = [];
  for (const guard of guards) {
    const status = runner(guard.script, guard);
    if (status !== 0) failed.push({ ...guard, status });
  }
  return { advisory: true, guards, diagnostics, failed };
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch (error) {
    console.error(`Edit guards skipped: hook payload was not valid JSON (${error.message}).`);
    return;
  }

  const rootDir = process.env.CLAUDE_PROJECT_DIR ? path.resolve(process.env.CLAUDE_PROJECT_DIR) : process.cwd();
  const result = runEditGuards(payload, rootDir);
  for (const diagnostic of result.diagnostics) console.error(diagnostic);
  if (result.guards.length === 0) return;

  if (result.failed.length > 0) {
    console.error(`Edit guards completed with ${result.failed.length} advisory failure(s); the edit remains applied.`);
  } else {
    console.error(`Edit guards completed: ${result.guards.map((guard) => `npm run ${guard.script}`).join(', ')}.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
