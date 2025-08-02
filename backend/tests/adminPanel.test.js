const request = require('supertest');
const app = require('../server');
const { User, Issue, Flag, AdminLog } = require('../models');
const { generateToken } = require('../middleware/auth');

describe('Admin Panel API', () => {
  let adminUser, citizenUser, testIssue, adminToken, citizenToken;

  beforeAll(async () => {
    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      password_hash: 'hashedpassword',
      role: 'admin',
      is_verified: true
    });

    citizenUser = await User.create({
      email: 'citizen@test.com',
      password_hash: 'hashedpassword',
      role: 'citizen',
      is_verified: true
    });

    // Create test issue
    testIssue = await Issue.create({
      title: 'Test Issue',
      description: 'Test description',
      category: 'roads',
      status: 'reported',
      latitude: 40.7128,
      longitude: -74.0060,
      reporter_id: citizenUser.id,
      flag_count: 3,
      is_hidden: true
    });

    // Create test flags
    await Flag.create({
      issue_id: testIssue.id,
      flagged_by: citizenUser.id,
      reason: 'Spam content',
      flag_type: 'spam'
    });

    // Generate tokens
    adminToken = generateToken(adminUser);
    citizenToken = generateToken(citizenUser);
  });

  afterAll(async () => {
    // Clean up test data
    await AdminLog.destroy({ where: {} });
    await Flag.destroy({ where: {} });
    await Issue.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('Admin Authentication and Authorization', () => {
    test('should require admin role for admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should allow admin access to admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test('should require authentication for admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /api/admin/flagged-issues', () => {
    test('should return flagged issues for review', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('flagged_issues');
      expect(response.body).toHaveProperty('metadata');
      expect(Array.isArray(response.body.flagged_issues)).toBe(true);
    });

    test('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.flagged_issues).toBeDefined();
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues?limit=10&offset=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.metadata).toHaveProperty('limit', 10);
      expect(response.body.metadata).toHaveProperty('offset', 0);
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues?limit=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/admin/issues/:id/review', () => {
    test('should allow admin to approve flagged issue', async () => {
      const response = await request(app)
        .post(`/api/admin/issues/${testIssue.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          reason: 'Issue is valid'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('approved successfully');
      expect(response.body).toHaveProperty('issue');
      expect(response.body).toHaveProperty('review');
    });

    test('should allow admin to reject flagged issue', async () => {
      const response = await request(app)
        .post(`/api/admin/issues/${testIssue.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'reject',
          reason: 'Issue is spam'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('rejected successfully');
    });

    test('should allow admin to delete flagged issue', async () => {
      const response = await request(app)
        .post(`/api/admin/issues/${testIssue.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'delete',
          reason: 'Inappropriate content'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should validate review action', async () => {
      const response = await request(app)
        .post(`/api/admin/issues/${testIssue.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'invalid_action',
          reason: 'Test reason'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate issue ID format', async () => {
      const response = await request(app)
        .post('/api/admin/issues/invalid-id/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          reason: 'Test reason'
        });

      expect(response.status).toBe(400);
    });

    test('should handle non-existent issue', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/admin/issues/${fakeId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          reason: 'Test reason'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('REVIEW_ERROR');
    });
  });

  describe('GET /api/admin/analytics', () => {
    test('should return analytics data', async () => {
      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics).toHaveProperty('issues');
      expect(response.body.analytics).toHaveProperty('flags');
      expect(response.body.analytics).toHaveProperty('users');
    });

    test('should support date filtering', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await request(app)
        .get(`/api/admin/analytics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.filters.start_date).toBe(startDate);
      expect(response.body.filters.end_date).toBe(endDate);
    });

    test('should support category filtering', async () => {
      const response = await request(app)
        .get('/api/admin/analytics?category=roads')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.filters.category).toBe('roads');
    });

    test('should validate date format', async () => {
      const response = await request(app)
        .get('/api/admin/analytics?startDate=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/users', () => {
    test('should return user management data', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('metadata');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('should support filtering by banned status', async () => {
      const response = await request(app)
        .get('/api/admin/users?banned=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
    });

    test('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=citizen')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
    });

    test('should include user statistics', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      if (response.body.users.length > 0) {
        expect(response.body.users[0]).toHaveProperty('stats');
        expect(response.body.users[0].stats).toHaveProperty('issues_reported');
        expect(response.body.users[0].stats).toHaveProperty('flags_submitted');
      }
    });
  });

  describe('POST /api/admin/users/:id/ban', () => {
    test('should allow admin to ban user', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${citizenUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Policy violation'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User banned successfully');
      expect(response.body.user.is_banned).toBe(true);
    });

    test('should prevent banning admin users', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${adminUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test ban'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CANNOT_BAN_ADMIN');
    });

    test('should handle already banned user', async () => {
      // First ban the user
      await User.update({ is_banned: true }, { where: { id: citizenUser.id } });

      const response = await request(app)
        .post(`/api/admin/users/${citizenUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test ban'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('USER_ALREADY_BANNED');
    });

    test('should validate user ID format', async () => {
      const response = await request(app)
        .post('/api/admin/users/invalid-id/ban')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test ban'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/admin/users/:id/unban', () => {
    beforeEach(async () => {
      // Ensure user is banned before unban tests
      await User.update({ is_banned: true }, { where: { id: citizenUser.id } });
    });

    test('should allow admin to unban user', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${citizenUser.id}/unban`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User unbanned successfully');
      expect(response.body.user.is_banned).toBe(false);
    });

    test('should handle user that is not banned', async () => {
      // First unban the user
      await User.update({ is_banned: false }, { where: { id: citizenUser.id } });

      const response = await request(app)
        .post(`/api/admin/users/${citizenUser.id}/unban`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('USER_NOT_BANNED');
    });

    test('should handle non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/admin/users/${fakeId}/unban`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Admin Activity Logging', () => {
    test('should log flag review actions', async () => {
      const response = await request(app)
        .post(`/api/admin/issues/${testIssue.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          reason: 'Valid issue'
        });

      expect(response.status).toBe(200);

      // Check if log was created
      const logs = await AdminLog.findAll({
        where: {
          admin_id: adminUser.id,
          action: 'flag_review',
          target_id: testIssue.id
        }
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].details.review_action).toBe('approve');
    });

    test('should log user ban actions', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${citizenUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Policy violation'
        });

      expect(response.status).toBe(200);

      // Check if log was created
      const logs = await AdminLog.findAll({
        where: {
          admin_id: adminUser.id,
          action: 'user_ban',
          target_id: citizenUser.id
        }
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].details.ban_reason).toBe('Policy violation');
    });

    test('should log user unban actions', async () => {
      // First ban the user
      await User.update({ is_banned: true }, { where: { id: citizenUser.id } });

      const response = await request(app)
        .post(`/api/admin/users/${citizenUser.id}/unban`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Check if log was created
      const logs = await AdminLog.findAll({
        where: {
          admin_id: adminUser.id,
          action: 'user_unban',
          target_id: citizenUser.id
        }
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/admin/logs', () => {
    test('should return admin activity logs', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('metadata');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    test('should support filtering by admin ID', async () => {
      const response = await request(app)
        .get(`/api/admin/logs?adminId=${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
    });

    test('should support filtering by action type', async () => {
      const response = await request(app)
        .get('/api/admin/logs?action=flag_review')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
    });

    test('should support date range filtering', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await request(app)
        .get(`/api/admin/logs?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/admin/logs?adminId=invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/activity-stats', () => {
    test('should return admin activity statistics', async () => {
      const response = await request(app)
        .get('/api/admin/activity-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activity_stats');
      expect(response.body.activity_stats).toHaveProperty('total_actions');
      expect(response.body.activity_stats).toHaveProperty('by_action_type');
      expect(response.body.activity_stats).toHaveProperty('by_admin');
    });

    test('should support filtering by admin ID', async () => {
      const response = await request(app)
        .get(`/api/admin/activity-stats?adminId=${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.filters.admin_id).toBe(adminUser.id);
    });

    test('should support date range filtering', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await request(app)
        .get(`/api/admin/activity-stats?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.filters.start_date).toBe(startDate);
      expect(response.body.filters.end_date).toBe(endDate);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock a database error by using an invalid UUID format in a way that bypasses validation
      jest.spyOn(require('../services/flaggingService'), 'getFlaggedIssues')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/admin/flagged-issues')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('ADMIN_FETCH_ERROR');
    });

    test('should handle validation errors properly', async () => {
      const response = await request(app)
        .post('/api/admin/issues/invalid-uuid/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          reason: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});