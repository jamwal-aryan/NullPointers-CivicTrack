const { body, param, query } = require('express-validator');

/**
 * Validation middleware for flagging operations
 */
class FlagValidation {
  
  /**
   * Validate flag issue request
   */
  static flagIssue() {
    return [
      param('id')
        .isUUID()
        .withMessage('Issue ID must be a valid UUID'),
      
      body('reason')
        .trim()
        .isLength({ min: 3, max: 500 })
        .withMessage('Reason must be between 3 and 500 characters')
        .escape(),
      
      body('flag_type')
        .optional()
        .isIn(['spam', 'inappropriate', 'irrelevant', 'duplicate', 'other'])
        .withMessage('Flag type must be one of: spam, inappropriate, irrelevant, duplicate, other')
    ];
  }
  
  /**
   * Validate admin review request
   */
  static reviewFlag() {
    return [
      param('id')
        .isUUID()
        .withMessage('Issue ID must be a valid UUID'),
      
      body('action')
        .isIn(['approve', 'reject', 'delete'])
        .withMessage('Action must be one of: approve, reject, delete'),
      
      body('reason')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Reason must not exceed 1000 characters')
        .escape()
    ];
  }
  
  /**
   * Validate get flagged issues query
   */
  static getFlaggedIssues() {
    return [
      query('status')
        .optional()
        .isIn(['pending', 'reviewed', 'all'])
        .withMessage('Status must be one of: pending, reviewed, all'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
      
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer')
        .toInt(),
      
      query('flagType')
        .optional()
        .isIn(['spam', 'inappropriate', 'irrelevant', 'duplicate', 'other'])
        .withMessage('Flag type must be one of: spam, inappropriate, irrelevant, duplicate, other'),
      
      query('sortBy')
        .optional()
        .isIn(['flag_count', 'created_at', 'updated_at'])
        .withMessage('Sort by must be one of: flag_count, created_at, updated_at'),
      
      query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Sort order must be ASC or DESC')
    ];
  }
  
  /**
   * Validate ban user request
   */
  static banUser() {
    return [
      param('id')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
      
      body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Reason must not exceed 500 characters')
        .escape()
    ];
  }
  
  /**
   * Validate analytics query
   */
  static getAnalytics() {
    return [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
      
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate(),
      
      query('category')
        .optional()
        .isIn(['roads', 'lighting', 'water', 'cleanliness', 'safety', 'obstructions'])
        .withMessage('Category must be one of: roads, lighting, water, cleanliness, safety, obstructions'),
      
      query('status')
        .optional()
        .isIn(['reported', 'in_progress', 'resolved'])
        .withMessage('Status must be one of: reported, in_progress, resolved')
    ];
  }
  
  /**
   * Validate get users query
   */
  static getUsers() {
    return [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
      
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer')
        .toInt(),
      
      query('banned')
        .optional()
        .isBoolean()
        .withMessage('Banned must be a boolean value')
        .toBoolean(),
      
      query('role')
        .optional()
        .isIn(['citizen', 'authority', 'admin'])
        .withMessage('Role must be one of: citizen, authority, admin'),
      
      query('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search term must be between 1 and 100 characters')
        .escape()
    ];
  }
  
  /**
   * Validate get admin logs query
   */
  static getAdminLogs() {
    return [
      query('adminId')
        .optional()
        .isUUID()
        .withMessage('Admin ID must be a valid UUID'),
      
      query('action')
        .optional()
        .isIn(['flag_review', 'user_ban', 'user_unban', 'issue_delete', 'bulk_action'])
        .withMessage('Action must be one of: flag_review, user_ban, user_unban, issue_delete, bulk_action'),
      
      query('targetType')
        .optional()
        .isIn(['issue', 'user', 'flag', 'system'])
        .withMessage('Target type must be one of: issue, user, flag, system'),
      
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
      
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate(),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
      
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer')
        .toInt(),
      
      query('sortBy')
        .optional()
        .isIn(['created_at', 'action', 'target_type'])
        .withMessage('Sort by must be one of: created_at, action, target_type'),
      
      query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Sort order must be ASC or DESC')
    ];
  }
  
  /**
   * Validate get admin stats query
   */
  static getAdminStats() {
    return [
      query('adminId')
        .optional()
        .isUUID()
        .withMessage('Admin ID must be a valid UUID'),
      
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
      
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate()
    ];
  }
  
  /**
   * Sanitize input to prevent XSS and other attacks
   */
  static sanitizeInput(req, res, next) {
    // Remove any potentially dangerous characters from string inputs
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    };
    
    // Recursively sanitize object properties
    const sanitizeObject = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };
    
    // Sanitize request body, query, and params
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    
    next();
  }
}

module.exports = FlagValidation;