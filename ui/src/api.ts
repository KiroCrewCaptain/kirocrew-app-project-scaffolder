/**
 * Typed client for the two host folder-scaffolding endpoints, over the app's
 * permission-scoped transport (`useAppApi()`, bound once by the entry module).
 *
 * The page branches on the `code` in a 400 body (a stale selection needs a
 * re-scan prompt, an unusable root needs an inline field error), so a refusal is
 * re-read here into a `ScaffoldApiError` that keeps it: the scoped client throws
 * with the status and the raw body text, which is exactly what the built-in
 * page read off its own `fetch`.
 *
 * There is no scan or create logic here, deliberately. The server re-derives the
 * selection from its own fresh scan, so a candidate path is only ever a pick from
 * what the server offered; duplicating any part of that here would create a
 * second answer to "what does this tree contain".
 */

import type { AppApi } from '@kirocrew/app-sdk'

/** Server response `status` values. `empty` is a successful scan of a tree with nothing in it. */
export const STATUS_EMPTY = 'empty'

/** `code` on the 400 that means the preview no longer matches the tree on disk. */
export const CODE_SELECTION_STALE = 'folder_scaffold_selection_stale'
/** The scan root was refused. For a create, that means it moved or was replaced since the scan. */
export const CODE_ROOT_INVALID = 'folder_scan_root_invalid'

/** Confidence tier the scanner assigned. `auto` starts ticked, `offered` does not. */
export type Tier = 'auto' | 'offered'

export interface Candidate {
  /** Absolute directory path. Also the identifier a scaffold request selects with. */
  path: string
  name: string
  /** Parent candidate's path, or null when the candidate hangs off the scan root. */
  parent_path: string | null
  tier: Tier
  signals: string[]
  /** A folder is already bound to this directory. Reported, never re-created. */
  existing: boolean
  /** The server's default tick state. */
  selected: boolean
}

export interface ScanResult {
  root: string
  root_existing: boolean
  status: string
  candidates: Candidate[]
  warnings: string[]
}

export interface CreatedFolder {
  path: string
  folder_id: string
  name: string
}

export interface FailedFolder {
  path: string
  error: string
  code: string
}

export interface ScaffoldResult {
  root: string
  created: CreatedFolder[]
  skipped_existing: string[]
  failed: FailedFolder[]
  warnings: string[]
}

/**
 * A refused request, carrying the two halves of the server's 400 body.
 *
 * `message` is the server's own `error` prose and is rendered verbatim: it is
 * the same sentence creating a folder by hand would have produced, so
 * re-wording it here would make the two surfaces disagree about the same
 * refusal. `code` is what the UI branches on.
 */
export class ScaffoldApiError extends Error {
  readonly status: number
  readonly code: string
  /** Selected paths the current scan no longer offers (stale-selection refusals only). */
  readonly unknown: string[]
  constructor(status: number, code: string, message: string, unknownPaths: string[] = []) {
    super(message)
    this.name = 'ScaffoldApiError'
    this.status = status
    this.code = code
    this.unknown = unknownPaths
  }
}

/** Turn a refused response's status and body text into the error the page reads. */
export function scaffoldError(status: number, text: string): ScaffoldApiError {
  let code = ''
  let message = text || `HTTP ${status}`
  let unknownPaths: string[] = []
  if (text) {
    try {
      const parsed = JSON.parse(text) as { error?: unknown; code?: unknown; unknown?: unknown }
      if (typeof parsed.code === 'string') code = parsed.code
      if (typeof parsed.error === 'string') message = parsed.error
      if (Array.isArray(parsed.unknown)) {
        unknownPaths = parsed.unknown.filter((p): p is string => typeof p === 'string')
      }
    } catch {
      /* not JSON: keep the raw body as the message */
    }
  }
  return new ScaffoldApiError(status, code, message, unknownPaths)
}

let bound: AppApi | null = null

/** Bind the scoped client every request goes through. Called by the entry module. */
export function bindAppApi(api: AppApi): void {
  bound = api
}

function isHttpError(err: unknown): err is { status: number; body: string } {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { status?: unknown; body?: unknown }
  return typeof e.status === 'number' && typeof e.body === 'string'
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!bound) throw new Error('project-scaffolder: the app API is not bound yet')
  try {
    return await bound.post<T>(path, body)
  } catch (err) {
    // A non-2xx carries its status and body; a network failure or the SDK's own
    // refusal passes through unchanged, as a failed `fetch` did on the built-in.
    if (isHttpError(err)) throw scaffoldError(err.status, err.body)
    throw err
  }
}

/** Preview the folders a project tree would produce. Creates nothing. */
export function scanProject(root: string): Promise<ScanResult> {
  return postJson<ScanResult>('/api/project-scaffold/scan', { root })
}

/**
 * Create the scan root's folder plus the selected candidates beneath it.
 *
 * `selected` carries exactly the paths ticked at confirmation time. The server
 * re-scans and refuses the whole call when any of them is no longer a candidate,
 * so an empty list is a real answer (create the root folder only) rather than a
 * missing field.
 */
export function scaffoldProject(root: string, selected: string[]): Promise<ScaffoldResult> {
  return postJson<ScaffoldResult>('/api/project-scaffold/create', { root, selected })
}
