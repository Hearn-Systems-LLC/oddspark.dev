#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).parents[1] / "harness-monitor.py"
SPEC = importlib.util.spec_from_file_location("harness_monitor", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def completed(args: list[str], stdout: str = "", stderr: str = "", code: int = 0) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(args, code, stdout, stderr)


class HarnessMonitorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.record = self.root / "job.json"
        self.handoff = self.root / "handoff.md"
        self.record.write_text(json.dumps({
            "tmux_session": "gov-test",
            "workdir": str(self.root),
            "handoff_path": str(self.handoff),
        }), encoding="utf-8")

    def events(self, stream: io.StringIO) -> list[dict[str, object]]:
        return [json.loads(line) for line in stream.getvalue().splitlines()]

    def test_observe_reports_changed_then_unchanged_and_conservative_signals(self) -> None:
        outputs = iter([
            completed([], code=0), completed([], "%7\t0\n"), completed([], "working\n"),
            completed([], code=0), completed([], "%7\t0\n"), completed([], "working more\n"),
            completed([], code=0), completed([], "%7\t0\n"), completed([], "working more\n"),
        ])
        stream = io.StringIO()
        with mock.patch.object(MODULE.subprocess, "run", side_effect=lambda *a, **k: next(outputs)), contextlib.redirect_stdout(stream):
            MODULE.observe(self.record, tmux="fake-tmux", interval=0, samples=3,
                           stall_threshold=1, history_lines=20, configured_handoff=None,
                           sleeper=lambda _: None)
        events = self.events(stream)
        self.assertIsNone(events[0]["output_changed"])
        self.assertTrue(events[1]["output_changed"])
        self.assertFalse(events[2]["output_changed"])
        self.assertEqual(events[2]["unchanged_count"], 1)
        self.assertTrue(events[2]["likely_stall"])
        self.assertFalse(events[2]["likely_prompt"])

    def test_prompt_is_anchored_to_last_line_and_explained(self) -> None:
        self.assertIsNone(MODULE.prompt_reason("The prose says: do you want to continue?\nThen work continued."))
        self.assertEqual(MODULE.prompt_reason("Ready.\nDo you want to continue?"), "confirmation_question")
        self.assertEqual(MODULE.prompt_reason("Press Enter to continue:"), "press_enter")

    def test_observe_reports_handoff_and_terminal_states(self) -> None:
        self.handoff.write_text("claim", encoding="utf-8")
        stream = io.StringIO()
        outputs = iter([completed([], code=0), completed([], "%2\t1\n"), completed([], "done\n")])
        with mock.patch.object(MODULE.subprocess, "run", side_effect=lambda *a, **k: next(outputs)), contextlib.redirect_stdout(stream):
            MODULE.observe(self.record, tmux="fake", interval=0, samples=2, stall_threshold=2,
                           history_lines=20, configured_handoff=None, sleeper=lambda _: None)
        event = self.events(stream)[0]
        self.assertEqual(event["event"], "terminal_dead")
        self.assertTrue(event["handoff_present"])
        self.assertFalse(event["terminal_active"])

        stream = io.StringIO()
        with mock.patch.object(MODULE.subprocess, "run", return_value=completed([], stderr="can't find session: gov-test", code=1)), contextlib.redirect_stdout(stream):
            MODULE.observe(self.record, tmux="fake", interval=0, samples=1, stall_threshold=2,
                           history_lines=20, configured_handoff=None)
        self.assertEqual(self.events(stream)[0]["event"], "terminal_disappeared")

    def test_submit_preserves_literal_text_and_reports_output_change(self) -> None:
        literal = "continue; $(touch /tmp/nope) 'quoted'\nsecond line"
        calls: list[tuple[list[str], str | None]] = []
        outputs = iter([
            completed([], code=0), completed([], "%4\t0\n"), completed([], "before\n"),
            completed([], "writer\tgov-test\tattached\n"), completed([]), completed([]),
            completed([]), completed([], "after\n"),
        ])

        def fake_run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            calls.append((command, kwargs.get("input")))
            return next(outputs)

        stream = io.StringIO()
        with mock.patch.object(MODULE.subprocess, "run", side_effect=fake_run), contextlib.redirect_stdout(stream):
            MODULE.submit(self.record, literal, tmux="fake", detach_read_only=False,
                          confirmation_delay=0, history_lines=20)
        load = next(item for item in calls if item[0][1] == "load-buffer")
        self.assertEqual(load[1], literal)
        self.assertNotIn(literal, load[0])
        self.assertIn(["fake", "send-keys", "-t", "%4", "Enter"], [item[0] for item in calls])
        event = self.events(stream)[0]
        self.assertTrue(event["output_changed_after_submission"])
        self.assertFalse(event["worker_acceptance_confirmed"])

    def test_submit_refuses_read_only_viewer_without_opt_in(self) -> None:
        outputs = iter([
            completed([], code=0), completed([], "%4\t0\n"), completed([], "before\n"),
            completed([], "viewer\tgov-test\tattached,read-only\n"),
        ])
        with mock.patch.object(MODULE.subprocess, "run", side_effect=lambda *a, **k: next(outputs)):
            with self.assertRaisesRegex(MODULE.MonitorError, "read-only viewers"):
                MODULE.submit(self.record, "yes", tmux="fake", detach_read_only=False,
                              confirmation_delay=0, history_lines=20)

    def test_submit_detaches_only_target_session_read_only_clients(self) -> None:
        commands: list[list[str]] = []
        outputs = iter([
            completed([], code=0), completed([], "%4\t0\n"), completed([], "before\n"),
            completed([], "target-ro\tgov-test\tread-only\nother-ro\tgov-other\tread-only\ntarget-rw\tgov-test\tattached\n"),
            completed([]), completed([]), completed([]), completed([]), completed([], "before\n"),
        ])

        def fake_run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            commands.append(command)
            return next(outputs)

        stream = io.StringIO()
        with mock.patch.object(MODULE.subprocess, "run", side_effect=fake_run), contextlib.redirect_stdout(stream):
            MODULE.submit(self.record, "go", tmux="fake", detach_read_only=True,
                          confirmation_delay=0, history_lines=20)
        detach_commands = [command for command in commands if command[1] == "detach-client"]
        self.assertEqual(detach_commands, [["fake", "detach-client", "-t", "target-ro"]])
        event = self.events(stream)[0]
        self.assertEqual(event["detached_clients"], ["target-ro"])
        self.assertEqual(event["read_only_watch_command"], "tmux attach-session -r -t gov-test")

    def test_tmux_failure_and_ambiguous_pane_fail_closed(self) -> None:
        with mock.patch.object(MODULE.subprocess, "run", return_value=completed([], stderr="boom", code=2)):
            with self.assertRaisesRegex(MODULE.MonitorError, "boom"):
                MODULE.resolve_pane("fake", "gov-test")
        with mock.patch.object(MODULE.subprocess, "run", return_value=completed([], stderr="unexpected failure", code=1)):
            with self.assertRaisesRegex(MODULE.MonitorError, "unexpected failure"):
                MODULE.session_exists("fake", "gov-test")
        with mock.patch.object(MODULE.subprocess, "run", return_value=completed([], "%1\t0\n%2\t0\n")):
            with self.assertRaisesRegex(MODULE.MonitorError, "exactly one pane"):
                MODULE.resolve_pane("fake", "gov-test")

    def test_malformed_record_fails_closed(self) -> None:
        self.record.write_text('{"tmux_session":"bad:target"}', encoding="utf-8")
        with self.assertRaisesRegex(MODULE.MonitorError, "unsafe or missing"):
            MODULE.load_record(self.record)


if __name__ == "__main__":
    unittest.main()
