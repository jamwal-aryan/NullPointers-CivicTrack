const fs = require('fs').promises;
const path = require('path');

/**
 * File Service for managing uploaded files
 * Handles file operations, optimization, and cleanup
 */

class FileService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
    this.issuesDir = path.join(this.uploadsDir, 'issues');
  }

  /**
   * Get file path from relative path
   * @param {string} relativePath - Relative path from uploads directory
   * @returns {string} Full file path
   */
  getFullPath(relativePath) {
    return path.join(this.uploadsDir, relativePath);
  }

  /**
   * Check if file exists
   * @param {string} relativePath - Relative path from uploads directory
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(relativePath) {
    try {
      const fullPath = this.getFullPath(relativePath);
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete a file
   * @param {string} relativePath - Relative path from uploads directory
   * @returns {Promise<boolean>} True if file was deleted successfully
   */
  async deleteFile(relativePath) {
    try {
      const fullPath = this.getFullPath(relativePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Delete multiple files
   * @param {string[]} relativePaths - Array of relative paths
   * @returns {Promise<{success: string[], failed: string[]}>} Results of deletion attempts
   */
  async deleteFiles(relativePaths) {
    const results = {
      success: [],
      failed: []
    };

    for (const relativePath of relativePaths) {
      const deleted = await this.deleteFile(relativePath);
      if (deleted) {
        results.success.push(relativePath);
      } else {
        results.failed.push(relativePath);
      }
    }

    return results;
  }

  /**
   * Get file information
   * @param {string} relativePath - Relative path from uploads directory
   * @returns {Promise<Object|null>} File information or null if not found
   */
  async getFileInfo(relativePath) {
    try {
      const fullPath = this.getFullPath(relativePath);
      const stats = await fs.stat(fullPath);
      
      return {
        path: relativePath,
        fullPath: fullPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Basic image optimization using sharp (if available)
   * Note: This is a placeholder for future enhancement
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {Object} options - Optimization options
   * @returns {Promise<boolean>} True if optimization succeeded
   */
  async optimizeImage(inputPath, outputPath, options = {}) {
    try {
      // For now, just copy the file since sharp is not installed
      // This can be enhanced later with actual image optimization
      const inputData = await fs.readFile(inputPath);
      await fs.writeFile(outputPath, inputData);
      return true;
    } catch (error) {
      console.error('Error optimizing image:', error);
      return false;
    }
  }

  /**
   * Clean up old files (for maintenance)
   * @param {number} daysOld - Delete files older than this many days
   * @returns {Promise<{deleted: number, errors: number}>} Cleanup results
   */
  async cleanupOldFiles(daysOld = 30) {
    const results = {
      deleted: 0,
      errors: 0
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const walkDir = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            try {
              const stats = await fs.stat(fullPath);
              if (stats.mtime < cutoffDate) {
                await fs.unlink(fullPath);
                results.deleted++;
              }
            } catch (error) {
              console.error(`Error processing file ${fullPath}:`, error);
              results.errors++;
            }
          }
        }
      };

      await walkDir(this.issuesDir);
    } catch (error) {
      console.error('Error during cleanup:', error);
      results.errors++;
    }

    return results;
  }

  /**
   * Generate public URL for file access
   * @param {string} relativePath - Relative path from uploads directory
   * @returns {string} Public URL for file access
   */
  generatePublicUrl(relativePath) {
    // This will be used by the file serving endpoint
    return `/api/files/${relativePath.replace(/\\/g, '/')}`;
  }

  /**
   * Validate file access permissions
   * @param {string} relativePath - Relative path from uploads directory
   * @param {Object} user - User object (optional for anonymous access)
   * @returns {Promise<boolean>} True if access is allowed
   */
  async validateFileAccess(relativePath, user = null) {
    // Basic validation - ensure file is within uploads directory
    const fullPath = this.getFullPath(relativePath);
    const normalizedPath = path.normalize(fullPath);
    const normalizedUploadsDir = path.normalize(this.uploadsDir);
    
    // Prevent directory traversal attacks
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return false;
    }

    // Check if file exists
    const exists = await this.fileExists(relativePath);
    if (!exists) {
      return false;
    }

    // For now, allow access to all existing files
    // This can be enhanced with more sophisticated access control
    return true;
  }
}

module.exports = new FileService();