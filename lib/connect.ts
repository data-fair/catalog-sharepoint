import { ClientSecretCredential } from '@azure/identity'

/**
 * Retrieves an access token for the Microsoft Graph API using client credentials.
 * @param catalogConfig The configuration for the SharePoint catalog, including tenant ID, client ID, and site URL.
 * @param secrets The secrets for authentication, including the client secret.
 * @returns A promise that resolves to an access token for the Microsoft Graph API.
 */
export const getToken = async (tenantId: string, clientId: string, clientSecret: string): Promise<string> => {
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)
  try {
    const token = await credential.getToken('https://graph.microsoft.com/.default')
    return token.token
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}
