const { body, query, param } = require('express-validator');

/**
 * Validation middleware for issue-related endpoints
 */
class IssueValidation {
  
  /**
   * Validation rules for creating a new issue
   */
  static createIssue() {
    return [
      body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters')
        .matches(/^[a-zA-Z0-9\s\-.,!?()]+$/)
        .withMessage('Title contains invalid characters'),
      
      body('description')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
      
      body('category')
        .isIn(['roads', 'lighting', 'water', 'cleanliness', 'safety', 'obstructions'])
        .withMessage('Invalid category. Must be one of: roads, lighting, water, cleanliness, safety, obstructions'),
      
      body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be a valid number between -90 and 90'),
      
      body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be a valid number between -180 and 180'),
      
      body('address')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Address must not exceed 500 characters'),
      
      body('photos')
        .optional()
        .isArray({ max: 3 })
        .withMessage('Maximum 3 photos allowed')
        .custom((photos) => {
          if (photos && photos.length > 0) {
            for (const photo of photos) {
              if (typeof photo !== 'string' || photo.length > 500) {
                throw new Error('Each photo URL must be a string with maximum 500 characters');
              }
            }
          }
          return true;
        }),
      
      body('isAnonymous')
        .optional()
        .isBoolean()
        .withMessage('isAnonymous must be a boolean value'),
      
      // Optional user location for distance validation
      body('userLat')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('User latitude must be a valid number between -90 and 90'),
      
      body('userLng')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('User longitude must be a valid number between -180 and 180')
    ];
  }
  
  /**
   * Validation rules for getting issues with filters
   */
  static getIssues() {
    return [
      query('lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be a valid number between -90 and 90'),
      
      query('lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be a valid number between -180 and 180'),
      
      query('radius')
        .optional()
        .isFloat({ min: 0.1, max: 5 })
        .withMessage('Radius must be between 0.1 and 5 kilometers'),
      
      query('status')
        .optional()
        .custom((value) => {
          if (value) {
            const statuses = Array.isArray(value) ? value : value.split(',');
            const validStatuses = ['reported', 'in_progress', 'resolved'];
            const invalidStatuses = statuses.filter(s => !validStatuses.includes(s.trim()));
            
            if (invalidStatuses.length > 0) {
              throw new Error(`Invalid status values: ${invalidStatuses.join(', ')}. Valid values are: ${validStatuses.join(', ')}`);
            }
          }
          return true;
        }),
      
      query('category')
        .optional()
        .custom((value) => {
          if (value) {
            const categories = Array.isArray(value) ? value : value.split(',');
            const validCategories = ['roads', 'lighting', 'water', 'cleanliness', 'safety', 'obstructions'];
            const invalidCategories = categories.filter(c => !validCategories.includes(c.trim()));
            
            if (invalidCategories.length > 0) {
              throw new Error(`Invalid category values: ${invalidCategories.join(', ')}. Valid values are: ${validCategories.join(', ')}`);
            }
          }
          return true;
        }),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be an integer between 1 and 100'),
      
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer')
    ];
  }
  
  /**
   * Validation rules for getting issue by ID
   */
  static getIssueById() {
    return [
      param('id')
        .isUUID()
        .withMessage('Issue ID must be a valid UUID'),
      
      // Optional user location for distance calculation
      query('userLat')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('User latitude must be a valid number between -90 and 90'),
      
      query('userLng')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('User longitude must be a valid number between -180 and 180')
    ];
  }
  
  /**
   * Validation rules for updating issue status
   */
  static updateIssueStatus() {
    return [
      param('id')
        .isUUID()
        .withMessage('Issue ID must be a valid UUID'),
      
      body('status')
        .isIn(['reported', 'in_progress', 'resolved'])
        .withMessage('Status must be one of: reported, in_progress, resolved'),
      
      body('comment')
        .trim()
        .isLength({ min: 5, max: 1000 })
        .withMessage('Comment must be between 5 and 1000 characters')
        .matches(/^[a-zA-Z0-9\s\-.,!?()'"]+$/)
        .withMessage('Comment contains invalid characters')
    ];
  }
  
  /**
   * Validation rules for user location parameters (used in multiple endpoints)
   */
  static userLocation() {
    return [
      query('userLat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('User latitude must be a valid number between -90 and 90'),
      
      query('userLng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('User longitude must be a valid number between -180 and 180')
    ];
  }
  
  /**
   * Custom validation for photo uploads
   * This will be used when file upload is implemented
   */
  static validatePhotos() {
    return [
      body('photos')
        .optional()
        .custom((value, { req }) => {
          // If files are uploaded via multer
          if (req.files && req.files.length > 3) {
            throw new Error('Maximum 3 photos allowed');
          }
          
          // If photo URLs are provided
          if (value && Array.isArray(value) && value.length > 3) {
            throw new Error('Maximum 3 photos allowed');
          }
          
          return true;
        })
    ];
  }
  
  /**
   * Sanitization middleware to clean input data
   */
  static sanitizeInput(req, res, next) {
    // Sanitize string fields
    const stringFields = ['title', 'description', 'address', 'comment'];
    
    stringFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Remove potentially harmful characters but keep basic punctuation
        req.body[field] = req.body[field]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      }
    });
    
    // Ensure numeric fields are properly typed
    const numericFields = ['latitude', 'longitude', 'userLat', 'userLng', 'radius', 'limit', 'offset'];
    
    numericFields.forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = parseFloat(req.body[field]);
      }
      if (req.query[field] !== undefined) {
        req.query[field] = parseFloat(req.query[field]);
      }
    });
    
    // Ensure boolean fields are properly typed
    if (req.body.isAnonymous !== undefined) {
      req.body.isAnonymous = req.body.isAnonymous === true || req.body.isAnonymous === 'true';
    }
    
    next();
  }
}

module.exports = IssueValidation;