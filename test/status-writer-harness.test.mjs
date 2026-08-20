import assert from 'node:assert/strict';
import test from 'node:test';

import { createWriterHarness } from '../scripts/lib/status-writer-harness.mjs';

const initial = { expected: { commitSha: 'a'.repeat(40), manifestDigest: 'b'.repeat(64), setDigest: 'c'.repeat(64), headDigest: 'd'.repeat(64) }, archive: new Set() };
const publication = (id) => ({ record: `${id}-record`, archivePeer: `${id}-archive`, manifest: `${id}-manifest`, projection: `${id}-projection`, gitCommit: `${id}-commit`, defaultRef: `${id}-ref` });
const candidate = (id, expected = initial.expected) => ({ writer: { kind: 'local-cli', identity: 'maintainer@example.com', toolVersion: '1.0.0' }, expected, publication: publication(id) });

test('harness re-reads CAS immediately and allows exactly one winner', () => {
  const harness = createWriterHarness(initial);
  assert.deepEqual(harness.publish(candidate('one')).accepted, true);
  assert.deepEqual(harness.publish(candidate('two')).error, { code: 'STALE_CAS' });
  assert.equal(harness.snapshot().publication.record, 'one-record');
});

test('stale, unsupported, archive-collision, and interrupted publication are side-effect free', () => {
  const harness = createWriterHarness(initial);
  const before = harness.snapshot();
  assert.equal(harness.publish({ ...candidate('hosted'), writer: { kind: 'hosted', identity: 'x', toolVersion: '1.0.0' } }).error.code, 'UNSUPPORTED_WRITER');
  assert.equal(harness.publish({ ...candidate('stale'), expected: { ...initial.expected, headDigest: 'e'.repeat(64) } }).error.code, 'STALE_CAS');
  assert.equal(harness.publish({ ...candidate('interrupt'), interruptAt: 'manifest' }).error.code, 'PUBLICATION_INTERRUPTED');
  assert.deepEqual(harness.snapshot(), before);
  assert.equal(harness.publish(candidate('one')).accepted, true);
  const after = harness.snapshot();
  assert.equal(harness.publish({ ...candidate('collision', after.currentTuple), publication: { ...publication('collision'), archivePeer: 'one-archive' } }).error.code, 'ARCHIVE_COLLISION');
  assert.deepEqual(harness.snapshot(), after);
});
