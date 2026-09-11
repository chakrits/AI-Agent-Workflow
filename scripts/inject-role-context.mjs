import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Canonical registry of roles permitted to receive on-demand role context injection.
 */
export const ROLE_REGISTRY = [
  'ba-agent',
  'sa-agent',
  'developer-agent',
  'qa-agent',
  'pm-agent',
  'config-agent',
  'documentation-agent',
  'orchestrator-agent',
  'release-agent',
  'security-agent',
  'data-agent'
];

/**
 * Maximum token budget per role payload (chars / 4).
 */
export const ROLE_BUDGET_TARGET = 1500;

/**
 * Resolve repository-relative or absolute role context file path.
 *
 * @param {string} roleId
 * @param {string} [root=process.cwd()]
 * @returns {string} Absolute path to role context markdown file
 */
export function getRoleContextPath(roleId, root = process.cwd()) {
  return path.join(root, 'docs', 'workflow', 'roles', `${roleId}.md`);
}

/**
 * Retrieve markdown content for a registered role.
 * Throws structured error if role is invalid or file is missing.
 *
 * @param {string} roleId
 * @param {string} [root=process.cwd()]
 * @returns {string}
 */
export function getRoleContext(roleId, root = process.cwd()) {
  if (!ROLE_REGISTRY.includes(roleId)) {
    const error = new Error(`Role '${roleId}' is not registered.`);
    error.code = 'INVALID_ROLE_IDENTIFIER';
    error.status = 'ERROR';
    error.allowed_roles = ROLE_REGISTRY;
    throw error;
  }

  const filePath = getRoleContextPath(roleId, root);
  if (!existsSync(filePath)) {
    const error = new Error(`Role context file not found: ${filePath}`);
    error.code = 'ROLE_FILE_NOT_FOUND';
    error.status = 'ERROR';
    error.allowed_roles = ROLE_REGISTRY;
    throw error;
  }

  return readFileSync(filePath, 'utf8');
}

/**
 * Inject role context into stream or format object.
 *
 * @param {string} roleId
 * @param {object} [options={}]
 * @param {boolean} [options.json=false]
 * @param {string} [options.root=process.cwd()]
 * @returns {{status: string, role: string, tokens: number, chars: number, content: string}}
 */
export function injectRoleContext(roleId, options = {}) {
  const root = options.root ?? process.cwd();
  const content = getRoleContext(roleId, root);
  const chars = content.length;
  const tokens = Math.floor(chars / 4);

  return {
    status: 'SUCCESS',
    role: roleId,
    tokens,
    chars,
    content
  };
}

export function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const roleArgs = args.filter((arg) => !arg.startsWith('--'));

  const roleId = roleArgs[0];

  if (!roleId || !ROLE_REGISTRY.includes(roleId)) {
    const errorPayload = {
      status: 'ERROR',
      error_code: 'INVALID_ROLE_IDENTIFIER',
      message: `Role '${roleId ?? ''}' is not registered.`,
      allowed_roles: ROLE_REGISTRY
    };
    process.stderr.write(`${JSON.stringify(errorPayload, null, 2)}\n`);
    process.exit(1);
  }

  try {
    const res = injectRoleContext(roleId, { json: isJson });
    if (isJson) {
      process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
    } else {
      process.stdout.write(res.content);
    }
  } catch (err) {
    const errorPayload = {
      status: 'ERROR',
      error_code: err.code || 'ROLE_INJECTION_FAILED',
      message: err.message,
      allowed_roles: ROLE_REGISTRY
    };
    process.stderr.write(`${JSON.stringify(errorPayload, null, 2)}\n`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
