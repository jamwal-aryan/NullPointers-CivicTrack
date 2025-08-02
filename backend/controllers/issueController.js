const { Issue, User, StatusHistory } = require('../models');
const GeolocationService = require('../services/geolocationService');
const fileService = require('../services/fileService');
const NotificationService = require('../services/notificationService');
const FlaggingService = require('../services/flaggingService');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Issue Controller - Handles all issue-related operations
 */
class IssueController {
  
  /**
   * Create a new issue report
   * POST /api/issues
   */
  static async createIssue(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const {
        title,
        description,
        category,
        latitude,
        longitude,
        address,
        isAnonymous = false
      } = req.body;
      
      // Process uploaded files
      const photos = [];
      if (req.uploadedFiles && req.uploadedFiles.length > 0) {
        for (const file of req.uploadedFiles) {
          photos.push({
            filename: file.filename,
            originalName: file.originalName,
            path: file.relativePath,
            size: file.size,
            mimetype: file.mimetype,
            url: fileService.generatePublicUrl(file.relativePath)
          });
        }
      }
      
      // Validate location for reporting
      const locationValidation = await GeolocationService.validateReportingLocation(latitude, longitude);
      if (!locationValidation.isValid) {
        return res.status(400).json({
          error: {
            code: 'INVALID_LOCATION',
            message: locationValidation.error,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Prepare issue data
      const issueData = {
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: locationValidation.location.latitude,
        longitude: locationValidation.location.longitude,
        address: address ? address.trim() : null,
        photos: photos, // Processed uploaded photos
        is_anonymous: isAnonymous,
        status: 'reported'
      };
      
      // Set reporter information based on authentication
      if (req.user && !req.user.isAnonymous && !isAnonymous) {
        issueData.reporter_id = req.user.id;
        issueData.is_anonymous = false;
      } else {
        issueData.reporter_id = null;
        issueData.is_anonymous = true;
        // For anonymous users, store session token for tracking
        if (req.user && req.user.sessionToken) {
          issueData.reporter_session = req.user.sessionToken;
        }
      }
      
      // Start transaction for atomic creation
      const transaction = await require('../config/database').sequelize.transaction();
      
      try {
        // Create the issue
        const issue = await Issue.create(issueData, { transaction });
        
        // Create initial status history entry
        // For anonymous users, we need a system user or handle differently
        let historyUpdatedBy = issueData.reporter_id;
        
        // If anonymous, we need to handle this case - for now, we'll skip initial history for anonymous
        // This will be created when the first status update happens by an authority
        if (historyUpdatedBy) {
          await StatusHistory.create({
            issue_id: issue.id,
            previous_status: null, // No previous status for new issues
            new_status: 'reported',
            comment: 'Issue reported',
            updated_by: historyUpdatedBy
          }, { transaction });
        }
        
        await transaction.commit();
        
        // Send notification for new issue
        const io = req.app.get('io');
        if (io) {
          const notificationService = new NotificationService(io);
          await notificationService.notifyNewIssue(issue.id);
        }
        
        // Fetch the created issue with formatted response
        const createdIssue = await Issue.findByPk(issue.id, {
        attributes: [
          'id', 'title', 'description', 'category', 'status',
          'latitude', 'longitude', 'address', 'photos',
          'is_anonymous', 'flag_count', 'created_at', 'updated_at'
        ],
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'email'],
            required: false
          }
        ]
      });
      
      // Format response
      const responseData = {
        ...createdIssue.toJSON(),
        reporter: createdIssue.reporter ? {
          id: createdIssue.reporter.id,
          email: createdIssue.is_anonymous ? null : createdIssue.reporter.email
        } : null
      };
      
      res.status(201).json({
        message: 'Issue created successfully',
        issue: responseData,
        timestamp: new Date().toISOString()
      });
      
      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }
      
    } catch (error) {
      console.error('Error creating issue:', error);
      
      // Handle specific database errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid data provided',
            details: error.errors.map(err => ({
              field: err.path,
              message: err.message
            })),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: 'ISSUE_CREATION_ERROR',
          message: 'Failed to create issue',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Get issues with geospatial and category filtering
   * GET /api/issues
   */
  static async getIssues(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array(),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const {
        lat,
        lng,
        radius = 3,
        status,
        category,
        limit = 50,
        offset = 0
      } = req.query;
      
      // Parse coordinates
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      
      // Build filters
      const filters = {
        radius: parseFloat(radius),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
      // Add status filter if provided
      if (status) {
        const statusArray = Array.isArray(status) ? status : status.split(',');
        const validStatuses = ['reported', 'in_progress', 'resolved'];
        filters.status = statusArray.filter(s => validStatuses.includes(s.trim()));
      }
      
      // Add category filter if provided
      if (category) {
        const categoryArray = Array.isArray(category) ? category : category.split(',');
        const validCategories = ['roads', 'lighting', 'water', 'cleanliness', 'safety', 'obstructions'];
        filters.category = categoryArray.filter(c => validCategories.includes(c.trim()));
      }
      
      // Get issues using geolocation service
      const result = await GeolocationService.getIssuesWithinRadius(userLat, userLng, filters);
      
      // Format issues for response (remove sensitive data for anonymous users)
      const formattedIssues = result.issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        status: issue.status,
        latitude: issue.latitude,
        longitude: issue.longitude,
        address: issue.address,
        photos: issue.photos || [],
        is_anonymous: issue.is_anonymous,
        flag_count: issue.flag_count,
        distance_km: issue.distance_km,
        distance_meters: issue.distance_meters,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        reporter: issue.is_anonymous ? null : {
          id: issue.reporter_id
        }
      }));
      
      res.json({
        issues: formattedIssues,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching issues:', error);
      res.status(500).json({
        error: {
          code: 'ISSUES_FETCH_ERROR',
          message: 'Failed to fetch issues',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Get issue details by ID
   * GET /api/issues/:id
   */
  static async getIssueById(req, res) {
    try {
      const { id } = req.params;
      
      // Find issue with related data
      const issue = await Issue.findOne({
        where: {
          id,
          is_hidden: false
        },
        attributes: [
          'id', 'title', 'description', 'category', 'status',
          'latitude', 'longitude', 'address', 'photos',
          'is_anonymous', 'flag_count', 'created_at', 'updated_at'
        ],
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'email'],
            required: false
          },
          {
            model: StatusHistory,
            as: 'statusHistory',
            attributes: ['id', 'previous_status', 'new_status', 'comment', 'updated_at'],
            include: [
              {
                model: User,
                as: 'updatedBy',
                attributes: ['id', 'email', 'role'],
                required: false
              }
            ],
            order: [['updated_at', 'DESC']]
          }
        ]
      });
      
      if (!issue) {
        return res.status(404).json({
          error: {
            code: 'ISSUE_NOT_FOUND',
            message: 'Issue not found or is hidden',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Calculate distance if user location is provided
      let distance = null;
      if (req.userLocation) {
        const distanceKm = await require('../utils/geospatial').calculateDistance(
          req.userLocation.latitude,
          req.userLocation.longitude,
          issue.latitude,
          issue.longitude
        );
        distance = {
          km: parseFloat(distanceKm.toFixed(2)),
          meters: Math.round(distanceKm * 1000)
        };
      }
      
      // Format response
      const responseData = {
        ...issue.toJSON(),
        distance,
        reporter: issue.is_anonymous ? null : {
          id: issue.reporter?.id || null,
          email: issue.reporter?.email || null
        },
        statusHistory: issue.statusHistory?.map(history => ({
          id: history.id,
          previous_status: history.previous_status,
          new_status: history.new_status,
          comment: history.comment,
          updated_at: history.updated_at,
          updated_by: history.updatedBy ? {
            id: history.updatedBy.id,
            email: history.updatedBy.email,
            role: history.updatedBy.role
          } : null
        })) || []
      };
      
      res.json({
        issue: responseData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching issue details:', error);
      res.status(500).json({
        error: {
          code: 'ISSUE_FETCH_ERROR',
          message: 'Failed to fetch issue details',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Get issue status history
   * GET /api/issues/:id/history
   */
  static async getIssueHistory(req, res) {
    try {
      const { id } = req.params;
      
      // First verify the issue exists and user has access
      const issue = await Issue.findOne({
        where: {
          id,
          is_hidden: false
        },
        attributes: ['id', 'title', 'status', 'created_at']
      });
      
      if (!issue) {
        return res.status(404).json({
          error: {
            code: 'ISSUE_NOT_FOUND',
            message: 'Issue not found or is hidden',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Get complete status history
      const statusHistory = await StatusHistory.findAll({
        where: {
          issue_id: id
        },
        attributes: [
          'id', 'previous_status', 'new_status', 'comment', 'updated_at'
        ],
        include: [
          {
            model: User,
            as: 'updatedBy',
            attributes: ['id', 'email', 'role'],
            required: false
          }
        ],
        order: [['updated_at', 'ASC']] // Chronological order
      });
      
      // Format history for response
      const formattedHistory = statusHistory.map(history => ({
        id: history.id,
        previous_status: history.previous_status,
        new_status: history.new_status,
        comment: history.comment,
        updated_at: history.updated_at,
        updated_by: history.updatedBy ? {
          id: history.updatedBy.id,
          email: history.updatedBy.email,
          role: history.updatedBy.role
        } : null
      }));
      
      res.json({
        issue: {
          id: issue.id,
          title: issue.title,
          current_status: issue.status,
          created_at: issue.created_at
        },
        history: formattedHistory,
        metadata: {
          total_changes: formattedHistory.length,
          first_change: formattedHistory.length > 0 ? formattedHistory[0].updated_at : null,
          last_change: formattedHistory.length > 0 ? formattedHistory[formattedHistory.length - 1].updated_at : null
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching issue history:', error);
      res.status(500).json({
        error: {
          code: 'HISTORY_FETCH_ERROR',
          message: 'Failed to fetch issue history',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Update issue status (authorities only)
   * PATCH /api/issues/:id/status
   */
  static async updateIssueStatus(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const { id } = req.params;
      const { status, comment } = req.body;
      
      // Find the issue
      const issue = await Issue.findOne({
        where: {
          id,
          is_hidden: false
        }
      });
      
      if (!issue) {
        return res.status(404).json({
          error: {
            code: 'ISSUE_NOT_FOUND',
            message: 'Issue not found or is hidden',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Check if status is actually changing
      if (issue.status === status) {
        return res.status(400).json({
          error: {
            code: 'STATUS_UNCHANGED',
            message: `Issue is already in ${status} status`,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Validate status transition
      const validTransitions = {
        'reported': ['in_progress', 'resolved'],
        'in_progress': ['resolved', 'reported'],
        'resolved': ['in_progress', 'reported']
      };
      
      if (!validTransitions[issue.status].includes(status)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot change status from ${issue.status} to ${status}`,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Validate that comment is required for status updates
      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({
          error: {
            code: 'COMMENT_REQUIRED',
            message: 'Comment is required when updating issue status',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Start transaction for atomic update
      const transaction = await require('../config/database').sequelize.transaction();
      
      try {
        // Record status change in history
        await StatusHistory.create({
          issue_id: issue.id,
          previous_status: issue.status,
          new_status: status,
          comment: comment.trim(),
          updated_by: req.user.id
        }, { transaction });
        
        // Update issue status
        await issue.update({
          status,
          updated_at: new Date()
        }, { transaction });
        
        await transaction.commit();
        
        // Fetch updated issue with history
        const updatedIssue = await Issue.findByPk(issue.id, {
          attributes: [
            'id', 'title', 'description', 'category', 'status',
            'latitude', 'longitude', 'address', 'photos',
            'is_anonymous', 'flag_count', 'created_at', 'updated_at'
          ],
          include: [
            {
              model: StatusHistory,
              as: 'statusHistory',
              attributes: ['id', 'previous_status', 'new_status', 'comment', 'updated_at'],
              include: [
                {
                  model: User,
                  as: 'updatedBy',
                  attributes: ['id', 'email', 'role'],
                  required: false
                }
              ],
              order: [['updated_at', 'DESC']],
              limit: 5 // Only return recent history
            }
          ]
        });
        
        res.json({
          message: 'Issue status updated successfully',
          issue: {
            ...updatedIssue.toJSON(),
            statusHistory: updatedIssue.statusHistory?.map(history => ({
              id: history.id,
              previous_status: history.previous_status,
              new_status: history.new_status,
              comment: history.comment,
              updated_at: history.updated_at,
              updated_by: history.updatedBy ? {
                id: history.updatedBy.id,
                email: history.updatedBy.email,
                role: history.updatedBy.role
              } : null
            })) || []
          },
          timestamp: new Date().toISOString()
        });
        
        // Send notification to reporter about status change
        const io = req.app.get('io');
        if (io) {
          const notificationService = new NotificationService(io);
          await notificationService.notifyStatusChange(
            issue.id,
            issue.status,
            status,
            req.user.id
          );
        }
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      console.error('Error updating issue status:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid data provided',
            details: error.errors.map(err => ({
              field: err.path,
              message: err.message
            })),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: 'STATUS_UPDATE_ERROR',
          message: 'Failed to update issue status',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Flag an issue for inappropriate content
   * POST /api/issues/:id/flag
   */
  static async flagIssue(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const { id } = req.params;
      const { reason, flag_type = 'spam' } = req.body;
      
      // Get user information (could be authenticated or anonymous)
      let userId = null;
      let sessionToken = null;
      
      if (req.user && !req.user.isAnonymous) {
        userId = req.user.id;
      } else if (req.user && req.user.sessionToken) {
        sessionToken = req.user.sessionToken;
      }
      
      // Validate that we have some way to track the flagger
      if (!userId && !sessionToken) {
        return res.status(400).json({
          error: {
            code: 'INVALID_USER',
            message: 'Unable to identify user for flagging',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const result = await FlaggingService.flagIssue(
        id,
        userId,
        sessionToken,
        reason,
        flag_type
      );
      
      if (!result.success) {
        const statusCode = result.error.includes('already flagged') ? 409 : 400;
        return res.status(statusCode).json({
          error: {
            code: 'FLAG_ERROR',
            message: result.error,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Send notification for flagged issue
      const io = req.app.get('io');
      if (io) {
        const notificationService = new NotificationService(io);
        await notificationService.notifyIssueFlagged(id, reason);
      }
      
      res.status(201).json({
        message: 'Issue flagged successfully',
        flag: result.flag,
        issue: result.issue,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error flagging issue:', error);
      res.status(500).json({
        error: {
          code: 'FLAG_ERROR',
          message: 'Failed to flag issue',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = IssueController;