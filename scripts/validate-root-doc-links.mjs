import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DOCS = ['README.md', 'PROJECT_INDEX.md'];
const LINK_PATTERN = /\[[^\]]*\]\(([^)]+)\)/g;

function localTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  const angleDestination = trimmed.match(/^<([^>]*)>(?:\s+.*)?$/);
  const plainDestination = trimmed.match(/^([^\s]+)(?:\s+.*)?$/);
  let target = angleDestination?.[1] ?? plainDestination?.[1] ?? '';
  if (!target || target.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) return undefined;
  target = target.split(/[?#]/, 1)[0];
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

export function validateRootDocLinks(root = process.cwd()) {
  const rootPath = path.resolve(root);
  const errors = [];

  for (const file of ROOT_DOCS) {
    const sourcePath = path.join(rootPath, file);
    if (!existsSync(sourcePath)) {
      errors.push(`${file}: required root guide does not exist`);
      continue;
    }

    const content = readFileSync(sourcePath, 'utf8');
    for (const [, rawTarget] of content.matchAll(LINK_PATTERN)) {
      const target = localTarget(rawTarget);
      if (target === undefined) continue;
      const resolved = path.resolve(rootPath, target);
      if (resolved !== rootPath && !resolved.startsWith(`${rootPath}${path.sep}`)) {
        errors.push(`${file}: local link escapes repository root: ${target}`);
      } else if (!existsSync(resolved)) {
        errors.push(`${file}: local link target does not exist: ${target}`);
      }
    }
  }

  return errors;
}

function main() {
  const errors = validateRootDocLinks();
  if (errors.length) {
    for (const error of errors) console.error(`FAIL: ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Root-guide local links passed (${ROOT_DOCS.join(', ')}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
