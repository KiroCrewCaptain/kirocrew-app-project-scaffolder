/**
 * On a host below App Kit level 7 the SDK has no `ProjectPicker`, so the page
 * keeps the typed path and shows no Browse button rather than failing to load.
 * The page reads the export through a namespace import, so its absence is
 * `undefined` here, not a load error (`tests/test_manifest_contract.py` checks
 * the built bundle for that).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@kirocrew/app-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./stubs/app-sdk')
  return { ...actual, APP_SDK_LEVEL: 6, ProjectPicker: undefined }
})

import { useAppApi } from '@kirocrew/app-sdk'
import ProjectScaffolderPage from '../src/ProjectScaffolderPage'
import { bindAppApi } from '../src/api'

describe('on a host without the SDK project picker', () => {
  it('offers no Browse button and still scans a typed path', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      root: '/work/repo', root_existing: false, status: 'empty', candidates: [], warnings: [],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    bindAppApi(useAppApi())
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <ProjectScaffolderPage />
      </QueryClientProvider>,
    )
    expect(screen.queryByTestId('scaffolder-browse')).toBeNull()
    await user.type(screen.getByLabelText('Project directory'), '/work/repo')
    await user.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByTestId('scan-empty')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
