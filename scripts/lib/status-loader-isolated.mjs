import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { StatusError } from './status-errors.mjs';

const workerPath = fileURLToPath(new URL('./status-loader-worker.mjs', import.meta.url));

export function loadStatusFilesIsolated(paths, options = {}) {
  return new Promise((resolve, reject) => {
    const worker = fork(workerPath, [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    worker.once('error', reject);
    worker.once('message', (message) => {
      if (!message.ok) {
        reject(new StatusError(message.error.code, message.error.inputId));
        return;
      }
      const records = message.records;
      if (message.assurance) Object.defineProperty(records, 'assurance', { value: message.assurance, enumerable: false });
      resolve(records);
    });
    worker.send({ paths, options });
  });
}
