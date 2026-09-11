#!/usr/bin/env python3
"""Independent stdlib-only verifier for work-item-status/v1 JCS vectors."""

import argparse
import hashlib
import json
import math
from pathlib import Path, PurePosixPath, PureWindowsPath
import stat
import sys


MAX_SAFE_INTEGER = 9_007_199_254_740_991
MAX_CANONICAL_BYTES = 65_536
MAX_MANIFEST_BYTES = 65_536
MAX_FIXTURE_BYTES = 98_304
EXIT_OK = 0
EXIT_DATA_ERROR = 65
VECTOR_IDS = ("JCS-U01", "JCS-N01", "JCS-E01")
NEGATIVE_VECTOR_IDS = (
    "JCS-X01-negative-zero", "JCS-X02-fraction", "JCS-X03-overflow", "JCS-X04-lone-surrogate"
)


class DomainError(ValueError):
    pass


class VerifierError(ValueError):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def _validate(value, depth=0, seen=None):
    if seen is None:
        seen = set()
    if isinstance(value, str):
        try:
            value.encode("utf-8")
        except UnicodeEncodeError as error:
            raise DomainError("invalid Unicode scalar value") from error
        return
    if value is None or isinstance(value, bool):
        return
    if isinstance(value, int):
        if abs(value) > MAX_SAFE_INTEGER:
            raise DomainError("integer outside safe domain")
        return
    if isinstance(value, float):
        if not math.isfinite(value) or not value.is_integer() or (value == 0 and math.copysign(1, value) < 0):
            raise DomainError("number outside restricted domain")
        if abs(value) > MAX_SAFE_INTEGER:
            raise DomainError("integer outside safe domain")
        return
    if not isinstance(value, (dict, list)):
        raise DomainError("non-JSON value")
    if depth >= 16 or id(value) in seen:
        raise DomainError("invalid container graph")
    seen.add(id(value))
    items = value.items() if isinstance(value, dict) else enumerate(value)
    for key, child in items:
        if isinstance(value, dict):
            if not isinstance(key, str):
                raise DomainError("object key must be a string")
            _validate(key, depth, seen)
        _validate(child, depth + 1 if isinstance(child, (dict, list)) else depth, seen)
    seen.remove(id(value))


def _utf16_key(value):
    return value.encode("utf-16-be")


def _evidence_key(entry):
    return tuple(str(entry.get(field, "")).encode("utf-8")
                 for field in ("kind", "url", "digest", "commit", "observedAt"))


def _serialize(value):
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return str(int(value))
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(_serialize(item) for item in value) + "]"
    keys = sorted(value, key=_utf16_key)
    return "{" + ",".join(_serialize(key) + ":" + _serialize(value[key]) for key in keys) + "}"


def canonicalize(value):
    _validate(value)
    normalized = dict(value) if isinstance(value, dict) else value
    if isinstance(normalized, dict):
        normalized.pop("recordDigest", None)
        if isinstance(normalized.get("evidence"), list):
            normalized["evidence"] = sorted(normalized["evidence"], key=_evidence_key)
    encoded = _serialize(normalized).encode("utf-8")
    if len(encoded) > MAX_CANONICAL_BYTES:
        raise DomainError("canonical preimage exceeds limit")
    return encoded


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise DomainError("duplicate object key")
        result[key] = value
    return result


def _parse_integer(text):
    if text == "-0":
        raise DomainError("negative zero")
    return int(text)


def _load_json(raw):
    return json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object, parse_int=_parse_integer)


def _bounded_read(path, limit, size_code, invalid_code):
    try:
        metadata = path.lstat()
        if stat.S_ISLNK(metadata.st_mode):
            code = "FIXTURE_SYMLINK" if invalid_code == "FIXTURE_PATH_INVALID" else invalid_code
            raise VerifierError(code)
        if not stat.S_ISREG(metadata.st_mode):
            raise VerifierError(invalid_code)
        if metadata.st_size > limit:
            raise VerifierError(size_code)
        with path.open("rb") as source:
            raw = source.read(limit + 1)
    except VerifierError:
        raise
    except OSError as error:
        raise VerifierError(invalid_code) from error
    if len(raw) > limit:
        raise VerifierError(size_code)
    return raw


