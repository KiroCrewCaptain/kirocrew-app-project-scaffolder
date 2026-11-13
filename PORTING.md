# Porting notes: built-in to external app

This repository was ported from Kiro Crew's built-in app at
`src/kiro_crew/apps/builtins/project_scaffolder/` (KiroCrew `main` at
`9b32941be66d`), its dashboard page at `website/src/apps/project-scaffolder/`,
its store art at `website/public/app-assets/project-scaffolder/`, its strings
(`apps.projectScaffolder.*` in `website/src/i18n/locales/`), and its tests: the
app's own `tests/test_manifest.py`, `website/src/test/ProjectScaffolderPage.test.tsx`
and `website/src/i18n/projectScaffolderNestedCountPlural.test.ts`.

The built-in is a page and a manifest: it has no backend, and the two endpoints
it calls (`POST /api/project-scaffold/scan` and `/create`) are host routes in
Kiro Crew (`dashboard/chat_folder_scaffold.py`, over the scanner in
`project_scan.py`). They stay there. This repository carries the page.

"Gap" below means something the built-in gets from Kiro Crew that an external
app has no public way to get today. Each gap is a Kiro Crew change, not a change
here.

## What carried over unchanged

- `app.json` `name` (`project-scaffolder`), `platform` (macOS, Linux, Windows),
  `defaultEnabled` (`false`), `displayName`, `description`, `tags`,
  `highlights`, and `permissions` (see the next section for the three families
  the built-in now declares beside `/api/project-scaffold`).
  `tests/test_manifest_contract.py` compares them with the built-in's manifest
  (`tests/fixtures/builtin-app.json`), because adoption refuses a manifest that
  would widen a grant or force the app off. The `version` started equal to the
  built-in's (`0.1.0`) and only moves up.
- The page's markup, class strings, behaviour and every string (the catalogs in
  `ui/i18n/` are the built-in's `apps.projectScaffolder` subtree, keys
  unchanged, so each locale reads exactly as before). The request bodies and the
  way a refusal's `code`, `error` and `unknown` are read are the built-in's.
- The row animation: the built-in's `framer-motion` cross-fade, bundled at the
  version the dashboard locks (12.40.0).

## What changed, and why

| Built-in | Here | Why |
|---|---|---|
| Page compiled into the dashboard (`website/src/apps/builtinRegistry.ts`), `ui.pages` `[{"route": "/project-scaffolder", "icon": "FolderPlus"}]` | `ui.entry: "dist/index.mjs"` (a committed ESM bundle built from `ui/src/`), `ui.pages` `[{"route": "/apps/project-scaffolder", "label": "Create Folders"}]`, no `icon` | An installed app ships its page as a bundle AppHost loads. The legacy `/project-scaffolder` route, nav id and `FolderPlus` glyph of an ADOPTED record come from Kiro Crew's adoption pin (`legacyNav`), never from this manifest, so a fresh install cannot claim them. |
| `import ProjectPicker from '../../components/ProjectPicker'` | The App SDK's `ProjectPicker` (App Kit level 7, kirodotdev/KiroCrew#36322), read through a namespace import | The same dashboard picker (Favorites, Recent, Browse, the desktop folder picker, New folder). The SDK mounts it for an app that declares the three endpoint families it calls. On a host below level 7 the page shows no **Choose directory** button and keeps the typed path, instead of failing to load (`ui/tests/olderHost.test.tsx`). |
| `permissions.api: ["/api/project-scaffold"]` | Adds `/api/browse-dirs`, `/api/recent-projects`, `/api/favorite-projects` | What the picker calls. The built-in's page always called them through the picker, under the dashboard's own authority; kirodotdev/KiroCrew#36322 declares them in the built-in's manifest first, so an adopted copy declaring them is not a widening. Nothing else is declared. |
| `fetch(path, {credentials: 'same-origin'})` in `api.ts` | `useAppApi().post(path, body)`, bound once by `ui/src/index.tsx` | Requests go through the app's scoped client. A refusal arrives as the client's error with the status and the raw body text, and `scaffoldError` reads it exactly as the built-in read its `Response`. |
| `i18nT` and `fmtList` from the dashboard (`i18n/t`, `i18n/format`) | `ui/src/i18n.ts` and `ui/src/format.ts` | A bundle cannot read the dashboard's catalogs. The lookup tries the exact locale, its base language, then English, with the same plural key shape; `fmtList` makes the same `Intl.ListFormat` call. |
| `iconUrl` / `heroImage*` as absolute `/app-assets/...` SVGs | `iconPath` / `heroImage*` / `screenshots` as repo-relative PNGs under `assets/` | A registry app's art is repo-relative, and the catalog's publish step refuses SVG for a non-builtin source. The PNGs were rendered from the built-in SVGs (the icon at 512x512 on an opaque tile with its `--ico-a` / `--ico-b` tokens resolved to fixed amber tones; heroes at 1200x675; detail banners at 1200x288). The original SVGs are kept beside them. The store screenshot is the built-in's. |
| App Store copy keys in the dashboard catalogs (`apps.projectScaffolder.manifest.*`) | `l10n` block in `app.json`, one entry per shipped non-English locale, plus `useCases` and `configuration` | The listing copy travels with the app. It is the `manifest` subtree of `ui/i18n/<locale>.json`, kept equal by a test. |
| No `minKiroCrewVersion` | `"minKiroCrewVersion": "0.12.0"` | The first Kiro Crew whose dashboard reads `l10n` and whose adoption can carry this record. |

