import fetch from 'node-fetch'
import * as path from 'path'
import { fileTypeFromBuffer } from 'file-type'
import { LinearClient } from '@linear/sdk'
import { FileSystem } from './FileSystem.js'
import { OAuthHelper } from './OAuthHelper.js'

interface DownloadResult {
  success: boolean
  fileType?: string
  isImage?: boolean
}

interface AttachmentDownloadResult {
  attachmentMap: Record<string, string>
  imageMap: Record<string, string>
  totalFound: number
  downloaded: number
  imagesDownloaded: number
  skipped: number
  failed: number
}

export interface Issue {
  description?: string
  identifier: string
  comments?: {
    nodes: Array<{ body: string }>
  }
}

/**
 * Utility class for downloading attachments from Linear with proper authentication
 */
export class AttachmentDownloader {
  private linearClient: LinearClient
  private fileSystem: FileSystem
  private oauthHelper: OAuthHelper | null

  /**
   * @param linearClient - Linear API client
   * @param fileSystem - File system utility
   * @param oauthHelper - OAuth helper for token retrieval
   */
  constructor(linearClient: LinearClient, fileSystem: FileSystem, oauthHelper: OAuthHelper | null = null) {
    this.linearClient = linearClient
    this.fileSystem = fileSystem
    this.oauthHelper = oauthHelper
  }

