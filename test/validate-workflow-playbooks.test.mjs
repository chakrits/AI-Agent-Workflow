import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

test('new-feature playbook references its contract', async () => {
  const newFeature = await readFile('docs/workflows/new-feature.md', 'utf8');
  assert.match(newFeature, /docs\/contracts\/new-feature-workflow\.yaml/);
});
