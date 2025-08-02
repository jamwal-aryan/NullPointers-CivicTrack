const request = require('supertest');
const app = require('../server');
const { sequelize, User, Issue, StatusHistory } = require('../models');
const jwt = require('jsonwebtoken');

describe('Status Tracking System', () => {
  let testUser, testAuthority, testIssue, authToken, authorityToken;

  beforeAll(async () => {
    // Ensure database is connected
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up database
    await StatusHistory.destroy({ where: {}, force: true });
    await Issue.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test users
    testUser = await User.create({
      email: 'testuser@example.com',
      password_hash: 'hashedpassword',
      role: 'citizen',
      is_verified: true
    });

    testAuthority = await User.create({
      email: 'authority@example.com',
      password_hash: 'hashedpassword',
      role: 'authority',
      is_verified: true
    });

    // Create test issue
    testIssue = await Issue.create({
      title: 'Test Road Issue',
      description: 'Test description for road damage',
      category: 'roads',
      status: 'reported',
      latitude: 40.7128,
      longitude: -74.0060,
      reporter_id: testUser.id,
      is_anonymous: false
    });

    // Generate auth tokens
    authToken = jwt.sign(
      { userId: testUser.id, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    authorityToken = jwt.sign(
      { userId: testAuthority.id, role: testAuthority.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/issues/:id/history', () => {
    it('should return empty history for new issue', async () => {
      const response = await request(app)
        .get(`/api/issues/${testIssue.id}/history`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.issue).toBeDefined();
      expect(response.body.issue.id).toBe(testIssue.id);
      expect(response.body.issue.current_status).toBe('reported');
      expect(response.body.history).toEqual([]);
      expect(response.body.metadata.total_changes).toBe(0);
    });

    it('should return status history after status updates', async () => {
      // Create some status history
      await StatusHistory.create({
        issue_id: testIssue.id,
        previous_status: 'reported',
        new_status: 'in_progress',
        comment: 'Started working on this issue',
        updated_by: testAuthority.id
      });

      await StatusHistory.create({
        issue_id: testIssue.id,
        previous_status: 'in_progress',
        new_status: 'resolved',
        comment: 'Issue has been fixed',
        updated_by: testAuthority.id
      });

      const response = await request(app)
        .get(`/api/issues/${testIssue.id}/history`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history).toHaveLength(2);
      expect(response.body.history[0].previous_status).toBe('reported');
      expect(response.body.history[0].new_status).toBe('in_progress');
      expect(response.body.history[0].comment).toBe('Started working on this issue');
      expect(response.body.history[0].updated_by.role).toBe('authority');

      expect(response.body.history[1].previous_status).toBe('in_progress');
      expect(response.body.history[1].new_status).toBe('resolved');
      expect(response.body.metadata.total_changes).toBe(2);
    });

    it('should return 404 for non-existent issue', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/issues/${fakeId}/history`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ISSUE_NOT_FOUND');
    });

    it('should enforce location-based access control', async () => {
      const response = await request(app)
        .get(`/api/issues/${testIssue.id}/history`)
        .query({
          userLat: 35.0000, // Too far from issue location
          userLng: -120.0000
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PATCH /api/issues/:id/status', () => {
    it('should update status and create history entry', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'in_progress',
          comment: 'Started working on this issue'
        })
        .expect(200);

      expect(response.body.message).toBe('Issue status updated successfully');
      expect(response.body.issue.status).toBe('in_progress');

      // Verify history was created
      const history = await StatusHistory.findAll({
        where: { issue_id: testIssue.id }
      });

      expect(history).toHaveLength(1);
      expect(history[0].previous_status).toBe('reported');
      expect(history[0].new_status).toBe('in_progress');
      expect(history[0].comment).toBe('Started working on this issue');
      expect(history[0].updated_by).toBe(testAuthority.id);
    });

    it('should require comment for status updates', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'in_progress'
          // Missing comment
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authority role for status updates', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .send({
          status: 'in_progress',
          comment: 'Trying to update status'
        })
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate status transitions', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'invalid_status',
          comment: 'Invalid status update'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate status updates', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'reported', // Same as current status
          comment: 'Trying to set same status'
        })
        .expect(400);

      expect(response.body.error.code).toBe('STATUS_UNCHANGED');
    });

    it('should record timestamp automatically', async () => {
      const beforeUpdate = new Date();
      
      await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'in_progress',
          comment: 'Started working on this issue'
        })
        .expect(200);

      const afterUpdate = new Date();

      const history = await StatusHistory.findOne({
        where: { issue_id: testIssue.id }
      });

      expect(history).toBeTruthy();
      expect(new Date(history.updated_at)).toBeInstanceOf(Date);
      expect(new Date(history.updated_at).getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(new Date(history.updated_at).getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    it('should handle multiple status transitions', async () => {
      // First transition: reported -> in_progress
      await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'in_progress',
          comment: 'Started working on this issue'
        })
        .expect(200);

      // Second transition: in_progress -> resolved
      await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'resolved',
          comment: 'Issue has been fixed'
        })
        .expect(200);

      // Verify both history entries
      const history = await StatusHistory.findAll({
        where: { issue_id: testIssue.id },
        order: [['updated_at', 'ASC']]
      });

      expect(history).toHaveLength(2);
      
      expect(history[0].previous_status).toBe('reported');
      expect(history[0].new_status).toBe('in_progress');
      
      expect(history[1].previous_status).toBe('in_progress');
      expect(history[1].new_status).toBe('resolved');
    });
  });

  describe('Status Change Notifications', () => {
    it('should trigger notification when status is updated', async () => {
      // Mock console.log to capture notification logs
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'in_progress',
          comment: 'Started working on this issue'
        })
        .expect(200);

      // Check if notification was triggered
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status change notification processed')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Transaction Safety', () => {
    it('should rollback on status update failure', async () => {
      // Mock StatusHistory.create to fail
      const originalCreate = StatusHistory.create;
      StatusHistory.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          status: 'in_progress',
          comment: 'This should fail'
        })
        .expect(500);

      // Verify issue status wasn't changed
      const issue = await Issue.findByPk(testIssue.id);
      expect(issue.status).toBe('reported'); // Should remain unchanged

      // Verify no history entry was created
      const history = await StatusHistory.findAll({
        where: { issue_id: testIssue.id }
      });
      expect(history).toHaveLength(0);

      // Restore original method
      StatusHistory.create = originalCreate;
    });
  });
});