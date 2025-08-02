const { Flag, Issue, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Flagging Service - Handles content flagging and moderation
 */
class FlaggingService {
  
  // Flag threshold for auto-hiding content
  static FLAG_THRESHOLD = 3;
  
  /**
   * Flag an issue for inappropriate content
   * @param {string} issueId - Issue ID to flag
   * @param {string|null} userId - User ID (null for anonymous)
   * @param {string|null} sessionToken - Session token for anonymous users
   * @param {string} reason - Reason for flagging
   * @param {string} flagType - Type of flag (spam, inappropriate, etc.)
   * @returns {Object} Flag result
   */
  static async flagIssue(issueId, userId, sessionToken, reason, flagType = 'spam') {
    try {
      // Validate issue exists and is not hidden
      const issue = await Issue.findOne({
        where: {
          id: issueId,
          is_hidden: false
        }
      });
      
      if (!issue) {
        return {
          success: false,
          error: 'Issue not found or is already hidden'
        };
      }
      
      // Check if user/session has already flagged this issue
      const existingFlag = await Flag.findOne({
        where: {
          issue_id: issueId,
          [Op.or]: [
            userId ? { flagged_by: userId } : null,
            sessionToken ? { flagger_session: sessionToken } : null
          ].filter(Boolean)
        }
      });
      
      if (existingFlag) {
        return {
          success: false,
          error: 'You have already flagged this issue'
        };
      }
      
      // Prevent users from flagging their own issues
      if (userId && issue.reporter_id === userId) {
        return {
          success: false,
          error: 'You cannot flag your own issue'
        };
      }
      
      // Create flag record
      const flagData = {
        issue_id: issueId,
        reason: reason.trim(),
        flag_type: flagType
      };
      
      if (userId) {
        flagData.flagged_by = userId;
      } else if (sessionToken) {
        flagData.flagger_session = sessionToken;
      }
      
      const transaction = await require('../config/database').sequelize.transaction();
      
      try {
        // Create the flag
        const flag = await Flag.create(flagData, { transaction });
        
        // Update issue flag count
        await issue.increment('flag_count', { transaction });
        
        // Check if flag threshold is reached
        const updatedIssue = await Issue.findByPk(issueId, { transaction });
        let autoHidden = false;
        
        if (updatedIssue.flag_count >= this.FLAG_THRESHOLD) {
          await updatedIssue.update({
            is_hidden: true
          }, { transaction });
          autoHidden = true;
        }
        
        await transaction.commit();
        
        return {
          success: true,
          flag: {
            id: flag.id,
            reason: flag.reason,
            flag_type: flag.flag_type,
            created_at: flag.created_at
          },
          issue: {
            id: updatedIssue.id,
            flag_count: updatedIssue.flag_count,
            is_hidden: updatedIssue.is_hidden,
            auto_hidden: autoHidden
          }
        };
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      console.error('Error flagging issue:', error);
      return {
        success: false,
        error: 'Failed to flag issue'
      };
    }
  }
  
  /**
   * Get flagged issues for admin review
   * @param {Object} filters - Filtering options
   * @returns {Object} Flagged issues with metadata
   */
  static async getFlaggedIssues(filters = {}) {
    try {
      const {
        status = 'pending', // pending, reviewed, all
        limit = 50,
        offset = 0,
        flagType,
        sortBy = 'flag_count',
        sortOrder = 'DESC'
      } = filters;
      
      // Build where conditions
      const whereConditions = {};
      
      if (status === 'pending') {
        whereConditions.is_hidden = true;
        whereConditions.flag_count = { [Op.gte]: this.FLAG_THRESHOLD };
      } else if (status === 'reviewed') {
        whereConditions['$flags.reviewed_at$'] = { [Op.not]: null };
      }
      
      if (flagType) {
        whereConditions['$flags.flag_type$'] = flagType;
      }
      
      // Get flagged issues with flag details
      const { count, rows: issues } = await Issue.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Flag,
            as: 'flags',
            attributes: [
              'id', 'reason', 'flag_type', 'created_at',
              'reviewed_at', 'review_action', 'review_comment'
            ],
            include: [
              {
                model: User,
                as: 'flaggedBy',
                attributes: ['id', 'email'],
                required: false
              },
              {
                model: User,
                as: 'reviewedBy',
                attributes: ['id', 'email', 'role'],
                required: false
              }
            ]
          },
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'email'],
            required: false
          }
        ],
        attributes: [
          'id', 'title', 'description', 'category', 'status',
          'latitude', 'longitude', 'photos', 'is_anonymous',
          'flag_count', 'is_hidden', 'created_at', 'updated_at'
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });
      
      // Format response
      const formattedIssues = issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        status: issue.status,
        latitude: issue.latitude,
        longitude: issue.longitude,
        photos: issue.photos || [],
        is_anonymous: issue.is_anonymous,
        flag_count: issue.flag_count,
        is_hidden: issue.is_hidden,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        reporter: issue.is_anonymous ? null : {
          id: issue.reporter?.id || null,
          email: issue.reporter?.email || null
        },
        flags: issue.flags?.map(flag => ({
          id: flag.id,
          reason: flag.reason,
          flag_type: flag.flag_type,
          created_at: flag.created_at,
          reviewed_at: flag.reviewed_at,
          review_action: flag.review_action,
          review_comment: flag.review_comment,
          flagged_by: flag.flaggedBy ? {
            id: flag.flaggedBy.id,
            email: flag.flaggedBy.email
          } : null,
          reviewed_by: flag.reviewedBy ? {
            id: flag.reviewedBy.id,
            email: flag.reviewedBy.email,
            role: flag.reviewedBy.role
          } : null
        })) || []
      }));
      
      return {
        success: true,
        issues: formattedIssues,
        metadata: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < count
        }
      };
      
    } catch (error) {
      console.error('Error fetching flagged issues:', error);
      return {
        success: false,
        error: 'Failed to fetch flagged issues'
      };
    }
  }
  
  /**
   * Review a flagged issue (admin action)
   * @param {string} issueId - Issue ID to review
   * @param {string} adminId - Admin user ID
   * @param {string} action - Review action (approve, reject, delete)
   * @param {string} comment - Review comment
   * @returns {Object} Review result
   */
  static async reviewFlaggedIssue(issueId, adminId, action, comment) {
    try {
      // Validate issue exists
      const issue = await Issue.findByPk(issueId, {
        include: [
          {
            model: Flag,
            as: 'flags',
            where: {
              reviewed_at: null
            },
            required: false
          }
        ]
      });
      
      if (!issue) {
        return {
          success: false,
          error: 'Issue not found'
        };
      }
      
      const transaction = await require('../config/database').sequelize.transaction();
      
      try {
        // Update all pending flags for this issue
        await Flag.update({
          reviewed_at: new Date(),
          reviewed_by: adminId,
          review_action: action,
          review_comment: comment?.trim() || null
        }, {
          where: {
            issue_id: issueId,
            reviewed_at: null
          },
          transaction
        });
        
        // Handle different review actions
        switch (action) {
          case 'approve':
            // Restore issue visibility
            await issue.update({
              is_hidden: false
            }, { transaction });
            break;
            
          case 'reject':
            // Keep issue hidden
            await issue.update({
              is_hidden: true
            }, { transaction });
            break;
            
          case 'delete':
            // Soft delete by keeping hidden and marking as deleted
            await issue.update({
              is_hidden: true,
              // Could add a deleted_at field in future
            }, { transaction });
            break;
            
          default:
            throw new Error('Invalid review action');
        }
        
        await transaction.commit();
        
        return {
          success: true,
          issue: {
            id: issue.id,
            title: issue.title,
            is_hidden: issue.is_hidden,
            flag_count: issue.flag_count
          },
          review: {
            action,
            comment: comment?.trim() || null,
            reviewed_by: adminId,
            reviewed_at: new Date()
          }
        };
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      console.error('Error reviewing flagged issue:', error);
      return {
        success: false,
        error: 'Failed to review flagged issue'
      };
    }
  }
  
  /**
   * Get user flagging statistics
   * @param {string} userId - User ID
   * @returns {Object} User flagging stats
   */
  static async getUserFlaggingStats(userId) {
    try {
      const stats = await Flag.findAll({
        where: {
          flagged_by: userId
        },
        attributes: [
          'flag_type',
          [require('../config/database').sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['flag_type'],
        raw: true
      });
      
      const totalFlags = await Flag.count({
        where: {
          flagged_by: userId
        }
      });
      
      return {
        success: true,
        stats: {
          total_flags: totalFlags,
          by_type: stats.reduce((acc, stat) => {
            acc[stat.flag_type] = parseInt(stat.count);
            return acc;
          }, {})
        }
      };
      
    } catch (error) {
      console.error('Error fetching user flagging stats:', error);
      return {
        success: false,
        error: 'Failed to fetch flagging statistics'
      };
    }
  }
  
  /**
   * Check if user should be banned for excessive flagging
   * @param {string} userId - User ID to check
   * @returns {Object} Ban recommendation
   */
  static async checkUserForBan(userId) {
    try {
      // Get user's flagging history
      const recentFlags = await Flag.count({
        where: {
          flagged_by: userId,
          created_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });
      
      // Get rejected flags (flags where the issue was approved after review)
      const rejectedFlags = await Flag.count({
        where: {
          flagged_by: userId,
          review_action: 'approved', // Issue was approved, meaning flag was invalid
          reviewed_at: {
            [Op.not]: null
          }
        }
      });
      
      const totalFlags = await Flag.count({
        where: {
          flagged_by: userId
        }
      });
      
      // Simple ban criteria (can be made more sophisticated)
      const shouldBan = (
        recentFlags > 10 || // More than 10 flags in a week
        (totalFlags > 5 && rejectedFlags / totalFlags > 0.8) // More than 80% rejected flags
      );
      
      return {
        success: true,
        should_ban: shouldBan,
        stats: {
          recent_flags: recentFlags,
          total_flags: totalFlags,
          rejected_flags: rejectedFlags,
          rejection_rate: totalFlags > 0 ? (rejectedFlags / totalFlags) : 0
        }
      };
      
    } catch (error) {
      console.error('Error checking user for ban:', error);
      return {
        success: false,
        error: 'Failed to check user ban status'
      };
    }
  }
}

module.exports = FlaggingService;