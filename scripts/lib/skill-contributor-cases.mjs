import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';

const catalog = 'docs/operating-model/SKILL_CATALOG.md';
const vault = 'docs/vault/00-Index.md';
const skill = '.agents/skills/dynamic-workflow/SKILL.md';
const workflow = '.agents/workflows/dynamic-workflow.md';
const prose = '\nControlled harmless QA prose.\n';

export function contributorCases() {
  return [
    { id: 'baseline', kind: 'none', paths: [] },
    ...['.agents', '.claude', '.agent'].map(tree => ({ id: `add-${tree.slice(1)}`, kind: 'add', paths: [`${tree}/skills/probe/SKILL.md`] })),
    { id: 'formerly-pinned-skill', kind: 'append', paths: [skill], audit: 'audit:skills' },
    { id: 'reference-template', kind: 'add', paths: ['.agents/skills/dynamic-workflow/references/probe.md', '.agents/skills/dynamic-workflow/templates/probe.md'] },
    { id: 'workflow-prose', kind: 'append', paths: [workflow] },
    ...['remove', 'duplicate', 'stale'].flatMap(action => [
      { id: `catalog-${action}`, kind: action, paths: [catalog] },
      { id: `vault-${action}`, kind: action, paths: [vault] }
    ]),
    { id: 'catalog-absent', kind: 'delete', paths: [catalog] },
    { id: 'vault-skill-section-absent', kind: 'section', paths: [vault] },
    ...[159, 160, 161].flatMap(n => [false, true].map(emoji => ({
      id: `description-${n}-${emoji}`, kind: 'description', paths: [skill],
      description: (emoji ? '🙂' : 'x').repeat(n)
    }))),
    ...[5499, 5500, 5501].map(total => ({ id: `total-${total}`, kind: 'total', paths: [], total })),
    { id: 'catalog-over-budget', kind: 'large', paths: [catalog] },
    { id: 'task-log-no-notation', kind: 'log', paths: ['TASK_LOG.md'], audit: 'audit:skill-usage' },
    { id: 'all-optional-libraries-absent', kind: 'libraries', paths: [catalog, '.agents/skills/', '.claude/skills/', '.agent/skills/', '.agents/workflows/'] }
  ].map(item => ({ ...item, acIds:
    item.id === 'baseline' ? ['AC-05', 'AC-06', 'AC-07', 'AC-08'] :
    item.id === 'add-agents' ? ['AC-01'] : item.id.startsWith('add-') ? ['AC-02'] :
    item.id === 'task-log-no-notation' ? ['AC-09'] :
    ['formerly-pinned-skill', 'reference-template', 'workflow-prose'].includes(item.id) ? ['AC-03', 'AC-06', 'AC-07'] :
    ['AC-04', 'AC-06', 'AC-07', 'AC-08'] }));
}

export function applyContributorCase(root, input) {
  const item = { ...input, paths: [...input.paths] };
  const read = file => readFileSync(path.join(root, file), 'utf8');
  const write = (file, text) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), text); };
  if (item.kind === 'total') {
    item.paths = readdirSync(path.join(root, '.agents/skills')).filter(name => !name.startsWith('.'))
      .map(name => `.agents/skills/${name}/SKILL.md`);
    for (const [i, file] of item.paths.entries()) {
      write(file, read(file).replace(/^description:.*$/m, `description: ${'x'.repeat(i ? 1 : item.total - item.paths.length + 1)}`));
    }
  } else if (item.kind === 'libraries' || item.kind === 'delete') {
    for (const file of item.paths) rmSync(path.join(root, file), { recursive: true });
  } else if (item.kind === 'add') {
    for (const file of item.paths) write(file, file.endsWith('SKILL.md')
      ? '---\nname: probe\ndescription: Use for a controlled QA probe.\n---\n\n# Probe\n' : prose);
  } else if (item.kind !== 'none') {
    const file = item.paths[0];
    let text = read(file);
    if (item.kind === 'append') text += prose;
    if (item.kind === 'large') text += `\n${'x'.repeat(140000)}\n`;
    if (item.kind === 'description') text = text.replace(/^description:.*$/m, `description: ${item.description}`);
    if (item.kind === 'section') text = text.replace(/^## Skills[^]*?(?=^## )/m, '');
    if (item.kind === 'log') text += '\n| 2026-10-11 | QA probe | QA Agent | Controlled task | Observed | Reviewer | No notation |\n';
    if (['remove', 'duplicate', 'stale'].includes(item.kind)) {
      const line = file === catalog ? text.match(/^\| Dynamic Workflow.*$/m)?.[0] : text.match(/^- .*\.agents\/skills\/.*$/m)?.[0];
      if (!line) throw new Error(`No editorial specimen in ${file}`);
      text = text.replace(line, item.kind === 'remove' ? '' : item.kind === 'duplicate' ? `${line}\n${line}` : line.replaceAll('dynamic-workflow', 'missing-probe').replaceAll('api-contract-testing', 'missing-probe'));
    }
    write(file, text);
  }
  return item;
}
