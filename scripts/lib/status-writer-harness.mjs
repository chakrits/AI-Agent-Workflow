import { createHash } from 'node:crypto';

import { isSafeRepositoryPath } from './status-cas-decision.mjs';

const clone = (value) => structuredClone(value);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const COMMIT = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const WRITER_IDENTITY = /^[a-z][a-z0-9._-]{1,63}@[a-z][a-z0-9.-]{1,63}$/;
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const CAS_FIELDS = [['commitSha', COMMIT], ['manifestDigest', DIGEST], ['setDigest', DIGEST], ['headDigest', DIGEST]];

const error = (code) => ({ accepted: false, error: { code } });

function validTuple(tuple) {
  return tuple && typeof tuple === 'object' && !Array.isArray(tuple)
    && CAS_FIELDS.every(([field, pattern]) => typeof tuple[field] === 'string' && pattern.test(tuple[field]));
}

function validWriter(writer) {
  return writer && typeof writer === 'object' && !Array.isArray(writer)
    && writer.kind === 'local-cli'
    && typeof writer.identity === 'string' && WRITER_IDENTITY.test(writer.identity)
    && typeof writer.toolVersion === 'string' && writer.toolVersion.length <= 64 && SEMVER.test(writer.toolVersion);
}

function validPublication(publication) {
  if (!publication || typeof publication !== 'object' || Array.isArray(publication)) return false;
  return ['candidatePath', 'archivePath', 'manifestPath', 'projectionPath', 'gitRef', 'defaultRef'].every((field) => isSafeRepositoryPath(publication[field]))
    && publication.gitRef.startsWith('refs/heads/disposable-')
    && publication.defaultRef === publication.gitRef
    && typeof publication.record === 'string'
    && typeof publication.manifest === 'string'
    && typeof publication.projection === 'string'
    && typeof publication.gitCommit === 'string';
}

export function createWriterHarness(initial) {
  let state = {
    currentTuple: clone(initial?.expected),
    candidate: null,
    archive: new Set(initial?.archive ?? []),
    manifest: null,
    projection: null,
    gitCommit: null,
    defaultRef: null,
  };
  const snapshot = () => clone(state);
  function publish(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return error('INVALID_INPUT');
    if (candidate.writer?.kind !== 'local-cli') return error('UNSUPPORTED_WRITER');
    if (!validWriter(candidate.writer)) return error('INVALID_WRITER_INTENT');
    if (!validTuple(candidate.expected)) return error('INVALID_CAS_TUPLE');
    if (!validPublication(candidate.publication)) return error('INVALID_PUBLICATION');
    for (const [field] of CAS_FIELDS) if (candidate.expected[field] !== state.currentTuple[field]) return error('STALE_CAS');
    if (state.archive.has(candidate.publication.archivePath)) return error('ARCHIVE_COLLISION');
    if (candidate.interruptAt && ['candidate', 'archive', 'manifest', 'projection', 'gitCommit', 'defaultRef'].includes(candidate.interruptAt)) return error('PUBLICATION_INTERRUPTED');
    const next = clone(state);
    next.candidate = { path: candidate.publication.candidatePath, record: candidate.publication.record };
    next.archive.add(candidate.publication.archivePath);
    next.manifest = candidate.publication.manifest;
    next.projection = candidate.publication.projection;
    next.gitCommit = candidate.publication.gitCommit;
    next.defaultRef = candidate.publication.defaultRef;
    next.currentTuple = { commitSha: digest(candidate.publication.gitCommit).slice(0, 40), manifestDigest: digest(candidate.publication.manifest), setDigest: digest(candidate.publication.record), headDigest: digest(candidate.publication.defaultRef) };
    state = next;
    return { accepted: true, publication: clone(candidate.publication) };
  }
  function publishCompeting(candidates) {
    if (!Array.isArray(candidates)) return [error('INVALID_INPUT')];
    return candidates.map((candidate) => publish(candidate));
  }
  return { publish, publishCompeting, snapshot };
}
