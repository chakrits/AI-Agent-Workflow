import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { StatusError } from './status-errors.mjs';

const defaultWorkerPath = fileURLToPath(new URL('./status-loader-worker.mjs', import.meta.url));

export function loadStatusFilesIsolated(paths, options = {}, { workerPath = defaultWorkerPath } = {}) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = fork(workerPath, [], {
        execArgv: ['--max-old-space-size=96'],
        stdio: ['ignore', 'ignore', 'ignore', 'ipc']
      });
    } catch {
      reject(new StatusError('ISOLATED_WORKER_EXIT'));
      return;
    }
    let settled = false;
    const finish = (operation, value) => {
      if (settled) return;
      settled = true;
      worker.removeAllListeners();
      operation(value);
    };
    worker.once('error', () => finish(reject, new StatusError('ISOLATED_WORKER_EXIT')));
    worker.once('exit', () => finish(reject, new StatusError('ISOLATED_WORKER_EXIT')));
    worker.once('close', () => finish(reject, new StatusError('ISOLATED_WORKER_EXIT')));
    worker.once('message', (message) => {
      if (!message.ok) {
        finish(reject, new StatusError(message.error.code, message.error.inputId));
        return;
      }
      const records = message.records;
      if (message.assurance) Object.defineProperty(records, 'assurance', { value: message.assurance, enumerable: false });
      Object.defineProperty(records, 'resources', { value: Object.freeze(message.resources), enumerable: false });
      finish(resolve, records);
    });
    try {
      worker.send({ paths, options }, (error) => {
        if (error) finish(reject, new StatusError('ISOLATED_WORKER_EXIT'));
      });
    } catch {
      finish(reject, new StatusError('ISOLATED_WORKER_EXIT'));
    }
  });
}
