import type { SharePointConfig, SharePointResource } from '#types'
import { getToken } from './connect.ts'
import axios from '@data-fair/lib-node/axios.js'
import type { CatalogPlugin, GetResourceContext, Resource } from '@data-fair/types-catalogs'
import fs from 'fs'

/**
 * Retrieves a resource from SharePoint.
 * This function fetches the metadata of a resource from SharePoint and downloads the file if it exists.
 * It returns the resource metadata, including the file path after download.
 * @param context The context containing catalog configuration, secrets, and resource ID
 * @param context.catalogConfig The configuration for the SharePoint catalog
 * @param context.secrets The secrets for authentication
 * @param context.resourceId The ID of the resource to retrieve
 * @param context.tmpDir The temporary directory for storing downloaded files
 * @param context.log The logging context for tracking progress and errors
 * @returns A promise that resolves to the resource metadata, including file path after download
 */
export const getResource = async (context: GetResourceContext<SharePointConfig>): Promise<ReturnType<CatalogPlugin['getResource']>> => {
  try {
    await context.log.step('Téléchargement du fichier depuis SharePoint')
    const accessToken = await getToken(context.catalogConfig.tenantId, context.catalogConfig.clientId, context.secrets.clientSecret)
    const resource = await getMetaData(context, accessToken)
    await context.log.task(`Téléchargement ${resource.id}`, `Taille du fichier : ${resource.size ?? NaN} octets`, resource.size ?? NaN)
    resource.filePath = await downloadResource(resource.title, context, accessToken)
    return resource
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

/**
 * Retrieves metadata for a resource from SharePoint.
 * @param context The context containing catalog configuration and resource ID
 * @param context.catalogConfig The configuration for the SharePoint catalog
 * @param context.resourceId The ID of the resource to retrieve metadata for
 * @param accessToken The access token for authentication
 * @returns A promise that resolves to the resource metadata
 */
export const getMetaData = async ({ catalogConfig, resourceId }: GetResourceContext<SharePointConfig>, accessToken: string): Promise<Resource> => {
  const url = `https://graph.microsoft.com/v1.0/sites/${catalogConfig.siteId}/drive/items/${resourceId}`

  const response = await axios(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.data) {
    throw new Error(`No data found for resource ID: ${resourceId}`)
  }

  const data: SharePointResource = response.data

  return {
    id: resourceId,
    title: data.name,
    format: data.name?.substring(data.name.lastIndexOf('.') + 1) ?? data.file?.mimeType ?? 'unknown',
    mimeType: data.file?.mimeType,
    origin: data.webUrl,
    size: data.size,
    filePath: ''
  }
}

/**
 * Downloads a resource from SharePoint.
 * @param title The title of the resource to download
 * @param context The context containing catalog configuration and resource ID
 * @param accessToken The access token for authentication
 * @returns A promise that resolves to the file path after download
 */
export const downloadResource = async (title: string, { catalogConfig, resourceId, tmpDir, log }: GetResourceContext<SharePointConfig>, accessToken: string): Promise<string> => {
  const url = `https://graph.microsoft.com/v1.0/sites/${catalogConfig.siteId}/drive/items/${resourceId}/content`

  const response = await axios(url, {
    responseType: 'stream',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })

  const filePath = `${tmpDir}/${title.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`
  const writer = fs.createWriteStream(filePath)

  // Track download progress
  let downloadedBytes = 0
  response.data.on('data', async (chunk: any) => {
    downloadedBytes += chunk.length
    await log.progress(`Téléchargement ${resourceId}`, downloadedBytes)
  })

  response.data.pipe(writer)

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', async () => {
      await log.info('Download completed')
      resolve()
    })
    writer.on('error', async (err) => {
      await log.error(`Error writing file: ${err}`)
      reject(err)
    })
  })

  await log.info(`File saved to ${filePath}`)

  return filePath
}
