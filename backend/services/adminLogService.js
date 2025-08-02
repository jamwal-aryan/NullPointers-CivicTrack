const { AdminLog } = require('../models');

/**
 * Admin Log Service - Handles logging of administrative actions
 */
class AdminLogService {
  
  /**
   * Log an admin action
   * @param {string} adminId - ID of the admin performing the action
   * @param {string} action - Type of action performed
   * @param {string} targetType - Type of target (issue, user, flag, system)
   * @param {string|null} targetId - ID of the target (if applicable)
   * @param {Object} details - Additional details about the action
   * @param {string|null} ipAddress - IP address of the admin
   * @param {string|null} userAgent - User agent of the admin
   * @returns {Object} Log result
   */
  static async logAction(adminId, action, targetType, targetId = null, details = {}, ipAddress = null, userAgent = null) {
    try {
      const logEntry = await AdminLog.create({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent
      });
      
      return {
        success: true,
        log: {
          id: logEntry.id,
          action: logEntry.action,
          target_type: logEntry.target_type,
          target_id: logEntry.target_id,
          created_at: logEntry.created_at
        }
      };
      
    } catch (error) {
      console.error('Error logging admin action:', error);
      return {
        success: false,
        error: 'Failed to log admin action'
      };
    }
  }
  
  /**
   * Log flag review action
   * @param {string} adminId - Admin ID
   * @param {string} issueId - Issue ID that was reviewed
   * @param {string} action - Review action (approve, reject, delete)
   * @param {string} reason - Review reason/comment
   * @param {number} flagCount - Number of flags on the issue
   * @param {string} ipAddress - Admin IP address
   * @param {string} userAgent - Admin user agent
   * @returns {Object} Log result
   */
  static async logFlagReview(adminId, issueId, action, reason, flagCount, ipAddress = null, userAgent = null) {
    const details = {
      review_action: action,
      review_reason: reason,
      flag_count: flagCount,
      timestamp: new Date().toISOString()
    };
    
    return this.logAction(
      adminId,
      'flag_review',
      'issue',
      issueId,
      details,
      ipAddress,
      userAgent
    );
  }
  
  /**
   * Log user ban action
   * @param {string} adminId - Admin ID
   * @param {string} userId - User ID that was banned
   * @param {string} reason - Ban reason
   * @param {string} ipAddress - Admin IP address
   * @param {string} userAgent - Admin user agent
   * @returns {Object} Log result
   */
  static async logUserBan(adminId, userId, reason, ipAddress = null, userAgent = null) {
    const details = {
      ban_reason: reason,
      timestamp: new Date().toISOString()
    };
    
    return this.logAction(
      adminId,
      'user_ban',
      'user',
      userId,
      details,
      ipAddress,
      userAgent
    );
  }
  
  /**
   * Log user unban action
   * @param {string} adminId - Admin ID
   * @param {string} userId - User ID that was unbanned
   * @param {string} ipAddress - Admin IP address
   * @param {string} userAgent - Admin user agent
   * @returns {Object} Log result
   */
  static async logUserUnban(adminId, userId, ipAddress = null, userAgent = null) {
    const details = {
      timestamp: new Date().toISOString()
    };
    
    return this.logAction(
      adminId,
      'user_unban',
      'user',
      userId,
      details,
      ipAddress,
      userAgent
    );
  }
  
  /**
   * Log issue deletion action
   * @param {string} adminId - Admin ID
   * @param {string} issueId - Issue ID that was deleted
   * @param {string} reason - Deletion reason
   * @param {string} ipAddress - Admin IP address
   * @param {string} userAgent - Admin user agent
   * @returns {Object} Log result
   */
  static async logIssueDeletion(adminId, issueId, reason, ipAddress = null, userAgent = null) {
    const details = {
      deletion_reason: reason,
      timestamp: new Date().toISOString()
    };
    
    return this.logAction(
      adminId,
      'issue_delete',
      'issue',
      issueId,
      details,
      ipAddress,
      userAgent
    );
  }
  
