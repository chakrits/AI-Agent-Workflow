const planOnlyMarker = /^<!-- plan-only: true -->$/m;

export function shouldFetchPlanOnlyFiles({ body = '', issueNumber, closeout = false } = {}) {
  return Boolean(issueNumber && !closeout && planOnlyMarker.test(body));
}

export async function loadPlanOnlyChangedFiles({
  body = '',
  issueNumber,
  closeout = false,
  pullNumber,
  listFiles
} = {}) {
  if (!shouldFetchPlanOnlyFiles({ body, issueNumber, closeout })) return [];
  if (typeof listFiles !== 'function') throw new TypeError('listFiles is required');
  const files = await listFiles(pullNumber);
  return files.map((file) => file.filename);
}
