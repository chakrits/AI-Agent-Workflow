# Third-Party Notices

## obra/superpowers — task-execution concepts (Issue #166)

Issue #166 is an independent, conceptual adaptation informed by
[`obra/superpowers` at commit `44c9b2d`](https://github.com/obra/superpowers/tree/44c9b2d6e889982ac18c27d05a19fefe335194e1), specifically its
`subagent-driven-development` skill and implementer/reviewer/re-review prompt shapes. The
repository does not reproduce the upstream prompts verbatim and retains its own dynamic routing,
lifecycle contracts, QA ownership, and human gates as canonical policy.

> **Pinning note:** the record of Issue #166 does not state which upstream commit was consulted
> while adapting the `subagent-driven-development` concepts. Per the Issue #170 assumption, this
> citation pins the upstream `HEAD` at the time of the fix (`44c9b2d`, 2026-08-12) and is
> explicitly **not** claimed to be the revision that was read during #166. It makes the reference
> reproducible, not historical.

Upstream copyright and license notice:

```text
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Addy Osmani — Frontend UI Engineering skill

The `frontend-ui-engineering` instruction is an independent adaptation informed by the [upstream skill at commit `98967c4`](https://github.com/addyosmani/agent-skills/tree/98967c45a42b88d6b8fb3a88b7ff6273920763d6/skills/frontend-ui-engineering). The implementation deliberately avoids reproducing the upstream framework-specific examples or full text.

Upstream copyright and license notice:

```text
MIT License

Copyright (c) 2025 Addy Osmani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## LambdaTest — `api-skill` catalog (Issue #139)

The 7 new API skills (`api-test-design`, `api-compliance-patterns`, `api-security-patterns`, `api-versioning-deprecation`, `api-observability-monitoring`, `api-integration-patterns`, `api-mocking-sandbox`) and 4 enrichments are an independent adaptation informed by [`LambdaTest/agent-skills/api-skill`](https://github.com/LambdaTest/agent-skills/tree/main/api-skill). The implementation deliberately strips the upstream's embedded third-party product-promotion instructions and avoids reproducing its full text.

Upstream copyright and license notice:

```text
MIT License

Copyright (c) 2025 TestMu AI / LambdaTest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## affaan-m/ECC — coding-standards / backend-patterns / frontend-patterns skills

The `coding-standards`, `backend-patterns`, and `frontend-react-patterns` skills are an independent adaptation informed by [`affaan-m/ECC`](https://github.com/affaan-m/ECC) (`skills/coding-standards`, `skills/backend-patterns`, `skills/frontend-patterns`, and `rules/common/`). The implementation deliberately avoids reproducing the upstream's full text or its exact worked examples, and does not carry forward a drift/contradiction found between two of the upstream's own mirrored copies (an in-memory rate limiter added to `.agents/skills/backend-patterns/SKILL.md` that contradicts the canonical `skills/backend-patterns/SKILL.md`'s explicit warning against per-process in-memory limiters in production).

Upstream copyright and license notice:

```text
MIT License

Copyright (c) 2026 Affaan Mustafa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Microsoft — `github-issue-creator` skill

The `defect-analysis` skill is an independent adaptation informed by [`microsoft/skills`'s `github-issue-creator`](https://github.com/microsoft/skills/blob/main/.github/skills/github-issue-creator/SKILL.md). Three elements were adopted: a `Summary` field at the top of the report, a concrete severity-to-impact worked mapping (translating this repo's existing Critical/High/Medium/Low/Informational scale into functional-defect terms rather than inventing a new taxonomy), and a note to placeholder/redact sensitive data before attaching logs/screenshots. The upstream's "infer missing context" guidance and its `/issues/`-directory output convention were deliberately not carried forward, since both conflict with this repo's Evidence-Based Reporting rule and existing output-location conventions.

Upstream copyright and license notice:

```text
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Anthropic — `frontend-design` skill

The `frontend-visual-design` skill is an independent adaptation informed by [`anthropics/skills/skills/frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design). The implementation restates the upstream's design philosophy in this repo's own skill format rather than reproducing its full text.

Upstream license: Apache License, Version 2.0. Full text: https://github.com/anthropics/skills/blob/main/skills/frontend-design/LICENSE.txt
