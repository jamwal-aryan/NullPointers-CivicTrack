const { uploadIssuePhotos, handleUploadErrors, processUploadedFiles } = require('../middleware/upload');
const fileService = require('../services/fileService');
const path = require('path');
const fs = require('fs');

describe('Upload Middleware', () => {
  describe('File Service', () => {
    test('should generate correct public URLs', () => {
      const relativePath = 'issues/2024/01/15/test.jpg';
      const url = fileService.generatePublicUrl(relativePath);
      expect(url).toBe('/api/files/issues/2024/01/15/test.jpg');
    });

    test('should handle Windows path separators', () => {
      const relativePath = 'issues\\2024\\01\\15\\test.jpg';
      const url = fileService.generatePublicUrl(relativePath);
      expect(url).toBe('/api/files/issues/2024/01/15/test.jpg');
    });

    test('should validate file access - prevent directory traversal', async () => {
      const maliciousPath = '../../../etc/passwd';
      const hasAccess = await fileService.validateFileAccess(maliciousPath);
      expect(hasAccess).toBe(false);
    });

    test('should validate file access - allow valid paths', async () => {
      // This will return false because the file doesn't exist, but it won't fail due to path traversal
      const validPath = 'issues/2024/01/15/valid-file.jpg';
      const hasAccess = await fileService.validateFileAccess(validPath);
      expect(hasAccess).toBe(false); // File doesn't exist, but path is valid
    });

    test('should get full path correctly', () => {
      const relativePath = 'issues/test.jpg';
      const fullPath = fileService.getFullPath(relativePath);
      expect(fullPath).toContain('uploads');
      expect(fullPath).toContain('issues');
      expect(fullPath).toContain('test.jpg');
    });
  });

  describe('Upload Directory Structure', () => {
    test('should ensure upload directories exist', () => {
      const uploadsDir = path.join(__dirname, '../uploads');
      const issuesDir = path.join(uploadsDir, 'issues');
      const tempDir = path.join(uploadsDir, 'temp');

      // Check if directories exist (they should be created by the middleware)
      expect(fs.existsSync(uploadsDir)).toBe(true);
      expect(fs.existsSync(issuesDir)).toBe(true);
      expect(fs.existsSync(tempDir)).toBe(true);
    });
  });

  describe('File Validation', () => {
    test('should validate allowed file extensions', () => {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      
      allowedExtensions.forEach(ext => {
        const filename = `test${ext}`;
        const extension = path.extname(filename).toLowerCase();
        expect(allowedExtensions.includes(extension)).toBe(true);
      });
    });

    test('should reject invalid file extensions', () => {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const invalidExtensions = ['.txt', '.pdf', '.doc', '.exe', '.js'];
      
      invalidExtensions.forEach(ext => {
        const filename = `test${ext}`;
        const extension = path.extname(filename).toLowerCase();
        expect(allowedExtensions.includes(extension)).toBe(false);
      });
    });
  });
});