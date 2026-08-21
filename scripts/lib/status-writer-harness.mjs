import { createHash } from 'node:crypto';

import { isSafeRepositoryPath } from './status-cas-decision.mjs';

const clone = (value) => structuredClone(value);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const COMMIT = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const CAS_FIELDS = [['commitSha', COMMIT], ['manifestDigest', DIGEST], ['setDigest', DIGEST], ['headDigest', DIGEST]];
const WRITER_FIELDS = new Set(['kind', 'profile', 'identity', 'toolVersion']);
const CANDIDATE_FIELDS = new Set(['writer', 'expected', 'publication', 'interruptAt']);
const PUBLICATION_FIELDS = new Set(['candidatePath', 'archivePath', 'manifestPath', 'projectionPath', 'defaultRef', 'record', 'manifest', 'projection', 'gitCommit']);
const STAGES = ['candidate', 'archive', 'manifest', 'projection', 'gitCommit', 'defaultRef'];
const IDENTITY = /^local-cli\/[a-z][a-z0-9._-]{0,31}$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const error = (code) => ({ accepted: false, error: { code } });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, fields) => isObject(value) && Object.keys(value).every((key) => fields.has(key));
const pathKey = (value) => value.normalize('NFKC').toLocaleLowerCase('en-US');

function validTuple(tuple) { return isObject(tuple) && Object.keys(tuple).length === CAS_FIELDS.length && CAS_FIELDS.every(([field, pattern]) => typeof tuple[field] === 'string' && pattern.test(tuple[field])); }
function validWriter(writer) { return exact(writer, WRITER_FIELDS) && writer.kind === 'local-cli' && writer.profile === 'disposable-local' && IDENTITY.test(writer.identity) && VERSION.test(writer.toolVersion) && writer.toolVersion.length <= 64; }
function validPublication(publication) {
  if (!exact(publication, PUBLICATION_FIELDS) || !COMMIT.test(publication.gitCommit) || typeof publication.record !== 'string' || typeof publication.manifest !== 'string' || typeof publication.projection !== 'string') return false;
  if (!/^refs\/heads\/disposable-[a-z0-9-]+$/.test(publication.defaultRef)) return false;
  const paths = ['candidatePath', 'archivePath', 'manifestPath', 'projectionPath'].map((field) => publication[field]);
  if (!paths.every(isSafeRepositoryPath)) return false;
  const keys = new Set(paths.map(pathKey));
  return keys.size === paths.length && !paths.some((path) => pathKey(path) === pathKey(publication.defaultRef));
}
function validCandidate(candidate) { return exact(candidate, CANDIDATE_FIELDS) && validWriter(candidate.writer) && validTuple(candidate.expected) && validPublication(candidate.publication) && (candidate.interruptAt === undefined || STAGES.includes(candidate.interruptAt)); }

export function createWriterHarness(initial) {
  let state = { currentTuple: isObject(initial?.expected) ? clone(initial.expected) : null, candidate: null, archive: new Set(Array.isArray(initial?.archive) ? initial.archive : []), manifest: null, projection: null, gitCommit: null, defaultRef: null, approval: null, dispatch: null, handoff: null, terminalResult: null, consumption: null };
  const snapshot = () => clone(state);
  function prepare(candidate) {
    try {
      if (!isObject(candidate) || !exact(candidate, CANDIDATE_FIELDS)) return error('INVALID_INPUT');
      if (!validWriter(candidate.writer)) return error('INVALID_WRITER_INTENT');
      if (!validTuple(candidate.expected)) return error('INVALID_CAS_TUPLE');
      if (!validPublication(candidate.publication)) return error('INVALID_PUBLICATION');
      return { accepted: true, token: { candidate: clone(candidate), observed: clone(state.currentTuple) } };
    } catch { return error('INVALID_INPUT'); }
  }
  function commit(token) {
    try {
      if (!isObject(token) || !exact(token, new Set(['candidate', 'observed'])) || !validCandidate(token.candidate) || !validTuple(token.observed)) return error('INVALID_INPUT');
      if (CAS_FIELDS.some(([field]) => token.candidate.expected[field] !== state.currentTuple?.[field] || token.observed[field] !== state.currentTuple?.[field])) return error('STALE_CAS');
      if (state.archive.has(token.candidate.publication.archivePath)) return error('ARCHIVE_COLLISION');
      if (token.candidate.interruptAt) return error('PUBLICATION_INTERRUPTED');
      const publication = token.candidate.publication;
      const next = clone(state);
      next.candidate = { path: publication.candidatePath, record: publication.record };
      next.archive.add(publication.archivePath);
      next.manifest = publication.manifest;
      next.projection = publication.projection;
      next.gitCommit = publication.gitCommit;
      next.defaultRef = publication.defaultRef;
      next.currentTuple = { commitSha: digest(publication.gitCommit).slice(0, 40), manifestDigest: digest(publication.manifest), setDigest: digest(publication.record), headDigest: digest(publication.defaultRef) };
      state = next;
      return { accepted: true, publication: clone(publication) };
    } catch { return error('INVALID_INPUT'); }
  }
  function publish(candidate) { const prepared = prepare(candidate); return prepared.accepted ? commit(prepared.token) : prepared; }
  function runInterleavedRace(candidates) {
    if (!Array.isArray(candidates) || candidates.length !== 2) return [error('INVALID_INPUT')];
    const prepared = candidates.map(prepare);
    return prepared.map((item, index) => item.accepted ? null : item).map((item, index) => item ?? commit(prepared[index].token));
  }
  return { publish, prepare, commit, publishCompeting: runInterleavedRace, runInterleavedRace, snapshot };
}
