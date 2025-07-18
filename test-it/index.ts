// // import type CatalogPlugin from '@data-fair/types-catalogs'
// // import { strict as assert } from 'node:assert'
// // import { it, describe, before, beforeEach } from 'node:test'
// // import fs from 'fs-extra'

import type { SharePointConfig, SharePointResource } from '#types'
import type { GetResourceContext } from '@data-fair/types-catalogs'
import { logFunctions } from './test-utils.ts'
import { buildPath, getResourcesAndFolders } from '../lib/imports.ts'
import { describe, beforeEach, it } from 'node:test'
import nock from 'nock'
import assert from 'node:assert'
import { downloadResource, getMetaData } from '../lib/getResources.ts'
import fs from 'fs-extra'

describe('listResources', () => {
  const siteId = 'a-site-id'
  const accessToken = 'test-access-token'

  describe('tests with mock requests', async () => {
    beforeEach(() => {
      nock.cleanAll()
    })

    it('should list folders and files successfully without currentFolderId', async () => {
      const responseValue: SharePointResource[] = [
        {
          id: 'folder1',
          name: 'Folder 1',
          webUrl: 'https://example.com/folder1',
          size: 0,
          parentReference: {
            path: 'drive/root:'
          }
        },
        {
          id: 'file1',
          name: 'File 1.txt',
          file: { mimeType: 'text/plain' },
          webUrl: 'https://example.com/file1.txt',
          size: 10,
          parentReference: {
            path: 'drive/root:'
          }
        }
      ]
      nock('https://graph.microsoft.com')
        .get('/v1.0/sites/a-site-id/drive/root/children')
        .reply(200, { value: responseValue })

      const result = await getResourcesAndFolders(siteId, accessToken, undefined)
      assert.strictEqual(result.length, 2, 'Expected 2 items in the root folder')
      assert.deepStrictEqual(result, [
        { id: 'drive/root:/Folder 1', title: 'Folder 1', type: 'folder' },
        { id: 'file1', title: 'File 1.txt', size: 10, mimeType: 'text/plain', type: 'resource', format: 'txt' }
      ], 'Expected correct folder and file structure')
    })

    it('should list folders and files successfully with currentFolderId', async () => {
      const currentFolderId = '/drive/root:/folder1'
      const responseValue: SharePointResource[] = [
        {
          id: 'file2',
          name: 'File 2.txt',
          file: { mimeType: 'text/plain' },
          webUrl: 'https://example.com/folder1/file2.txt',
          size: 10,
          parentReference: {
            path: 'drive/root:/folder1'
          }
        },
        {
          id: 'folder2',
          name: 'Folder 2',
          webUrl: 'https://example.com/folder1/folder2',
          size: 0,
          parentReference: {
            path: 'drive/root:/folder1'
          }
        }
      ]
      nock('https://graph.microsoft.com')
        .get('/v1.0/sites/a-site-id/drive/root:/folder1:/children')
        .reply(200, { value: responseValue })

      const result = await getResourcesAndFolders(siteId, accessToken, currentFolderId)
      assert.strictEqual(result.length, 2, 'Expected 2 items in the folder')
      assert.deepStrictEqual(result, [
        { id: 'file2', title: 'File 2.txt', size: 10, mimeType: 'text/plain', type: 'resource', format: 'txt' },
        { id: 'drive/root:/folder1/Folder 2', title: 'Folder 2', type: 'folder' }
      ], 'Expected correct folder and file structure')
    })
  })

  describe('test construction of the path', async () => {
    it('test to build a path without a current folderId', async () => {
      const path = buildPath(undefined)
      assert.deepStrictEqual(path, [], 'Expected empty path when currentFolderId is undefined')
    })

    it('test to build a path with a current folderId', async () => {
      const currentFolderId = 'drive/root:/folder1/folder2'
      const path = buildPath(currentFolderId)
      assert.deepStrictEqual(path, [
        { id: 'drive/root:/folder1', title: 'folder1', type: 'folder' },
        { id: 'drive/root:/folder1/folder2', title: 'folder2', type: 'folder' }
      ], 'Expected correct path construction with currentFolderId')
    })
  })
})

describe('downloadResource', async () => {
  it('test getMetaData with mock requests', async () => {
    const context: GetResourceContext<SharePointConfig> = {
      catalogConfig: {
        clientId: 'a-client-id',
        clientSecret: 'a-client-secret',
        tenantId: 'a-tenant-id',
        url: 'example.com:/sites/a-site',
        siteId: 'a-site-id'
      },
      secrets: {},
      importConfig: {},
      resourceId: 'a-res-id',
      tmpDir: './test-it/tmp',
      log: logFunctions
    }
    const responseValue: SharePointResource = {
      id: 'a-res-id',
      name: 'File 2.txt',
      file: { mimeType: 'text/plain' },
      webUrl: 'https://example.com/folder1/a-res-id.txt',
      size: 10,
      parentReference: {
        path: 'drive/root:/folder1'
      }
    }
    nock('https://graph.microsoft.com')
      .get('/v1.0/sites/a-site-id/drive/items/a-res-id')
      .reply(200, responseValue)

    const resource = await getMetaData(context, 'an-accessToken')
    assert.deepStrictEqual(resource, {
      id: 'a-res-id',
      title: 'File 2.txt',
      format: 'txt',
      origin: 'https://example.com/folder1/a-res-id.txt',
      mimeType: 'text/plain',
      size: 10,
      filePath: '',
    })
  })

  it('should download a file and verify its content', async () => {
    // Setup a temporary directory for the test
    const tmpDir = './test-it/tmp'
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir)
    }

    const context: GetResourceContext<SharePointConfig> = {
      catalogConfig: {
        clientId: 'a-client-id',
        clientSecret: 'a-client-secret',
        tenantId: 'a-tenant-id',
        url: 'example.com:/sites/a-site',
        siteId: 'a-site-id'
      },
      secrets: {},
      importConfig: {},
      resourceId: 'a-res-id',
      tmpDir,
      log: logFunctions
    }

    const accessToken = 'an-accessToken'
    const title = 'File 2.txt'
    const fileContent = 'hello world'

    nock('https://graph.microsoft.com')
      .get('/v1.0/sites/a-site-id/drive/items/a-res-id/content')
      .reply(200, fileContent)

    await context.log.task(`Téléchargement ${context.resourceId}`, `Taille du fichier : ${fileContent.length} octets`, fileContent.length)
    const filePath = await downloadResource(title, context, accessToken)

    assert.strictEqual(
      filePath,
      tmpDir + '/file_2.txt',
      'Expected file path to be normalized'
    )

    const downloadedContent = fs.readFileSync(filePath, 'utf8')
    assert.strictEqual(
      downloadedContent,
      fileContent,
      'Expected file content to match'
    )

    // Clean up: remove the temporary directory and file
    fs.unlinkSync(filePath)
    fs.rmdirSync(tmpDir)
  })
})
