/**
 * Ported from the built-in's `website/src/i18n/projectScaffolderNestedCountPlural.test.ts`.
 *
 * The Create Folders From Project disclosure counts its nested rows. Its key had
 * no plural forms once, so one row read "1 possible sub-folders" in English and
 * the noun never agreed with the number in any language. This copy's own lookup
 * (`ui/src/i18n.ts`) must pick the same forms the dashboard's i18next did.
 */
import { describe, expect, it } from 'vitest'

import { i18nT } from '../src/i18n'
import { stubLocale } from './stubs/app-sdk'

const KEY = 'apps.projectScaffolder.projectScaffolderPage.n_possible_sub_folders_inside_packages_above'

describe('nested sub-folder count picks the plural form for its number', () => {
  it('uses the English singular for one', () => {
    expect(i18nT(KEY, { count: 1, n: 1 })).toBe('1 possible sub-folder inside packages above')
    expect(i18nT(KEY, { count: 5, n: 5 })).toBe('5 possible sub-folders inside packages above')
  })

  it('agrees the Russian noun with the number', () => {
    stubLocale('ru')
    expect(i18nT(KEY, { count: 1, n: 1 })).toBe('1 возможная вложенная папка в пакетах выше')
    expect(i18nT(KEY, { count: 3, n: 3 })).toBe('3 возможные вложенные папки в пакетах выше')
    expect(i18nT(KEY, { count: 5, n: 5 })).toBe('5 возможных вложенных папок в пакетах выше')
  })

  it('uses the singular in German, Spanish and French', () => {
    stubLocale('de')
    expect(i18nT(KEY, { count: 1, n: 1 })).toBe('1 möglicher Unterordner in den Paketen oben')
    stubLocale('es')
    expect(i18nT(KEY, { count: 1, n: 1 })).toBe('1 posible subcarpeta dentro de los paquetes de arriba')
    stubLocale('fr')
    expect(i18nT(KEY, { count: 1, n: 1 })).toBe('1 sous-dossier possible dans les paquets ci-dessus')
  })
})
