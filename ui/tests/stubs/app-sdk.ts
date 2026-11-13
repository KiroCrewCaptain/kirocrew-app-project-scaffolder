/**
 * A light stand-in for the host's `@kirocrew/app-sdk`.
 *
 * Only the names the bundle uses, with the host's documented behaviour where a
 * test depends on it. `useAppApi().post` goes through the global `fetch` the
 * way the host's scoped client does: a 2xx answers its JSON body, a non-2xx
 * throws an error carrying `status` and the raw `body` text. The `stub*` /
 * `resetStubSdk` exports are test controls; no host module has them. A test
 * that needs a different host shape replaces this module with `vi.mock`.
 */

import { createElement } from 'react'
import type { AppApi, AppProjectPickerProps } from '@kirocrew/app-sdk'

let locale = 'en'

/** The host's active language for the next lookups. */
export function stubLocale(next: string): void {
  locale = next
}

export function resetStubSdk(): void {
  locale = 'en'
  stubPickerDirs.splice(0, stubPickerDirs.length, '/work/monorepo', '/work/other')
}

export function activeLocale(): string {
  return locale
}

export function useLanguageGeneration(): number {
  return 0
}

export const APP_SDK_LEVEL = 7

class StubApiError extends Error {
  readonly status: number
  readonly body: string
  constructor(status: number, body: string) {
    super(`HTTP ${status}`)
    this.status = status
    this.body = body
  }
}

const stubApi: AppApi = {
  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new StubApiError(res.status, await res.text())
    return (await res.json()) as T
  },
}

export function useAppApi(): AppApi {
  return stubApi
}

/** The directories the stand-in picker offers, one option each. */
export const stubPickerDirs: string[] = ['/work/monorepo', '/work/other']

/**
 * The host picker's contract, not its look: a "Recent" list of options, each
 * choosing its directory, and an Escape-equivalent close button.
 */
export function ProjectPicker({ open, onOpenChange, onSelect }: AppProjectPickerProps) {
  if (!open) return null
  return createElement(
    'div',
    { role: 'dialog', 'data-testid': 'stub-project-picker' },
    createElement('div', null, 'Recent'),
    createElement(
      'ul',
      { role: 'listbox' },
      ...stubPickerDirs.map((dir) =>
        createElement('li', { key: dir, role: 'option', 'aria-selected': false, onClick: () => onSelect(dir) }, dir),
      ),
    ),
    createElement('button', { type: 'button', onClick: () => onOpenChange(false) }, 'Close picker'),
  )
}
