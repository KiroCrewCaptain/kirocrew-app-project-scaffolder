"""What an existing user's copy of the built-in needs from this repository.

Kiro Crew adopts a user's built-in record onto this repository in place, at a
pinned commit, with no consent dialog, so the tree must be something it can take
over unchanged:

- the same name, permissions, platform and ``defaultEnabled`` as the built-in
  (``tests/fixtures/builtin-app.json`` is its manifest at the commit this was
  ported from), and a version never below its. A widened grant would be held
  back, and adoption refuses that. Adoption matches the version against Kiro
  Crew's pin of one commit here, so a later commit carries a later patch
  version, which is what shows an adopted user the update;
- no backend and no dependencies: the built-in is a page over two host
  endpoints, and its Windows claim rests on spawning nothing;
- nothing that needs a build at install time, and no symlinks or file names a
  Windows checkout cannot hold;
- a committed UI bundle that imports only the seven modules the dashboard
  provides, names from the two SDK modules that every supported host exports
  (a named import of a missing export fails the whole bundle at load), and the
  level-7 ``ProjectPicker`` only through a namespace read.
"""

from __future__ import annotations

import json
import os
import re
import unittest
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
BUNDLE = APP_ROOT / "ui" / "dist" / "index.mjs"

HOST_MODULES = {
    "react",
    "react-dom",
    "react/jsx-runtime",
    "lucide-react",
    "@tanstack/react-query",
    "@kirocrew/app-sdk",
    "@kirocrew/app-sdk/ui",
}

# What a host BEFORE App Kit level 1 exports from each SDK module (its
# public/vendor/*.mjs stubs). A named import from these modules must stay in this
# set; a later name is read off the namespace import.
LEVEL0_EXPORTS = {
    "@kirocrew/app-sdk": {
        "useAppApi",
        "useAppEvents",
        "useTheme",
        "useAppInfo",
        "useNavigate",
        "useNotify",
        "useNavBadge",
        "useChatLauncher",
        "AppApiProvider",
        "useImeGuard",
        "useLanguageGeneration",
        "activeLocale",
        "fmtNumber",
        "fmtDate",
        "fmtTime",
        "fmtDateTime",
        "fmtRelative",
        "compareText",
    },
    "@kirocrew/app-sdk/ui": {
        "Card",
        "CardTitle",
        "Btn",
        "SendBtn",
        "Input",
        "SearchInput",
        "Badge",
        "SourceBadge",
        "StatCard",
        "Skeleton",
        "ContentSkeleton",
        "EmptyState",
        "PageHeader",
        "Toggle",
        "InfoTip",
        "SegmentedControl",
        "MarkdownRenderer",
        "Clickable",
        "Modal",
        "ErrorNotice",
        "SettingsSection",
        "SettingsCard",
        "SettingsInput",
        "SettingsToggle",
        "SettingsSelect",
    },
}

#: The page's own two endpoints and the three families the SDK picker calls.
PAGE_API_PATHS = [
    "/api/project-scaffold",
    "/api/browse-dirs",
    "/api/recent-projects",
    "/api/favorite-projects",
]

# Directories git ignores here (see .gitignore): never part of a clone.
_UNTRACKED_DIRS = {".git", "node_modules", "__pycache__", ".pytest_cache", ".venv"}
_WINDOWS_RESERVED = re.compile(r"^(con|prn|aux|nul|com[1-9]|lpt[1-9])$", re.IGNORECASE)
_STATIC_IMPORT = re.compile(
    r"^import\s+(?:(?P<clause>[^'\"]+?)\s+from\s+)?[\"'](?P<spec>[^\"']+)[\"'];?\s*$",
    re.MULTILINE,
)


def _manifest() -> dict:
    return json.loads((APP_ROOT / "app.json").read_text(encoding="utf-8"))


def _builtin() -> dict:
    return json.loads((APP_ROOT / "tests" / "fixtures" / "builtin-app.json").read_text("utf-8"))


def _text() -> str:
    return BUNDLE.read_text(encoding="utf-8")


def _bundle_imports() -> list[tuple[str, str]]:
    return [(m["spec"], (m["clause"] or "").strip()) for m in _STATIC_IMPORT.finditer(_text())]


def _named(clause: str) -> set[str]:
    """The imported names of ``{ a, b as c }``; empty for a namespace import."""
    match = re.search(r"\{([^}]*)\}", clause)
    if not match:
        return set()
    return {part.split(" as ")[0].strip() for part in match.group(1).split(",") if part.strip()}


def _tree() -> list[Path]:
    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(APP_ROOT):
        dirnames[:] = [d for d in dirnames if d not in _UNTRACKED_DIRS]
        files += [Path(dirpath) / name for name in filenames]
        files += [Path(dirpath) / d for d in dirnames if (Path(dirpath) / d).is_symlink()]
    return files


