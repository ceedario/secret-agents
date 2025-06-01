import { LinearClient } from '@linear/sdk';
import { FileSystem } from './FileSystem.js';
import { OAuthHelper } from './OAuthHelper.js';
interface DownloadResult {
    success: boolean;
    fileType?: string;
    isImage?: boolean;
}
interface AttachmentDownloadResult {
    attachmentMap: Record<string, string>;
    imageMap: Record<string, string>;
    totalFound: number;
    downloaded: number;
    imagesDownloaded: number;
    skipped: number;
    failed: number;
}
export interface Issue {
    description?: string;
    identifier: string;
    comments?: {
        nodes: Array<{
            body: string;
        }>;
    };
}
/**
 * Utility class for downloading attachments from Linear with proper authentication
 */
export declare class AttachmentDownloader {
    private linearClient;
    private fileSystem;
    private oauthHelper;
    /**
     * @param linearClient - Linear API client
     * @param fileSystem - File system utility
     * @param oauthHelper - OAuth helper for token retrieval
     */
    constructor(linearClient: LinearClient, fileSystem: FileSystem, oauthHelper?: OAuthHelper | null);
    /**
     * Extract attachment URLs from text (issue description or comment)
     * @param text - The text to search for attachment URLs
     * @returns Array of attachment URLs
     */
    extractAttachmentUrls(text: string): string[];
    /**
     * Download an attachment from Linear with authentication
     * @param attachmentUrl - The URL of the attachment to download
     * @param destinationPath - Where to save the attachment
     * @returns Success status and detected file type
     */
    downloadAttachment(attachmentUrl: string, destinationPath: string): Promise<DownloadResult>;
    /**
     * Download all attachments from an issue and its comments
     * @param issue - The issue containing potential attachments
     * @param workspacePath - The workspace directory
     * @param maxAttachments - Maximum number of attachments to download (default: 10)
     * @returns Map of original URLs to local file paths and download results
     */
    downloadIssueAttachments(issue: Issue, workspacePath: string, maxAttachments?: number): Promise<AttachmentDownloadResult>;
    /**
     * Generate a markdown section describing downloaded attachments
     * @param downloadResult - Result from downloadIssueAttachments
     * @returns Markdown formatted string
     */
    generateAttachmentManifest(downloadResult: AttachmentDownloadResult): string;
}
export {};
