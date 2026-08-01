#!/usr/bin/env python3
"""Independent stdlib-only verifier for work-item-status/v1 JCS vectors."""

import argparse
import hashlib
import json
import math
from pathlib import Path


MAX_SAFE_INTEGER = 9_007_199_254_740_991
MAX_CANONICAL_BYTES = 65_536
VECTOR_IDS = ("JCS-U01", "JCS-N01", "JCS-E01")
NEGATIVE_VECTOR_IDS = (
    "JCS-X01-negative-zero", "JCS-X02-fraction", "JCS-X03-overflow", "JCS-X04-lone-surrogate"
)


class DomainError(ValueError):
    pass


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


def verify_manifest(root):
    fixture_dir = root / "test" / "fixtures" / "work-item-status" / "v1"
    manifest = json.loads((fixture_dir / "manifest.json").read_text(encoding="utf-8"))
    cases = {case["id"]: case for case in manifest["cases"]}
    verified = []
    for vector_id in VECTOR_IDS:
        case = cases[vector_id]
        raw = (fixture_dir / case["inputPaths"][0]).read_bytes()
        value = _load_json(raw)
        canonical = canonicalize(value)
        digest = hashlib.sha256(canonical).hexdigest()
        if canonical.hex() != case["canonicalUtf8Hex"] or digest != case["digests"]["record"]:
            raise AssertionError(f"{vector_id}: canonical bytes or digest mismatch")
        verified.append(vector_id)
    for vector_id in NEGATIVE_VECTOR_IDS:
        case = cases[vector_id]
        raw = (fixture_dir / case["inputPaths"][0]).read_bytes()
        try:
            canonicalize(_load_json(raw))
        except DomainError:
            verified.append(vector_id)
            continue
        raise AssertionError(f"{vector_id}: expected restricted-domain rejection")
    return verified


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    verified = verify_manifest(args.root.resolve())
    print(f"Verified {len(verified)} JCS vectors: {', '.join(verified)}")


if __name__ == "__main__":
    main()
