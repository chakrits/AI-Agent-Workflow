import { statusError } from './status-errors.mjs';

export const STATUS_MODES = Object.freeze([
  'active', 'archive-identity', 'archive-all', 'transition', 'correction', 'authoritative-integration'
]);
export const INCREMENT_1_STATUS_MODES = Object.freeze([
  'active', 'archive-identity', 'archive-all'
]);

const statusModeSet = new Set(STATUS_MODES);
const increment1StatusModeSet = new Set(INCREMENT_1_STATUS_MODES);

export function requireStatusMode(mode) {
  if (!statusModeSet.has(mode)) statusError('UNSUPPORTED_MODE');
  return mode;
}

export function requireIncrement1StatusMode(mode) {
  requireStatusMode(mode);
  if (!increment1StatusModeSet.has(mode)) statusError('UNSUPPORTED_MODE');
  return mode;
}
