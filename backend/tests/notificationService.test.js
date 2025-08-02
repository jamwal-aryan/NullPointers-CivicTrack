const NotificationService = require('../services/notificationService');
const { User, Issue } = require('../models');

// Mock the models
jest.mock('../models', () => ({
  User: {
    findByPk: jest.fn()
  },
  Issue: {
    findByPk: jest.fn()
  }
}));

describe('NotificationService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('notifyStatusChange', () => {
    const mockIssue = {
      id: 'issue-123',
      title: 'Test Road Issue',
      reporter_id: 'user-123',
      is_anonymous: false,
      reporter_session: null,
      reporter: {
        id: 'user-123',
        email: 'reporter@example.com'
      }
    };

    const mockUpdater = {
      id: 'authority-123',
      email: 'authority@example.com',
      role: 'authority'
    };

    it('should send notification for verified user report', async () => {
      // Mock database responses
      Issue.findByPk.mockResolvedValue(mockIssue);
      User.findByPk.mockResolvedValue(mockUpdater);

      await NotificationService.notifyStatusChange(
        'issue-123',
        'reported',
        'in_progress',
        'Started working on this issue',
        'authority-123'
      );

      // Verify database queries were made
      expect(Issue.findByPk).toHaveBeenCalledWith('issue-123', expect.any(Object));
      expect(User.findByPk).toHaveBeenCalledWith('authority-123', expect.any(Object));

      // Verify notification was logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Status change notification sent to reporter: reporter@example.com')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Status change notification processed for issue issue-123: reported -> in_progress')
      );
    });

    it('should skip notification for anonymous reports', async () => {
      const anonymousIssue = {
        ...mockIssue,
        is_anonymous: true,
        reporter: null
      };

      Issue.findByPk.mockResolvedValue(anonymousIssue);
      User.findByPk.mockResolvedValue(mockUpdater);

      await NotificationService.notifyStatusChange(
        'issue-123',
        'reported',
        'in_progress',
        'Started working on this issue',
        'authority-123'
      );

      // Should not attempt to send email notification
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Status change notification sent to reporter')
      );

      // But should still log the processing
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Status change notification processed for issue issue-123: reported -> in_progress')
      );
    });

    it('should handle missing issue gracefully', async () => {
      Issue.findByPk.mockResolvedValue(null);

      await NotificationService.notifyStatusChange(
        'nonexistent-issue',
        'reported',
        'in_progress',
        'Comment',
        'authority-123'
      );

      expect(console.error).toHaveBeenCalledWith(
        'Issue not found for notification:',
        'nonexistent-issue'
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      Issue.findByPk.mockRejectedValue(dbError);

      await NotificationService.notifyStatusChange(
        'issue-123',
        'reported',
        'in_progress',
        'Comment',
        'authority-123'
      );

      expect(console.error).toHaveBeenCalledWith(
        'Error sending status change notification:',
        dbError
      );
    });
  });

  describe('sendEmailNotification', () => {
    it('should prepare email notification correctly', async () => {
      const notificationData = {
        issueTitle: 'Test Road Issue',
        previousStatus: 'reported',
        newStatus: 'in_progress',
        comment: 'Started working on this issue',
        updatedBy: {
          role: 'authority',
          email: 'authority@example.com'
        },
        timestamp: '2024-01-01T12:00:00.000Z'
      };

      await NotificationService.sendEmailNotification('reporter@example.com', notificationData);

      expect(console.log).toHaveBeenCalledWith(
        'Email notification prepared:',
        expect.objectContaining({
          to: 'reporter@example.com',
          subject: expect.stringContaining('CivicTrack: Issue Status Updated - Test Road Issue'),
          body: expect.stringContaining('Your reported issue has been updated')
        })
      );
    });

    it('should handle email service errors gracefully', async () => {
      // Mock console.log to throw an error (simulating email service failure)
      console.log.mockImplementation(() => {
        throw new Error('Email service unavailable');
      });

      const notificationData = {
        issueTitle: 'Test Issue',
        previousStatus: 'reported',
        newStatus: 'in_progress',
        comment: 'Comment',
        updatedBy: { role: 'authority', email: 'auth@example.com' },
        timestamp: '2024-01-01T12:00:00.000Z'
      };

      // Should not throw error
      await expect(
        NotificationService.sendEmailNotification('reporter@example.com', notificationData)
      ).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        'Error sending email notification:',
        expect.any(Error)
      );
    });
  });

  describe('sendWebSocketNotification', () => {
    it('should log WebSocket notification preparation', async () => {
      const notificationData = {
        issueTitle: 'Test Issue',
        newStatus: 'in_progress'
      };

      await NotificationService.sendWebSocketNotification('user-123', notificationData);

      expect(console.log).toHaveBeenCalledWith(
        'WebSocket notification prepared for user user-123:',
        notificationData
      );
    });
  });

  describe('sendPushNotification', () => {
    it('should log push notification preparation', async () => {
      const notificationData = {
        issueTitle: 'Test Issue',
        newStatus: 'in_progress'
      };

      await NotificationService.sendPushNotification('user-123', notificationData);

      expect(console.log).toHaveBeenCalledWith(
        'Push notification prepared for user user-123:',
        notificationData
      );
    });
  });

  describe('notifyFlaggedContent', () => {
    it('should log flagged content notification preparation', async () => {
      await NotificationService.notifyFlaggedContent('issue-123', 'user-456', 'Spam content');

      expect(console.log).toHaveBeenCalledWith(
        'Flagged content notification prepared for issue issue-123'
      );
    });
  });
});