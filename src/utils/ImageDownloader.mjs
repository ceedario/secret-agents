import fetch from 'node-fetch';
import path from 'path';

/**
 * Utility class for downloading attachments from Linear with proper authentication
 */
export class ImageDownloader {
  /**
   * @param {LinearClient} linearClient - Linear API client
   * @param {FileSystem} fileSystem - File system utility
   * @param {OAuthHelper} oauthHelper - OAuth helper for token retrieval
   */
  constructor(linearClient, fileSystem, oauthHelper = null) {
    this.linearClient = linearClient;
    this.fileSystem = fileSystem;
    this.oauthHelper = oauthHelper;
  }

  /**
   * Extract attachment URLs from text (issue description or comment)
   * @param {string} text - The text to search for attachment URLs
   * @returns {Object} - Object with arrays of image URLs and other attachment URLs
   */
  extractAttachmentUrls(text) {
    if (!text) return { imageUrls: [], otherAttachmentUrls: [] };
    
    // Match URLs that start with https://uploads.linear.app
    const regex = /https:\/\/uploads\.linear\.app\/[^\s<>"()]+/gi;
    const matches = text.match(regex) || [];
    
    // Remove duplicates
    const uniqueUrls = [...new Set(matches)];
    
    // Separate images from other attachments
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const imageUrls = [];
    const otherAttachmentUrls = [];
    
    uniqueUrls.forEach(url => {
      const lowerUrl = url.toLowerCase();
      const isImage = imageExtensions.some(ext => lowerUrl.endsWith(ext));
      
      if (isImage) {
        imageUrls.push(url);
      } else {
        otherAttachmentUrls.push(url);
      }
    });
    
    return { imageUrls, otherAttachmentUrls };
  }
  
  /**
   * Extract image URLs from text (issue description or comment)
   * @param {string} text - The text to search for image URLs
   * @returns {string[]} - Array of image URLs
   * @deprecated Use extractAttachmentUrls instead
   */
  extractImageUrls(text) {
    const { imageUrls } = this.extractAttachmentUrls(text);
    return imageUrls;
  }

  /**
   * Download an image from Linear with authentication
   * @param {string} imageUrl - The URL of the image to download
   * @param {string} destinationPath - Where to save the image
   * @returns {Promise<boolean>} - Success status
   */
  async downloadImage(imageUrl, destinationPath) {
    try {
      console.log(`Downloading image from: ${imageUrl}`);
      
      // Get the authorization header from the appropriate source
      let authHeader = '';
      
      // Try OAuth first if available
      if (this.oauthHelper && await this.oauthHelper.hasValidToken()) {
        const token = await this.oauthHelper.getAccessToken();
        authHeader = `Bearer ${token}`;
        console.log('Using OAuth token for image download');
      } else if (process.env.LINEAR_API_TOKEN) {
        // Fall back to API token
        authHeader = process.env.LINEAR_API_TOKEN;
        console.log('Using API token for image download');
      } else if (process.env.LINEAR_PERSONAL_ACCESS_TOKEN) {
        // Fall back to personal access token
        authHeader = `Bearer ${process.env.LINEAR_PERSONAL_ACCESS_TOKEN}`;
        console.log('Using personal access token for image download');
      } else {
        throw new Error('No authentication method available for image download');
      }
      
      const response = await fetch(imageUrl, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status || 401} ${response.statusText || 'Unauthorized'}`);
      }
      
      const buffer = await response.buffer();
      
      // Ensure the directory exists
      const dir = path.dirname(destinationPath);
      await this.fileSystem.ensureDir(dir);
      
      // Write the image to disk
      await this.fileSystem.writeFile(destinationPath, buffer);
      
      console.log(`Successfully downloaded image to: ${destinationPath}`);
      return true;
    } catch (error) {
      console.error(`Error downloading image from ${imageUrl}:`, error);
      return false;
    }
  }

  /**
   * Download all attachments from an issue and its comments
   * @param {Issue} issue - The issue containing potential attachments
   * @param {string} workspacePath - The workspace directory
   * @param {number} maxImages - Maximum number of images to download (default: 10)
   * @returns {Promise<Object>} - Result object with downloaded files info
   */
  async downloadIssueAttachments(issue, workspacePath, maxImages = 10) {
    const imageMap = {};
    const otherAttachmentMap = {};
    let imageCount = 0;
    let otherAttachmentCount = 0;
    let skippedImageCount = 0;
    let failedDownloads = [];
    
    // Create attachments directory in workspace
    const attachmentsDir = path.join(workspacePath, '.linear-attachments');
    
    // Extract URLs from issue description
    const descriptionAttachments = this.extractAttachmentUrls(issue.description);
    
    // Extract URLs from comments
    const commentImageUrls = [];
    const commentOtherUrls = [];
    if (issue.comments && issue.comments.nodes) {
      for (const comment of issue.comments.nodes) {
        const attachments = this.extractAttachmentUrls(comment.body);
        commentImageUrls.push(...attachments.imageUrls);
        commentOtherUrls.push(...attachments.otherAttachmentUrls);
      }
    }
    
    // Combine and deduplicate all URLs
    const allImageUrls = [...new Set([...descriptionAttachments.imageUrls, ...commentImageUrls])];
    const allOtherUrls = [...new Set([...descriptionAttachments.otherAttachmentUrls, ...commentOtherUrls])];
    
    console.log(`Found ${allImageUrls.length} unique image URLs and ${allOtherUrls.length} other attachment URLs in issue ${issue.identifier}`);
    
    if (allImageUrls.length > maxImages) {
      console.warn(`Warning: Found ${allImageUrls.length} images but limiting to ${maxImages}. Skipping ${allImageUrls.length - maxImages} images.`);
    }
    
    // Download images up to the limit
    for (const url of allImageUrls) {
      if (imageCount >= maxImages) {
        skippedImageCount++;
        continue;
      }
      
      // Generate a filename based on the URL
      const urlPath = new URL(url).pathname;
      const filename = `image_${imageCount + 1}${path.extname(urlPath) || '.png'}`;
      const localPath = path.join(attachmentsDir, filename);
      
      const success = await this.downloadImage(url, localPath);
      
      if (success) {
        imageMap[url] = localPath;
        imageCount++;
      } else {
        failedDownloads.push({ url, type: 'image', reason: 'Download failed' });
      }
    }
    
    // Download other attachments
    for (const url of allOtherUrls) {
      // Generate a filename based on the URL
      const urlPath = new URL(url).pathname;
      const filename = `attachment_${otherAttachmentCount + 1}${path.extname(urlPath) || ''}`;
      const localPath = path.join(attachmentsDir, filename);
      
      const success = await this.downloadImage(url, localPath);
      
      if (success) {
        otherAttachmentMap[url] = localPath;
        otherAttachmentCount++;
      } else {
        failedDownloads.push({ url, type: 'attachment', reason: 'Download failed' });
      }
    }
    
    if (skippedImageCount > 0) {
      console.log(`Downloaded ${imageCount} images. Skipped ${skippedImageCount} due to limit.`);
    } else {
      console.log(`Downloaded all ${imageCount} images.`);
    }
    
    if (otherAttachmentCount > 0) {
      console.log(`Downloaded ${otherAttachmentCount} other attachments.`);
    }
    
    if (failedDownloads.length > 0) {
      console.warn(`Warning: Failed to download ${failedDownloads.length} file(s):`);
      failedDownloads.forEach(({ url, type }) => {
        console.warn(`  - ${type}: ${url}`);
      });
    }
    
    return {
      imageMap,
      otherAttachmentMap,
      totalImagesFound: allImageUrls.length,
      totalOtherAttachmentsFound: allOtherUrls.length,
      imagesDownloaded: imageCount,
      otherAttachmentsDownloaded: otherAttachmentCount,
      imagesSkipped: skippedImageCount,
      failedDownloads
    };
  }

  /**
   * Download all images from an issue and its comments
   * @param {Issue} issue - The issue containing potential images
   * @param {string} workspacePath - The workspace directory
   * @param {number} maxImages - Maximum number of images to download (default: 10)
   * @returns {Promise<Object>} - Map of original URLs to local file paths
   * @deprecated Use downloadIssueAttachments instead
   */
  async downloadIssueImages(issue, workspacePath, maxImages = 10) {
    const result = await this.downloadIssueAttachments(issue, workspacePath, maxImages);
    // Return in the old format for backward compatibility
    return {
      imageMap: result.imageMap,
      totalFound: result.totalImagesFound,
      downloaded: result.imagesDownloaded,
      skipped: result.imagesSkipped
    };
  }
  
  /**
   * Generate a markdown section describing downloaded attachments
   * @param {Object} downloadResult - Result from downloadIssueAttachments
   * @returns {string} - Markdown formatted string
   */
  generateAttachmentManifest(downloadResult) {
    const { imageMap, otherAttachmentMap, totalImagesFound, totalOtherAttachmentsFound, 
            imagesDownloaded, otherAttachmentsDownloaded, imagesSkipped, failedDownloads } = downloadResult;
    
    let manifest = '\n## Downloaded Attachments\n\n';
    
    const hasImages = Object.keys(imageMap).length > 0;
    const hasOtherAttachments = Object.keys(otherAttachmentMap).length > 0;
    const hasFailures = failedDownloads.length > 0;
    
    if (!hasImages && !hasOtherAttachments && !hasFailures) {
      manifest += 'No attachments were found in this issue.\n';
      return manifest;
    }
    
    // Summary section
    if (hasImages) {
      manifest += `Found ${totalImagesFound} image(s). Downloaded ${imagesDownloaded}`;
      if (imagesSkipped > 0) {
        manifest += ` (skipped ${imagesSkipped} due to 10 image limit)`;
      }
      manifest += '.\n';
    }
    
    if (hasOtherAttachments) {
      manifest += `Found ${totalOtherAttachmentsFound} other attachment(s). Downloaded ${otherAttachmentsDownloaded}.\n`;
    }
    
    if (hasFailures) {
      manifest += `\n⚠️ Failed to download ${failedDownloads.length} file(s). The agent will continue processing but may not have complete context.\n`;
    }
    
    manifest += '\n';
    
    // Images section
    if (hasImages) {
      manifest += '### Images\n';
      manifest += 'Images have been downloaded to the `.linear-attachments` directory:\n\n';
      
      Object.entries(imageMap).forEach(([url, localPath], index) => {
        const filename = path.basename(localPath);
        manifest += `${index + 1}. ${filename} - Original URL: ${url}\n`;
        manifest += `   Local path: ${localPath}\n\n`;
      });
      
      manifest += 'You can use the Read tool to view these images.\n\n';
    }
    
    // Other attachments section
    if (hasOtherAttachments) {
      manifest += '### Other Attachments\n';
      manifest += 'Non-image attachments have been downloaded to the `.linear-attachments` directory:\n\n';
      
      Object.entries(otherAttachmentMap).forEach(([url, localPath], index) => {
        const filename = path.basename(localPath);
        const ext = path.extname(filename).toLowerCase();
        let fileType = 'File';
        
        // Identify common file types
        if (ext === '.jsonl' || ext === '.json') fileType = 'JSON';
        else if (ext === '.txt') fileType = 'Text';
        else if (ext === '.csv') fileType = 'CSV';
        else if (ext === '.pdf') fileType = 'PDF';
        else if (ext === '.md') fileType = 'Markdown';
        
        manifest += `${index + 1}. ${filename} (${fileType}) - Original URL: ${url}\n`;
        manifest += `   Local path: ${localPath}\n\n`;
      });
      
      manifest += 'You can use the Read tool to view the contents of text-based attachments.\n\n';
    }
    
    // Failed downloads section
    if (hasFailures) {
      manifest += '### Failed Downloads\n';
      manifest += 'The following files could not be downloaded:\n\n';
      
      failedDownloads.forEach(({ url, type }, index) => {
        manifest += `${index + 1}. ${type}: ${url}\n`;
      });
      
      manifest += '\n';
    }
    
    return manifest;
  }
  
  /**
   * Generate a markdown section describing downloaded images
   * @param {Object} downloadResult - Result from downloadIssueImages or downloadIssueAttachments
   * @returns {string} - Markdown formatted string
   * @deprecated Use generateAttachmentManifest instead
   */
  generateImageManifest(downloadResult) {
    // Handle both old and new result formats
    if ('imageMap' in downloadResult && 'totalFound' in downloadResult) {
      // Old format from downloadIssueImages
      return this.generateAttachmentManifest({
        imageMap: downloadResult.imageMap,
        otherAttachmentMap: {},
        totalImagesFound: downloadResult.totalFound,
        totalOtherAttachmentsFound: 0,
        imagesDownloaded: downloadResult.downloaded,
        otherAttachmentsDownloaded: 0,
        imagesSkipped: downloadResult.skipped,
        failedDownloads: []
      });
    } else {
      // New format, use directly
      return this.generateAttachmentManifest(downloadResult);
    }
  }
}