export function validateQaEvidence({ result, rows = [] }) {
  if (result !== 'Pass') return [];
  return rows.flatMap(({ id, source, evidence }) => {
    if (!id || !source) return [`${id || 'AC'} source`];
    return evidence && (evidence.startsWith('http') || /^N\/A\s+—\s+.+/.test(evidence))
      ? []
      : [`${id} evidence or N/A reason`];
  });
}
