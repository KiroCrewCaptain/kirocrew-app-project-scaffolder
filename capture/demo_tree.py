"""Write the made-up project folder the README pictures scan.

Create Folders From Project only reads a directory tree and then creates sidebar
folders, so its demo data is a directory on disk, not something an API can
seed. This writes one fictional monorepo from scratch under the folder given on
the command line:

    python capture/demo_tree.py /tmp/kc-scaffold-demo

which makes ``/tmp/kc-scaffold-demo/robin`` (the home the gateway runs under)
and, inside it, ``projects/allotment-planner``: a small workspace for a
community garden's planting app. Every name in it is invented.

What the scan finds there, and why the pictures use it:

- ``services/api`` and ``services/weather`` are git repositories of their own,
  and ``apps/web`` and ``libs/design-tokens`` already have a ``.kiro`` folder,
  so all four are confident matches, ticked by default;
- ``apps/mobile`` (a workspace member with a ``package.json``) and
  ``tools/seed-data`` (a ``package.json`` only) are offered for the reader to
  tick;
- ``apps/web/e2e/package.json`` is a manifest below a package root, which is
  what the preview defers into its collapsed "inside packages above" group.

The script is idempotent: it deletes and rewrites the folder each run.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _package(path: Path, name: str, **extra: object) -> None:
    body = {"name": name, "version": "0.1.0", "private": True, **extra}
    _write(path / "package.json", json.dumps(body, indent=2) + "\n")


def _git_init(path: Path, message: str) -> None:
    """A real git repository with one commit, so the scan's git signal is honest."""
    env_args = ["-c", "user.name=Robin Example", "-c", "user.email=robin@allotment.example"]
    subprocess.run(["git", "init", "-q", "-b", "main", str(path)], check=True)
    subprocess.run(["git", "-C", str(path), "add", "-A"], check=True)
    subprocess.run(
        ["git", *env_args, "-C", str(path), "commit", "-q", "-m", message],
        check=True,
    )


def build(base: Path) -> Path:
    home = base / "robin"
    if base.exists():
        shutil.rmtree(base)
    root = home / "projects" / "allotment-planner"
    _package(root, "allotment-planner", workspaces=["apps/*", "libs/*"])
    _write(root / "README.md", "# Allotment planner\n\nPlots, sowing dates and a watering rota.\n")
    _package(root / "apps" / "web", "@allotment/web")
    _write(root / "apps" / "web" / ".kiro" / "steering" / "web.md", "The planting calendar UI.\n")
    _write(root / "apps" / "web" / "src" / "main.ts", "export const plots = 24\n")
    _package(root / "apps" / "web" / "e2e", "@allotment/web-e2e")
    _package(root / "apps" / "mobile", "@allotment/mobile")
    _package(root / "libs" / "design-tokens", "@allotment/design-tokens")
    _write(root / "libs" / "design-tokens" / ".kiro" / "steering" / "tokens.md", "Colours.\n")
    _write(
        root / "services" / "api" / "pyproject.toml",
        '[project]\nname = "allotment-api"\nversion = "0.1.0"\n',
    )
    _write(root / "services" / "api" / "allotment_api" / "__init__.py", "")
    _git_init(root / "services" / "api", "Start the plots API")
    _write(root / "services" / "weather" / "forecast.py", "FROST_RISK_DAYS = 3\n")
    _git_init(root / "services" / "weather", "Start the forecast service")
    _package(root / "tools" / "seed-data", "seed-data")
    return root


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python capture/demo_tree.py <empty-or-throwaway-folder>", file=sys.stderr)
        return 2
    root = build(Path(sys.argv[1]).resolve())
    print(root)
    return 0


if __name__ == "__main__":
    sys.exit(main())
