#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Emit a read-only JSON snapshot of Git and BMAD routing evidence."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


PROTECTED_NAMES = {"sprint-status.yaml", "deferred-work.md"}


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=False
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout.rstrip("\n")


def frontmatter_status(path: Path) -> str | None:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError):
        return None
    if not lines or lines[0].strip() != "---":
        return None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        key, separator, value = line.partition(":")
        if separator and key.strip() == "status":
            return value.strip().strip("'\"") or None
    return None


def collect_artifacts(root: Path) -> list[dict[str, str | None]]:
    output = root / "_bmad-output"
    if not output.exists():
        return []
    artifacts = []
    for path in sorted(output.rglob("*.md")):
        status = frontmatter_status(path)
        if status is not None or path.name.startswith(("spec-", "story-")):
            artifacts.append({"path": path.relative_to(root).as_posix(), "status": status})
    return artifacts


def collect_loop_runs(root: Path, limit: int = 10) -> list[dict[str, object]]:
    runs = root / ".bmad-loop" / "runs"
    states = []
    if not runs.exists():
        return states
    for path in sorted(runs.glob("*/state.json"), reverse=True)[:limit]:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            states.append({"path": path.relative_to(root).as_posix(), "state": data})
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            states.append({"path": path.relative_to(root).as_posix(), "error": type(exc).__name__})
    return states


def snapshot(root: Path) -> dict[str, object]:
    porcelain = git(root, "status", "--porcelain=v1", "--untracked-files=all").splitlines()
    changed_paths = [line[3:] for line in porcelain if len(line) > 3]
    conflicts = [line[3:] for line in porcelain if len(line) > 1 and "U" in line[:2]]
    protected_dirty = [
        path for path in changed_paths if Path(path).name in PROTECTED_NAMES
    ]
    return {
        "root": str(root),
        "branch": git(root, "branch", "--show-current"),
        "head": git(root, "rev-parse", "HEAD"),
        "upstream": git(root, "rev-parse", "--abbrev-ref", "@{upstream}")
        if git_has_upstream(root)
        else None,
        "changed_paths": changed_paths,
        "protected_dirty": protected_dirty,
        "conflicts": conflicts,
        "artifacts": collect_artifacts(root),
        "recent_loop_runs": collect_loop_runs(root),
    }


def git_has_upstream(root: Path) -> bool:
    result = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--abbrev-ref", "@{upstream}"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inspect Git and BMAD artifacts without modifying the repository."
    )
    parser.add_argument("root", type=Path, help="project root")
    parser.add_argument("-o", "--output", type=Path, help="write JSON to this file")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    try:
        payload = snapshot(root)
    except (OSError, RuntimeError) as exc:
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}))
        return 2
    rendered = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    if args.verbose:
        print(f"inspected {root}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
