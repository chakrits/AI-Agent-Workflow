import { statusError } from './status-errors.mjs';

export const STATUS_MODES = Object.freeze([
  'active', 'archive-identity', 'archive-all', 'transition', 'correction', 'authoritative-integration'
]);

const statusModeSet = new Set(STATUS_MODES);

export function requireStatusMode(mode) {
  if (!statusModeSet.has(mode)) statusError('UNSUPPORTED_MODE');
  return mode;
}