class TestTheBundle(unittest.TestCase):
    def test_the_entry_the_manifest_names_is_committed(self) -> None:
        ui = _manifest()["ui"]
        self.assertEqual(ui["entry"], "dist/index.mjs")
        # ui.entry is relative to ui/.
        self.assertTrue((APP_ROOT / "ui" / ui["entry"]).is_file(), "run `npm run build` in ui/")

    def test_it_imports_only_what_the_host_provides(self) -> None:
        imports = _bundle_imports()
        self.assertTrue(imports, "no import statements found; the scan is broken")
        # Every top-level import statement is one the pattern read in full.
        starts = re.findall(r"^import\b", _text(), re.MULTILINE)
        self.assertEqual(len(starts), len(imports), "an import the scan could not parse")
        self.assertLessEqual({spec for spec, _ in imports}, HOST_MODULES)
        self.assertNotRegex(_text(), r"\bimport\s*\(", "a dynamic import would load a second file")

    def test_named_sdk_imports_exist_on_every_supported_host(self) -> None:
        for spec, clause in _bundle_imports():
            if spec in LEVEL0_EXPORTS:
                with self.subTest(module=spec):
                    self.assertLessEqual(_named(clause), LEVEL0_EXPORTS[spec])

    def test_the_picker_is_read_through_the_namespace_behind_its_level(self) -> None:
        """``ProjectPicker`` is level 7; an older host has no such export."""
        text = _text()
        self.assertIn('import * as sdk from "@kirocrew/app-sdk";', text)
        self.assertIn("(sdk.APP_SDK_LEVEL ?? 0) >= 7 ? sdk.ProjectPicker : void 0", text)

    def test_it_calls_only_its_two_endpoints_through_the_scoped_client(self) -> None:
        text = _text()
        self.assertIn('"/api/project-scaffold/scan"', text)
        self.assertIn('"/api/project-scaffold/create"', text)
        self.assertNotRegex(text, r"\bfetch\(", "requests go through the scoped useAppApi() client")

    def test_it_reads_no_node_global(self) -> None:
        """A browser has no ``process``: the bundled animation library's
        ``process.env.NODE_ENV`` checks are replaced at build time, or the page
        throws ``ReferenceError`` the first time a row animates."""
        self.assertNotRegex(_text(), r"\bprocess\.env\b")

    def test_no_build_machine_path_is_baked_in(self) -> None:
        """No path of the machine that built it. The bundled animation library's
        module comments name its files relative to ``ui/`` (``// node_modules/...``),
        which says nothing about the build machine; an absolute one would."""
        text = _text()
        self.assertNotIn(str(APP_ROOT), text)
        self.assertNotIn(APP_ROOT.as_posix(), text)
        self.assertNotIn("/node_modules/", text)
        self.assertNotIn("file://", text)
        self.assertNotRegex(text, r"[A-Za-z]:\\\\(?:Users|a)\\\\")


