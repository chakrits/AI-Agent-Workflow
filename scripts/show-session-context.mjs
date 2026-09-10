import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function git(rootDir, args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

export function buildSessionContext(rootDir = process.cwd()) {
  const status = readFileSync(path.join(rootDir, 'PROJECT_STATUS.md'), 'utf8');
  const clean = (value) => value?.trim().replace(/^[-*]\s+/, '') ?? '(not recorded)';
  const workItem = clean(status.match(/^## Current Work Item\s*\n([^\n]*)/m)?.[1]);
  const stage = clean(status.match(/^## Current Stage\s*\n([^\n]*)/m)?.[1]);
  return {
    workItem,
    stage,
    branch: git(rootDir, ['rev-parse', '--abbrev-ref', 'HEAD']),
    worktree: git(rootDir, ['rev-parse', '--show-toplevel'])
  };
}

export function formatSessionContext(context) {
  return [
    `Current Work Item: ${context.workItem}`,
    `Current Stage: ${context.stage}`,
    `Branch: ${context.branch}`,
    `Worktree: ${context.worktree}`
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(formatSessionContext(buildSessionContext()));
}
