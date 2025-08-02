const express = require('express');
const router = express.Router();

// Import controllers and middleware
const IssueController = require('../controllers/issueController');
const IssueValidation = require('../middleware/issueValidation');
const FlagValidation = require('../middleware/flagValidation');
const LocationMiddleware = require('../middleware/location');
const { optionalAuth, requireRole } = require('../middleware/auth');
const { uploadIssuePhotos, handleUploadErrors, processUploadedFiles } = require('../middleware/upload');

/**
 * Issue Management Routes
 * All routes handle location-based access control and proper error responses
 */

/**
 * @route   POST /api/issues
 * @desc    Create a new issue report with photo uploads
 * @access  Public (supports both anonymous and authenticated users)
 * @body    {title, description, category, latitude, longitude, address?, isAnonymous?, userLat?, userLng?}
 * @files   photos[] - Up to 3 image files (JPEG, PNG, WebP, max 5MB each)
 */
router.post('/',
  uploadIssuePhotos, // Handle file uploads first
  handleUploadErrors, // Handle upload errors
  processUploadedFiles, // Process uploaded files
  IssueValidation.sanitizeInput,
  IssueValidation.createIssue(),
  LocationMiddleware.validateIssueLocation,
  optionalAuth, // Allows both anonymous and authenticated users
  IssueController.createIssue
);

/**
 * @route   GET /api/issues
 * @desc    Get issues with geospatial and category filtering
 * @access  Public (supports both anonymous and authenticated users)
 * @query   {lat, lng, radius?, status?, category?, limit?, offset?}
 */
router.get('/',
  IssueValidation.sanitizeInput,
  IssueValidation.getIssues(),
  LocationMiddleware.validateRadius,
  optionalAuth, // Allows both anonymous and authenticated users
  IssueController.getIssues
);

/**
 * @route   GET /api/issues/:id
 * @desc    Get issue details by ID with location-based access control
 * @access  Public (supports both anonymous and authenticated users)
 * @params  {id} - Issue UUID
 * @query   {userLat, userLng} - User location for access control and distance calculation
 */
router.get('/:id',
  IssueValidation.sanitizeInput,
  IssueValidation.getIssueById(),
  IssueValidation.userLocation(),
  LocationMiddleware.enforceRadiusAccess(5), // 5km max access radius
  optionalAuth, // Allows both anonymous and authenticated users
  IssueController.getIssueById
);

/**
 * @route   GET /api/issues/:id/history
 * @desc    Get status change history for an issue
 * @access  Public (supports both anonymous and authenticated users)
 * @params  {id} - Issue UUID
 * @query   {userLat, userLng} - User location for access control
 */
router.get('/:id/history',
  IssueValidation.sanitizeInput,
  IssueValidation.getIssueById(),
  IssueValidation.userLocation(),
  LocationMiddleware.enforceRadiusAccess(5), // 5km max access radius
  optionalAuth, // Allows both anonymous and authenticated users
  IssueController.getIssueHistory
);

/**
 * @route   PATCH /api/issues/:id/status
 * @desc    Update issue status (authorities and admins only)
 * @access  Private - Requires authority or admin role
 * @params  {id} - Issue UUID
 * @body    {status, comment}
 * @query   {userLat, userLng} - User location for access control
 */
router.patch('/:id/status',
  IssueValidation.sanitizeInput,
  IssueValidation.updateIssueStatus(),
  IssueValidation.userLocation(),
  LocationMiddleware.enforceRadiusAccess(5), // 5km max access radius
  requireRole(['authority', 'admin']), // Only authorities and admins can update status
  IssueController.updateIssueStatus
);

/**
 * @route   POST /api/issues/:id/flag
 * @desc    Flag an issue for inappropriate content
 * @access  Public (supports both anonymous and authenticated users)
 * @params  {id} - Issue UUID
 * @body    {reason, flag_type?}
 * @query   {userLat, userLng} - User location for access control
 */
router.post('/:id/flag',
  FlagValidation.sanitizeInput,
  FlagValidation.flagIssue(),
  IssueValidation.userLocation(),
  LocationMiddleware.enforceRadiusAccess(5), // 5km max access radius
  optionalAuth, // Allows both anonymous and authenticated users
  IssueController.flagIssue
);

/**
 * Error handling middleware for issue routes
 */
router.use((error, req, res, next) => {
  console.error('Issue route error:', error);
  
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
        message: 'Invalid issue ID format',
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