/**
 * The app's own strings. A bundle cannot read the dashboard's catalogs (those
 * belong to the host and change with it), so every locale the dashboard ships is
 * bundled here and looked up against the host's active language. The keys are
 * the built-in page's own (`apps.projectScaffolder.*`), so each string is the
 * one the built-in showed.
 *
 * Lookup order: the exact locale (`pt`, `zh-CN`), then its base language, then
 * English, then the key itself, so a missing translation shows English rather
 * than nothing. `{{name}}` placeholders are filled from `vars`; one with no value
 * is left as written. With a numeric `count`, the CLDR plural form of that
 * locale is tried first (`_one`, `_few`, `_many`, `_other`), the same key shape
 * the dashboard's catalogs use.
 *
 * `t` reads the language at call time. The root component subscribes to the
 * host's language changes (`useLanguageGeneration`), and its re-render reaches
 * every child, so a language switch repaints the page without a reload.
 */

import { activeLocale } from '@kirocrew/app-sdk'
import bn from '../i18n/bn.json'
import de from '../i18n/de.json'
import en from '../i18n/en.json'
import es from '../i18n/es.json'
import fr from '../i18n/fr.json'
import hi from '../i18n/hi.json'
import it from '../i18n/it.json'
import ja from '../i18n/ja.json'
import ko from '../i18n/ko.json'
import pt from '../i18n/pt.json'
import ru from '../i18n/ru.json'
import zhCN from '../i18n/zh-CN.json'

interface Catalog {
  [key: string]: string | Catalog
}

export const CATALOGS: Readonly<Record<string, Catalog>> = {
  bn,
  de,
  en,
  es,
  fr,
  hi,
  it,
  ja,
  ko,
  pt,
  ru,
  'zh-CN': zhCN,
}

type Vars = Record<string, string | number>

const own = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

function lookup(catalog: Catalog | undefined, key: string): string | undefined {
  let node: string | Catalog | undefined = catalog
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string' || !own(node, part)) return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** The catalogs to try for `locale`, most specific first, always ending in English. */
export function localeChain(locale: string): string[] {
  const chain: string[] = []
  const add = (candidate: string) => {
    if (own(CATALOGS, candidate) && !chain.includes(candidate)) chain.push(candidate)
  }
  add(locale)
  add(locale.split('-')[0])
  add('en')
  return chain
}

function currentLocale(): string {
  try {
    const locale = activeLocale()
    return typeof locale === 'string' && locale ? locale : 'en'
  } catch {
    return 'en'
  }
}

function pluralSuffix(locale: string, count: number): string {
  try {
    return new Intl.PluralRules(locale).select(count)
  } catch {
    return 'other'
  }
}

const isNameChar = (ch: string) =>
  (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_'

/** Fill each `{{ name }}` with `vars[name]`, leaving an unsupplied one as written. */
export function fill(text: string, vars?: Vars): string {
  let out = ''
  let at = 0
  for (;;) {
    const open = text.indexOf('{{', at)
    if (open < 0) break
    const close = text.indexOf('}}', open + 2)
    if (close < 0) break
    const name = text.slice(open + 2, close).trim()
    out += text.slice(at, open)
    const valid = name !== '' && [...name].every(isNameChar)
    out += valid && vars && own(vars, name) ? String(vars[name]) : text.slice(open, close + 2)
    at = close + 2
  }
  return out + text.slice(at)
}

export function t(key: string, vars?: Vars): string {
  const count = vars && typeof vars.count === 'number' ? vars.count : undefined
  for (const locale of localeChain(currentLocale())) {
    const catalog = CATALOGS[locale]
    if (count !== undefined) {
      for (const form of [`${key}_${pluralSuffix(locale, count)}`, `${key}_other`]) {
        const text = lookup(catalog, form)
        if (text !== undefined) return fill(text, vars)
      }
    }
    const text = lookup(catalog, key)
    if (text !== undefined) return fill(text, vars)
  }
  return key
}

/** The name the page calls `t` by, kept from the built-in. */
export const i18nT = t
