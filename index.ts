import type CatalogPlugin from '@data-fair/types-catalogs'
import { configSchema, assertConfigValid, type SharePointConfig } from '#types'
import { type SharePointCapabilities, capabilities } from './lib/capabilities.ts'

const plugin: CatalogPlugin<SharePointConfig, SharePointCapabilities> = {
  async prepare (context) {
    const prepare = (await import('./lib/prepare.ts')).default
    return prepare(context)
  },

  async list (context) {
    const { list } = await import('./lib/imports.ts')
    return list(context)
  },

  async getResource (context) {
    const { getResource } = await import('./lib/getResources.ts')
    return getResource(context)
  },

  metadata: {
    title: 'Catalog SharePoint',
    thumbnailPath: './lib/resources/thumbnail.svg',
    i18n: {
      en: { description: 'This catalog allows you to retrieve your files stored on SharePoint (or Teams).' },
      fr: { description: 'Ce catalogue permet de récupérer vos fichiers sauvegardés sur SharePoint (ou Teams).' },
    },
    capabilities
  },

  configSchema,
  assertConfigValid
}
export default plugin
