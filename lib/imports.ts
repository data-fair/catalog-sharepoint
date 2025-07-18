import type { SharePointConfig, SharePointResource } from '#types'
import type { SharePointCapabilities } from './capabilities.ts'
import { getToken } from './connect.ts'
import type { CatalogPlugin, Folder, ListResourcesContext } from '@data-fair/types-catalogs'
import axios from '@data-fair/lib-node/axios.js'

/**
 * Alias type for the list of resources returned by the SharePoint plugin.
 */
type ResourceList = Awaited<ReturnType<CatalogPlugin['listResources']>>['results']

/**
 * Lists resources and folders from a SharePoint site or folder.
 * This function retrieves the resources and folders from the specified SharePoint site or folder,
 * and returns them in a structured format.
 * @param context The context containing catalog configuration, secrets, and parameters for listing resources
 * @param context.catalogConfig The configuration for the SharePoint catalog
 * @param context.secrets The secrets for authentication
 * @param context.params The parameters for listing resources, including the current folder ID
 * @param context.params.currentFolderId The ID of the current folder to list resources from
 * @returns A promise that resolves to the list of resources and folders
 */
export const listResources = async ({ catalogConfig, secrets, params }: ListResourcesContext<SharePointConfig, SharePointCapabilities>): ReturnType<CatalogPlugin['listResources']> => {
  try {
    const accessToken = await getToken(catalogConfig.tenantId, catalogConfig.clientId, secrets.clientSecret)
    const resources = await getResourcesAndFolders(catalogConfig.siteId, accessToken, params.currentFolderId)
    const path = buildPath(params.currentFolderId)

    return {
      count: resources.length,
      results: resources,
      path
    }
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

/**
 * Fetches a list of resources and folders from a SharePoint site or folder.
 * @param siteId The ID of the SharePoint site
 * @param accessToken The access token for authentication
 * @param currentFolderId  The ID of the current folder, if any
 * @returns A list of resources and folders in the specified SharePoint site or folder
 * @throws An error if the request fails or if no data is found
 */
export const getResourcesAndFolders = async (siteId: string, accessToken: string, currentFolderId: string | undefined): Promise<ResourceList> => {
  let url: string
  if (currentFolderId) {
    url = `https://graph.microsoft.com/v1.0/sites/${siteId}${currentFolderId}:/children`
  } else {
    url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`
  }

  const data: { value: SharePointResource[] } = (await axios(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })).data

  const resources: ResourceList = []
  data.value.forEach((element: SharePointResource) => {
    if (element.file) {
      resources.push({
        id: element.id,
        title: element.name,
        size: element.size,
        mimeType: element.file?.mimeType,
        type: 'resource',
        format: element.name?.substring(element.name.lastIndexOf('.') + 1) ?? element.file?.mimeType ?? 'unknown',
      })
    } else {
      resources.push({
        id: element.parentReference.path + '/' + element.name,
        title: element.name,
        type: 'folder'
      })
    }
  })
  return resources
}

/**
 * Constructs the path for the current folder.
 * @param currentFolderId The ID of the current folder
 * @returns The constructed path
 */
export const buildPath = (currentFolderId: string | undefined): Folder[] => {
  const path: Folder[] = []

  if (currentFolderId) {
    const folderPath = currentFolderId.substring(currentFolderId.indexOf(':') + 1).split('/')
    folderPath.forEach((folderId, index) => {
      if (folderId) {
        path.push({
          id: 'drive/root:' + folderPath.slice(0, index + 1).join('/'),
          title: folderId,
          type: 'folder',
        })
      }
    })
  }

  return path
}
