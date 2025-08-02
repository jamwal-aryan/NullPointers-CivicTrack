const { User, Issue } = require('../models');

/**
 * Notification Service - Handles all notification-related operations
 * This service manages status change notifications and other system notifications
 */
class NotificationService {
  
  /**
   * Send notification when issue status is updated
   * @param {string} issueId - The ID of the issue that was updated
   * @param {string} previousStatus - The previous status
   * @param {string} newStatus - The new status
   * @param {string} comment - The comment explaining the status change
   * @param {string} updatedBy - The ID of the user who updated the status
   */
  static async notifyStatusChange(issueId, previousStatus, newStatus, comment, updatedBy) {
    try {
      // Get issue details with reporter information
      const issue = await Issue.findByPk(issueId, {
        attributes: ['id', 'title', 'reporter_id', 'is_anonymous', 'reporter_session'],
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'email'],
            required: false
          }
        ]
      });
      
      if (!issue) {
        console.error('Issue not found for notification:', issueId);
        return;
      }
      
      // Get the user who made the update
      const updater = await User.findByPk(updatedBy, {
        attributes: ['id', 'email', 'role']
      });
      
      // Prepare notification data
      const notificationData = {
        issueId: issue.id,
        issueTitle: issue.title,
        previousStatus,
        newStatus,
        comment,
        updatedBy: updater ? {
          id: updater.id,
          email: updater.email,
          role: updater.role
        } : null,
        timestamp: new Date().toISOString()
      };
      
      // Send notification to reporter if not anonymous
      if (!issue.is_anonymous && issue.reporter) {
        await this.sendEmailNotification(issue.reporter.email, notificationData);
        console.log(`Status change notification sent to reporter: ${issue.reporter.email}`);
      }
      
      // TODO: Implement WebSocket real-time notifications
      // await this.sendWebSocketNotification(issue.reporter_id, notificationData);
      
      // TODO: Implement push notifications for PWA
      // await this.sendPushNotification(issue.reporter_id, notificationData);
      
      console.log(`Status change notification processed for issue ${issueId}: ${previousStatus} -> ${newStatus}`);
      
    } catch (error) {
      console.error('Error sending status change notification:', error);
      // Don't throw error to avoid breaking the main status update flow
    }
  }
  
  /**
   * Send email notification for status change
   * @param {string} email - Recipient email address
   * @param {Object} notificationData - Notification details
   */
  static async sendEmailNotification(email, notificationData) {
    try {
      // TODO: Implement actual email sending using a service like SendGrid, AWS SES, etc.
      // For now, we'll just log the notification
      
      const emailContent = {
        to: email,
        subject: `CivicTrack: Issue Status Updated - ${notificationData.issueTitle}`,
        body: `
          Your reported issue has been updated:
          
          Issue: ${notificationData.issueTitle}
          Status changed from: ${notificationData.previousStatus || 'N/A'} to ${notificationData.newStatus}
          
          Update comment: ${notificationData.comment}
          
          Updated by: ${notificationData.updatedBy?.role || 'System'} (${notificationData.updatedBy?.email || 'N/A'})
          
          Time: ${notificationData.timestamp}
          
          You can view the full issue details and history in the CivicTrack app.
        `
      };
      
      console.log('Email notification prepared:', emailContent);
      
      // TODO: Replace with actual email service implementation
      // await emailService.send(emailContent);
      
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }
  
  /**
   * Send WebSocket real-time notification
   * @param {string} userId - User ID to send notification to
   * @param {Object} notificationData - Notification details
   */
  static async sendWebSocketNotification(userId, notificationData) {
    try {
      // TODO: Implement WebSocket notification using Socket.io
      // This will be implemented in the real-time notifications task
      
      console.log(`WebSocket notification prepared for user ${userId}:`, notificationData);
      
    } catch (error) {
      console.error('Error sending WebSocket notification:', error);
    }
  }
  
  /**
   * Send push notification for PWA
   * @param {string} userId - User ID to send notification to
   * @param {Object} notificationData - Notification details
   */
  static async sendPushNotification(userId, notificationData) {
    try {
      // TODO: Implement push notifications for PWA
      // This will be implemented in the PWA features task
      
      console.log(`Push notification prepared for user ${userId}:`, notificationData);
      
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
  
  /**
   * Notify about flagged content (for admin notifications)
   * @param {string} issueId - The ID of the flagged issue
   * @param {string} flaggedBy - The ID of the user who flagged the issue
   * @param {string} reason - The reason for flagging
   */
  static async notifyFlaggedContent(issueId, flaggedBy, reason) {
    try {
      // TODO: Implement admin notification for flagged content
      // This will be implemented in the content flagging task
      
      console.log(`Flagged content notification prepared for issue ${issueId}`);
      
    } catch (error) {
      console.error('Error sending flagged content notification:', error);
    }
  }
}

module.exports = NotificationService;