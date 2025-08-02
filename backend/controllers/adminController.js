const { User, Issue, Flag } = require('../models');
const FlaggingService = require('../services/flaggingService');
const AdminLogService = require('../services/adminLogService');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Admin Controller - Handles administrative operations
 */
class AdminController {
  
  /**
   * Get flagged issues for review
   * GET /api/admin/flagged-issues
   */
  static async getFlaggedIssues(req, res) {
    try {
      const {
        status = 'pending',
        limit = 50,
        offset = 0,
        flagType,
        sortBy = 'flag_count',
        sortOrder = 'DESC'
      } = req.query;
      
      const filters = {
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        flagType,
        sortBy,
        sortOrder
      };
      
      const result = await FlaggingService.getFlaggedIssues(filters);
      
      if (!result.success) {
        return res.status(500).json({
          error: {
            code: 'FLAGGED_ISSUES_FETCH_ERROR',
            message: result.error,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json({
        flagged_issues: result.issues,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching flagged issues:', error);
      res.status(500).json({
        error: {
          code: 'ADMIN_FETCH_ERROR',
          message: 'Failed to fetch flagged issues',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Review a flagged issue
   * POST /api/admin/issues/:id/review
   */
  static async reviewFlaggedIssue(req, res) {
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
      const { action, reason } = req.body;
      
      // Validate action
      const validActions = ['approve', 'reject', 'delete'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be one of: approve, reject, delete',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const result = await FlaggingService.reviewFlaggedIssue(
        id,
        req.user.id,
        action,
        reason
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'REVIEW_ERROR',
            message: result.error,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Log the admin action
      await AdminLogService.logFlagReview(
        req.user.id,
        id,
        action,
        reason,
        result.issue.flag_count,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({
        message: `Issue ${action}ed successfully`,
        issue: result.issue,
        review: result.review,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error reviewing flagged issue:', error);
      res.status(500).json({
        error: {
          code: 'REVIEW_ERROR',
          message: 'Failed to review flagged issue',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Get analytics data
   * GET /api/admin/analytics
   */
  static async getAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        category,
        status
      } = req.query;
      
      // Build date filter
      const dateFilter = {};
      if (startDate) {
        dateFilter[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        dateFilter[Op.lte] = new Date(endDate);
      }
      
      const whereConditions = {};
      if (Object.keys(dateFilter).length > 0) {
        whereConditions.created_at = dateFilter;
      }
      if (category) {
        whereConditions.category = category;
      }
      if (status) {
        whereConditions.status = status;
      }
      
      // Get total issues
      const totalIssues = await Issue.count({
        where: whereConditions
      });
      
      // Get issues by category
      const issuesByCategory = await Issue.findAll({
        where: whereConditions,
        attributes: [
          'category',
          [require('../config/database').sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['category'],
        raw: true
      });
      
      // Get issues by status
      const issuesByStatus = await Issue.findAll({
        where: whereConditions,
        attributes: [
          'status',
          [require('../config/database').sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['status'],
        raw: true
      });
      
      // Get flagged issues count
      const flaggedIssuesCount = await Issue.count({
        where: {
          ...whereConditions,
          flag_count: { [Op.gt]: 0 }
        }
      });
      
      // Get hidden issues count
      const hiddenIssuesCount = await Issue.count({
        where: {
          ...whereConditions,
          is_hidden: true
        }
      });
      
      // Get total flags
      const totalFlags = await Flag.count({
        where: Object.keys(dateFilter).length > 0 ? {
          created_at: dateFilter
        } : {}
      });
      
      // Get flags by type
      const flagsByType = await Flag.findAll({
        where: Object.keys(dateFilter).length > 0 ? {
          created_at: dateFilter
        } : {},
        attributes: [
          'flag_type',
          [require('../config/database').sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['flag_type'],
        raw: true
      });
      
      // Get user statistics
      const totalUsers = await User.count({
        where: {
          email: { [Op.not]: null } // Exclude anonymous users
        }
      });
      
      const bannedUsers = await User.count({
        where: {
          is_banned: true
        }
      });
      
      // Format response
      const analytics = {
        issues: {
          total: totalIssues,
          by_category: issuesByCategory.reduce((acc, item) => {
            acc[item.category] = parseInt(item.count);
            return acc;
          }, {}),
          by_status: issuesByStatus.reduce((acc, item) => {
            acc[item.status] = parseInt(item.count);
            return acc;
          }, {}),
          flagged: flaggedIssuesCount,
          hidden: hiddenIssuesCount
        },
        flags: {
          total: totalFlags,
          by_type: flagsByType.reduce((acc, item) => {
            acc[item.flag_type] = parseInt(item.count);
            return acc;
          }, {})
        },
        users: {
          total: totalUsers,
          banned: bannedUsers,
          active: totalUsers - bannedUsers
        }
      };
      
      res.json({
        analytics,
        filters: {
          start_date: startDate || null,
          end_date: endDate || null,
          category: category || null,
          status: status || null
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to fetch analytics data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Ban a user
   * POST /api/admin/users/:id/ban
   */
  static async banUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      // Find the user
      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Prevent banning admins
      if (user.role === 'admin') {
        return res.status(403).json({
          error: {
            code: 'CANNOT_BAN_ADMIN',
            message: 'Cannot ban admin users',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Check if user is already banned
      if (user.is_banned) {
        return res.status(400).json({
          error: {
            code: 'USER_ALREADY_BANNED',
            message: 'User is already banned',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const transaction = await require('../config/database').sequelize.transaction();
      
      try {
        // Ban the user
        await user.update({
          is_banned: true
        }, { transaction });
        
        // Hide all issues reported by this user
        await Issue.update({
          is_hidden: true
        }, {
          where: {
            reporter_id: id
          },
          transaction
        });
        
        await transaction.commit();
        
        // Log the admin action
        await AdminLogService.logUserBan(
          req.user.id,
          id,
          reason,
          req.ip,
          req.get('User-Agent')
        );
        
        res.json({
          message: 'User banned successfully',
          user: {
            id: user.id,
            email: user.email,
            is_banned: true
          },
          ban_reason: reason || null,
          banned_by: req.user.id,
          banned_at: new Date(),
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({
        error: {
          code: 'BAN_ERROR',
          message: 'Failed to ban user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Unban a user
   * POST /api/admin/users/:id/unban
   */
  static async unbanUser(req, res) {
    try {
      const { id } = req.params;
      
      // Find the user
      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Check if user is actually banned
      if (!user.is_banned) {
        return res.status(400).json({
          error: {
            code: 'USER_NOT_BANNED',
            message: 'User is not banned',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Unban the user
      await user.update({
        is_banned: false
      });
      
      // Log the admin action
      await AdminLogService.logUserUnban(
        req.user.id,
        id,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({
        message: 'User unbanned successfully',
        user: {
          id: user.id,
          email: user.email,
          is_banned: false
        },
        unbanned_by: req.user.id,
        unbanned_at: new Date(),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({
        error: {
          code: 'UNBAN_ERROR',
          message: 'Failed to unban user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Get user management data
   * GET /api/admin/users
   */
  static async getUsers(req, res) {
    try {
      const {
        limit = 50,
        offset = 0,
        banned,
        role,
        search
      } = req.query;
      
      const whereConditions = {
        email: { [Op.not]: null } // Exclude anonymous users
      };
      
      if (banned !== undefined) {
        whereConditions.is_banned = banned === 'true';
      }
      
      if (role) {
        whereConditions.role = role;
      }
      
      if (search) {
        whereConditions.email = {
          [Op.iLike]: `%${search}%`
        };
      }
      
      const { count, rows: users } = await User.findAndCountAll({
        where: whereConditions,
        attributes: [
          'id', 'email', 'role', 'is_banned', 'is_verified',
          'created_at', 'last_active_at'
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // Get additional stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const issueCount = await Issue.count({
            where: { reporter_id: user.id }
          });
          
          const flagCount = await Flag.count({
            where: { flagged_by: user.id }
          });
          
          return {
            ...user.toJSON(),
            stats: {
              issues_reported: issueCount,
              flags_submitted: flagCount
            }
          };
        })
      );
      
      res.json({
        users: usersWithStats,
        metadata: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < count
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        error: {
          code: 'USERS_FETCH_ERROR',
          message: 'Failed to fetch users',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Get admin activity logs
   * GET /api/admin/logs
   */
  static async getAdminLogs(req, res) {
    try {
      const {
        adminId,
        action,
        targetType,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;
      
      const filters = {
        adminId,
        action,
        targetType,
        startDate,
        endDate,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder
      };
      
      const result = await AdminLogService.getAdminLogs(filters);
      
      if (!result.success) {
        return res.status(500).json({
          error: {
            code: 'ADMIN_LOGS_FETCH_ERROR',
            message: result.error,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json({
        logs: result.logs,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      res.status(500).json({
        error: {
          code: 'ADMIN_LOGS_ERROR',
          message: 'Failed to fetch admin logs',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Get admin activity statistics
   * GET /api/admin/activity-stats
   */
  static async getAdminActivityStats(req, res) {
    try {
      const {
        adminId,
        startDate,
        endDate
      } = req.query;
      
      const filters = {
        adminId,
        startDate,
        endDate
      };
      
      const result = await AdminLogService.getAdminStats(filters);
      
      if (!result.success) {
        return res.status(500).json({
          error: {
            code: 'ADMIN_STATS_FETCH_ERROR',
            message: result.error,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json({
        activity_stats: result.stats,
        filters: {
          admin_id: adminId || null,
          start_date: startDate || null,
          end_date: endDate || null
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching admin activity stats:', error);
      res.status(500).json({
        error: {
          code: 'ADMIN_STATS_ERROR',
          message: 'Failed to fetch admin activity statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = AdminController;