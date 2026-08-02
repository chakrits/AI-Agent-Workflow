import { statusError } from './status-errors.mjs';
import { STATUS_LIMITS } from './status-parser.mjs';

export function enforceMemoryBudget({ baselineRss, currentRss, allocatedBytes }) {
  if (!Number.isSafeInteger(baselineRss) || !Number.isSafeInteger(currentRss)
      || !Number.isSafeInteger(allocatedBytes) || baselineRss < 0 || currentRss < 0 || allocatedBytes < 0) {
    statusError('MEMORY_BUDGET_EXCEEDED');
  }
  const residentDelta = Math.max(0, currentRss - baselineRss);
  if (residentDelta > STATUS_LIMITS.residentBytes || allocatedBytes > STATUS_LIMITS.residentBytes) {
    statusError('MEMORY_BUDGET_EXCEEDED');
  }
  return Object.freeze({ residentDelta, allocatedBytes });
}
