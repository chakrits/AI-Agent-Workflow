import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEvidenceReference } from '../scripts/lib/evidence-reference.mjs';

function makeRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-ref-'));
  fs.mkdirSync(path.join(rootDir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'docs', 'note.md'), '# note\n');
  return rootDir;
}
const COMMENT_URL = 'https://github.com/org/repo/issues/297#issuecomment-123456';

test('I297-TC-001: free text and "rp" are not references', () => {
  const rootDir = makeRoot();
  try {
    for (const bad of ['rp', 'see above', '', '  ', 42, null, undefined, true, {}, { url: 'https://x.io' }, [], [''], ['rp'], ['https://x.io/a', 'rp'], [['https://x.io/a']], 'http://example.com/a', 'https://exa mple.com', 'https://', 'issuecomment-', 'issuecomment-12a', 'issuecomment-1 ']) {
      const result = parseEvidenceReference(bad, { rootDir });
      assert.equal(result.valid, false, `expected invalid: ${JSON.stringify(bad)}`);
      assert.equal(result.code, 'EVIDENCE_NOT_REFERENCE');
    }
  } finally { fs.rmSync(rootDir, { recursive: true, force: true }); }
});

test('I297-TC-002: valid reference forms and non-empty arrays', () => {
  const rootDir = makeRoot();
  try {
    const cases = [
      ['docs/note.md', 'path'], ['docs/note.md#section-1', 'path'], ['https://example.com/a/b?c=1', 'url'],
      [COMMENT_URL, 'issue-comment'], ['https://github.com/org/repo/pull/5#issuecomment-9', 'issue-comment'], ['issuecomment-1', 'issue-comment']
    ];
    for (const [value, kind] of cases) {
      const result = parseEvidenceReference(value, { rootDir });
      assert.equal(result.valid, true, value);
      assert.equal(result.kind, kind, value);
    }
    assert.equal(parseEvidenceReference(['docs/note.md', 'issuecomment-2', 'https://example.com/x'], { rootDir }).valid, true);
  } finally { fs.rmSync(rootDir, { recursive: true, force: true }); }
});

test('I297-TC-001: path containment rejects traversal, absolute, NUL, symlink escape, missing file', () => {
  const rootDir = makeRoot();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-outside-'));
  try {
    fs.writeFileSync(path.join(outside, 'secret.md'), 'x');
    fs.symlinkSync(outside, path.join(rootDir, 'docs', 'link'));
    fs.symlinkSync(path.join(outside, 'secret.md'), path.join(rootDir, 'docs', 'file-link.md'));
    fs.symlinkSync(path.join(rootDir, 'docs', 'note.md'), path.join(rootDir, 'docs', 'inside-link.md'));
    const bad = ['../x.md', 'docs/../../x.md', 'docs/../note.md', 'docs/../docs/note.md', './../x.md', path.join(outside, 'secret.md'), '/etc/passwd', 'docs/note.md\0.txt', 'docs/link/secret.md', 'docs/file-link.md', 'docs/missing.md', 'docs/missing.md#frag', 'docs', '#frag', 'docs\\..\\x.md'];
    for (const value of bad) {
      const result = parseEvidenceReference(value, { rootDir });
      assert.equal(result.valid, false, `expected invalid: ${JSON.stringify(value)}`);
      assert.equal(result.code, 'EVIDENCE_NOT_REFERENCE');
    }
    assert.equal(parseEvidenceReference('docs/inside-link.md', { rootDir }).valid, true, 'symlink staying inside root is allowed');
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('I297-TC-001: reference check performs no network access', () => {
  const rootDir = makeRoot();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('network is forbidden'); };
  try {
    assert.equal(parseEvidenceReference(COMMENT_URL, { rootDir }).valid, true);
    assert.equal(parseEvidenceReference('https://example.com/a', { rootDir }).valid, true);
  } finally { globalThis.fetch = originalFetch; fs.rmSync(rootDir, { recursive: true, force: true }); }
});
