const FULL_VALIDATORS = [
  'npm run validate:contracts',
  'npm run validate:dispatch-receipts',
  'npm run validate:workflow-evidence',
  'npm run validate:adapter-parity',
  'npm run adr:audit',
  'npm run validate:risk-register',
  'npm run validate:review-gate',
  'npm run validate:clearable-refs',
  'npm run validate:context-budget',
  'npm run validate:context-compatibility',
  'npm run validate:status-projection',
  'npm run validate:ci-parity',
  'npm run validate:project-state'
];

const OPTIONAL_LIBRARY_PREFIXES = [
  '.agents/skills/',
  '.agents/workflows/',
  '.claude/skills/',
  '.agent/skills/'
];

const ROOT_DOCUMENTS = new Set([
  'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'ROADMAP-SDLC-FRAMEWORK.md'
]);

const PROJECT_STATE_PATHS = [
  'PROJECT_STATUS.md',
  'TASK_LOG.md'
];

// Keep the context integrity check tied to its real source-matrix dependencies,
// compatibility fixtures, and runtime loader. Unrelated contracts/docs stay light.
const CONTEXT_COMPATIBILITY_PATHS = new Set([
  'AGENTS.md',
  'docs/workflow/core-bootloader.md',
  'docs/workflow/role-definitions.md',
  'docs/workflow/quality-gates.md',
  'docs/workflow/handoff-contract.md',
  'docs/operating-model/AGENT_EVALUATION_CHECKLIST.md',
  'docs/workflow/dispatch-packet-contract.md',
  'docs/contracts/new-feature-workflow.yaml',
  'docs/workflow/testing-conventions.md',
  'docs/workflow/task-execution-mode.md',
  'docs/contracts/config-change-workflow.yaml',
  'docs/contracts/data-change-workflow.yaml',
  'docs/workflow/platform-readiness.md',
  'docs/workflow/reset-to-template.md',
  'docs/contracts/schemas/context-pack-v1.schema.json',
  'test/fixtures/context-pack-v1/required-source-matrix.json',
  'test/fixtures/context-compatibility-v1.json',
  'test/fixtures/context-compatibility-v1.manifest.json',
  'scripts/inject-role-context.mjs',
  'scripts/validate-context-compatibility.mjs',
  'scripts/lib/context-compatibility-v1.mjs',
  'scripts/lib/context-compatibility.mjs',
  'scripts/lib/context-shadow-adapter.mjs',
  'scripts/repin-source-matrix.mjs',
  'test/validate-context-compatibility.test.mjs',
  'test/context-compatibility.test.mjs',
  'test/context-shadow-adapter.test.mjs',
  'test/core-source-matrix.test.mjs'
]);

function isWithin(file, prefix) {
  return file === prefix || file.startsWith(`${prefix}/`);
}

function isValidRelativePath(file) {
  if (typeof file !== 'string' || file.length === 0 || file.includes('\0') || file.includes('\\')) return false;
  if (file.startsWith('/') || file.endsWith('/') || file.includes('//')) return false;
  return !file.split('/').some((part) => part === '.' || part === '..' || part.length === 0);
}

function conservative(reasonCode) {
  return {
    fullSuite: true,
    commands: ['git diff --check', 'npm test', ...FULL_VALIDATORS],
    reasonCodes: [reasonCode]
  };
}

/**
 * Selects a fixed allowlist of framework validations from repository-relative paths.
 * Paths never become shell commands. Unknown or incomplete input runs the full
 * correctness set and every core validator.
 *
 * @param {{changedPaths: string[], comparisonComplete: boolean}} input
 * @returns {{fullSuite: boolean, commands: string[], reasonCodes: string[]}}
 */
