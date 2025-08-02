const express = require('express');
const path = require('path');
const router = express.Router();

// Import services and middleware
const fileService = require('../services/fileService');
const { optionalAuth, requireRole } = require('../middleware/auth');

/**
 * File Management Routes
 * Handles file serving, deletion, and access control
 */

/**
 * @route   GET /api/files/*
 * @desc    Serve uploaded files with access control
 * @access  Public (with basic validation)
 * @params  {*} - File path relative to uploads directory
 */
router.get('/*', optionalAuth, async (req, res) => {
  try {
    const relativePath = req.params[0];
    
    // Validate file access
    const hasAccess = await fileService.validateFileAccess(relativePath, req.user);
    
    if (!hasAccess) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found or access denied',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Get file information
    const fileInfo = await fileService.getFileInfo(relativePath);
    
    if (!fileInfo) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Set appropriate headers
    const extension = path.extname(relativePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileInfo.size);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Last-Modified', fileInfo.modified.toUTCString());
    
    // Send file
    res.sendFile(fileInfo.fullPath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              code: 'FILE_SERVE_ERROR',
              message: 'Error serving file',
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    });
    
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route   DELETE /api/files/*
 * @desc    Delete uploaded files (admin only)
 * @access  Private - Admin only
 * @params  {*} - File path relative to uploads directory
 */
router.delete('/*', requireRole(['admin']), async (req, res) => {
  try {
    const relativePath = req.params[0];
    
    // Validate file exists
    const fileExists = await fileService.fileExists(relativePath);
    
    if (!fileExists) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Delete file
    const deleted = await fileService.deleteFile(relativePath);
    
    if (!deleted) {
      return res.status(500).json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete file',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({
      message: 'File deleted successfully',
      path: relativePath,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route   POST /api/files/cleanup
 * @desc    Clean up old files (admin only)
 * @access  Private - Admin only
 * @body    {daysOld?: number} - Delete files older than this many days (default: 30)
 */
router.post('/cleanup', requireRole(['admin']), async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    
    // Validate input
    if (typeof daysOld !== 'number' || daysOld < 1) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'daysOld must be a positive number',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Perform cleanup
    const results = await fileService.cleanupOldFiles(daysOld);
    
    res.json({
      message: 'Cleanup completed',
      results: {
        filesDeleted: results.deleted,
        errors: results.errors,
        daysOld: daysOld
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('File cleanup error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route   GET /api/files/info/*
 * @desc    Get file information (admin only)
 * @access  Private - Admin only
 * @params  {*} - File path relative to uploads directory
 */
router.get('/info/*', requireRole(['admin']), async (req, res) => {
  try {
    const relativePath = req.params[0];
    
    // Get file information
    const fileInfo = await fileService.getFileInfo(relativePath);
    
    if (!fileInfo) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({
      file: {
        path: fileInfo.path,
        size: fileInfo.size,
        created: fileInfo.created,
        modified: fileInfo.modified,
        isFile: fileInfo.isFile,
        publicUrl: fileService.generatePublicUrl(relativePath)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Error handling middleware for file routes
 */
router.use((error, req, res, next) => {
  console.error('File route error:', error);
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;