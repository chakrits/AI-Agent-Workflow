import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateRootDocLinks } from '../scripts/validate-root-doc-links.mjs';

function withTempRoot(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'root-doc-links-'));
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('validates local links in both root guides and ignores external and fragment links', () => {
  withTempRoot((root) => {
    mkdirSync(path.join(root, 'docs'));
    writeFileSync(path.join(root, 'docs', 'guide.md'), '# Guide');
    writeFileSync(path.join(root, 'README.md'), '[Guide](docs/guide.md \"Guide title\") [Web](https://example.com) [Top](#top)');
    writeFileSync(path.join(root, 'PROJECT_INDEX.md'), '[Readme](README.md)');
    assert.deepEqual(validateRootDocLinks(root), []);
  });
});

test('reports broken local links with their source file and target', () => {
  withTempRoot((root) => {
    writeFileSync(path.join(root, 'README.md'), '[Missing](docs/missing.md)');
    writeFileSync(path.join(root, 'PROJECT_INDEX.md'), '# Index');
    assert.deepEqual(validateRootDocLinks(root), [
      'README.md: local link target does not exist: docs/missing.md'
    ]);
  });
});

test('rejects local links that escape the repository root', () => {
  withTempRoot((root) => {
    writeFileSync(path.join(root, 'README.md'), '[Outside](../outside.md)');
    writeFileSync(path.join(root, 'PROJECT_INDEX.md'), '# Index');
    assert.deepEqual(validateRootDocLinks(root), [
      'README.md: local link escapes repository root: ../outside.md'
    ]);
  });
});
