/**
 * The bundle's entry: AppHost lazy-imports this module and renders its default
 * export as the app's page.
 *
 * It binds the host's permission-scoped API client before any child renders,
 * and subscribes to the host's language generation, which is what repaints the
 * page on a language switch: `t` reads the active locale at call time, and this
 * component's re-render reaches every child.
 */

import { useAppApi, useLanguageGeneration } from '@kirocrew/app-sdk'
import { bindAppApi } from './api'
import ProjectScaffolderPage from './ProjectScaffolderPage'

export default function ProjectScaffolderApp() {
  bindAppApi(useAppApi())
  useLanguageGeneration()
  return <ProjectScaffolderPage />
}
