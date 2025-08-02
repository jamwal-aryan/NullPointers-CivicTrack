const request = require('supertest');
const app = require('../server');
const { sequelize, User, Issue, Flag } = require('../models');
const jwt = require('jsonwebtoken');

describe('Content Flagging System', () => {
  let testUser, testAdmin, testIssue, authToken, adminToken;

  beforeAll(async () => {
    // Ensure database is connected
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up database
    await Flag.destroy({ where: {}, force: true });
    await Issue.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test users
    testUser = await User.create({
      email: 'testuser@example.com',
      password_hash: 'hashedpassword',
      role: 'citizen',
      is_verified: true
    });

    testAdmin = await User.create({
      email: 'admin@example.com',
      password_hash: 'hashedpassword',
      role: 'admin',
      is_verified: true
    });

    // Create test issue
    testIssue = await Issue.create({
      title: 'Test Issue',
      description: 'This is a test issue for flagging',
      category: 'roads',
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

    adminToken = jwt.sign(
      { userId: testAdmin.id, role: testAdmin.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/issues/:id/flag', () => {
    it('should flag an issue successfully', async () => {
      const response = await request(app)
        .post(`/api/issues/${testIssue.id}/flag`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .send({
          reason: 'This is spam content',
          flag_type: 'spam'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Issue flagged successfully');
      expect(response.body.flag).toHaveProperty('id');
      expect(response.body.flag.reason).toBe('This is spam content');
      expect(response.body.issue.flag_count).toBe(1);
    });

    it('should prevent duplicate flags from same user', async () => {
      // First flag
      await request(app)
        .post(`/api/issues/${testIssue.id}/flag`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .send({
          reason: 'This is spam content',
          flag_type: 'spam'
        });

      // Second flag attempt
      const response = await request(app)
        .post(`/api/issues/${testIssue.id}/flag`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .send({
          reason: 'This is still spam',
          flag_type: 'spam'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('already flagged');
    });

    it('should auto-hide issue when flag threshold is reached', async () => {
      // Create additional users to reach threshold
      const users = [];
      for (let i = 0; i < 3; i++) {
        const user = await User.create({
          email: `user${i}@example.com`,
          password_hash: 'hashedpassword',
          role: 'citizen',
          is_verified: true
        });
        users.push(user);
      }

      // Flag from multiple users
      for (let i = 0; i < 3; i++) {
        const token = jwt.sign(
          { userId: users[i].id, role: users[i].role },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        await request(app)
          .post(`/api/issues/${testIssue.id}/flag`)
          .set('Authorization', `Bearer ${token}`)
          .query({
            userLat: 40.7128,
            userLng: -74.0060
          })
          .send({
            reason: `Flag reason ${i}`,
            flag_type: 'spam'
          });
      }

      // Check if issue is hidden
      const updatedIssue = await Issue.findByPk(testIssue.id);
      expect(updatedIssue.is_hidden).toBe(true);
      expect(updatedIssue.flag_count).toBe(3);
    });

    it('should validate flag reason length', async () => {
      const response = await request(app)
        .post(`/api/issues/${testIssue.id}/flag`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          userLat: 40.7128,
          userLng: -74.0060
        })
        .send({
          reason: 'ab', // Too short
          flag_type: 'spam'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce location-based access control', async () => {
      const response = await request(app)
        .post(`/api/issues/${testIssue.id}/flag`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          userLat: 50.0, // Too far from issue
          userLng: 50.0
        })
        .send({
          reason: 'This is spam content',
          flag_type: 'spam'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('GET /api/admin/flagged-issues', () => {
    beforeEach(async () => {
      // Create flagged issue
      await Flag.create({
        issue_id: testIssue.id,
        flagged_by: testUser.id,
        reason: 'Test flag',
        flag_type: 'spam'
      });
      
      await testIssue.update({
        flag_count: 3,
        is_hidden: true
      });
    });

    it('should get flagged issues for admin', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.flagged_issues).toHaveLength(1);
      expect(response.body.flagged_issues[0].id).toBe(testIssue.id);
      expect(response.body.flagged_issues[0].flags).toHaveLength(1);
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should filter flagged issues by status', async () => {
      const response = await request(app)
        .get('/api/admin/flagged-issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body.flagged_issues).toHaveLength(1);
    });
  });

  describe('POST /api/admin/issues/:id/review', () => {
    let flaggedIssue;

    beforeEach(async () => {
      // Create flagged issue
      await Flag.create({
        issue_id: testIssue.id,
        flagged_by: testUser.id,
        reason: 'Test flag',
        flag_type: 'spam'
      });
      
      flaggedIssue = await testIssue.update({
        flag_count: 3,
        is_hidden: true
      });
    });

    it('should approve flagged issue', async () => {
      const response = await request(app)
        .post(`/api/admin/issues/${testIssue.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          reason: 'Content is appropriate'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('approved');
      
      // Check if issue is no longer hidden
      const updatedIssue = await Issue.findByPk(testIssue.id);
      expect(updatedIssue.is_hidden).toBe(false);
    });

    it('should reject flagged issue', async () => {
      const response = await request(app)
        .post(`/api/admin/issues/${testIssue.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'reject',
          reason: 'Content is inappropriate'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('rejected');
      
      // Check if issue remains hidden
      const updatedIssue = await Issue.findByPk(testIssue.id);
      expect(updatedIssue.is_hidden).toBe(true);
    });

    it('should delete flagged issue', async () => {
      const response = await request(app)
        .post(`/api/admin/issues/${testIssue.id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'delete',
          reason: 'Content violates terms'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should validate review action', async () => {
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
  });

  describe('POST /api/admin/users/:id/ban', () => {
    it('should ban a user successfully', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${testUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Repeated policy violations'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User banned successfully');
      expect(response.body.user.is_banned).toBe(true);
      
      // Check if user's issues are hidden
      const userIssues = await Issue.findAll({
        where: { reporter_id: testUser.id }
      });
      userIssues.forEach(issue => {
        expect(issue.is_hidden).toBe(true);
      });
    });

    it('should prevent banning admin users', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${testAdmin.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test ban'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CANNOT_BAN_ADMIN');
    });

    it('should prevent duplicate bans', async () => {
      // First ban
      await testUser.update({ is_banned: true });

      const response = await request(app)
        .post(`/api/admin/users/${testUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test ban'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('USER_ALREADY_BANNED');
    });
  });

  describe('GET /api/admin/analytics', () => {
    beforeEach(async () => {
      // Create test data for analytics
      await Flag.create({
        issue_id: testIssue.id,
        flagged_by: testUser.id,
        reason: 'Test flag',
        flag_type: 'spam'
      });
    });

    it('should get analytics data', async () => {
      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.analytics).toHaveProperty('issues');
      expect(response.body.analytics).toHaveProperty('flags');
      expect(response.body.analytics).toHaveProperty('users');
      expect(response.body.analytics.issues.total).toBeGreaterThan(0);
      expect(response.body.analytics.flags.total).toBeGreaterThan(0);
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.filters.start_date).toBeTruthy();
      expect(response.body.filters.end_date).toBeTruthy();
    });
  });
});