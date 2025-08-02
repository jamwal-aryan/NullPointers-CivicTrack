const { User, Issue, StatusHistory } = require('../models');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  // Send notification to specific user
  async sendToUser(userId, notification) {
    try {
      this.io.to(`user-${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
      console.log(`Notification sent to user ${userId}:`, notification.type);
    } catch (error) {
      console.error('Error sending notification to user:', error);
    }
  }

  // Send notification to all admins
  async sendToAdmins(notification) {
    try {
      this.io.to('admin-room').emit('admin-notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
      console.log('Notification sent to admins:', notification.type);
    } catch (error) {
      console.error('Error sending notification to admins:', error);
    }
  }

  // Notify when issue status changes
  async notifyStatusChange(issueId, oldStatus, newStatus, updatedBy) {
    try {
      const issue = await Issue.findByPk(issueId, {
        include: [{ model: User, as: 'reporter' }]
      });

      if (!issue) return;

      const statusLabels = {
        'reported': 'Reported',
        'under_review': 'Under Review',
        'in_progress': 'In Progress',
        'resolved': 'Resolved',
        'rejected': 'Rejected'
      };

      const notification = {
        type: 'status_change',
        title: 'Issue Status Updated',
        message: `Issue "${issue.title}" status changed from ${statusLabels[oldStatus]} to ${statusLabels[newStatus]}`,
        issueId: issue.id,
        oldStatus,
        newStatus,
        updatedBy
      };

      // Notify the issue reporter
      if (issue.reporterId && issue.reporterId !== updatedBy) {
        await this.sendToUser(issue.reporterId, notification);
      }

      // Notify admins
      await this.sendToAdmins({
        ...notification,
        type: 'admin_status_change'
      });

    } catch (error) {
      console.error('Error notifying status change:', error);
    }
  }

  // Notify when new issue is reported
  async notifyNewIssue(issueId) {
    try {
      const issue = await Issue.findByPk(issueId, {
        include: [{ model: User, as: 'reporter' }]
      });

      if (!issue) return;

      const notification = {
        type: 'new_issue',
        title: 'New Issue Reported',
        message: `New issue reported: "${issue.title}"`,
        issueId: issue.id,
        category: issue.category,
        location: {
          latitude: issue.latitude,
          longitude: issue.longitude
        }
      };

      // Notify admins
      await this.sendToAdmins({
        ...notification,
        type: 'admin_new_issue'
      });

    } catch (error) {
      console.error('Error notifying new issue:', error);
    }
  }

  // Notify when issue is flagged
  async notifyIssueFlagged(issueId, flagReason) {
    try {
      const issue = await Issue.findByPk(issueId);

      if (!issue) return;

      const notification = {
        type: 'issue_flagged',
        title: 'Issue Flagged',
        message: `Issue "${issue.title}" has been flagged for review`,
        issueId: issue.id,
        flagReason
      };

      // Notify admins
      await this.sendToAdmins({
        ...notification,
        type: 'admin_issue_flagged'
      });

    } catch (error) {
      console.error('Error notifying issue flagged:', error);
    }
  }

  // Notify when user is banned/unbanned
  async notifyUserBanStatus(userId, isBanned, reason) {
    try {
      const user = await User.findByPk(userId);

      if (!user) return;

      const notification = {
        type: isBanned ? 'user_banned' : 'user_unbanned',
        title: isBanned ? 'Account Suspended' : 'Account Restored',
        message: isBanned 
          ? `Your account has been suspended: ${reason}`
          : 'Your account has been restored',
        userId: user.id,
        reason: isBanned ? reason : null
      };

      // Notify the user
      await this.sendToUser(userId, notification);

    } catch (error) {
      console.error('Error notifying user ban status:', error);
    }
  }

  // Send system notification to all users
  async sendSystemNotification(message, type = 'info') {
    try {
      this.io.emit('system-notification', {
        type: 'system',
        title: 'System Notification',
        message,
        notificationType: type,
        timestamp: new Date().toISOString()
      });
      console.log('System notification sent:', message);
    } catch (error) {
      console.error('Error sending system notification:', error);
    }
  }
}

module.exports = NotificationService;