import importlib.util
import json
import math
from pathlib import Path
import shutil
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "verify_status_jcs.py"
SPEC = importlib.util.spec_from_file_location("verify_status_jcs", MODULE_PATH)
REFERENCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REFERENCE)


class StatusJcsReferenceTest(unittest.TestCase):
    def fixture_copy(self):
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        target = root / "test" / "fixtures" / "work-item-status" / "v1"
        shutil.copytree(ROOT / "test" / "fixtures" / "work-item-status" / "v1", target)
        self.addCleanup(temporary.cleanup)
        return root, target

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

    def test_rejects_crlf_alteration_before_parsing(self):
        root, fixtures = self.fixture_copy()
        fixture = fixtures / "jcs-u01.json"
        fixture.write_bytes(fixture.read_bytes().replace(b"\n", b"\r\n"))
        with self.assertRaisesRegex(REFERENCE.VerifierError, "^INPUT_DIGEST_MISMATCH$"):
            REFERENCE.verify_manifest(root)

    def test_rejects_negative_fixture_substitution_before_parsing(self):
        root, fixtures = self.fixture_copy()
        (fixtures / "jcs-negative-zero.json").write_bytes((fixtures / "jcs-fraction.json").read_bytes())
        with self.assertRaisesRegex(REFERENCE.VerifierError, "^INPUT_DIGEST_MISMATCH$"):
            REFERENCE.verify_manifest(root)

    def test_rejects_uncontained_and_symlink_fixture_paths_safely(self):
        for replacement, code in (("../outside.json", "FIXTURE_PATH_INVALID"),
                                  (str(ROOT / "package.json"), "FIXTURE_PATH_INVALID")):
            with self.subTest(code=code, replacement=replacement):
                root, fixtures = self.fixture_copy()
                manifest_path = fixtures / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest["cases"][0]["inputPaths"][0] = replacement
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                with self.assertRaisesRegex(REFERENCE.VerifierError, f"^{code}$"):
                    REFERENCE.verify_manifest(root)

        root, fixtures = self.fixture_copy()
        target = fixtures / "jcs-u01.json"
        target.unlink()
        target.symlink_to(ROOT / "package.json")
        with self.assertRaisesRegex(REFERENCE.VerifierError, "^FIXTURE_SYMLINK$"):
            REFERENCE.verify_manifest(root)

    def test_bounds_manifest_and_fixture_before_read(self):
        root, fixtures = self.fixture_copy()
        (fixtures / "manifest.json").write_bytes(b" " * (REFERENCE.MAX_MANIFEST_BYTES + 1))
        with self.assertRaisesRegex(REFERENCE.VerifierError, "^MANIFEST_SIZE_LIMIT$"):
            REFERENCE.verify_manifest(root)

        root, fixtures = self.fixture_copy()
        (fixtures / "jcs-u01.json").write_bytes(b" " * (REFERENCE.MAX_FIXTURE_BYTES + 1))
        with self.assertRaisesRegex(REFERENCE.VerifierError, "^FIXTURE_SIZE_LIMIT$"):
            REFERENCE.verify_manifest(root)


if __name__ == "__main__":
    unittest.main()
