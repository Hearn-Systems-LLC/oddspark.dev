#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Launch and track resumable external coding-harness sessions."""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path


HARNESSES = {"codex", "agy"}
ROLES = {"development", "code-review"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def atomic_write(path: Path, data: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(data, stream, indent=2, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise


def load(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def human_command(parts: list[str], cwd: str | None = None) -> str:
    command = shlex.join(parts)
    return f"(cd {shlex.quote(cwd)} && {command})" if cwd else command


def native_resume(harness: str, session_id: str, workdir: str) -> str:
    if harness == "codex":
        return human_command(["codex", "-C", workdir, "resume", session_id])
    return human_command(["agy", "--conversation", session_id], cwd=workdir)


def record_path(project_root: Path, name: str) -> Path:
    return project_root / "_bmad" / "memory" / "agent-project-governor" / "harness-sessions" / f"{name}.json"


def validate_name(value: str) -> str:
    if not value or any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for character in value):
        raise ValueError("name may contain only letters, digits, hyphen, and underscore")
    return value


def worker(record: Path) -> int:
    data = load(record)
    prompt = Path(str(data["prompt_file"])).read_text(encoding="utf-8")
    harness = str(data["harness"])
    workdir = str(data["workdir"])
    if harness == "codex":
        command = ["codex", "-C", workdir, "--no-alt-screen", prompt]
    else:
        command = ["agy", "--sandbox", "--dangerously-skip-permissions", "--prompt-interactive", prompt]
    data["started_at"] = now()
    data["status"] = "running"
    atomic_write(record, data)
    result = subprocess.run(command, cwd=workdir, check=False)
    data = load(record)
    data["finished_at"] = now()
    data["exit_code"] = result.returncode
    data["status"] = "exited"
    atomic_write(record, data)
    return result.returncode


def launch(args: argparse.Namespace) -> int:
    project_root = args.project_root.resolve()
    workdir = args.workdir.resolve()
    prompt_file = args.prompt_file.resolve()
    name = validate_name(args.name)
    if args.harness not in HARNESSES or args.role not in ROLES:
        raise ValueError("unsupported harness or role")
    if not workdir.is_dir() or not prompt_file.is_file():
        raise ValueError("workdir must exist and prompt-file must be a file")
    if not shutil.which(args.harness):
        raise RuntimeError(f"harness executable not found: {args.harness}")
    if not shutil.which("tmux"):
        raise RuntimeError("tmux is required for detachable live observation")
    record = record_path(project_root, name)
    if record.exists():
        raise RuntimeError(f"job record already exists: {record}")
    tmux_name = f"gov-{name}"
    data: dict[str, object] = {
        "name": name,
        "role": args.role,
        "harness": args.harness,
        "workdir": str(workdir),
        "prompt_file": str(prompt_file),
        "record": str(record),
        "tmux_session": tmux_name,
        "status": "launching",
        "created_at": now(),
        "native_session_id": None,
        "resume_command": None,
        "watch_command": human_command(["tmux", "attach-session", "-r", "-t", tmux_name]),
        "attach_command": human_command(["tmux", "attach-session", "-t", tmux_name]),
    }
    atomic_write(record, data)
    uv = shutil.which("uv")
    if not uv:
        raise RuntimeError("uv is required to launch the detached harness worker")
    worker_command = shlex.join(
        [uv, "run", str(Path(__file__).resolve()), "worker", "--record", str(record)]
    )
    create = subprocess.run(
        ["tmux", "new-session", "-d", "-s", tmux_name, "-c", str(workdir)],
        capture_output=True,
        text=True,
        check=False,
    )
    if create.returncode:
        data["status"] = "launch-failed"
        data["error"] = create.stderr.strip()
        atomic_write(record, data)
        raise RuntimeError(create.stderr.strip() or "tmux launch failed")
    subprocess.run(["tmux", "set-option", "-t", tmux_name, "remain-on-exit", "on"], check=True)
    subprocess.run(["tmux", "respawn-pane", "-k", "-t", tmux_name, worker_command], check=True)
    print(json.dumps(load(record), indent=2, sort_keys=True))
    return 0


def record_id(args: argparse.Namespace) -> int:
    record = args.record.resolve()
    data = load(record)
    data["native_session_id"] = args.session_id
    data["resume_command"] = native_resume(str(data["harness"]), args.session_id, str(data["workdir"]))
    data["updated_at"] = now()
    atomic_write(record, data)
    print(json.dumps(data, indent=2, sort_keys=True))
    return 0


def status(args: argparse.Namespace) -> int:
    record = args.record.resolve()
    data = load(record)
    tmux_name = str(data["tmux_session"])
    exists = subprocess.run(["tmux", "has-session", "-t", tmux_name], capture_output=True, check=False).returncode == 0
    dead = True
    if exists:
        panes = subprocess.run(
            ["tmux", "list-panes", "-t", tmux_name, "-F", "#{pane_dead}"],
            capture_output=True,
            text=True,
            check=False,
        )
        dead = panes.stdout.strip() == "1"
    data["terminal_exists"] = exists
    data["terminal_active"] = exists and not dead
    print(json.dumps(data, indent=2, sort_keys=True))
    return 0


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest="command", required=True)
    launch_parser = commands.add_parser("launch", help="start a detached external harness job")
    launch_parser.add_argument("--project-root", type=Path, required=True)
    launch_parser.add_argument("--role", choices=sorted(ROLES), required=True)
    launch_parser.add_argument("--harness", choices=sorted(HARNESSES), required=True)
    launch_parser.add_argument("--workdir", type=Path, required=True)
    launch_parser.add_argument("--prompt-file", type=Path, required=True)
    launch_parser.add_argument("--name", required=True)
    launch_parser.set_defaults(run=launch)
    id_parser = commands.add_parser("record-id", help="store the harness-native session identifier")
    id_parser.add_argument("--record", type=Path, required=True)
    id_parser.add_argument("--session-id", required=True)
    id_parser.set_defaults(run=record_id)
    status_parser = commands.add_parser("status", help="report durable record and terminal status")
    status_parser.add_argument("--record", type=Path, required=True)
    status_parser.set_defaults(run=status)
    worker_parser = commands.add_parser("worker", help=argparse.SUPPRESS)
    worker_parser.add_argument("--record", type=Path, required=True)
    worker_parser.set_defaults(run=lambda args: worker(args.record.resolve()))
    return root


def main() -> int:
    try:
        args = parser().parse_args()
        return args.run(args)
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
