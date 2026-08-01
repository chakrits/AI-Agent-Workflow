import importlib.util
import math
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "verify_status_jcs.py"
SPEC = importlib.util.spec_from_file_location("verify_status_jcs", MODULE_PATH)
REFERENCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REFERENCE)


class StatusJcsReferenceTest(unittest.TestCase):
    def test_canonicalizes_without_mutating_and_sorts_evidence_by_utf8(self):
        value = {"recordDigest": "ignored", "evidence": [
            {"kind": "é", "url": "a", "digest": "", "commit": "", "observedAt": "2026-08-01T00:00:00Z"},
            {"kind": "a", "url": "z", "digest": "", "commit": "", "observedAt": "2026-08-01T00:00:00Z"},
        ]}
        before = repr(value)
        canonical = REFERENCE.canonicalize(value)
        self.assertEqual(repr(value), before)
        self.assertTrue(canonical.startswith(b'{"evidence":[{"commit":"","digest":"","kind":"a"'))

    def test_rejects_values_outside_the_restricted_domain(self):
        for value in (-0.0, 1.5, math.inf, 9007199254740992, "\ud800"):
            with self.subTest(value=repr(value)):
                with self.assertRaises(REFERENCE.DomainError):
                    REFERENCE.canonicalize({"value": value})

    def test_verifies_all_frozen_jcs_vectors(self):
        self.assertEqual(REFERENCE.verify_manifest(ROOT), [
            "JCS-U01", "JCS-N01", "JCS-E01",
            "JCS-X01-negative-zero", "JCS-X02-fraction", "JCS-X03-overflow", "JCS-X04-lone-surrogate",
        ])


if __name__ == "__main__":
    unittest.main()
