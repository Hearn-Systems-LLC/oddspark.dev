#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Boundedly observe and explicitly control a durable harness tmux session."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable


SAFE_TARGET = re.compile(r"^[A-Za-z0-9_-]+$")
PROMPT_PATTERNS = (
    ("yes_no_question", re.compile(r"(?:\[\s*y\s*/\s*n\s*\]|\(\s*y\s*/\s*n\s*\))\s*[:>]?$", re.I)),
    ("press_enter", re.compile(r"(?:press|hit)\s+(?:the\s+)?(?:enter|return)(?:\s+to\s+[^.]+)?[.:>]?\s*$", re.I)),
    ("explicit_choice", re.compile(r"(?:choose|select)\s+(?:an?\s+)?(?:option|number)\s*[:>]\s*$", re.I)),
    ("confirmation_question", re.compile(r"(?:do you want to|would you like (?:me )?to|shall i)\b[^.]*\?\s*$", re.I)),
)


class MonitorError(RuntimeError):
    """A fail-closed validation or tmux boundary error."""


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def emit(event: dict[str, object]) -> None:
    print(json.dumps(event, sort_keys=True), flush=True)


def load_record(path: Path) -> dict[str, object]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise MonitorError(f"cannot load job record: {exc}") from exc
    if not isinstance(data, dict):
        raise MonitorError("job record must be a JSON object")
    session = data.get("tmux_session")
    if not isinstance(session, str) or not SAFE_TARGET.fullmatch(session):
        raise MonitorError("job record has an unsafe or missing tmux_session")
    return data


def run_tmux(
    tmux: str,
    arguments: list[str],
    *,
    input_text: str | None = None,
    allow_missing: bool = False,
) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            [tmux, *arguments],
            input=input_text,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as exc:
        raise MonitorError(f"cannot execute tmux: {exc}") from exc
    if result.returncode and not (allow_missing and result.returncode == 1):
        message = result.stderr.strip() or result.stdout.strip() or "unknown tmux failure"
        raise MonitorError(f"tmux {' '.join(arguments[:2])} failed: {message}")
    return result


def session_exists(tmux: str, session: str) -> bool:
    result = run_tmux(tmux, ["has-session", "-t", session], allow_missing=True)
    if result.returncode == 0:
        return True
    message = result.stderr.strip().lower()
    if "can't find session" in message or "no server running" in message:
        return False
    raise MonitorError(f"tmux has-session failed: {result.stderr.strip() or 'unknown tmux failure'}")


def resolve_pane(tmux: str, session: str) -> tuple[str, bool]:
    result = run_tmux(
        tmux,
        ["list-panes", "-t", session, "-F", "#{pane_id}\t#{pane_dead}"],
    )
    lines = [line for line in result.stdout.splitlines() if line]
    if len(lines) != 1:
        raise MonitorError(f"expected exactly one pane in target session; found {len(lines)}")
    fields = lines[0].split("\t")
    if len(fields) != 2 or not re.fullmatch(r"%[0-9]+", fields[0]) or fields[1] not in {"0", "1"}:
        raise MonitorError("tmux returned unsafe or malformed pane data")
    return fields[0], fields[1] == "1"


def capture_pane(tmux: str, pane: str, history_lines: int) -> str:
    result = run_tmux(tmux, ["capture-pane", "-p", "-S", f"-{history_lines}", "-t", pane])
    return result.stdout


def prompt_reason(output: str) -> str | None:
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    if not lines:
        return None
    candidate = lines[-1]
    if len(candidate) > 500:
        return None
    for reason, pattern in PROMPT_PATTERNS:
        if pattern.search(candidate):
            return reason
    return None


def handoff_path(record: dict[str, object], configured: Path | None) -> Path | None:
    value: object = configured
    if value is None:
        value = record.get("handoff_path", record.get("terminal_handoff"))
    if value is None:
        return None
    if isinstance(value, Path):
        path = value
    elif isinstance(value, str) and value:
        path = Path(value)
    else:
        raise MonitorError("configured handoff path must be a non-empty path")
    if not path.is_absolute():
        workdir = record.get("workdir")
        if not isinstance(workdir, str) or not Path(workdir).is_absolute():
            raise MonitorError("relative handoff path requires an absolute record workdir")
        path = Path(workdir) / path
    return path


def observe(
    record_path: Path,
    *,
    tmux: str,
    interval: float,
    samples: int,
    stall_threshold: int,
    history_lines: int,
    configured_handoff: Path | None,
    sleeper: Callable[[float], None] = time.sleep,
) -> int:
    record = load_record(record_path)
    session = str(record["tmux_session"])
    handoff = handoff_path(record, configured_handoff)
    previous_digest: str | None = None
    unchanged_count = 0
    for index in range(samples):
        event: dict[str, object] = {
            "event": "heartbeat",
            "observed_at": now(),
            "sample": index + 1,
            "tmux_session": session,
            "terminal_exists": False,
            "terminal_active": False,
            "output_changed": None,
            "unchanged_count": unchanged_count,
            "likely_prompt": False,
            "likely_stall": False,
        }
        if handoff is not None:
            event["handoff_path"] = str(handoff)
            event["handoff_present"] = handoff.is_file()
        if not session_exists(tmux, session):
            event["event"] = "terminal_disappeared"
            emit(event)
            return 0
        pane, dead = resolve_pane(tmux, session)
        output = capture_pane(tmux, pane, history_lines)
        digest = hashlib.sha256(output.encode("utf-8")).hexdigest()
        changed = previous_digest is not None and digest != previous_digest
        if previous_digest is None or changed:
            unchanged_count = 0
        else:
            unchanged_count += 1
        reason = prompt_reason(output)
        event.update(
            {
                "event": "terminal_dead" if dead else "heartbeat",
                "terminal_exists": True,
                "terminal_active": not dead,
                "pane": pane,
                "output_digest": f"sha256:{digest}",
                "output_changed": changed if previous_digest is not None else None,
                "unchanged_count": unchanged_count,
                "likely_prompt": reason is not None,
                "prompt_reason": reason,
                "likely_stall": not dead and unchanged_count >= stall_threshold,
                "stall_reason": "unchanged_output_threshold" if not dead and unchanged_count >= stall_threshold else None,
            }
        )
        emit(event)
        previous_digest = digest
        if dead:
            return 0
        if index + 1 < samples:
            sleeper(interval)
    return 0


