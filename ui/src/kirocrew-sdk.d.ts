/**
 * Types for the two host modules this bundle imports. They are not on npm: the
 * dashboard's import map serves them at runtime (`/vendor/*.mjs`), so only the
 * names this page uses are declared, with the shapes the App Kit documents.
 *
 * `ProjectPicker` is App Kit level 7 and is absent on an older host, so it is
 * optional here and the page reads it through a namespace import;
 * `tests/test_manifest_contract.py` checks the built bundle for that. Every
 * other name exists on a host before level 1 and is a plain named import.
 */

declare module '@kirocrew/app-sdk' {
  import type { ComponentType, RefObject } from 'react'

  export interface AppApi {
    post<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>
  }

  /** A scoped non-2xx: `body` is the raw response text. */
  export interface AppApiError extends Error {
    readonly status: number
    readonly body: string
  }

  export interface AppProjectPickerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    anchorRef?: RefObject<HTMLElement | null>
    anchorRect?: DOMRect | null
    onSelect: (path: string) => void
    startPath?: string
  }

  export const APP_SDK_LEVEL: number | undefined
  export const ProjectPicker: ComponentType<AppProjectPickerProps> | undefined

  export function useAppApi(): AppApi
  export function useLanguageGeneration(): number
  export function activeLocale(): string
}

declare module '@kirocrew/app-sdk/ui' {
  import type {
    ButtonHTMLAttributes,
    ComponentPropsWithoutRef,
    ComponentType,
    ForwardRefExoticComponent,
    InputHTMLAttributes,
    ReactNode,
    RefAttributes,
  } from 'react'

  type NoHtml<T> = Omit<T, 'dangerouslySetInnerHTML'>

  export const Card: ComponentType<NoHtml<ComponentPropsWithoutRef<'div'>>>
  export const CardTitle: ComponentType<NoHtml<ComponentPropsWithoutRef<'h3'>>>
  export const Btn: ForwardRefExoticComponent<
    ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean; primary?: boolean; busy?: boolean } & RefAttributes<HTMLButtonElement>
  >
  export const SendBtn: ForwardRefExoticComponent<
    { children: ReactNode; busy?: boolean } & Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'dangerouslySetInnerHTML'> & RefAttributes<HTMLButtonElement>
  >
  export const Input: ForwardRefExoticComponent<InputHTMLAttributes<HTMLInputElement> & RefAttributes<HTMLInputElement>>
  export const Badge: ComponentType<
    { variant: 'ok' | 'err' | 'warn' | 'aim' | 'muted'; children: ReactNode } & Omit<ComponentPropsWithoutRef<'span'>, 'children' | 'dangerouslySetInnerHTML'>
  >
  export const EmptyState: ComponentType<{
    icon: ReactNode
    title: string
    subtitle?: string
    action?: ReactNode
    testId?: string
  }>
  export const PageHeader: ComponentType<{ title: ReactNode; subtitle?: string; actions?: ReactNode }>
  export const ErrorNotice: ComponentType<{
    message?: string | null
    title?: string
    variant?: 'block' | 'inline'
    className?: string
    testId?: string
    /** Offer the "ask the agent" hand-off (only where no typed text is unsaved). */
    askAgent?: boolean
  }>
}
