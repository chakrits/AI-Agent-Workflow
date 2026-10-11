# Security Review: Issue #297 S2 (evidence reference grammar and path containment)

- Reviewer: Security Reviewer (independent; did not implement)
- Range: `git diff 20e7ae7..bf76284` (HEAD `bf76284`)
- Verdict: PASS_WITH_FINDINGS (no Critical/High; nothing blocks merge)
- Verification: `npm test` 799 pass / 0 fail; `npm run validate:contracts` passed.

## Controls

| Control | Result | Evidence |
|---|---|---|
| Path containment (no escape from rootDir) | PASS | scripts/lib/evidence-reference.mjs:24-40: lexical rejects (NUL/backslash :25, control :28, absolute :29, `..` segment :30) then realpath of root and target with `path.relative` check :33-36, then isFile :37. Probes below. |
| No network/DNS/IO for URL and comment forms | PASS | parseOne :42-47 uses regex only; fetch stubbed in probe, `fetched=false`. |
| `issuecomment-<digits>` cannot smuggle content | PASS | COMMENT_ID anchored :17; `\n`, trailing text, Arabic-Indic digits all rejected. |
| Input types | PASS | non-string, null, number, `{}`, null-proto object, nested array, `[]` all rejected without throw (:43,:52). Messages carry only fixed reason strings; no host paths or file contents. |
| Wiring order and scope | PASS | task-state-machine.mjs:160-161: validateEvidenceForRow (key presence) then validateReferenceEvidence; only called from the disk path (:175). Pure `transitionTaskState` untouched; test pins prose accepted in pure API (OQ-P2). |
| Rejection leaves bytes unchanged, lock/guard released | PASS | Throw occurs before `acquireCommitGuard` (:176-178); `finally` :190-193 releases lock; no write occurs before :186. Tests assert bytes, lock and guard absent. |
| Existing gates not weakened | PASS | Diff in the state machine is additive: one import, one function, one call, plus the `requires` check. CAS, fencing, actors, human gate, rework ceiling unchanged. |
| F1 closure (requires array mandatory) | PASS | :27 now throws POLICY_UNAVAILABLE for non-array `requires`, applied to transitions and resume rows. Probed undefined/null/string/object in tests I297-S1-F1. |
| Test edit `'rp'` -> `'issuecomment-1'` | PASS | The diff for test/ only changes fixture values (2 sites) so they satisfy the new grammar; no assertion removed or weakened. New tests are additive. |

## Probe inputs (scratch dir, since deleted; rootDir with real files, symlinks to an outside dir)

Rejected: `../x`, `./../x`, `docs/./../../out/secret.md` (traversal); `docs/%2e%2e/x`, `docs/..%2fx` (treated literally, nonexistent); `/etc/passwd`; `C:\x`, `docs\note.md` (backslash); `docs/note.md\0`; `docs/dirlink/secret.md` (dir symlink out); `docs/filelink.md` (file symlink out); `docs/chain.md` (chain to outside); `emptydir`, `docs` (not a file); `#x`; newline variants; 100 KB and 10k-segment inputs (no hang, nonexistent); nonexistent rootDir; missing rootDir; rootDir given but file absent.
Accepted (correctly): `docs/inlink.md` and `sub/up/note.md` (symlinks staying inside); `docs/note.md#../../out/secret.md` (fragment is stripped before resolution, not interpreted); `docs//note.md`, `./docs/note.md`, `docs/note.md/.`; a rootDir that is itself a symlink resolves via realpath and still blocks escape.
URL set: accepted `https://user@evil.com/a`, `https://exаmple.com/a` (Cyrillic а); rejected `http://`, `HTTPS://`, `javascript:`, `file:///`, `https://`, `https:///a`, `https://#a`, whitespace, NBSP, U+2028, newline.

## Findings

1. Low: latent oneOf defect in `validateReferenceEvidence` (task-state-machine.mjs:148). `(row.requires||[]).flat()` flattens oneOf groups, so if a reference key (repro, fail_path, hypothesis_matrix) is ever placed inside a oneOf group, the absent alternative is parsed as `undefined` and rejected, wrongly blocking a valid transition (fail-closed, availability only). Not reachable with the current YAML. Route to Developer Agent; not blocking.
2. Low: fsOps fallback (evidence-reference.mjs:50). `createStateIo`'s default `nodeFsOps` (fenced-commit.mjs:8-12) has no `realpathSync`, so production always uses the real `fs.realpathSync`; a fault-injecting `fsOps` that omits it is silently bypassed, and a caller supplying lying `realpathSync`/`statSync` can defeat containment (probed: returns valid for a symlink escape). fsOps is trusted in-process test/DI code, not attacker input, so this is hardening: add realpathSync/statSync to nodeFsOps or fail closed when absent. Also `fsOps: null` throws TypeError rather than returning invalid (fail-closed, but uncaught).
3. Low: TOCTOU between realpath and stat (:34-37). A swap after validation is possible, but the function returns only a boolean and the path is never opened or read here, so no content disclosure. Future consumers that read the referenced file must re-resolve under their own check.
4. Informational: url grammar accepts userinfo (`https://user:pw@host`) and non-ASCII/lookalike hosts, and the generic https branch (:44) also accepts any non-comment URL; `...#issuecomment-1x` is classified `url`. Offline grammar is per human decision 10a; no fetch occurs, so no exploit here. Do not render these as trusted links downstream, and avoid logging credentials in userinfo.
5. Informational: path accepts `docs//note.md`, trailing `/`, `/.`; harmless after realpath.

## Chained findings

Findings 1-3 do not compose into a higher risk: 2 needs a hostile in-process caller, 3 has no read primitive, 1 is availability-only.

## Handoff

Owner: Developer Agent for findings 1-2 (optional hardening). No human approval required; no Critical/High.
