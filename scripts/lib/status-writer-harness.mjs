import { createHash } from 'node:crypto';

const clone = (value) => structuredClone(value);
const digest = (value) => createHash('sha256').update(value).digest('hex');

export function createWriterHarness(initial) {
  let state = { currentTuple: clone(initial.expected), archive: new Set(initial.archive ?? []), publication: null };
  const snapshot = () => clone(state);
  function publish(candidate) {
    if (candidate?.writer?.kind !== 'local-cli') return { accepted: false, error: { code: 'UNSUPPORTED_WRITER' } };
    if (!candidate.writer.identity || !candidate.writer.toolVersion) return { accepted: false, error: { code: 'INVALID_WRITER_INTENT' } };
    for (const field of ['commitSha', 'manifestDigest', 'setDigest', 'headDigest']) if (candidate.expected?.[field] !== state.currentTuple[field]) return { accepted: false, error: { code: 'STALE_CAS' } };
    if (state.archive.has(candidate.publication?.archivePeer)) return { accepted: false, error: { code: 'ARCHIVE_COLLISION' } };
    if (candidate.interruptAt) return { accepted: false, error: { code: 'PUBLICATION_INTERRUPTED' } };
    const next = clone(state);
    next.archive.add(candidate.publication.archivePeer);
    next.publication = clone(candidate.publication);
    next.currentTuple = { commitSha: digest(candidate.publication.gitCommit).slice(0, 40), manifestDigest: digest(candidate.publication.manifest), setDigest: digest(candidate.publication.record), headDigest: digest(candidate.publication.defaultRef) };
    state = next;
    return { accepted: true, publication: clone(candidate.publication) };
  }
  return { publish, snapshot };
}
