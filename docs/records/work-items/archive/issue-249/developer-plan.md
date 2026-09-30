Issue #249 Developer plan; approval cd43b4a ADR-0025. Bug Fix / Medium.
Repro: quoted title --body hijacks actual body; root seam raw regex vs command-only lexer.
Direct proof excludes readiness validation as cause (extractor alone returns fake).
1. Add failing regression tests for shapes 9–13 and argument forms.
2. Extend existing lexer to optionally emit word tokens while preserving segment API; consume flags, honoring repetitions and gh precedence. No shell evaluation/dependencies.
3. Add mutation-focused marker cases; README CI correction; real-history parity replay.
Verify focused node tests, npm test, package validators; parent independent QA.
Risks: shell lexer retained limitations; no-flag whole-call denial unchanged. Rollback scoped commit.
