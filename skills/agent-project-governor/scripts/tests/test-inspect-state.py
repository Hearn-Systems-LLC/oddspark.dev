#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///

from __future__ import annotations

import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "inspect-state.py"
SPEC = importlib.util.spec_from_file_location("inspect_state", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class InspectStateTests(unittest.TestCase):
    def test_frontmatter_status(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "spec.md"
            path.write_text("---\nstatus: ready-for-dev\n---\n# Spec\n", encoding="utf-8")
            self.assertEqual(MODULE.frontmatter_status(path), "ready-for-dev")

    def test_snapshot_reports_protected_dirty_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            subprocess.run(["git", "-C", str(root), "config", "user.email", "test@example.com"], check=True)
            subprocess.run(["git", "-C", str(root), "config", "user.name", "Test"], check=True)
            protected = root / "_bmad-output" / "implementation-artifacts" / "sprint-status.yaml"
            protected.parent.mkdir(parents=True)
            protected.write_text("status: baseline\n", encoding="utf-8")
            subprocess.run(["git", "-C", str(root), "add", protected.relative_to(root)], check=True)
            subprocess.run(["git", "-C", str(root), "commit", "-qm", "baseline"], check=True)
            protected.write_text("status: changed\n", encoding="utf-8")
            result = MODULE.snapshot(root)
            self.assertEqual(
                result["protected_dirty"],
                ["_bmad-output/implementation-artifacts/sprint-status.yaml"],
            )


if __name__ == "__main__":
    unittest.main()
