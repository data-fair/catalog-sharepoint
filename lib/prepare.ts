import type { PrepareContext } from '@data-fair/types-catalogs'
import type { SharePointCapabilities } from './capabilities.ts'
import type { SharePointConfig } from '#types'
import axios from '@data-fair/lib-node/axios.js'
import { getToken } from './connect.ts'

/**
 * Prepares the SharePoint plugin by validating the configuration and retrieving the site ID.
 * This function checks if the client secret is provided, retrieves the site ID from SharePoint,
 * and returns the updated catalog configuration along with capabilities and secrets.
 * @param context The context containing catalog configuration, capabilities, and secrets
 * @param context.catalogConfig The configuration for the SharePoint catalog
 * @param context.capabilities The capabilities of the SharePoint plugin
 * @param context.secrets The secrets for authentication
 * @returns A promise that resolves to the updated catalog configuration, capabilities, and secrets
 * @throws An error if the site ID cannot be retrieved or if the configuration is invalid
 */
export default async ({ catalogConfig, capabilities, secrets }: PrepareContext<SharePointConfig, SharePointCapabilities>) => {
  console.log('Preparing SharePoint plugin with config:', catalogConfig)
  const clientSecret = catalogConfig.clientSecret

  if (clientSecret && clientSecret !== '********') {
    secrets.clientSecret = clientSecret
    catalogConfig.clientSecret = '********'
  } else if (secrets?.clientSecret && clientSecret === '') {
    delete secrets.clientSecret
  } else {
    // The secret is already set, do nothing
  }

  let siteId: string | undefined
  try {
    // check if the configuration is valid and retrieve the site ID
    const accessToken = await getToken(catalogConfig.tenantId, catalogConfig.clientId, secrets.clientSecret)

    // transform url like https://koumoul.sharepoint.com/sites/testsharepoint to koumoul.sharepoint.com:/sites/testsharepoint
    let urlFormatted = catalogConfig.url.replace(/^https?:\/\//, '')
    const sitesIndex = urlFormatted.indexOf('/sites/')
    if (sitesIndex !== -1) {
      const domain = urlFormatted.substring(0, sitesIndex)
      const sitePath = urlFormatted.substring(sitesIndex + 1)
      urlFormatted = `${domain}:/${sitePath}`
    }

    const data = (await axios(`https://graph.microsoft.com/v1.0/sites/${urlFormatted}?select=id`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })).data
    siteId = data.id
    if (!siteId) {
      throw new Error('No site found for the provided URL')
    }
    catalogConfig.siteId = siteId
  } catch (error) {
    console.error('Error while preparing SharePoint plugin:', error)
    throw new Error(`Erreur lors de la préparation du plugin SharePoint. ${error instanceof Error ? error.message : error}`)
  }

  return {
    catalogConfig,
    capabilities,
    secrets,
  }
}
