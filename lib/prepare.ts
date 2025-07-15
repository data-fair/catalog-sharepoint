import type { PrepareContext } from '@data-fair/types-catalogs'
import type { MockCapabilities } from './capabilities.ts'
import type { MockConfig } from '#types'

export default async ({ catalogConfig, capabilities, secrets }: PrepareContext<MockConfig, MockCapabilities>) => {
  // Manage secrets
  const secretField = catalogConfig.secretField
  // If the config contains a secretField, and it is not already hidden
  if (secretField && secretField !== '********') {
    // Hide the secret in the catalogConfig, and copy it to secrets
    secrets.secretField = secretField
    catalogConfig.secretField = '********'

  // If the secretField is in the secrets, and empty in catalogConfig,
  // then it means the user has cleared the secret in the config
  } else if (secrets?.secretField && secretField === '') {
    delete secrets.secretField
  } else {
    // The secret is already set, do nothing
  }

  // Manage capabilities
  if (catalogConfig.searchCapability && !capabilities.includes('search')) capabilities.push('search')
  else capabilities = capabilities.filter(c => c !== 'search')

  if (catalogConfig.paginationCapability && !capabilities.includes('pagination')) capabilities.push('pagination')
  else capabilities = capabilities.filter(c => c !== 'pagination')

  let thumbnailUrl: string
  if (catalogConfig.thumbnailUrl) {
    if (!capabilities.includes('thumbnailUrl')) capabilities.push('thumbnailUrl')
    thumbnailUrl = catalogConfig.thumbnailUrl
  } else {
    capabilities = capabilities.filter(c => c !== 'thumbnailUrl')
    thumbnailUrl = ''
  }

  return {
    catalogConfig,
    capabilities,
    secrets,
    thumbnailUrl
  }
}
