import { jest } from '@jest/globals';

// Mock node-fetch before importing ImageDownloader
jest.unstable_mockModule('node-fetch', () => ({
  default: jest.fn()
}));

// Import modules after mocking
const fetch = (await import('node-fetch')).default;
const { ImageDownloader } = await import('../../../src/utils/ImageDownloader.mjs');
const { Issue } = await import('../../../src/core/Issue.mjs');

describe('ImageDownloader', () => {
  let imageDownloader;
  let mockLinearClient;
  let mockFileSystem;
  let mockOAuthHelper;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    fetch.mockClear();

    // Create mock dependencies
    mockLinearClient = {
      viewer: jest.fn().mockResolvedValue({ id: 'user-123', name: 'Test User' })
    };

    mockFileSystem = {
      ensureDir: jest.fn().mockResolvedValue(undefined),
      existsSync: jest.fn().mockReturnValue(false),
      writeFile: jest.fn().mockResolvedValue(undefined)
    };

    mockOAuthHelper = {
      hasValidToken: jest.fn().mockResolvedValue(true),
      getAccessToken: jest.fn().mockResolvedValue('oauth-token-123')
    };

    imageDownloader = new ImageDownloader(mockLinearClient, mockFileSystem, mockOAuthHelper);
  });

  describe('extractAttachmentUrls', () => {
    it('should separate image URLs from other attachment URLs', () => {
      const text = `
        Here is an image: https://uploads.linear.app/12345/image1.png
        And a JSON file: https://uploads.linear.app/67890/data.jsonl
        Another image: https://uploads.linear.app/abc/photo.jpg
        A PDF: https://uploads.linear.app/def/document.pdf
      `;

      const result = imageDownloader.extractAttachmentUrls(text);

      expect(result.imageUrls).toHaveLength(2);
      expect(result.imageUrls).toContain('https://uploads.linear.app/12345/image1.png');
      expect(result.imageUrls).toContain('https://uploads.linear.app/abc/photo.jpg');
      
      expect(result.otherAttachmentUrls).toHaveLength(2);
      expect(result.otherAttachmentUrls).toContain('https://uploads.linear.app/67890/data.jsonl');
      expect(result.otherAttachmentUrls).toContain('https://uploads.linear.app/def/document.pdf');
    });

    it('should handle various image extensions', () => {
      const text = `
        https://uploads.linear.app/1/image.jpg
        https://uploads.linear.app/2/image.jpeg
        https://uploads.linear.app/3/image.png
        https://uploads.linear.app/4/image.gif
        https://uploads.linear.app/5/image.webp
        https://uploads.linear.app/6/image.svg
        https://uploads.linear.app/7/image.bmp
      `;

      const result = imageDownloader.extractAttachmentUrls(text);

      expect(result.imageUrls).toHaveLength(7);
      expect(result.otherAttachmentUrls).toHaveLength(0);
    });

    it('should be case-insensitive for extensions', () => {
      const text = `
        https://uploads.linear.app/1/image.PNG
        https://uploads.linear.app/2/image.JpG
        https://uploads.linear.app/3/data.JSONL
      `;

      const result = imageDownloader.extractAttachmentUrls(text);

      expect(result.imageUrls).toHaveLength(2);
      expect(result.otherAttachmentUrls).toHaveLength(1);
    });

    it('should return empty arrays for null or empty text', () => {
      expect(imageDownloader.extractAttachmentUrls(null)).toEqual({ imageUrls: [], otherAttachmentUrls: [] });
      expect(imageDownloader.extractAttachmentUrls('')).toEqual({ imageUrls: [], otherAttachmentUrls: [] });
      expect(imageDownloader.extractAttachmentUrls(undefined)).toEqual({ imageUrls: [], otherAttachmentUrls: [] });
    });
  });

  describe('extractImageUrls (deprecated)', () => {
    it('should extract Linear upload URLs from text', () => {
      const text = `
        Here is some text with an image:
        https://uploads.linear.app/12345/image1.png
        And another one: https://uploads.linear.app/67890/image2.jpg
        Not a Linear image: https://example.com/image.png
      `;

      const urls = imageDownloader.extractImageUrls(text);

      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://uploads.linear.app/12345/image1.png');
      expect(urls).toContain('https://uploads.linear.app/67890/image2.jpg');
    });

    it('should return empty array for null or empty text', () => {
      expect(imageDownloader.extractImageUrls(null)).toEqual([]);
      expect(imageDownloader.extractImageUrls('')).toEqual([]);
      expect(imageDownloader.extractImageUrls(undefined)).toEqual([]);
    });

    it('should remove duplicate URLs', () => {
      const text = `
        https://uploads.linear.app/12345/image.png
        https://uploads.linear.app/12345/image.png
        https://uploads.linear.app/12345/image.png
      `;

      const urls = imageDownloader.extractImageUrls(text);
      expect(urls).toHaveLength(1);
      expect(urls[0]).toBe('https://uploads.linear.app/12345/image.png');
    });

    it('should handle URLs in markdown format', () => {
      const text = `
        ![Screenshot](https://uploads.linear.app/12345/screenshot.png)
        [Link](https://uploads.linear.app/67890/file.pdf)
      `;

      const urls = imageDownloader.extractImageUrls(text);
      expect(urls).toHaveLength(1); // Only the PNG is an image
      expect(urls[0]).toBe('https://uploads.linear.app/12345/screenshot.png');
    });
  });

  describe('downloadImage', () => {
    it('should download image with OAuth token', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: jest.fn().mockResolvedValue(mockBuffer)
      });

      const result = await imageDownloader.downloadImage(
        'https://uploads.linear.app/12345/image.png',
        '/workspace/images/image.png'
      );

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://uploads.linear.app/12345/image.png',
        {
          headers: {
            'Authorization': 'Bearer oauth-token-123'
          }
        }
      );
      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith('/workspace/images');
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/workspace/images/image.png', mockBuffer);
    });

    it('should fall back to API token when OAuth is not available', async () => {
      mockOAuthHelper.hasValidToken.mockResolvedValue(false);
      process.env.LINEAR_API_TOKEN = 'api-token-456';

      const mockBuffer = Buffer.from('fake-image-data');
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: jest.fn().mockResolvedValue(mockBuffer)
      });

      const result = await imageDownloader.downloadImage(
        'https://uploads.linear.app/12345/image.png',
        '/workspace/images/image.png'
      );

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://uploads.linear.app/12345/image.png',
        {
          headers: {
            'Authorization': 'api-token-456'
          }
        }
      );

      delete process.env.LINEAR_API_TOKEN;
    });

    it('should handle download failures', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await imageDownloader.downloadImage(
        'https://uploads.linear.app/12345/missing.png',
        '/workspace/images/missing.png'
      );

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await imageDownloader.downloadImage(
        'https://uploads.linear.app/12345/image.png',
        '/workspace/images/image.png'
      );

      expect(result).toBe(false);
    });

    it('should throw error when no authentication is available', async () => {
      mockOAuthHelper.hasValidToken.mockResolvedValue(false);
      // Ensure no env variables are set
      delete process.env.LINEAR_API_TOKEN;
      delete process.env.LINEAR_PERSONAL_ACCESS_TOKEN;

      const result = await imageDownloader.downloadImage(
        'https://uploads.linear.app/12345/image.png',
        '/workspace/images/image.png'
      );

      expect(result).toBe(false);
    });
  });

  describe('downloadIssueAttachments', () => {
    it('should download both images and other attachments', async () => {
      const issue = new Issue({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Image: https://uploads.linear.app/12345/screenshot.png JSON: https://uploads.linear.app/67890/data.jsonl',
        comments: { nodes: [] }
      });

      const mockBuffer = Buffer.from('fake-file-data');
      fetch.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: jest.fn().mockResolvedValue(mockBuffer)
      }));

      const result = await imageDownloader.downloadIssueAttachments(issue, '/workspace');

      expect(result.imagesDownloaded).toBe(1);
      expect(result.otherAttachmentsDownloaded).toBe(1);
      expect(result.totalImagesFound).toBe(1);
      expect(result.totalOtherAttachmentsFound).toBe(1);
      expect(result.failedDownloads).toHaveLength(0);
      
      expect(Object.keys(result.imageMap)).toHaveLength(1);
      expect(Object.keys(result.otherAttachmentMap)).toHaveLength(1);
      
      expect(result.imageMap['https://uploads.linear.app/12345/screenshot.png']).toMatch(/\.linear-attachments\/image_1\.png$/);
      expect(result.otherAttachmentMap['https://uploads.linear.app/67890/data.jsonl']).toMatch(/\.linear-attachments\/attachment_1\.jsonl$/);
    });

    it('should handle download failures gracefully and continue', async () => {
      const issue = new Issue({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Image1: https://uploads.linear.app/1/image1.png Image2: https://uploads.linear.app/2/image2.png JSON: https://uploads.linear.app/3/data.jsonl',
        comments: { nodes: [] }
      });

      // First download succeeds, second fails, third succeeds
      fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          buffer: jest.fn().mockResolvedValue(Buffer.from('image1-data'))
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          buffer: jest.fn().mockResolvedValue(Buffer.from('json-data'))
        });

      const result = await imageDownloader.downloadIssueAttachments(issue, '/workspace');

      expect(result.totalImagesFound).toBe(2);
      expect(result.totalOtherAttachmentsFound).toBe(1);
      expect(result.imagesDownloaded).toBe(1);
      expect(result.otherAttachmentsDownloaded).toBe(1);
      expect(result.failedDownloads).toHaveLength(1);
      expect(result.failedDownloads[0]).toEqual({ 
        url: 'https://uploads.linear.app/2/image2.png', 
        type: 'image', 
        reason: 'Download failed' 
      });
    });

    it('should respect the image limit but download all other attachments', async () => {
      // Create an issue with 15 images and 5 other attachments
      const imageUrls = [];
      for (let i = 1; i <= 15; i++) {
        imageUrls.push(`https://uploads.linear.app/img${i}/image${i}.png`);
      }
      const otherUrls = [];
      for (let i = 1; i <= 5; i++) {
        otherUrls.push(`https://uploads.linear.app/file${i}/data${i}.jsonl`);
      }

      const issue = new Issue({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: [...imageUrls, ...otherUrls].join(' '),
        comments: { nodes: [] }
      });

      const mockBuffer = Buffer.from('fake-file-data');
      fetch.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: jest.fn().mockResolvedValue(mockBuffer)
      }));

      const result = await imageDownloader.downloadIssueAttachments(issue, '/workspace', 10);

      expect(result.totalImagesFound).toBe(15);
      expect(result.totalOtherAttachmentsFound).toBe(5);
      expect(result.imagesDownloaded).toBe(10); // Limited to 10
      expect(result.otherAttachmentsDownloaded).toBe(5); // All other attachments downloaded
      expect(result.imagesSkipped).toBe(5);
      expect(Object.keys(result.imageMap)).toHaveLength(10);
      expect(Object.keys(result.otherAttachmentMap)).toHaveLength(5);
    });
  });

  describe('downloadIssueImages (deprecated)', () => {
    it('should download images from issue description and comments', async () => {
      const issue = new Issue({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Check this screenshot: https://uploads.linear.app/12345/screenshot.png',
        comments: {
          nodes: [
            {
              id: 'comment-1',
              body: 'Here is another image: https://uploads.linear.app/67890/image.jpg',
              user: { name: 'User 1' }
            }
          ]
        }
      });

      const mockBuffer = Buffer.from('fake-image-data');
      fetch.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: jest.fn().mockResolvedValue(mockBuffer)
      }));

      const result = await imageDownloader.downloadIssueImages(issue, '/workspace');

      expect(result.downloaded).toBe(2);
      expect(result.totalFound).toBe(2);
      expect(result.skipped).toBe(0);
      expect(Object.keys(result.imageMap)).toHaveLength(2);
      expect(result.imageMap['https://uploads.linear.app/12345/screenshot.png']).toMatch(/\.linear-attachments\/image_1\.png$/);
      expect(result.imageMap['https://uploads.linear.app/67890/image.jpg']).toMatch(/\.linear-attachments\/image_2\.jpg$/);
    });

    it('should respect the 10 image limit', async () => {
      // Create an issue with 15 image URLs
      const imageUrls = [];
      for (let i = 1; i <= 15; i++) {
        imageUrls.push(`https://uploads.linear.app/${i}/image${i}.png`);
      }

      const issue = new Issue({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: imageUrls.join(' '),
        comments: { nodes: [] }
      });

      const mockBuffer = Buffer.from('fake-image-data');
      fetch.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        buffer: jest.fn().mockResolvedValue(mockBuffer)
      }));

      const result = await imageDownloader.downloadIssueImages(issue, '/workspace', 10);

      expect(result.totalFound).toBe(15);
      expect(result.downloaded).toBe(10);
      expect(result.skipped).toBe(5);
      expect(Object.keys(result.imageMap)).toHaveLength(10);
    });

    it('should handle issues with no images', async () => {
      const issue = new Issue({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'No images here',
        comments: { nodes: [] }
      });

      const result = await imageDownloader.downloadIssueImages(issue, '/workspace');

      expect(result.downloaded).toBe(0);
      expect(result.totalFound).toBe(0);
      expect(result.skipped).toBe(0);
      expect(Object.keys(result.imageMap)).toHaveLength(0);
    });

    it('should handle download failures gracefully', async () => {
      const issue = new Issue({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Image 1: https://uploads.linear.app/1/image1.png Image 2: https://uploads.linear.app/2/image2.png',
        comments: { nodes: [] }
      });

      // First download succeeds, second fails
      fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          buffer: jest.fn().mockResolvedValue(Buffer.from('image1-data'))
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });

      const result = await imageDownloader.downloadIssueImages(issue, '/workspace');

      expect(result.totalFound).toBe(2);
      expect(result.downloaded).toBe(1);
      expect(result.skipped).toBe(0);
      expect(Object.keys(result.imageMap)).toHaveLength(1);
    });
  });

  describe('generateAttachmentManifest', () => {
    it('should generate manifest for images and other attachments', () => {
      const downloadResult = {
        imageMap: {
          'https://uploads.linear.app/12345/screenshot.png': '/workspace/.linear-attachments/image_1.png'
        },
        otherAttachmentMap: {
          'https://uploads.linear.app/67890/data.jsonl': '/workspace/.linear-attachments/attachment_1.jsonl',
          'https://uploads.linear.app/abc/report.pdf': '/workspace/.linear-attachments/attachment_2.pdf'
        },
        totalImagesFound: 1,
        totalOtherAttachmentsFound: 2,
        imagesDownloaded: 1,
        otherAttachmentsDownloaded: 2,
        imagesSkipped: 0,
        failedDownloads: []
      };

      const manifest = imageDownloader.generateAttachmentManifest(downloadResult);

      expect(manifest).toContain('## Downloaded Attachments');
      expect(manifest).toContain('Found 1 image(s). Downloaded 1');
      expect(manifest).toContain('Found 2 other attachment(s). Downloaded 2');
      expect(manifest).toContain('### Images');
      expect(manifest).toContain('image_1.png');
      expect(manifest).toContain('### Other Attachments');
      expect(manifest).toContain('attachment_1.jsonl (JSON)');
      expect(manifest).toContain('attachment_2.pdf (PDF)');
    });

    it('should include warnings for failed downloads', () => {
      const downloadResult = {
        imageMap: {
          'https://uploads.linear.app/1/image1.png': '/workspace/.linear-attachments/image_1.png'
        },
        otherAttachmentMap: {},
        totalImagesFound: 3,
        totalOtherAttachmentsFound: 1,
        imagesDownloaded: 1,
        otherAttachmentsDownloaded: 0,
        imagesSkipped: 0,
        failedDownloads: [
          { url: 'https://uploads.linear.app/2/image2.png', type: 'image', reason: 'Download failed' },
          { url: 'https://uploads.linear.app/3/image3.png', type: 'image', reason: 'Download failed' },
          { url: 'https://uploads.linear.app/4/data.csv', type: 'attachment', reason: 'Download failed' }
        ]
      };

      const manifest = imageDownloader.generateAttachmentManifest(downloadResult);

      expect(manifest).toContain('⚠️ Failed to download 3 file(s)');
      expect(manifest).toContain('### Failed Downloads');
      expect(manifest).toContain('The agent will continue processing but may not have complete context');
    });

    it('should handle case with no attachments', () => {
      const downloadResult = {
        imageMap: {},
        otherAttachmentMap: {},
        totalImagesFound: 0,
        totalOtherAttachmentsFound: 0,
        imagesDownloaded: 0,
        otherAttachmentsDownloaded: 0,
        imagesSkipped: 0,
        failedDownloads: []
      };

      const manifest = imageDownloader.generateAttachmentManifest(downloadResult);

      expect(manifest).toContain('No attachments were found in this issue');
    });
  });

  describe('generateImageManifest (deprecated)', () => {
    it('should generate manifest for downloaded images', () => {
      const downloadResult = {
        imageMap: {
          'https://uploads.linear.app/12345/screenshot.png': '/workspace/.linear-images/image_1.png',
          'https://uploads.linear.app/67890/diagram.jpg': '/workspace/.linear-images/image_2.jpg'
        },
        totalFound: 2,
        downloaded: 2,
        skipped: 0
      };

      const manifest = imageDownloader.generateImageManifest(downloadResult);

      expect(manifest).toContain('## Downloaded Attachments');
      expect(manifest).toContain('Found 2 image(s). Downloaded 2');
      expect(manifest).toContain('image_1.png');
      expect(manifest).toContain('image_2.jpg');
      expect(manifest).toContain('You can use the Read tool to view these images');
    });

    it('should mention skipped images in manifest', () => {
      const downloadResult = {
        imageMap: {
          'https://uploads.linear.app/1/image1.png': '/workspace/.linear-images/image_1.png',
          'https://uploads.linear.app/2/image2.png': '/workspace/.linear-images/image_2.png'
        },
        totalFound: 15,
        downloaded: 10,
        skipped: 5
      };

      const manifest = imageDownloader.generateImageManifest(downloadResult);

      expect(manifest).toContain('Found 15 image(s). Downloaded 10 (skipped 5 due to 10 image limit)');
    });

    it('should handle case with no images', () => {
      const downloadResult = {
        imageMap: {},
        totalFound: 0,
        downloaded: 0,
        skipped: 0
      };

      const manifest = imageDownloader.generateImageManifest(downloadResult);

      expect(manifest).toContain('No attachments were found in this issue');
    });
  });
});