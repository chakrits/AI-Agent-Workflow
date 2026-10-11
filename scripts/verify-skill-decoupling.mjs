import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { contributorCases, applyContributorCase } from './lib/skill-contributor-cases.mjs';

export function mandatoryCommands(github, gitlab) {
  const steps = github?.jobs?.validate?.steps;
  if (!Array.isArray(steps)) throw new Error('GitHub validate steps missing');
  const commands = steps.filter(step => step.run !== undefined).map(step => step.run);
  for (const job of Object.values(gitlab)) if (job?.script) commands.push(...job.script);
  const result = new Map();
  for (const text of commands) {
    if (typeof text !== 'string' || !/^(npm (?:ci|test|run [\w:-]+)|node scripts\/[\w./-]+)(?: [\w./:-]+)*$/.test(text.trim())) {
      throw new Error(`unsupported CI command: ${text}`);
    }
    const [program, ...args] = text.trim().split(/\s+/);
    if (program === 'npm' && args[0] === 'ci') continue; // locked modules reused, explicitly recorded
    result.set(JSON.stringify([program, args]), [program, args]);
  }
  if (!result.size) throw new Error('empty mandatory command graph');
  return [...result.values()];
}

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
function snapshot(root) {
  const files = git(root, ['ls-files', '-z']).split('\0').filter(Boolean);
  return Object.fromEntries(files.sort().map(file => [file, existsSync(path.join(root, file)) ? hash(readFileSync(path.join(root, file))) : null]));
}

export function verifySkillDecoupling(source = process.cwd()) {
  const root = git(source, ['rev-parse', '--show-toplevel']);
  if (git(root, ['status', '--porcelain'])) throw new Error('Source must be clean; commit candidate first');
  const candidate = git(root, ['rev-parse', 'HEAD']);
  const origin = git(root, ['remote', 'get-url', 'origin']);
  if (origin !== 'https://github.com/chakrits/AI-Agent-Workflow.git') throw new Error('Expected same-repository GitHub origin');
  const before = snapshot(root);
  const output = mkdtempSync(path.join(os.tmpdir(), 'skill-decoupling-evidence-'));
  const report = { candidate, origin, node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(), os: `${os.platform()} ${os.release()} ${os.arch()}`, dependencyMode: 'reused locked node_modules', lockHash: hash(readFileSync(path.join(root, 'package-lock.json'))), cases: [] };
  const commands = mandatoryCommands(parse(readFileSync(path.join(root, '.github/workflows/validate-contracts.yml'), 'utf8')), parse(readFileSync(path.join(root, '.gitlab-ci.yml'), 'utf8')));
  report.commands = commands;
  writeFileSync(path.join(output, 'baseline-hashes.json'), JSON.stringify(before, null, 2));
  for (const input of contributorCases()) {
    const clone = path.join(output, input.id);
    const logs = path.join(output, `${input.id}-logs`);
    mkdirSync(logs);
    git(root, ['clone', '--quiet', '--shared', '--no-checkout', root, clone]);
    git(clone, ['checkout', '--quiet', '--detach', candidate]);
    git(clone, ['remote', 'set-url', 'origin', origin]);
    if (git(clone, ['rev-parse', 'HEAD']) !== candidate) throw new Error('Clone SHA mismatch');
    symlinkSync(path.join(root, 'node_modules'), path.join(clone, 'node_modules'), 'dir');
    const item = applyContributorCase(clone, input);
    const result = { id: item.id, paths: item.paths, commands: [] };
    const allowed = file => item.paths.some(p => p.endsWith('/') ? file.startsWith(p) : file === p);
    const companion = values => hash(JSON.stringify(Object.entries(values).filter(([file]) => !allowed(file))));
    result.companionBefore = companion(before);
    const run = (program, args, expected = 0) => {
      const execution = spawnSync(program, args, { cwd: clone, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 180000 });
      const raw = `${execution.stdout ?? ''}\n${execution.stderr ?? ''}`;
      const log = `${result.commands.length}.log`;
      writeFileSync(path.join(logs, log), raw);
      result.commands.push({ program, args, status: execution.status, expected, log: path.join(logs, log), sha256: hash(raw), error: execution.error?.message });
      if (execution.status !== expected) throw new Error(`${item.id}: ${program} ${args.join(' ')} exit ${execution.status}, expected ${expected}; ${logs}/${log}`);
    };
    try {
      for (const [program, args] of commands) run(program, args);
      run('npm', ['run', 'validate:context-compatibility']);
      run('git', ['diff', '--check']);
      if (item.audit) run('npm', ['run', item.audit], 1);
      const after = snapshot(clone);
      result.companionAfter = companion(after);
      result.changedTracked = Object.keys(before).filter(file => before[file] !== after[file]);
      result.added = git(clone, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
      if (result.companionBefore !== result.companionAfter || [...result.changedTracked, ...result.added].some(file => !allowed(file))) throw new Error(`${item.id}: companion files changed`);
      result.passed = true;
    } catch (error) { result.passed = false; result.error = error.message; }
    report.cases.push(result);
    writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    rmSync(clone, { recursive: true }); // exact clone created by this run; logs remain
    console.log(`${item.id}: ${result.passed ? 'PASS' : 'FAIL'} (${result.commands.length} commands)`);
    if (!result.passed) break;
  }
  report.primaryPreserved = git(root, ['rev-parse', 'HEAD']) === candidate && !git(root, ['status', '--porcelain']) && JSON.stringify(snapshot(root)) === JSON.stringify(before);
  report.passed = report.primaryPreserved && report.cases.length === contributorCases().length && report.cases.every(item => item.passed);
  writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Evidence: ${output}/report.json`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { if (!verifySkillDecoupling().passed) process.exitCode = 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
