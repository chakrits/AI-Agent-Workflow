export class StatusError extends Error {
  constructor(code, inputId) {
    const safeInputId = /^input\[[0-9]{4,}\]$/.test(inputId ?? '') ? inputId : undefined;
    super(`${code}${safeInputId ? `: ${safeInputId}` : ''}`);
    this.name = 'StatusError';
    this.code = code;
    this.inputId = safeInputId;
  }
}

export function statusError(code, inputId) {
  throw new StatusError(code, inputId);
}
