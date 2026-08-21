import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import { createWriterHarness } from '../scripts/lib/status-writer-harness.mjs';

const initialTuple = { commitSha: 'a'.repeat(40), manifestDigest: 'b'.repeat(64), setDigest: 'c'.repeat(64), headDigest: 'd'.repeat(64) };
const publication = (id) => ({ candidatePath: `docs/status/candidates/${id}.json`, archivePath: `docs/status/archive/${id}.json`, manifestPath: 'docs/status/manifest.yaml', projectionPath: 'PROJECT_STATUS.md', gitRef: `refs/heads/disposable-${id}`, defaultRef: `refs/heads/disposable-${id}`, record: `${id}-record`, manifest: `${id}-manifest`, projection: `${id}-projection`, gitCommit: `${id}-commit` });
const candidate = (id, expected = initialTuple, overrides = {}) => ({ writer: { kind: 'local-cli', identity: 'maintainer@example.com', toolVersion: '1.0.0' }, expected, publication: publication(id), ...overrides });

test('writer-intent schema is closed and only accepts versioned local CLI identities', async () => {
  const schema = JSON.parse(await readFile(path.join('docs/contracts/schemas', 'status-writer-intent.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate({ kind: 'local-cli', identity: 'maintainer@example.com', toolVersion: '1.0.0' }), true);
  for (const invalid of [
    { kind: 'hosted', identity: 'maintainer@example.com', toolVersion: '1.0.0' },
    { kind: 'local-cli', identity: 'production', toolVersion: '1.0.0' },
    { kind: 'local-cli', identity: 'maintainer@example.com', toolVersion: 'latest' },
    { kind: 'local-cli', identity: 'maintainer@example.com', toolVersion: '1.0.0', extra: 'reject' },
  ]) assert.equal(validate(invalid), false, JSON.stringify(invalid));
});

test('writer harness public boundary never throws and rejects malformed/hosted/unsafe intent with code-only errors', () => {
  const harness = createWriterHarness({ expected: initialTuple });
  for (const value of [undefined, null, {}, { writer: { kind: 'hosted', identity: 'x', toolVersion: '1.0.0' } }, candidate('bad', initialTuple, { writer: { kind: 'local-cli', identity: 'production', toolVersion: '1' } }), candidate('path', initialTuple, { publication: { ...publication('path'), candidatePath: '../escape' } })]) {
    assert.doesNotThrow(() => harness.publish(value));
    const result = harness.publish(value);
    assert.deepEqual(Object.keys(result.error ?? {}), ['code']);
  }
});

test('publication state is explicit and every interruption point is side-effect free', () => {
  for (const stage of ['candidate', 'archive', 'manifest', 'projection', 'gitCommit', 'defaultRef']) {
    const harness = createWriterHarness({ expected: initialTuple });
    const before = harness.snapshot();
    assert.deepEqual(harness.publish(candidate(stage, initialTuple, { interruptAt: stage })), { accepted: false, error: { code: 'PUBLICATION_INTERRUPTED' } });
    assert.deepEqual(harness.snapshot(), before);
    assert.deepEqual(Object.keys(before).sort(), ['archive', 'candidate', 'currentTuple', 'defaultRef', 'gitCommit', 'manifest', 'projection']);
  }
});

test('archive collision, stale candidate, and competing interleaved candidates have no loser mutation and one winner', () => {
  const harness = createWriterHarness({ expected: initialTuple });
  const before = harness.snapshot();
  assert.deepEqual(harness.publishCompeting([candidate('one'), candidate('two')]).map(({ accepted, error }) => accepted ? 'accepted' : error.code), ['accepted', 'STALE_CAS']);
  const after = harness.snapshot();
  assert.equal(after.candidate.record, 'one-record');
  assert.deepEqual(harness.publish(candidate('stale')), { accepted: false, error: { code: 'STALE_CAS' } });
  assert.deepEqual(harness.snapshot(), after);
  assert.deepEqual(harness.publish(candidate('collision', after.currentTuple, { publication: { ...publication('collision'), archivePath: 'docs/status/archive/one.json' } })), { accepted: false, error: { code: 'ARCHIVE_COLLISION' } });
  assert.deepEqual(harness.snapshot(), after);
  assert.notDeepEqual(after, before);
});
