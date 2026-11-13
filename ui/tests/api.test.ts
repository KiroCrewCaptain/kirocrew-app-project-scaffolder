/**
 * The client over the app's scoped transport reads a refusal the way the
 * built-in page read it off its own `fetch`: the `code`, the verbatim `error`
 * prose and the `unknown` paths of a 400 body, or the raw text when the body is
 * not JSON. A failure with no response (the network, the SDK's own path
 * refusal) passes through unchanged.
 */
import { describe, it, expect, vi } from 'vitest'
import type { AppApi } from '@kirocrew/app-sdk'
import { bindAppApi, scaffoldError, scaffoldProject, scanProject, ScaffoldApiError } from '../src/api'

function refusing(status: number, body: string): AppApi {
  return {
    post: vi.fn(async () => {
      throw Object.assign(new Error(`HTTP ${status}`), { status, body })
    }),
  } as AppApi
}

describe('scaffoldError', () => {
  it('keeps the code, the prose and the paths of a JSON refusal', () => {
    const err = scaffoldError(400, JSON.stringify({ code: 'folder_scaffold_selection_stale', error: 'Re-scan first', unknown: ['/a', 3, '/b'] }))
    expect(err).toBeInstanceOf(ScaffoldApiError)
    expect(err.status).toBe(400)
    expect(err.code).toBe('folder_scaffold_selection_stale')
    expect(err.message).toBe('Re-scan first')
    expect(err.unknown).toEqual(['/a', '/b'])
  })

  it('keeps a non-JSON body as the message, and names the status when there is none', () => {
    expect(scaffoldError(502, 'Bad gateway').message).toBe('Bad gateway')
    expect(scaffoldError(502, 'Bad gateway').code).toBe('')
    expect(scaffoldError(500, '').message).toBe('HTTP 500')
  })
})

describe('the scoped client', () => {
  it('posts each endpoint with the body the built-in sent', async () => {
    const post = vi.fn(async () => ({ ok: true }))
    bindAppApi({ post } as unknown as AppApi)
    await scanProject('/work/repo')
    await scaffoldProject('/work/repo', ['/work/repo/a'])
    expect(post.mock.calls).toEqual([
      ['/api/project-scaffold/scan', { root: '/work/repo' }],
      ['/api/project-scaffold/create', { root: '/work/repo', selected: ['/work/repo/a'] }],
    ])
  })

  it('turns an HTTP refusal into a ScaffoldApiError', async () => {
    bindAppApi(refusing(403, JSON.stringify({ code: 'app_not_enabled', error: "app 'project-scaffolder' is not enabled" })))
    await expect(scanProject('/x')).rejects.toMatchObject({ name: 'ScaffoldApiError', status: 403, code: 'app_not_enabled' })
  })

  it('passes a failure with no response through unchanged', async () => {
    const network = new TypeError('Failed to fetch')
    bindAppApi({ post: vi.fn(async () => { throw network }) } as unknown as AppApi)
    await expect(scanProject('/x')).rejects.toBe(network)
  })
})
