export class StatusError extends Error {
  constructor(code, path, detail = '') {
    super(`${code}${path ? `: ${path}` : ''}${detail ? ` (${detail})` : ''}`);
    this.name = 'StatusError';
    this.code = code;
    this.path = path;
  }
}

export function statusError(code, path, detail) {
  throw new StatusError(code, path, detail);
}