def _fixture_path(fixture_root, relative):
    if not isinstance(relative, str) or not relative:
        raise VerifierError("FIXTURE_PATH_INVALID")
    posix = PurePosixPath(relative.replace("\\", "/"))
    windows = PureWindowsPath(relative)
    if posix.is_absolute() or windows.is_absolute() or ".." in posix.parts or ".." in windows.parts:
        raise VerifierError("FIXTURE_PATH_INVALID")
    candidate = fixture_root.joinpath(*posix.parts)
    try:
        current = fixture_root
        for part in posix.parts:
            current = current / part
            if current.is_symlink():
                raise VerifierError("FIXTURE_SYMLINK")
        candidate.resolve(strict=True).relative_to(fixture_root.resolve(strict=True))
    except VerifierError:
        raise
    except (OSError, ValueError) as error:
        raise VerifierError("FIXTURE_PATH_INVALID") from error
    return candidate


def _manifest_cases(fixture_root):
    raw = _bounded_read(
        fixture_root / "manifest.json", MAX_MANIFEST_BYTES, "MANIFEST_SIZE_LIMIT", "MANIFEST_INVALID"
    )
    try:
        manifest = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object)
        return {case["id"]: case for case in manifest["cases"]}
    except (DomainError, UnicodeError, json.JSONDecodeError, AttributeError, IndexError, KeyError, TypeError) as error:
        raise VerifierError("MANIFEST_INVALID") from error


def _verified_fixture(fixture_root, case):
    try:
        relative = case["inputPaths"][0]
        expected = case["inputSha256"][0]
    except (KeyError, IndexError, TypeError) as error:
        raise VerifierError("MANIFEST_INVALID") from error
    if not isinstance(expected, str) or len(expected) != 64:
        raise VerifierError("MANIFEST_INVALID")
    path = _fixture_path(fixture_root, relative)
    raw = _bounded_read(path, MAX_FIXTURE_BYTES, "FIXTURE_SIZE_LIMIT", "FIXTURE_PATH_INVALID")
    if hashlib.sha256(raw).hexdigest() != expected:
        raise VerifierError("INPUT_DIGEST_MISMATCH")
    return raw


def verify_manifest(root):
    fixture_dir = root / "test" / "fixtures" / "work-item-status" / "v1"
    cases = _manifest_cases(fixture_dir)
    verified = []
    for vector_id in VECTOR_IDS:
        try:
            case = cases[vector_id]
            canonical = canonicalize(_load_json(_verified_fixture(fixture_dir, case)))
        except KeyError as error:
            raise VerifierError("MANIFEST_INVALID") from error
        except (DomainError, UnicodeError, json.JSONDecodeError) as error:
            raise VerifierError("VECTOR_INVALID") from error
        digest = hashlib.sha256(canonical).hexdigest()
        if canonical.hex() != case["canonicalUtf8Hex"] or digest != case["digests"]["record"]:
            raise VerifierError("VECTOR_MISMATCH")
        verified.append(vector_id)
    for vector_id in NEGATIVE_VECTOR_IDS:
        try:
            case = cases[vector_id]
            canonicalize(_load_json(_verified_fixture(fixture_dir, case)))
        except DomainError:
            verified.append(vector_id)
            continue
        except KeyError as error:
            raise VerifierError("MANIFEST_INVALID") from error
        except (UnicodeError, json.JSONDecodeError) as error:
            raise VerifierError("VECTOR_INVALID") from error
        raise VerifierError("EXPECTED_REJECTION_MISSING")
    return verified


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        verified = verify_manifest(args.root.resolve())
    except VerifierError as error:
        print(error.code, file=sys.stderr)
        return EXIT_DATA_ERROR
    print(f"Verified {len(verified)} JCS vectors: {', '.join(verified)}")
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
