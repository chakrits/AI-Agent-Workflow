const planOnlyMarker = /^<!-- plan-only: true -->$/m;

export function shouldFetchPlanOnlyFiles({ body = '', issueNumber, closeout = false } = {}) {
  return Boolean(issueNumber && !closeout && planOnlyMarker.test(body));
}