export function selectValidationChecks({ changedPaths, comparisonComplete } = {}) {
  if (comparisonComplete !== true || !Array.isArray(changedPaths)) {
    return conservative('DIFF_UNAVAILABLE');
  }
  if (changedPaths.length === 0) {
    return { fullSuite: false, commands: [], reasonCodes: ['NO_CHANGES'] };
  }
  if (!changedPaths.every(isValidRelativePath)) return conservative('MALFORMED_PATH');

  const commands = new Set(['git diff --check']);
  const reasons = new Set();
  let fullSuite = false;

  const addFullSuite = (reasonCode) => {
    fullSuite = true;
    commands.add('npm test');
    reasons.add(reasonCode);
  };

  for (const file of changedPaths) {
    if (CONTEXT_COMPATIBILITY_PATHS.has(file) || isWithin(file, 'test/fixtures/context-pack-v1')) {
      commands.add('npm run validate:context-compatibility');
      reasons.add('CONTEXT_COMPATIBILITY');
    }

    if (OPTIONAL_LIBRARY_PREFIXES.some((prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix))) {
      reasons.add('OPTIONAL_LIBRARY_ONLY');
      continue;
    }

    if (PROJECT_STATE_PATHS.includes(file) || isWithin(file, 'docs/records/work-items')) {
      reasons.add('PROJECT_STATE');
      commands.add('npm run validate:project-state');
      commands.add('npm run validate:status-projection');
      commands.add('npm run validate:clearable-refs');
      continue;
    }

    if (isWithin(file, 'docs/records/handoff')) {
      reasons.add('EVIDENCE_RECORDS');
      commands.add('npm run validate:workflow-evidence');
      commands.add('npm run validate:dispatch-receipts');
      continue;
    }

    if (isWithin(file, 'docs/records/dispatch-receipts')) {
      reasons.add('EVIDENCE_RECORDS');
      commands.add('npm run validate:dispatch-receipts');
      continue;
    }

    if (isWithin(file, 'docs/records/qa')) {
      reasons.add('REVIEW_RECORDS');
      commands.add('npm run validate:review-gate');
      continue;
    }

    if (file === 'DECISIONS.md' || isWithin(file, 'docs/records/adr')) {
      reasons.add('DECISION_RECORDS');
      commands.add('npm run adr:audit');
      continue;
    }

    if (file === 'RISKS.md') {
      reasons.add('RISK_REGISTER');
      commands.add('npm run validate:risk-register');
      continue;
    }

    if (file === 'AGENTS.md' || isWithin(file, 'docs/workflow') || isWithin(file, 'docs/workflows') ||
        isWithin(file, 'docs/operating-model') || isWithin(file, 'docs/templates')) {
      addFullSuite('CORE_POLICY');
      commands.add('npm run validate:context-budget');
      continue;
    }

    if (isWithin(file, 'docs/contracts')) {
      addFullSuite('CONTRACTS');
      commands.add('npm run validate:contracts');
      continue;
    }

    if (isWithin(file, '.agents/agents') || isWithin(file, '.claude/agents') || isWithin(file, '.agent/agents')) {
      addFullSuite('CORE_POLICY');
      commands.add('npm run validate:adapter-parity');
      commands.add('npm run validate:context-budget');
      continue;
    }

    if (isWithin(file, 'scripts') || isWithin(file, 'test') ||
        ['package.json', 'package-lock.json'].includes(file)) {
      addFullSuite('CODE');
      commands.add('npm run validate:contracts');
      commands.add('npm run validate:review-gate');
      continue;
    }

    if (isWithin(file, '.github/workflows') || isWithin(file, '.githooks') ||
        file === '.gitlab-ci.yml' || file === '.claude/settings.json') {
      addFullSuite('CI_POLICY');
      commands.add('npm run validate:ci-parity');
      continue;
    }

    if (isWithin(file, 'docs') || ROOT_DOCUMENTS.has(file) || file === 'README.md') {
      reasons.add('DOCS_ONLY');
      continue;
    }

    addFullSuite('UNKNOWN_PATH');
    commands.clear();
    commands.add('git diff --check');
    commands.add('npm test');
    for (const command of FULL_VALIDATORS) commands.add(command);
  }

  const uniqueReasons = [...reasons];
  if (uniqueReasons.length > 1) uniqueReasons.push('MIXED_CHANGE');
  return {
    fullSuite,
    commands: [
      'git diff --check', 'npm test', ...FULL_VALIDATORS
    ].filter((command) => commands.has(command)),
    reasonCodes: uniqueReasons
  };
}
