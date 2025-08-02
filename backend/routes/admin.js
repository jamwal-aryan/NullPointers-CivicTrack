const express = require('express');
const router = express.Router();

// Import controllers and middleware
const AdminController = require('../controllers/adminController');
const FlagValidation = require('../middleware/flagValidation');
const { requireRole } = require('../middleware/auth');

/**
 * Admin Routes - All routes require admin role
 * These routes handle content moderation and user management
 */

/**
 * @route   GET /api/admin/flagged-issues
 * @desc    Get flagged issues for review
 * @access  Private - Admin only
 * @query   {status?, limit?, offset?, flagType?, sortBy?, sortOrder?}
 */
router.get('/flagged-issues',
  FlagValidation.sanitizeInput,
  FlagValidation.getFlaggedIssues(),
  requireRole(['admin']),
  AdminController.getFlaggedIssues
);

/**
 * @route   POST /api/admin/issues/:id/review
 * @desc    Review a flagged issue (approve, reject, or delete)
 * @access  Private - Admin only
 * @params  {id} - Issue UUID
 * @body    {action, reason?}
 */
router.post('/issues/:id/review',
  FlagValidation.sanitizeInput,
  FlagValidation.reviewFlag(),
  requireRole(['admin']),
  AdminController.reviewFlaggedIssue
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get platform analytics and statistics
 * @access  Private - Admin only
 * @query   {startDate?, endDate?, category?, status?}
 */
router.get('/analytics',
  FlagValidation.sanitizeInput,
  FlagValidation.getAnalytics(),
  requireRole(['admin']),
  AdminController.getAnalytics
);

/**
 * @route   GET /api/admin/users
 * @desc    Get user management data
 * @access  Private - Admin only
 * @query   {limit?, offset?, banned?, role?, search?}
 */
router.get('/users',
  FlagValidation.sanitizeInput,
  FlagValidation.getUsers(),
  requireRole(['admin']),
  AdminController.getUsers
);

/**
 * @route   POST /api/admin/users/:id/ban
 * @desc    Ban a user for policy violations
 * @access  Private - Admin only
 * @params  {id} - User UUID
 * @body    {reason?}
 */
router.post('/users/:id/ban',
  FlagValidation.sanitizeInput,
  FlagValidation.banUser(),
  requireRole(['admin']),
  AdminController.banUser
);

/**
 * @route   POST /api/admin/users/:id/unban
 * @desc    Unban a previously banned user
 * @access  Private - Admin only
 * @params  {id} - User UUID
 */
router.post('/users/:id/unban',
  FlagValidation.sanitizeInput,
  requireRole(['admin']),
  AdminController.unbanUser
);

/**
 * @route   GET /api/admin/logs
 * @desc    Get admin activity logs for audit purposes
 * @access  Private - Admin only
 * @query   {adminId?, action?, targetType?, startDate?, endDate?, limit?, offset?, sortBy?, sortOrder?}
 */
router.get('/logs',
  FlagValidation.sanitizeInput,
  FlagValidation.getAdminLogs(),
  requireRole(['admin']),
  AdminController.getAdminLogs
);

/**
 * @route   GET /api/admin/activity-stats
 * @desc    Get admin activity statistics
 * @access  Private - Admin only
 * @query   {adminId?, startDate?, endDate?}
 */
router.get('/activity-stats',
  FlagValidation.sanitizeInput,
  FlagValidation.getAdminStats(),
  requireRole(['admin']),
  AdminController.getAdminActivityStats
);

/**
 * Error handling middleware for admin routes
 */
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Generic error response
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;