/**
 * A light stand-in for the host's `@kirocrew/app-sdk/ui`: plain elements with
 * the roles, labels and test ids the host components render, so a test can find
 * them the way a user would.
 */

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'

export function Card({ children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest}>{children}</div>
}

export function CardTitle({ children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...rest}>{children}</h3>
}

export const Btn = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean; primary?: boolean; busy?: boolean }
>(function Btn({ danger: _danger, primary: _primary, busy: _busy, ...rest }, ref) {
  return <button ref={ref} {...rest} />
})

export const SendBtn = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }>(
  function SendBtn({ busy: _busy, ...rest }, ref) {
    return <button ref={ref} {...rest} />
  },
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return <input ref={ref} {...props} />
})

export function Badge({ variant: _variant, children, ...rest }: { variant: string; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return <span {...rest}>{children}</span>
}

export function EmptyState({ title, subtitle, action, testId = 'empty-state' }: {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  testId?: string
}) {
  return (
    <div data-testid={testId}>
      <div data-testid={`${testId}-title`}>{title}</div>
      {subtitle ? <div data-testid={`${testId}-subtitle`}>{subtitle}</div> : null}
      {action ? <div data-testid={`${testId}-action`}>{action}</div> : null}
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: string; actions?: ReactNode }) {
  return (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  )
}

export function ErrorNotice({ message, title, testId }: {
  message?: string | null
  title?: string
  variant?: 'block' | 'inline'
  className?: string
  testId?: string
  askAgent?: boolean
}) {
  if (!message && !title) return null
  return (
    <div role="alert" data-testid={testId}>
      {title ? <strong>{title}</strong> : null}
      {message ? <span>{message}</span> : null}
    </div>
  )
}
