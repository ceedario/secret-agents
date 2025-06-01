import { vi } from 'vitest'

// Mock node-fetch before importing AttachmentDownloader
vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

// Mock file-type module
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn()
}))

// Import modules after mocking
const fetch = (await import('node-fetch')).default
const { fileTypeFromBuffer } = await import('file-type')
const { AttachmentDownloader } = await import('../../../src/utils/AttachmentDownloader.js')
const { Issue } = await import('../../../src/core/Issue.js')

describe('AttachmentDownloader', () => {
  let attachmentDownloader
  let mockLinearClient
  let mockFileSystem
  let mockOAuthHelper

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    fetch.mockClear()
    fileTypeFromBuffer.mockClear()

    // Create mock dependencies
    mockLinearClient = {
      viewer: vi.fn().mockResolvedValue({ id: 'user-123', name: 'Test User' })
    }

    mockFileSystem = {
      ensureDir: vi.fn().mockResolvedValue(undefined),
      existsSync: vi.fn().mockReturnValue(false),
      writeFile: vi.fn().mockResolvedValue(undefined),
      homedir: vi.fn().mockReturnValue('/home/user'),
      basename: vi.fn().mockReturnValue('workspace'),
      joinPath: vi.fn().mockImplementation((...args) => args.join('/')),
      rename: vi.fn().mockResolvedValue(undefined)
    }

    mockOAuthHelper = {
      hasValidToken: vi.fn().mockResolvedValue(true),
      getAccessToken: vi.fn().mockResolvedValue('oauth-token-123')
    }

    attachmentDownloader = new AttachmentDownloader(mockLinearClient, mockFileSystem, mockOAuthHelper)
  })

  describe('extractAttachmentUrls', () => {
    it('should extract Linear upload URLs from text', () => {
      const text = `
        Here is some text with an attachment:
        https://uploads.linear.app/12345/document.pdf
        And another one: https://uploads.linear.app/67890/data.jsonl
        Not a Linear attachment: https://example.com/file.pdf
      `

      const urls = attachmentDownloader.extractAttachmentUrls(text)

      expect(urls).toHaveLength(2)
      expect(urls).toContain('https://uploads.linear.app/12345/document.pdf')
      expect(urls).toContain('https://uploads.linear.app/67890/data.jsonl')
    })

    it('should return empty array for null or empty text', () => {
      expect(attachmentDownloader.extractAttachmentUrls(null)).toEqual([])
      expect(attachmentDownloader.extractAttachmentUrls('')).toEqual([])
      expect(attachmentDownloader.extractAttachmentUrls(undefined)).toEqual([])
    })

    it('should remove duplicate URLs', () => {
      const text = `
        https://uploads.linear.app/12345/file.json
        https://uploads.linear.app/12345/file.json
        https://uploads.linear.app/12345/file.json
      `

      const urls = attachmentDownloader.extractAttachmentUrls(text)
      expect(urls).toHaveLength(1)
      expect(urls[0]).toBe('https://uploads.linear.app/12345/file.json')
    })

    it('should handle URLs in markdown format', () => {
      const text = `
        ![Screenshot](https://uploads.linear.app/12345/screenshot.png)
        [Data File](https://uploads.linear.app/67890/data.jsonl)
      `

      const urls = attachmentDownloader.extractAttachmentUrls(text)
      expect(urls).toHaveLength(2)
    })
  })

  describe('downloadAttachment', () => {
    it('should download image attachment with OAuth token', async () => {
      const mockBuffer = Buffer.from('fake-image-data')
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: vi.fn().mockResolvedValue(mockBuffer)
      })
      
      // Mock file type detection for image
      fileTypeFromBuffer.mockResolvedValueOnce({ ext: 'png', mime: 'image/png' })

      const result = await attachmentDownloader.downloadAttachment(
        'https://uploads.linear.app/12345/image.png',
        '/workspace/attachments/attachment.tmp'
      )

      expect(result).toEqual({ success: true, fileType: '.png', isImage: true })
      expect(fetch).toHaveBeenCalledWith(
        'https://uploads.linear.app/12345/image.png',
        {
          headers: {
            'Authorization': 'Bearer oauth-token-123'
          }
        }
      )
      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith('/workspace/attachments')
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/workspace/attachments/attachment.tmp', mockBuffer)
    })

    it('should download non-image attachment (JSONL file)', async () => {
      const mockBuffer = Buffer.from('{"data": "test"}\n{"data": "test2"}')
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: vi.fn().mockResolvedValue(mockBuffer)
      })
      
      // Mock file type detection returning null (unknown type)
      fileTypeFromBuffer.mockResolvedValueOnce(null)

      const result = await attachmentDownloader.downloadAttachment(
        'https://uploads.linear.app/12345/data.jsonl',
        '/workspace/attachments/attachment.tmp'
      )

      expect(result).toEqual({ success: true, fileType: '.jsonl', isImage: false })
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/workspace/attachments/attachment.tmp', mockBuffer)
    })

    it('should detect PDF files correctly', async () => {
      const mockBuffer = Buffer.from('fake-pdf-data')
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: vi.fn().mockResolvedValue(mockBuffer)
      })
      
      // Mock file type detection for PDF
      fileTypeFromBuffer.mockResolvedValueOnce({ ext: 'pdf', mime: 'application/pdf' })

      const result = await attachmentDownloader.downloadAttachment(
        'https://uploads.linear.app/12345/document.pdf',
        '/workspace/attachments/attachment.tmp'
      )

      expect(result).toEqual({ success: true, fileType: '.pdf', isImage: false })
    })

    it('should fall back to API token when OAuth is not available', async () => {
      mockOAuthHelper.hasValidToken.mockResolvedValue(false)
      process.env.LINEAR_API_TOKEN = 'api-token-456'

      const mockBuffer = Buffer.from('fake-data')
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: vi.fn().mockResolvedValue(mockBuffer)
      })
      
      fileTypeFromBuffer.mockResolvedValueOnce(null)

      const result = await attachmentDownloader.downloadAttachment(
        'https://uploads.linear.app/12345/file.txt',
        '/workspace/attachments/attachment.tmp'
      )

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://uploads.linear.app/12345/file.txt',
        {
          headers: {
            'Authorization': 'Bearer api-token-456'
          }
        }
      )

      delete process.env.LINEAR_API_TOKEN
    })

    it('should handle download failures', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await attachmentDownloader.downloadAttachment(
        'https://uploads.linear.app/12345/missing.png',
        '/workspace/attachments/missing.png'
      )

      expect(result).toEqual({ success: false })
    })

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await attachmentDownloader.downloadAttachment(
        'https://uploads.linear.app/12345/file.png',
        '/workspace/attachments/file.png'
      )

      expect(result).toEqual({ success: false })
    })
  })

  describe('downloadIssueAttachments', () => {
    it('should download and categorize attachments correctly', async () => {
      const issue = new Issue({
        id: '123',
        identifier: 'ISSUE-123',
        title: 'Test Issue',
        description: `Here's an image: https://uploads.linear.app/12345/screenshot.png
                     And a JSONL file: https://uploads.linear.app/67890/data.jsonl`,
        comments: {
          nodes: [
            {
              body: 'Check this PDF: https://uploads.linear.app/11111/document.pdf',
              user: { name: 'User1' }
            }
          ]
        }
      })

      // Mock successful downloads
      const mockImageBuffer = Buffer.from('image-data')
      const mockJsonlBuffer = Buffer.from('jsonl-data')
      const mockPdfBuffer = Buffer.from('pdf-data')
      
      fetch
        .mockResolvedValueOnce({
          ok: true,
          buffer: vi.fn().mockResolvedValue(mockImageBuffer)
        })
        .mockResolvedValueOnce({
          ok: true,
          buffer: vi.fn().mockResolvedValue(mockJsonlBuffer)
        })
        .mockResolvedValueOnce({
          ok: true,
          buffer: vi.fn().mockResolvedValue(mockPdfBuffer)
        })

      fileTypeFromBuffer
        .mockResolvedValueOnce({ ext: 'png', mime: 'image/png' })
        .mockResolvedValueOnce(null) // JSONL - unknown type
        .mockResolvedValueOnce({ ext: 'pdf', mime: 'application/pdf' })

      const result = await attachmentDownloader.downloadIssueAttachments(issue, '/workspace')

      expect(result.downloaded).toBe(3)
      expect(result.imagesDownloaded).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
      
      expect(Object.keys(result.imageMap)).toHaveLength(1)
      expect(Object.keys(result.attachmentMap)).toHaveLength(2)
      
      expect(result.imageMap['https://uploads.linear.app/12345/screenshot.png']).toContain('image_1.png')
      expect(result.attachmentMap['https://uploads.linear.app/67890/data.jsonl']).toContain('attachment_2.jsonl')
      expect(result.attachmentMap['https://uploads.linear.app/11111/document.pdf']).toContain('attachment_3.pdf')
    })

    it('should handle failed downloads gracefully', async () => {
      const issue = new Issue({
        id: '123',
        identifier: 'ISSUE-123',
        title: 'Test Issue',
        description: `Image 1: https://uploads.linear.app/12345/image1.png
                     Image 2: https://uploads.linear.app/67890/image2.png`,
      })

      // First download succeeds, second fails
      fetch
        .mockResolvedValueOnce({
          ok: true,
          buffer: vi.fn().mockResolvedValue(Buffer.from('data'))
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })

      fileTypeFromBuffer.mockResolvedValueOnce({ ext: 'png', mime: 'image/png' })

      const result = await attachmentDownloader.downloadIssueAttachments(issue, '/workspace')

      expect(result.downloaded).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.totalFound).toBe(2)
    })

    it('should respect attachment limit', async () => {
      const urls = Array(15).fill(null).map((_, i) => 
        `https://uploads.linear.app/${i}/file${i}.pdf`
      )
      
      const issue = new Issue({
        id: '123',
        identifier: 'ISSUE-123',
        title: 'Test Issue',
        description: urls.join('\n'),
      })

      // Mock successful downloads
      const mockBuffer = Buffer.from('data')
      fetch.mockResolvedValue({
        ok: true,
        buffer: vi.fn().mockResolvedValue(mockBuffer)
      })
      fileTypeFromBuffer.mockResolvedValue({ ext: 'pdf', mime: 'application/pdf' })

      const result = await attachmentDownloader.downloadIssueAttachments(issue, '/workspace', 10)

      expect(result.downloaded).toBe(10)
      expect(result.skipped).toBe(5)
      expect(result.totalFound).toBe(15)
    })
  })

  describe('generateAttachmentManifest', () => {
    it('should generate manifest with both images and other attachments', () => {
      const downloadResult = {
        imageMap: {
          'https://uploads.linear.app/12345/image.png': '/home/user/.linearsecretagent/workspace/attachments/image_1.png'
        },
        attachmentMap: {
          'https://uploads.linear.app/67890/data.jsonl': '/home/user/.linearsecretagent/workspace/attachments/attachment_2.jsonl',
          'https://uploads.linear.app/11111/doc.pdf': '/home/user/.linearsecretagent/workspace/attachments/attachment_3.pdf'
        },
        totalFound: 3,
        downloaded: 3,
        imagesDownloaded: 1,
        skipped: 0,
        failed: 0
      }

      const manifest = attachmentDownloader.generateAttachmentManifest(downloadResult)

      expect(manifest).toContain('Downloaded Attachments')
      expect(manifest).toContain('Found 3 attachments. Downloaded 3 (including 1 images)')
      expect(manifest).toContain('### Images')
      expect(manifest).toContain('image_1.png')
      expect(manifest).toContain('### Other Attachments')
      expect(manifest).toContain('attachment_2.jsonl')
      expect(manifest).toContain('attachment_3.pdf')
    })

    it('should include failure warning when downloads fail', () => {
      const downloadResult = {
        imageMap: {},
        attachmentMap: {},
        totalFound: 5,
        downloaded: 2,
        imagesDownloaded: 0,
        skipped: 0,
        failed: 3
      }

      const manifest = attachmentDownloader.generateAttachmentManifest(downloadResult)

      expect(manifest).toContain('failed to download 3')
      expect(manifest).toContain('Some attachments failed to download')
      expect(manifest).toContain('authentication issues or the files being unavailable')
    })

    it('should handle no attachments found', () => {
      const downloadResult = {
        imageMap: {},
        attachmentMap: {},
        totalFound: 0,
        downloaded: 0,
        imagesDownloaded: 0,
        skipped: 0,
        failed: 0
      }

      const manifest = attachmentDownloader.generateAttachmentManifest(downloadResult)

      expect(manifest).toContain('No attachments were found in this issue')
    })
  })
})