import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { digestJcs } from './status-jcs.mjs';

const CORPUS_FIELDS = ['schemaVersion', 'fixturePath', 'fixtureSha256', 'fixtureCount', 'groupCounts', 'sourceCommit', 'canonicalization'];
const CORPUS_GROUPS = ['routing', 'dispatch', 'stopBackwardRework', 'fallbackError'];
const PACK_FIELDS = ['schemaVersion', 'packId', 'authority', 'role', 'loadMode', 'measurementStatus', 'fallbackReason', 'sources'];
const SOURCE_FIELDS = ['path', 'sha256', 'triggerReason', 'loadResult', 'fallbackReason'];
const ROLES = ['Orchestrator Agent', 'PM Agent', 'BA Agent', 'SA Agent', 'Developer Agent', 'QA Agent', 'Security Reviewer', 'Config Agent', 'Data Agent', 'Release Agent', 'Documentation Agent'];
const LOAD_MODES = ['boot', 'on-demand'];
const MEASUREMENT_STATUSES = ['available', 'unsupported', 'unavailable', 'not_requested'];
const LOAD_RESULTS = ['loaded', 'fallback', 'rejected'];
const BOOT_SOURCES = ['AGENTS.md', 'docs/operating-model/AGENT_OPERATING_MODEL.md', 'docs/workflow/dynamic-routing.md'];
const ON_DEMAND_BASE_SOURCES = ['docs/workflow/role-definitions.md', 'docs/workflow/quality-gates.md', 'docs/workflow/handoff-contract.md', 'docs/operating-model/AGENT_EVALUATION_CHECKLIST.md', 'docs/operating-model/SKILL_CATALOG.md'];
const ROLE_SOURCE_CONTRACT = {
  'Orchestrator Agent': ['docs/workflow/dispatch-packet-contract.md', 'dynamic-workflow'],
  'PM Agent': ['docs/contracts/new-feature-workflow.yaml', 'requirement-brainstorming'],
  'BA Agent': ['docs/contracts/new-feature-workflow.yaml', 'ba-requirement-analysis'],
  'SA Agent': ['docs/workflow/testing-conventions.md', 'sa-architecture-design'],
  'Developer Agent': ['docs/workflow/task-execution-mode.md', 'tdd-implementation'],
  'QA Agent': ['docs/workflow/testing-conventions.md', 'qa-playwright-testing'],
  'Security Reviewer': ['docs/contracts/new-feature-workflow.yaml', 'security-review'],
  'Config Agent': ['docs/contracts/config-change-workflow.yaml', 'data-config-change'],
  'Data Agent': ['docs/contracts/data-change-workflow.yaml', 'data-config-change'],
  'Release Agent': ['docs/workflow/platform-readiness.md', 'documentation-closeout'],
  'Documentation Agent': ['docs/workflow/reset-to-template.md', 'documentation-closeout'],
};
const CANONICAL_SOURCE_PATHS = new Set([
  ...BOOT_SOURCES,
  ...ON_DEMAND_BASE_SOURCES,
  ...Object.values(ROLE_SOURCE_CONTRACT).flatMap(([routePath, skillId]) => [routePath, `.agents/skills/${skillId}/SKILL.md`]),
]);
const HEX64 = /^[0-9a-f]{64}$/;
const HEX40 = /^[0-9a-f]{40}$/;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactFields = (value, fields, label) => {
  const actual = Object.keys(value ?? {});
  const expected = new Set(fields);
  return [
    ...fields.filter((field) => !actual.includes(field)).map((field) => `${label}: missing field ${field}`),
    ...actual.filter((field) => !expected.has(field)).map((field) => `${label}: unknown field ${field}`),
  ];
};

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function resolveCommit(rootDir, commit) {
  if (!HEX40.test(commit)) return false;
  try {
    execFileSync('git', ['-C', rootDir, 'cat-file', '-e', `${commit}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function validateCorpusManifest(rootDir, manifest, fixture) {
  const errors = [];
  errors.push(...exactFields(manifest, CORPUS_FIELDS, 'corpus manifest'));
  if (manifest?.schemaVersion !== 'context-corpus/v1') errors.push('corpus manifest: unsupported schemaVersion');
  if (manifest?.canonicalization !== 'sha256-exact-utf8-bytes-v1') errors.push('corpus manifest: unsupported canonicalization');
  if (manifest?.fixturePath !== 'test/fixtures/context-compatibility-v1.json') errors.push('corpus manifest: fixturePath must name the canonical fixture');
  if (!HEX64.test(manifest?.fixtureSha256 ?? '')) errors.push('corpus manifest: fixtureSha256 must be lowercase SHA-256');
  if (!Number.isInteger(manifest?.fixtureCount) || manifest.fixtureCount !== 36) errors.push('corpus manifest: fixtureCount must be 36');
  if (!isObject(manifest?.groupCounts) || Object.keys(manifest.groupCounts).some((key) => !CORPUS_GROUPS.includes(key)) || CORPUS_GROUPS.some((key) => manifest.groupCounts?.[key] !== ({ routing: 12, dispatch: 10, stopBackwardRework: 8, fallbackError: 6 }[key]))) {
    errors.push('corpus manifest: groupCounts drift or unknown group');
  }
  if (!resolveCommit(rootDir, manifest?.sourceCommit ?? '')) errors.push('corpus manifest: sourceCommit must resolve to a commit');
  const bytes = await readFile(path.join(rootDir, manifest?.fixturePath ?? ''));
  if (sha256(bytes) !== manifest?.fixtureSha256) errors.push('corpus manifest: fixtureSha256 does not match exact UTF-8 bytes');
  if (!isObject(fixture) || !Array.isArray(fixture.fixtures)) errors.push('corpus fixture: fixtures must be an array');
  else {
    const groups = Object.groupBy(fixture.fixtures, ({ group }) => group);
    const actualGroups = Object.fromEntries(CORPUS_GROUPS.map((group) => [group, groups[group]?.length ?? 0]));
    if (fixture.fixtures.length !== manifest.fixtureCount) errors.push('corpus fixture: fixture count drift');
    if (JSON.stringify(actualGroups) !== JSON.stringify(manifest.groupCounts)) errors.push('corpus fixture: group count drift');
    const ids = fixture.fixtures.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) errors.push('corpus fixture: duplicate fixture id');
  }
  return { valid: errors.length === 0, errors };
}

const evidenceValueValid = (value, reason) => typeof value === 'string' && value.length > 0 && (value !== 'N/A' || (typeof reason === 'string' && reason.length > 0));

export function validatePairEvidence(pairs) {
  const errors = [];
  if (!Array.isArray(pairs)) return { valid: false, errors: ['pairs must be an array'] };
  const ids = new Set();
  for (const [index, pair] of pairs.entries()) {
    const prefix = `pair[${index}]`;
    if (!isObject(pair)) { errors.push(`${prefix}: must be an object`); continue; }
    if (ids.has(pair.pairId)) errors.push(`${prefix}: duplicate pairId`);
    ids.add(pair.pairId);
    for (const field of ['pairId', 'fixtureId', 'inputDigest', 'legacyResultDigest', 'candidateResultDigest', 'modelIdentity', 'configurationDigest', 'measurementId', 'hostId', 'firstActionBoundary']) {
      if (typeof pair[field] !== 'string' || pair[field].length === 0) errors.push(`${prefix}: missing ${field}`);
    }
    for (const field of ['inputDigest', 'legacyResultDigest', 'candidateResultDigest']) if (!HEX64.test(pair[field] ?? '')) errors.push(`${prefix}: invalid ${field}`);
    for (const field of ['modelIdentity', 'configurationDigest', 'hostId', 'firstActionBoundary']) if (pair[field] === 'N/A' && (!pair[`${field}Reason`] || typeof pair[`${field}Reason`] !== 'string')) errors.push(`${prefix}: ${field} N/A requires a reason`);
  }
  return { valid: errors.length === 0, errors };
}

export async function loadContextPackFixtures(rootDir) {
  const matrix = JSON.parse(await readFile(path.join(rootDir, 'test/fixtures/context-pack-v1/required-source-matrix.json'), 'utf8'));
  return { matrix };
}

export async function validateSourceMatrix(rootDir, matrix) {
  const errors = [];
  const skillCatalog = await readFile(path.join(rootDir, 'docs/operating-model/SKILL_CATALOG.md'), 'utf8');
  if (matrix?.schemaVersion !== 'context-source-matrix/v1') errors.push('source matrix: unsupported schemaVersion');
  if (JSON.stringify(matrix?.roles) !== JSON.stringify(ROLES)) errors.push('source matrix: role set/order must match the closed role enum');
  if (!Array.isArray(matrix?.rows) || matrix.rows.length !== ROLES.length * LOAD_MODES.length) errors.push('source matrix: expected exactly two rows per role');
  const seen = new Set();
  for (const row of matrix?.rows ?? []) {
    const key = `${row.role}/${row.loadMode}`;
    if (seen.has(key)) errors.push(`source matrix: duplicate row ${key}`);
    seen.add(key);
    if (!ROLES.includes(row.role) || !LOAD_MODES.includes(row.loadMode)) { errors.push(`source matrix: invalid row ${key}`); continue; }
    const paths = row.requiredSources?.map(({ path: sourcePath }) => sourcePath) ?? [];
    const roleContract = ROLE_SOURCE_CONTRACT[row.role];
    const expectedPaths = row.loadMode === 'on-demand'
      ? [...BOOT_SOURCES, ...ON_DEMAND_BASE_SOURCES, roleContract?.[0], `.agents/skills/${roleContract?.[1] ?? ''}/SKILL.md`]
      : BOOT_SOURCES;
    if (JSON.stringify(paths) !== JSON.stringify(expectedPaths)) errors.push(`source matrix: exact source set mismatch for ${key}`);
    for (const sourcePath of paths) if (!CANONICAL_SOURCE_PATHS.has(sourcePath)) errors.push(`source matrix: unknown source path: ${sourcePath}`);
    if (new Set(paths).size !== paths.length) errors.push(`source matrix: duplicate source for ${key}`);
    for (const source of row.requiredSources ?? []) {
      if (!HEX64.test(source.sha256 ?? '')) errors.push(`source matrix: invalid hash for ${source.path}`);
      try { if (sha256(await readFile(path.join(rootDir, source.path))) !== source.sha256) errors.push(`source matrix: stale hash for ${source.path}`); }
      catch { errors.push(`source matrix: missing source ${source.path}`); }
    }
    const expectedSkills = row.loadMode === 'on-demand' && roleContract ? [roleContract[1]] : [];
    if (JSON.stringify(row.allowedSkillIds ?? []) !== JSON.stringify(expectedSkills)) errors.push(`source matrix: skill set mismatch for ${key}`);
    for (const skillId of row.allowedSkillIds ?? []) {
      const skillPath = `.agents/skills/${skillId}/SKILL.md`;
      if (!skillId || typeof skillId !== 'string' || !CANONICAL_SOURCE_PATHS.has(skillPath)) errors.push(`source matrix: skill/path mismatch for ${key}`);
      else {
        try { await readFile(path.join(rootDir, skillPath)); }
        catch { errors.push(`source matrix: registered skill path is missing: ${skillPath}`); }
        const tokenPattern = new RegExp(`(^|[^A-Za-z0-9_-])${skillId.replaceAll('-', '\\-')}([^A-Za-z0-9_-]|$)`);
        if (!tokenPattern.test(skillCatalog)) errors.push(`source matrix: skill is not registered: ${skillId}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function validateContextPack(rootDir, pack, matrix) {
  const errors = [];
  errors.push(...exactFields(pack, PACK_FIELDS, 'context pack'));
  if (pack?.schemaVersion !== 'context-pack/v1') errors.push('context pack: unsupported schemaVersion');
  if (typeof pack?.packId !== 'string' || pack.packId.length === 0) errors.push('context pack: packId is required');
  if (pack?.authority !== 'legacy') errors.push('context pack: authority must remain legacy');
  if (!ROLES.includes(pack?.role)) errors.push('context pack: unknown role');
  if (!LOAD_MODES.includes(pack?.loadMode)) errors.push('context pack: invalid loadMode');
  if (!MEASUREMENT_STATUSES.includes(pack?.measurementStatus)) errors.push('context pack: invalid measurementStatus');
  if (pack?.fallbackReason !== null && (typeof pack?.fallbackReason !== 'string' || pack.fallbackReason.length === 0)) errors.push('context pack: fallbackReason must be null or non-empty');
  if (!Array.isArray(pack?.sources) || pack.sources.length < 3) errors.push('context pack: sources must have at least three entries');
  const row = matrix?.rows?.find((candidate) => candidate.role === pack?.role && candidate.loadMode === pack?.loadMode);
  if (!row) errors.push('context pack: no registered source-matrix row');
  const seen = new Set();
  for (const [index, source] of (pack?.sources ?? []).entries()) {
    const prefix = `context pack source[${index}]`;
    errors.push(...exactFields(source, SOURCE_FIELDS, prefix));
    if (seen.has(source.path)) errors.push(`${prefix}: duplicate path`);
    seen.add(source.path);
    if (!HEX64.test(source.sha256 ?? '')) errors.push(`${prefix}: invalid sha256`);
    if (!LOAD_RESULTS.includes(source.loadResult)) errors.push(`${prefix}: invalid loadResult`);
    if (typeof source.triggerReason !== 'string' || source.triggerReason.length === 0) errors.push(`${prefix}: triggerReason is required`);
    if (source.loadResult === 'loaded' && source.fallbackReason !== null) errors.push(`${prefix}: loaded source cannot have fallbackReason`);
    if (source.loadResult !== 'loaded' && (!source.fallbackReason || typeof source.fallbackReason !== 'string')) errors.push(`${prefix}: fallback/rejected source requires fallbackReason`);
    if (row && !row.allowedTriggerReasons.includes(source.triggerReason)) errors.push(`${prefix}: triggerReason is not allowed by matrix`);
    const expected = row?.requiredSources?.find((candidate) => candidate.path === source.path);
    if (!expected) errors.push(`${prefix}: path is not in exact matrix row`);
    else if (expected.sha256 !== source.sha256) errors.push(`${prefix}: stale source hash`);
    if (expected) {
      try { if (sha256(await readFile(path.join(rootDir, source.path))) !== source.sha256) errors.push(`${prefix}: source hash does not match repository bytes`); }
      catch { errors.push(`${prefix}: source path is missing`); }
    }
  }
  if (row && seen.size !== row.requiredSources.length) errors.push('context pack: source set is not exact');
  if ((pack?.loadMode === 'boot') && pack?.firstActionObserved === true) errors.push('context pack: boot-only context cannot authorize a first action');
  return { valid: errors.length === 0, errors };
}

export function validateFirstActionBoundary({ loadMode, firstActionObserved }) {
  if (loadMode === 'boot' && firstActionObserved === true) return { valid: false, errors: ['first action requires cumulative on-demand comparison'] };
  return { valid: true, errors: [] };
}

export function contextEvidenceForPack(pack) {
  return {
    source_manifest_digest: digestJcs(pack),
    token_measurement_status: pack.measurementStatus,
    packId: pack.packId,
    measurementId: null,
  };
}

export { LOAD_MODES, MEASUREMENT_STATUSES, ROLES };