class TestTheManifest(unittest.TestCase):
    def test_declares_the_first_kiro_crew_it_supports(self) -> None:
        self.assertRegex(_manifest().get("minKiroCrewVersion", ""), r"^\d+\.\d+\.\d+$")

    def test_what_adoption_compares_is_the_builtins(self) -> None:
        manifest, builtin = _manifest(), _builtin()
        for key in ("name", "permissions", "defaultEnabled", "platform"):
            with self.subTest(field=key):
                self.assertEqual(manifest[key], builtin[key])

        def parsed(version: str) -> tuple[int, ...]:
            self.assertRegex(version, r"^\d+\.\d+\.\d+$")
            return tuple(int(part) for part in version.split("."))

        self.assertGreaterEqual(parsed(manifest["version"]), parsed(builtin["version"]))

    def test_declares_exactly_the_paths_its_page_calls(self) -> None:
        """Nothing beyond what the built-in page already called is declared."""
        self.assertEqual(_manifest()["permissions"], {"api": PAGE_API_PATHS})

    def test_declares_nothing_adoption_cannot_carry(self) -> None:
        manifest = _manifest()
        for key in (
            "agents",
            "skills",
            "mcpServers",
            "crons",
            "sessionApproval",
            "backend",
            "dependencies",
            "agentTools",
        ):
            with self.subTest(field=key):
                self.assertNotIn(key, manifest)
        self.assertNotIn("overlays", manifest["ui"])
        self.assertIs(manifest["defaultEnabled"], False)

    def test_the_platform_claim_and_the_desktop_axis(self) -> None:
        """Ported from the built-in's own test: every OS, and no desktop shell needed.

        Picking a directory and ticking rows is ordinary DOM work and the scan
        runs on the gateway, so ``requiresDesktopApp`` must stay unset: setting it
        would withhold the enable action from every browser session.
        """
        platform = _manifest()["platform"]
        self.assertEqual(platform["os"], ["macos", "linux", "windows"])
        self.assertFalse(platform.get("requiresDesktopApp", False))

    def test_the_page_carries_no_glyph_of_its_own(self) -> None:
        """The legacy route and sidebar glyph come from Kiro Crew's pin, not from here."""
        pages = _manifest()["ui"]["pages"]
        self.assertEqual(pages, [{"route": "/apps/project-scaffolder", "label": "Create Folders"}])

    def test_listing_copy_matches_the_bundled_catalogs(self) -> None:
        """One source per string: the l10n block is the catalogs' ``manifest`` subtree."""
        manifest = _manifest()
        catalogs = {
            p.stem: json.loads(p.read_text(encoding="utf-8"))["apps"]["projectScaffolder"][
                "manifest"
            ]
            for p in sorted((APP_ROOT / "ui" / "i18n").glob("*.json"))
        }
        english = catalogs.pop("en")
        self.assertEqual(manifest["displayName"], english["display_name"])
        self.assertEqual(manifest["description"], english["description"])
        self.assertEqual(manifest["ui"]["pages"][0]["label"], english["page_label"])
        self.assertEqual(manifest["highlights"], [english[f"highlight_{i}"] for i in range(1, 7)])
        self.assertEqual(manifest["useCases"], [english["use_case_1"]])
        self.assertEqual(manifest["configuration"], [english["configuration_1"]])
        self.assertEqual(set(manifest["l10n"]), set(catalogs))
        for locale, strings in catalogs.items():
            with self.subTest(locale=locale):
                self.assertEqual(
                    manifest["l10n"][locale],
                    {
                        "displayName": strings["display_name"],
                        "description": strings["description"],
                        "pageLabel": strings["page_label"],
                        "highlights": [strings[f"highlight_{i}"] for i in range(1, 7)],
                    },
                )

    def test_l10n_is_within_the_host_parser_limits(self) -> None:
        """A locale over a limit is dropped by the host, silently for the reader."""
        l10n = _manifest()["l10n"]
        self.assertLessEqual(len(l10n), 32)
        for locale, entry in l10n.items():
            with self.subTest(locale=locale):
                self.assertRegex(locale, r"^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$")
                self.assertLessEqual(
                    set(entry), {"displayName", "description", "pageLabel", "highlights"}
                )
                self.assertLessEqual(len(entry["displayName"]), 120)
                self.assertLessEqual(len(entry["description"]), 1000)
                self.assertLessEqual(len(entry["pageLabel"]), 60)
                self.assertLessEqual(len(entry["highlights"]), 12)
                self.assertTrue(all(len(h) <= 300 for h in entry["highlights"]))

    def test_art_is_repo_relative_png(self) -> None:
        manifest = _manifest()
        for key in (
            "iconPath",
            "heroImage",
            "heroImageDark",
            "heroImageDetail",
            "heroImageDetailDark",
        ):
            with self.subTest(field=key):
                self.assertRegex(manifest[key], r"^assets/[\w-]+\.png$")
                self.assertTrue((APP_ROOT / manifest[key]).is_file())
        for shot in manifest["screenshots"]:
            self.assertRegex(shot, r"^assets/[\w-]+\.png$")
            self.assertTrue((APP_ROOT / shot).is_file())


class TestTheTreeIsAdoptable(unittest.TestCase):
    def test_no_root_build_file(self) -> None:
        for name in (
            "package.json",
            "pyproject.toml",
            "setup.py",
            "requirements.txt",
            ".gitattributes",
        ):
            with self.subTest(name=name):
                self.assertFalse((APP_ROOT / name).exists())

    def test_ships_no_executable_code(self) -> None:
        """Ported from the built-in: the only Python here is this test package and
        the capture tooling, so nothing can introduce a POSIX-only path at runtime."""
        offenders = [
            p.relative_to(APP_ROOT).as_posix()
            for p in _tree()
            if p.suffix == ".py" and p.relative_to(APP_ROOT).parts[0] not in {"tests", "capture"}
        ]
        self.assertEqual(offenders, [])

    def test_no_link_and_no_unportable_name(self) -> None:
        seen: dict[str, str] = {}
        for path in _tree():
            rel = path.relative_to(APP_ROOT).as_posix()
            with self.subTest(path=rel):
                self.assertFalse(path.is_symlink(), "a link is refused by adoption")
                self.assertTrue(path.is_file(), "only regular files")
                self.assertNotRegex(rel, r"[\\:]")
                for part in rel.split("/"):
                    self.assertFalse(part.endswith((".", " ")), part)
                    self.assertIsNone(_WINDOWS_RESERVED.match(part.split(".")[0]), part)
                self.assertNotIn(
                    rel.lower(), seen, f"differs only in case from {seen.get(rel.lower())}"
                )
                seen[rel.lower()] = rel

    def test_the_tree_is_within_the_adoption_caps(self) -> None:
        files = _tree()
        self.assertLessEqual(len(files), 5000)
        self.assertLessEqual(sum(p.stat().st_size for p in files), 64 * 1024 * 1024)


if __name__ == "__main__":
    unittest.main()
