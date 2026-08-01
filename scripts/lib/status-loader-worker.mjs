import { loadStatusFiles } from './status-loader.mjs';

process.once('message', async ({ paths, options }) => {
  try {
    const records = await loadStatusFiles(paths, options);
    process.send({ ok: true, records, assurance: records.assurance ?? null });
  } catch (error) {
    process.send({ ok: false, error: { code: error.code ?? 'SEMANTIC_ERROR', inputId: error.inputId ?? null } });
  } finally {
    process.disconnect();
  }
});