  /**
   * Log bulk action
   * @param {string} adminId - Admin ID
   * @param {string} bulkAction - Type of bulk action
   * @param {Array} targetIds - Array of target IDs affected
   * @param {Object} actionDetails - Details about the bulk action
   * @param {string} ipAddress - Admin IP address
   * @param {string} userAgent - Admin user agent
   * @returns {Object} Log result
   */
  static async logBulkAction(adminId, bulkAction, targetIds, actionDetails, ipAddress = null, userAgent = null) {
    const details = {
      bulk_action: bulkAction,
      target_ids: targetIds,
      affected_count: targetIds.length,
      action_details: actionDetails,
      timestamp: new Date().toISOString()
    };
    
    return this.logAction(
      adminId,
      'bulk_action',
      'system',
      null,
      details,
      ipAddress,
      userAgent
    );
  }
  
  /**
   * Get admin activity logs with filtering
   * @param {Object} filters - Filtering options
   * @returns {Object} Admin logs with metadata
   */
  static async getAdminLogs(filters = {}) {
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
      } = filters;
      
      // Build where conditions
      const whereConditions = {};
      
      if (adminId) {
        whereConditions.admin_id = adminId;
      }
      
      if (action) {
        whereConditions.action = action;
      }
      
      if (targetType) {
        whereConditions.target_type = targetType;
      }
      
      if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) {
          dateFilter[require('sequelize').Op.gte] = new Date(startDate);
        }
        if (endDate) {
          dateFilter[require('sequelize').Op.lte] = new Date(endDate);
        }
        whereConditions.created_at = dateFilter;
      }
      
      // Get logs with admin details
      const { count, rows: logs } = await AdminLog.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: require('../models').User,
            as: 'admin',
            attributes: ['id', 'email', 'role']
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // Format response
      const formattedLogs = logs.map(log => ({
        id: log.id,
        action: log.action,
        target_type: log.target_type,
        target_id: log.target_id,
        details: log.details,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
        admin: {
          id: log.admin.id,
          email: log.admin.email,
          role: log.admin.role
        }
      }));
      
      return {
        success: true,
        logs: formattedLogs,
        metadata: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < count
        }
      };
      
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      return {
        success: false,
        error: 'Failed to fetch admin logs'
      };
    }
  }
  
  /**
   * Get admin activity statistics
   * @param {Object} filters - Filtering options
   * @returns {Object} Admin activity statistics
   */
  static async getAdminStats(filters = {}) {
    try {
      const {
        adminId,
        startDate,
        endDate
      } = filters;
      
      const whereConditions = {};
      
      if (adminId) {
        whereConditions.admin_id = adminId;
      }
      
      if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) {
          dateFilter[require('sequelize').Op.gte] = new Date(startDate);
        }
        if (endDate) {
          dateFilter[require('sequelize').Op.lte] = new Date(endDate);
        }
        whereConditions.created_at = dateFilter;
      }
      
      // Get total actions
      const totalActions = await AdminLog.count({
        where: whereConditions
      });
      
      // Get actions by type
      const actionsByType = await AdminLog.findAll({
        where: whereConditions,
        attributes: [
          'action',
          [require('../config/database').sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['action'],
        raw: true
      });
      
      // Get actions by admin
      const actionsByAdmin = await AdminLog.findAll({
        where: whereConditions,
        attributes: [
          'admin_id',
          [require('../config/database').sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['admin_id'],
        include: [
          {
            model: require('../models').User,
            as: 'admin',
            attributes: ['email']
          }
        ],
        raw: true
      });
      
      return {
        success: true,
        stats: {
          total_actions: totalActions,
          by_action_type: actionsByType.reduce((acc, item) => {
            acc[item.action] = parseInt(item.count);
            return acc;
          }, {}),
          by_admin: actionsByAdmin.reduce((acc, item) => {
            acc[item['admin.email']] = parseInt(item.count);
            return acc;
          }, {})
        }
      };
      
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return {
        success: false,
        error: 'Failed to fetch admin statistics'
      };
    }
  }
}

module.exports = AdminLogService;