  /**
   * Extract attachment URLs from text (issue description or comment)
   * @param text - The text to search for attachment URLs
   * @returns Array of attachment URLs
   */
  extractAttachmentUrls(text: string): string[] {
    if (!text) return []
    
    // Match URLs that start with https://uploads.linear.app
    // Stop at common URL delimiters including parentheses used in markdown
    const regex = /https:\/\/uploads\.linear\.app\/[^\s<>"')]+/gi
    const matches = text.match(regex) || []
    
    // Remove duplicates
    return Array.from(new Set(matches))
  }

  /**
   * Download an attachment from Linear with authentication
   * @param attachmentUrl - The URL of the attachment to download
   * @param destinationPath - Where to save the attachment
   * @returns Success status and detected file type
   */
  async downloadAttachment(attachmentUrl: string, destinationPath: string): Promise<DownloadResult> {
    try {
      console.log(`Downloading attachment from: ${attachmentUrl}`)
      
      // Get the authorization header from the appropriate source
      let authHeader = ''
      
      // Try OAuth first if available
      if (this.oauthHelper && await this.oauthHelper.hasValidToken()) {
        const token = await this.oauthHelper.getAccessToken()
        authHeader = `Bearer ${token}`
        console.log('Using OAuth token for attachment download')
      } else if (process.env.LINEAR_API_TOKEN) {
        // Fall back to API token
        authHeader = `Bearer ${process.env.LINEAR_API_TOKEN}`
        console.log('Using API token for attachment download')
      } else if (process.env.LINEAR_PERSONAL_ACCESS_TOKEN) {
        // Fall back to personal access token
        authHeader = `Bearer ${process.env.LINEAR_PERSONAL_ACCESS_TOKEN}`
        console.log('Using personal access token for attachment download')
      } else {
        throw new Error('No authentication method available for attachment download')
      }
      
      const response = await fetch(attachmentUrl, {
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (!response.ok) {
        console.error(`Attachment download failed: ${response.status} ${response.statusText}`)
        console.error(`URL attempted: ${attachmentUrl}`)
        
        // Handle specific error cases gracefully
        if (response.status === 404) {
          console.warn(`Attachment not found (404) - it may have been deleted from Linear`)
          return { success: false }
        } else if (response.status === 401) {
          console.error(`Authentication failed - check that the token has proper permissions`)
          return { success: false }
        }
        
        // For other errors, still return false instead of throwing
        console.error(`Skipping attachment due to error: ${response.status} ${response.statusText}`)
        return { success: false }
      }
      
      const buffer = Buffer.from(await response.arrayBuffer())
      
      // Detect the file type from the buffer
      const fileType = await fileTypeFromBuffer(buffer)
      let detectedExtension = null
      let isImage = false
      
      if (fileType) {
        detectedExtension = `.${fileType.ext}`
        isImage = fileType.mime.startsWith('image/')
        console.log(`Detected file type: ${fileType.mime} (${fileType.ext}), is image: ${isImage}`)
      } else {
        // Try to get extension from URL
        const urlPath = new URL(attachmentUrl).pathname
        const urlExt = path.extname(urlPath)
        if (urlExt) {
          detectedExtension = urlExt
          console.log(`Using extension from URL: ${detectedExtension}`)
        } else {
          console.log('Could not detect file type from content or URL')
        }
      }
      
      // Ensure the directory exists
      const dir = path.dirname(destinationPath)
      await this.fileSystem.ensureDir(dir)
      
      // Write the attachment to disk
      await this.fileSystem.writeFile(destinationPath, buffer)
      
      console.log(`Successfully downloaded attachment to: ${destinationPath}`)
      return { success: true, fileType: detectedExtension || undefined, isImage }
    } catch (error) {
      console.error(`Error downloading attachment:`, error instanceof Error ? error.message : String(error))
      console.error(`URL: ${attachmentUrl}`)
      return { success: false }
    }
  }

  /**
   * Download all attachments from an issue and its comments
   * @param issue - The issue containing potential attachments
   * @param workspacePath - The workspace directory
   * @param maxAttachments - Maximum number of attachments to download (default: 10)
   * @returns Map of original URLs to local file paths and download results
   */
  async downloadIssueAttachments(issue: Issue, workspacePath: string, maxAttachments: number = 10): Promise<AttachmentDownloadResult> {
    const attachmentMap: Record<string, string> = {}
    const imageMap: Record<string, string> = {}
    let attachmentCount = 0
    let imageCount = 0
    let skippedCount = 0
    let failedCount = 0
    
    // Create attachments directory in home directory
    const homeDir = this.fileSystem.homedir()
    const workspaceFolderName = this.fileSystem.basename(workspacePath)
    const attachmentsDir = this.fileSystem.joinPath(
      homeDir,
      '.linearsecretagent',
      workspaceFolderName,
      'attachments'
    )
    
    // Extract URLs from issue description
    const descriptionUrls = this.extractAttachmentUrls(issue.description || '')
    
    // Extract URLs from comments
    const commentUrls: string[] = []
    if (issue.comments && issue.comments.nodes) {
      for (const comment of issue.comments.nodes) {
        const urls = this.extractAttachmentUrls(comment.body)
        commentUrls.push(...urls)
      }
    }
    
    // Combine and deduplicate all URLs
    const allUrls = Array.from(new Set([...descriptionUrls, ...commentUrls]))
    
    console.log(`Found ${allUrls.length} unique attachment URLs in issue ${issue.identifier}`)
    
    if (allUrls.length > maxAttachments) {
      console.warn(`Warning: Found ${allUrls.length} attachments but limiting to ${maxAttachments}. Skipping ${allUrls.length - maxAttachments} attachments.`)
    }
    
    // Download attachments up to the limit
    for (const url of allUrls) {
      if (attachmentCount >= maxAttachments) {
        skippedCount++
        continue
      }
      
      // Generate a temporary filename (will be renamed after detecting type)
      const tempFilename = `attachment_${attachmentCount + 1}.tmp`
      const tempPath = path.join(attachmentsDir, tempFilename)
      
      const result = await this.downloadAttachment(url, tempPath)
      
      if (result.success) {
        // Determine the final filename based on type
        let finalFilename
        if (result.isImage) {
          imageCount++
          finalFilename = `image_${imageCount}${result.fileType || '.png'}`
        } else {
          finalFilename = `attachment_${attachmentCount + 1}${result.fileType || ''}`
        }
        
        const finalPath = path.join(attachmentsDir, finalFilename)
        
        // Rename the file to include the correct extension
        await this.fileSystem.rename(tempPath, finalPath)
        
        // Store in appropriate map
        if (result.isImage) {
          imageMap[url] = finalPath
        } else {
          attachmentMap[url] = finalPath
        }
        attachmentCount++
      } else {
        failedCount++
        console.warn(`Failed to download attachment: ${url}`)
      }
    }
    
    if (skippedCount > 0) {
      console.log(`Downloaded ${attachmentCount} attachments. Skipped ${skippedCount} due to limit.`)
    } else {
      console.log(`Downloaded all ${attachmentCount} attachments.`)
    }
    
    if (failedCount > 0) {
      console.warn(`Failed to download ${failedCount} attachments.`)
    }
    
    return {
      attachmentMap,
      imageMap,
      totalFound: allUrls.length,
      downloaded: attachmentCount,
      imagesDownloaded: imageCount,
      skipped: skippedCount,
      failed: failedCount
    }
  }

  /**
   * Generate a markdown section describing downloaded attachments
   * @param downloadResult - Result from downloadIssueAttachments
   * @returns Markdown formatted string
   */
  generateAttachmentManifest(downloadResult: AttachmentDownloadResult): string {
    const { attachmentMap, imageMap, totalFound, downloaded, imagesDownloaded, skipped, failed } = downloadResult
    
    let manifest = '\n## Downloaded Attachments\n\n'
    
    if (totalFound === 0) {
      manifest += 'No attachments were found in this issue.\n'
      return manifest
    }
    
    manifest += `Found ${totalFound} attachments. Downloaded ${downloaded}`
    if (imagesDownloaded > 0) {
      manifest += ` (including ${imagesDownloaded} images)`
    }
    if (skipped > 0) {
      manifest += `, skipped ${skipped} due to ${downloaded} attachment limit`
    }
    if (failed > 0) {
      manifest += `, failed to download ${failed}`
    }
    manifest += '.\n\n'
    
    if (failed > 0) {
      manifest += '**Note**: Some attachments failed to download. This may be due to authentication issues or the files being unavailable. The agent will continue processing the issue with the available information.\n\n'
    }
    
    manifest += 'Attachments have been downloaded to the `~/.linearsecretagent/<workspace>/attachments` directory:\n\n'
    
    // List images first
    if (Object.keys(imageMap).length > 0) {
      manifest += '### Images\n'
      Object.entries(imageMap).forEach(([url, localPath], index) => {
        const filename = path.basename(localPath)
        manifest += `${index + 1}. ${filename} - Original URL: ${url}\n`
        manifest += `   Local path: ${localPath}\n\n`
      })
      manifest += 'You can use the Read tool to view these images.\n\n'
    }
    
    // List other attachments
    if (Object.keys(attachmentMap).length > 0) {
      manifest += '### Other Attachments\n'
      Object.entries(attachmentMap).forEach(([url, localPath], index) => {
        const filename = path.basename(localPath)
        manifest += `${index + 1}. ${filename} - Original URL: ${url}\n`
        manifest += `   Local path: ${localPath}\n\n`
      })
      manifest += 'You can use the Read tool to view these files.\n\n'
    }
    
    return manifest
  }
}