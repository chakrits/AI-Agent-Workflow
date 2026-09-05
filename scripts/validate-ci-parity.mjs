import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const GITHUB_VALIDATE_WORKFLOW = '.github/workflows/validate-contracts.yml';
const GITLAB_CI = '.gitlab-ci.yml';

/**
 * Scripts GitHub runs that GitLab deliberately does not.
 *
 * An entry here is a recorded decision that a host asymmetry is intended, not a
 * default. Add one only with a reason in the same change, and expect to justify
 * it in review: every current validator is a plain Node script with no host API
 * dependency, so "GitLab cannot run it" is rarely the real reason.
 */
export const HOST_ONLY_SCRIPTS = [];

/**
 * Every `npm run <script>` invocation in a CI file, as a Set.
 * Bare `npm test` is excluded: it is not a named script and both hosts run it.
 */
export function npmScriptsIn(filePath) {
  if (!existsSync(filePath)) return new Set();
  const content = readFileSync(filePath, 'utf8');
  return new Set([...content.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]));
}

/**
 * Portable validators the GitHub validate job runs that GitLab CI does not.
 *
 * The asymmetry matters because a GitLab-hosted clone is then enforced by a
 * weaker gate set than a GitHub-hosted one, with nothing reporting it.
 */
export function findMissingFromGitlab(root = process.cwd(), { hostOnly = HOST_ONLY_SCRIPTS } = {}) {
  const github = npmScriptsIn(path.join(root, GITHUB_VALIDATE_WORKFLOW));
  const gitlab = npmScriptsIn(path.join(root, GITLAB_CI));
  const exempt = new Set(hostOnly);
  return [...github].filter((script) => !gitlab.has(script) && !exempt.has(script)).sort();
}

function main() {
  const root = process.cwd();
  const github = npmScriptsIn(path.join(root, GITHUB_VALIDATE_WORKFLOW));
  const gitlab = npmScriptsIn(path.join(root, GITLAB_CI));
  const missing = findMissingFromGitlab(root);

  console.log('CI parity check');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`GitHub validate job runs:  ${github.size} named script(s)`);
  console.log(`GitLab CI runs:            ${gitlab.size} named script(s)`);
  console.log(`Deliberate host-only:      ${HOST_ONLY_SCRIPTS.length}`);
  console.log('─────────────────────────────────────────────────────────');

  if (missing.length === 0) {
    console.log('CI parity check PASSED: GitLab runs every portable validator GitHub enforces.');
    return;
  }

  console.error(`CI parity check FAILED: ${missing.length} validator(s) run on GitHub but not on GitLab:`);
  for (const script of missing) console.error(`  - ${script}`);
  console.error(
    '\nA GitLab-hosted clone is therefore gated more weakly than a GitHub-hosted one. ' +
      `Add each to ${GITLAB_CI}, or record it in HOST_ONLY_SCRIPTS with a reason if the asymmetry is intended.`
  );
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
