import type CatalogPlugin from '@data-fair/types-catalogs'
import { configSchema, assertConfigValid, type SharePointConfig } from '#types'
import { type SharePointCapabilities, capabilities } from './lib/capabilities.ts'

const plugin: CatalogPlugin<SharePointConfig, SharePointCapabilities> = {
  async prepare (context) {
    const prepare = (await import('./lib/prepare.ts')).default
    return prepare(context)
  },

  async listResources (context) {
    const { listResources } = await import('./lib/imports.ts')
    return listResources(context)
  },

  async getResource (context) {
    const { getResource } = await import('./lib/getResources.ts')
    return getResource(context)
  },

  metadata: {
    title: 'Catalog SharePoint',
    description: 'SharePoint plugin for Data Fair Catalog',
    capabilities
  },

  configSchema,
  assertConfigValid
}
export default plugin
