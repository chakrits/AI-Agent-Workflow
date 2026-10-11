// Evidence reference grammar for durable Bug Fix transitions (Issue #297, AC-004).
//
// Pure and offline: no network access is ever performed. A reference is a
// string, or a non-empty array of strings, where each string is one of:
//   - path:          repo-relative file (optional #fragment); no `..`, not
//                    absolute, no NUL; realpath must stay inside rootDir and
//                    resolve to an existing file.
//   - url:           https:// URL without whitespace.
//   - issue-comment: full GitHub issue/PR comment URL or `issuecomment-<digits>`.
// Object-valued evidence is rejected (OQ-P7). Prose such as "rp" is rejected.
//
// "No test seam" is satisfied by referencing a record that holds the rationale
// (a path or comment reference); no new evidence key or flag exists for it.
import fs from 'node:fs';
import path from 'node:path';

export const EVIDENCE_NOT_REFERENCE = 'EVIDENCE_NOT_REFERENCE';
const COMMENT_URL = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/\d+#issuecomment-\d+$/;
const COMMENT_ID = /^issuecomment-\d+$/;
const HTTPS_URL = /^https:\/\/[^\s/?#]+\S*$/;

function invalid(reason) { return { valid: false, code: EVIDENCE_NOT_REFERENCE, reason }; }

function checkPath(value, rootDir, fsOps) {
  if (value.includes('\0') || value.includes('\\')) return invalid('path contains NUL or backslash');
  const hashAt = value.indexOf('#');
  const filePart = hashAt === -1 ? value : value.slice(0, hashAt);
  if (!filePart || /[\u0000-\u001f]/.test(filePart)) return invalid('empty or control-character path');
  if (path.isAbsolute(filePart) || filePart.startsWith('/')) return invalid('absolute path');
  if (filePart.split('/').includes('..')) return invalid('path traversal');
  if (!rootDir || typeof rootDir !== 'string') return invalid('rootDir is required for path references');
  try {
    const realRoot = fsOps.realpathSync(rootDir);
    const realTarget = fsOps.realpathSync(path.resolve(realRoot, filePart));
    const relative = path.relative(realRoot, realTarget);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return invalid('path escapes rootDir');
    if (!fsOps.statSync(realTarget).isFile()) return invalid('path is not a file');
  } catch { return invalid('path does not exist'); }
  return { valid: true, kind: 'path' };
}

function parseOne(value, rootDir, fsOps) {
  if (typeof value !== 'string' || value.trim() === '' || value !== value.trim()) return invalid('reference must be a non-empty string');
  if (COMMENT_URL.test(value) || COMMENT_ID.test(value)) return { valid: true, kind: 'issue-comment' };
  if (value.startsWith('https://')) return HTTPS_URL.test(value) ? { valid: true, kind: 'url' } : invalid('malformed https URL');
  return checkPath(value, rootDir, fsOps);
}

export function parseEvidenceReference(value, { rootDir, fsOps = fs } = {}) {
  const ops = { realpathSync: fsOps.realpathSync ?? fs.realpathSync, statSync: fsOps.statSync ?? fs.statSync };
  if (Array.isArray(value)) {
    if (value.length === 0) return invalid('reference array must not be empty');
    const kinds = [];
    for (const item of value) {
      const result = parseOne(item, rootDir, ops);
      if (!result.valid) return result;
      kinds.push(result.kind);
    }
    return { valid: true, kind: 'array', kinds };
  }
  return parseOne(value, rootDir, ops);
}
