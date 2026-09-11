#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  loadContextPackFixtures,
  validateContextPack,
  validateCorpusManifest,
  validateSourceMatrix,
} from './lib/context-compatibility-v1.mjs';

const rootDir = process.cwd();
const readJson = async (file) => JSON.parse(await readFile(path.join(rootDir, file), 'utf8'));

const manifest = await readJson('test/fixtures/context-compatibility-v1.manifest.json');
const fixture = await readJson('test/fixtures/context-compatibility-v1.json');
const corpus = await validateCorpusManifest(rootDir, manifest, fixture);
const { matrix } = await loadContextPackFixtures(rootDir);
const matrixResult = await validateSourceMatrix(rootDir, matrix);
const result = { valid: corpus.valid && matrixResult.valid, corpus, matrix: matrixResult };
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
