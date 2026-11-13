/**
 * The app's own catalogs and the lookup over them.
 *
 * The bundle cannot read the dashboard's catalogs, so a missing key here is an
 * untranslated (or raw-key) string on screen in that locale. These pin the
 * fallback order, the plural forms, the placeholder fill, that every shipped
 * locale covers every English key with the same placeholders, that every key
 * the source asks for exists, and that the manifest's `l10n` block is the
 * catalogs' `manifest` subtree.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOGS, fill, localeChain, t } from '../src/i18n'
import { stubLocale } from './stubs/app-sdk'

type Tree = { [key: string]: string | Tree }

const ROOT = 'apps.projectScaffolder'
const PAGE = `${ROOT}.projectScaffolderPage`
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other']

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') out[prefix + key] = value
    else Object.assign(out, flatten(value, `${prefix}${key}.`))
  }
  return out
}

/** A plural family counts once: its base key. */
function family(key: string): string {
  const suffix = PLURAL_SUFFIXES.find((s) => key.endsWith(s))
  return suffix ? key.slice(0, -suffix.length) : key
}

function placeholders(text: string): string[] {
  const names: string[] = []
  let at = 0
  for (;;) {
    const open = text.indexOf('{{', at)
    if (open < 0) break
    const close = text.indexOf('}}', open)
    if (close < 0) break
    names.push(text.slice(open + 2, close).trim())
    at = close + 2
  }
  return names.sort()
}

const en = flatten(CATALOGS.en as Tree)

describe('lookup order', () => {
  it('uses the exact locale first', () => {
    stubLocale('zh-CN')
    expect(t(`${PAGE}.scan`)).toBe(flatten(CATALOGS['zh-CN'] as Tree)[`${PAGE}.scan`])
    expect(t(`${PAGE}.scan`)).not.toBe('Scan')
  })

  it('falls back to the base language for a regional variant', () => {
    stubLocale('pt-BR')
    expect(localeChain('pt-BR')).toEqual(['pt', 'en'])
    expect(t(`${PAGE}.scan`)).toBe(flatten(CATALOGS.pt as Tree)[`${PAGE}.scan`])
  })

  it('falls back to English for a language it does not ship', () => {
    stubLocale('sv')
    expect(localeChain('sv')).toEqual(['en'])
    expect(t(`${PAGE}.scan`)).toBe('Scan')
  })

  it('shows the key when no catalog has it, and never reads inherited properties', () => {
    expect(t('nope.not_a_key')).toBe('nope.not_a_key')
    expect(t(PAGE)).toBe(PAGE)
    expect(t('constructor')).toBe('constructor')
    expect(t(`${PAGE}.toString`)).toBe(`${PAGE}.toString`)
  })
})

describe('placeholders', () => {
  it('fills each named placeholder and leaves an unsupplied one as written', () => {
    expect(t(`${PAGE}.inside_name`, { name: 'services' })).toBe('Inside services')
    expect(t(`${PAGE}.inside_name`)).toBe('Inside {{name}}')
    expect(fill('{{ a }} and {{b}}', { a: 1, b: 'two' })).toBe('1 and two')
    expect(fill('{{a}} {{missing}} {{', { a: 'x' })).toBe('x {{missing}} {{')
    expect(fill('{{not a name}}', { 'not a name': 'x' })).toBe('{{not a name}}')
  })
})

describe('the catalogs', () => {
  it('ships every locale the dashboard ships', () => {
    const files = readdirSync(join(__dirname, '..', 'i18n')).map((f) => f.replace(/\.json$/, '')).sort()
    expect(Object.keys(CATALOGS).sort()).toEqual(files)
    expect(files).toEqual(['bn', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'zh-CN'])
  })

  it('covers every English key in every locale, with the same placeholders', () => {
    const enFamilies = new Set(Object.keys(en).map(family))
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const flat = flatten(catalog as Tree)
      const families = new Set(Object.keys(flat).map(family))
      expect([...families].sort(), locale).toEqual([...enFamilies].sort())
      for (const [key, text] of Object.entries(flat)) {
        const base = en[key] ?? en[`${family(key)}_other`]
        expect(base, `${locale} ${key}`).toBeDefined()
        expect(placeholders(text), `${locale} ${key}`).toEqual(placeholders(base))
        expect(text.trim(), `${locale} ${key}`).not.toBe('')
      }
    }
  })

  it('has every key the source asks for', () => {
    const src = join(__dirname, '..', 'src')
    const asked = new Set<string>()
    for (const file of readdirSync(src).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))) {
      const text = readFileSync(join(src, file), 'utf-8')
      let at = 0
      for (;;) {
        const hit = text.indexOf(`'${ROOT}.`, at)
        if (hit < 0) break
        const end = text.indexOf("'", hit + 1)
        asked.add(text.slice(hit + 1, end))
        at = end + 1
      }
    }
    expect(asked.size).toBeGreaterThan(30)
    for (const key of asked) {
      const known = key in en || PLURAL_SUFFIXES.some((s) => `${key}${s}` in en)
      expect(known, key).toBe(true)
    }
  })

  it("is what the manifest's l10n block lists for the store", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, '..', '..', 'app.json'), 'utf-8'))
    const enManifest = (CATALOGS.en as Tree).apps as Tree
    const enM = ((enManifest.projectScaffolder as Tree).manifest as Tree)
    expect(manifest.displayName).toBe(enM.display_name)
    expect(manifest.description).toBe(enM.description)
    expect(manifest.ui.pages[0].label).toBe(enM.page_label)
    expect(manifest.highlights).toEqual([1, 2, 3, 4, 5, 6].map((i) => enM[`highlight_${i}`]))
    expect(manifest.useCases).toEqual([enM.use_case_1])
    expect(manifest.configuration).toEqual([enM.configuration_1])
    const locales = Object.keys(CATALOGS).filter((l) => l !== 'en').sort()
    expect(Object.keys(manifest.l10n).sort()).toEqual(locales)
    for (const locale of locales) {
      const m = (((CATALOGS[locale] as Tree).apps as Tree).projectScaffolder as Tree).manifest as Tree
      expect(manifest.l10n[locale], locale).toEqual({
        displayName: m.display_name,
        description: m.description,
        pageLabel: m.page_label,
        highlights: [1, 2, 3, 4, 5, 6].map((i) => m[`highlight_${i}`]),
      })
    }
  })
})
