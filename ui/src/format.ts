/**
 * The one formatter the page needs that the App SDK does not export: a list in
 * the host's active language ("git repository and Kiro folder (.kiro)").
 *
 * Same call as the dashboard's own `fmtList` (conjunction, long style, locale
 * matched by lookup, empty items dropped), so a row's signals read the same in
 * this copy as in the built-in page.
 */

import { activeLocale } from '@kirocrew/app-sdk'

function currentLocale(): string {
  try {
    const locale = activeLocale()
    return typeof locale === 'string' && locale ? locale : 'en'
  } catch {
    return 'en'
  }
}

export function fmtList(items: readonly string[]): string {
  const kept = items.filter((item) => item !== '')
  const locale = currentLocale()
  try {
    return new Intl.ListFormat(locale, { localeMatcher: 'lookup', type: 'conjunction', style: 'long' }).format(kept)
  } catch {
    return new Intl.ListFormat('en', { type: 'conjunction', style: 'long' }).format(kept)
  }
}
