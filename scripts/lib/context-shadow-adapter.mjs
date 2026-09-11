import {
  compareCriticalRecords,
} from './context-compatibility.mjs';
import {
  contextEvidenceForPack,
  validateContextPack,
  validateFirstActionBoundary,
  validateSourceMatrix,
} from './context-compatibility-v1.mjs';

const LEGACY_PATH = 'legacy-context-loader';

function clone(value, label) {
  try {
    return structuredClone(value);
  } catch (error) {
    throw new TypeError(`shadow adapter error: ${label} is not cloneable: ${error.message}`);
  }
}

function fallbackResult(legacyResult, pack, stage, reason, errors = []) {
  const normalizedReason = reason instanceof Error ? reason.message : String(reason);
  return {
    status: 'fallback',
    authority: 'legacy',
    mutationAttempted: false,
    result: clone(legacyResult, 'legacy result'),
    legacyResult: clone(legacyResult, 'legacy result'),
    candidateResult: null,
    candidateManifest: null,
    comparison: null,
    evidence: {
      eventType: 'shadow_fallback',
      authority: 'shadow',
      stage,
      reason: normalizedReason,
      errors: [...errors],
      attributes: {
        fallback_used: true,
        fallback_reason: normalizedReason,
        legacy_path: LEGACY_PATH,
        packId: typeof pack?.packId === 'string' ? pack.packId : null,
        measurementStatus: typeof pack?.measurementStatus === 'string' ? pack.measurementStatus : null,
      },
    },
  };
}

function validatePackFallbackReason(pack) {
  const hasSourceFallback = pack.sources.some((source) => source.loadResult !== 'loaded');
  if (hasSourceFallback && (typeof pack.fallbackReason !== 'string' || pack.fallbackReason.length === 0)) {
    return ['context pack: fallbackReason is required when a source is fallback or rejected'];
  }
  if (!hasSourceFallback && pack.fallbackReason !== null) {
    return ['context pack: fallbackReason must be null when every source is loaded'];
  }
  return [];
}

function assertComparisonShape(comparison) {
  if (comparison === null || typeof comparison !== 'object'
    || typeof comparison.compatible !== 'boolean'
    || !Array.isArray(comparison.differences)) {
    throw new TypeError('shadow adapter error: comparator returned malformed comparison evidence');
  }
}

/**
 * Execute a repository-owned context-pack candidate as a non-authoritative shadow.
 * The legacy loader always runs first on a cloned input and its result is returned
 * for both successful comparisons and every candidate failure.
 */
export async function loadContextPackShadow({
  rootDir,
  matrix,
  pack,
  legacyInput,
  legacyLoader,
  candidateLoader,
  compare = compareCriticalRecords,
  firstActionObserved = false,
  measurementId = null,
  pairId = null,
  inputDigest = null,
}) {
  if (typeof legacyLoader !== 'function') throw new TypeError('shadow adapter requires a legacyLoader function');
  if (typeof candidateLoader !== 'function') throw new TypeError('shadow adapter requires a candidateLoader function');

  const legacyResult = await legacyLoader(clone(legacyInput, 'legacy input'));
  const authoritativeLegacyResult = clone(legacyResult, 'legacy result');
  const fallback = (stage, reason, errors = []) => fallbackResult(authoritativeLegacyResult, pack, stage, reason, errors);

  let matrixValidation;
  try {
    matrixValidation = await validateSourceMatrix(rootDir, matrix);
  } catch (error) {
    return fallback('source-matrix-validation', error);
  }
  if (!matrixValidation.valid) {
    return fallback('source-matrix-validation', 'candidate source matrix rejected', matrixValidation.errors);
  }

  let packValidation;
  try {
    packValidation = await validateContextPack(rootDir, pack, matrix);
  } catch (error) {
    return fallback('pack-validation', error);
  }
  if (!packValidation.valid) {
    return fallback('pack-validation', 'candidate context pack rejected', packValidation.errors);
  }

  const fallbackReasonErrors = validatePackFallbackReason(pack);
  if (fallbackReasonErrors.length > 0) {
    return fallback('pack-validation', 'candidate context pack fallback semantics rejected', fallbackReasonErrors);
  }

  const fallbackSources = pack.sources.filter((source) => source.loadResult !== 'loaded');
  if (fallbackSources.length > 0) {
    return fallback(
      'pack-load',
      pack.fallbackReason,
      fallbackSources.map((source) => `${source.path}: ${source.fallbackReason}`),
    );
  }

  const boundary = validateFirstActionBoundary({ loadMode: pack.loadMode, firstActionObserved });
  if (!boundary.valid) return fallback('first-action-boundary', boundary.errors[0], boundary.errors);

  let contextEvidence;
  try {
    contextEvidence = contextEvidenceForPack(pack);
  } catch (error) {
    return fallback('evidence', error);
  }

  let candidateResult;
  try {
    candidateResult = await candidateLoader({
      contextPack: clone(pack, 'context pack'),
      legacyResult: clone(authoritativeLegacyResult, 'legacy result for candidate'),
    });
  } catch (error) {
    return fallback('candidate-loader', error);
  }

  let comparison;
  try {
    comparison = compare(
      clone(authoritativeLegacyResult, 'legacy result for comparison'),
      clone(candidateResult, 'candidate result for comparison'),
    );
    assertComparisonShape(comparison);
  } catch (error) {
    return fallback('comparison', error);
  }

  return {
    status: 'compared',
    authority: 'legacy',
    mutationAttempted: false,
    result: clone(authoritativeLegacyResult, 'legacy result'),
    legacyResult: clone(authoritativeLegacyResult, 'legacy result'),
    candidateResult: clone(candidateResult, 'candidate result'),
    candidateManifest: clone(pack, 'candidate manifest'),
    comparison: clone(comparison, 'comparison evidence'),
    evidence: {
      contextLoaded: {
        contextMode: pack.loadMode,
        source_manifest_digest: contextEvidence.source_manifest_digest,
        token_measurement_status: contextEvidence.token_measurement_status,
        packId: contextEvidence.packId,
        measurementId,
      },
      shadowCompared: {
        pairId,
        inputDigest,
        legacyResultDigest: authoritativeLegacyResult.resultDigest,
        candidateResultDigest: candidateResult.resultDigest,
        comparisonResult: comparison.compatible ? 'match' : 'mismatch',
      },
    },
  };
}

export { LEGACY_PATH };