## Gaps

1. **The host endpoints name the app.** `dashboard/chat_folder_scaffold.py`
   answers `/api/project-scaffold/*` with 403 `app_not_enabled` unless the record
   named `project-scaffolder` is enabled (`APP_NAME`). The check reads the record
   whatever its origin, so it keeps working for an adopted record, but it is core
   naming an app, which has to become a generic seam (or the endpoints a plain
   host feature) before the wheel copy is deleted.
2. **Styles.** The page keeps the built-in's Tailwind utility class strings. They
   render because the dashboard's stylesheet still carries them while the
   compiled built-in page ships with Kiro Crew.
3. **Store listing localization, sidebar icon on a fresh install, author**: as
   for every first-party port. The dashboard reads `l10n` only for an app no
   catalog key covers, so the dashboard's own copy is shown while the built-in
   ships; the `FolderPlus` glyph and the `/project-scaffolder` route come only
   from the adoption pin.

## Tests

| Built-in | Here |
|---|---|
| `website/src/test/ProjectScaffolderPage.test.tsx` | `ui/tests/ProjectScaffolderPage.test.tsx`: every case, over the stub SDK's scoped client and a stand-in picker. The keyboard case that drove the host picker's own Escape and Enter is the host's to test; here it opens the picker from the keyboard and closes it without a pick. |
| `website/src/i18n/projectScaffolderNestedCountPlural.test.ts` | `ui/tests/projectScaffolderNestedCountPlural.test.ts`, against this copy's lookup |
| `tests/test_manifest.py`: platform list, `requiresDesktopApp`, no `backend` / `dependencies`, no executable code | `tests/test_manifest_contract.py` (`test_the_platform_claim_and_the_desktop_axis`, `test_declares_nothing_adoption_cannot_carry`, `test_ships_no_executable_code`) |
| `tests/test_manifest.py`: `project_scan.root_identity` and the endpoint's zero-inode refusal | Not ported: that is host code, and it stays tested in Kiro Crew |
| (new) | `ui/tests/api.test.ts` (refusal parsing over the scoped client), `ui/tests/i18n.test.ts` (catalog parity, lookup order, the `l10n` block), `ui/tests/olderHost.test.tsx` (no picker below level 7), and the bundle and tree checks in `tests/test_manifest_contract.py` |

## Fixes since the port

None yet. A change to the built-in's page, strings or manifest in Kiro Crew is
ported here first, recorded in this table, and released with a patch version.

| Kiro Crew change | Here | Version |
|---|---|---|