def parse_clients(output: str) -> list[tuple[str, str, set[str]]]:
    clients: list[tuple[str, str, set[str]]] = []
    for line in output.splitlines():
        if not line:
            continue
        fields = line.split("\t")
        if len(fields) != 3 or any("\n" in field or "\r" in field for field in fields):
            raise MonitorError("tmux returned malformed client data")
        name, session, flags_text = fields
        if not name or not SAFE_TARGET.fullmatch(session):
            raise MonitorError("tmux returned unsafe client identity or session data")
        flags = {flag.strip().lower() for flag in flags_text.split(",") if flag.strip()}
        clients.append((name, session, flags))
    return clients


def submit(
    record_path: Path,
    text: str,
    *,
    tmux: str,
    detach_read_only: bool,
    confirmation_delay: float,
    history_lines: int,
    sleeper: Callable[[float], None] = time.sleep,
) -> int:
    record = load_record(record_path)
    session = str(record["tmux_session"])
    if not session_exists(tmux, session):
        raise MonitorError("target tmux session does not exist")
    pane, dead = resolve_pane(tmux, session)
    if dead:
        raise MonitorError("target pane is dead")
    before = capture_pane(tmux, pane, history_lines)
    result = run_tmux(tmux, ["list-clients", "-F", "#{client_name}\t#{client_session}\t#{client_flags}"])
    target_read_only = [name for name, client_session, flags in parse_clients(result.stdout) if client_session == session and "read-only" in flags]
    if target_read_only and not detach_read_only:
        raise MonitorError("target session has read-only viewers; rerun with --detach-target-read-only")
    detached: list[str] = []
    for client in target_read_only:
        run_tmux(tmux, ["detach-client", "-t", client])
        detached.append(client)
    buffer_name = f"gov-control-{int(time.time_ns())}"
    run_tmux(tmux, ["load-buffer", "-b", buffer_name, "-"], input_text=text)
    run_tmux(tmux, ["paste-buffer", "-d", "-b", buffer_name, "-t", pane])
    run_tmux(tmux, ["send-keys", "-t", pane, "Enter"])
    if confirmation_delay:
        sleeper(confirmation_delay)
    after = capture_pane(tmux, pane, history_lines)
    emit(
        {
            "event": "control_submitted",
            "observed_at": now(),
            "tmux_session": session,
            "pane": pane,
            "detached_clients": detached,
            "read_only_watch_command": f"tmux attach-session -r -t {session}",
            "output_changed_after_submission": before != after,
            "worker_acceptance_confirmed": False,
        }
    )
    return 0


def non_negative_float(value: str) -> float:
    parsed = float(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be non-negative")
    return parsed


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be at least 1")
    return parsed


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest="command", required=True)
    observe_parser = commands.add_parser("observe", help="emit bounded JSONL observations")
    observe_parser.add_argument("--record", type=Path, required=True)
    observe_parser.add_argument("--tmux", default="tmux")
    observe_parser.add_argument("--interval", type=non_negative_float, default=30.0)
    observe_parser.add_argument("--samples", type=positive_int, default=20)
    observe_parser.add_argument("--stall-threshold", type=positive_int, default=4)
    observe_parser.add_argument("--history-lines", type=positive_int, default=200)
    observe_parser.add_argument("--handoff-path", type=Path)
    observe_parser.set_defaults(run=lambda args: observe(
        args.record.resolve(), tmux=args.tmux, interval=args.interval, samples=args.samples,
        stall_threshold=args.stall_threshold, history_lines=args.history_lines,
        configured_handoff=args.handoff_path,))
    submit_parser = commands.add_parser("submit", help="submit literal text and Enter explicitly")
    submit_parser.add_argument("--record", type=Path, required=True)
    submit_parser.add_argument("--text", required=True)
    submit_parser.add_argument("--tmux", default="tmux")
    submit_parser.add_argument("--detach-target-read-only", action="store_true")
    submit_parser.add_argument("--confirmation-delay", type=non_negative_float, default=1.0)
    submit_parser.add_argument("--history-lines", type=positive_int, default=200)
    submit_parser.set_defaults(run=lambda args: submit(
        args.record.resolve(), args.text, tmux=args.tmux,
        detach_read_only=args.detach_target_read_only,
        confirmation_delay=args.confirmation_delay, history_lines=args.history_lines,))
    return root


def main() -> int:
    try:
        args = parser().parse_args()
        return args.run(args)
    except (MonitorError, OSError, ValueError) as exc:
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}, sort_keys=True), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
