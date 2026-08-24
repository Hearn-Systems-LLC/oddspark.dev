#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "harness-session.py"
SPEC = importlib.util.spec_from_file_location("harness_session", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class HarnessSessionTests(unittest.TestCase):
    def test_native_resume_commands_are_role_specific(self) -> None:
        self.assertEqual(
            MODULE.native_resume("codex", "abc-123", "/tmp/work tree"),
            "codex -C '/tmp/work tree' resume abc-123",
        )
        self.assertEqual(
            MODULE.native_resume("agy", "xyz-789", "/tmp/work tree"),
            "(cd '/tmp/work tree' && agy --conversation xyz-789)",
        )

    def test_atomic_record_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "record.json"
            MODULE.atomic_write(path, {"status": "running", "native_session_id": None})
            self.assertEqual(MODULE.load(path)["status"], "running")

    def test_name_rejects_shell_metacharacters(self) -> None:
        with self.assertRaises(ValueError):
            MODULE.validate_name("review;shutdown")

    def test_human_command_quotes_paths(self) -> None:
        self.assertEqual(
            MODULE.human_command(["python", "/tmp/a script.py", "--record", "/tmp/a record.json"]),
            "python '/tmp/a script.py' --record '/tmp/a record.json'",
        )


if __name__ == "__main__":
    unittest.main()
