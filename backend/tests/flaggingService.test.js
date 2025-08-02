const { sequelize, User, Issue, Flag } = require('../models');
const FlaggingService = require('../services/flaggingService');

describe('FlaggingService', () => {
  let testUser, testIssue, testAdmin;

  beforeAll(async () => {
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up database
    await Flag.destroy({ where: {}, force: true });
    await Issue.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test data
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

    testIssue = await Issue.create({
      title: 'Test Issue',
      description: 'This is a test issue',
      category: 'roads',
      latitude: 40.7128,
      longitude: -74.0060,
      reporter_id: testUser.id,
      is_anonymous: false
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('flagIssue', () => {
    it('should flag an issue successfully', async () => {
      const result = await FlaggingService.flagIssue(
        testIssue.id,
        testUser.id,
        null,
        'This is spam content',
        'spam'
      );

      expect(result.success).toBe(true);
      expect(result.flag).toHaveProperty('id');
      expect(result.flag.reason).toBe('This is spam content');
      expect(result.issue.flag_count).toBe(1);
      expect(result.issue.is_hidden).toBe(false);
    });

    it('should auto-hide issue when threshold is reached', async () => {
      // Create additional users
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
        const result = await FlaggingService.flagIssue(
          testIssue.id,
          users[i].id,
          null,
          `Flag reason ${i}`,
          'spam'
        );
        
        if (i === 2) { // Third flag should trigger auto-hide
          expect(result.issue.auto_hidden).toBe(true);
          expect(result.issue.is_hidden).toBe(true);
        }
      }
    });

    it('should prevent duplicate flags from same user', async () => {
      // First flag
      await FlaggingService.flagIssue(
        testIssue.id,
        testUser.id,
        null,
        'First flag',
        'spam'
      );

      // Second flag attempt
      const result = await FlaggingService.flagIssue(
        testIssue.id,
        testUser.id,
        null,
        'Second flag',
        'spam'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already flagged');
    });

    it('should prevent users from flagging their own issues', async () => {
      const result = await FlaggingService.flagIssue(
        testIssue.id,
        testUser.id, // Same user who created the issue
        null,
        'Self flag',
        'spam'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot flag your own issue');
    });

    it('should handle anonymous flagging with session token', async () => {
      const result = await FlaggingService.flagIssue(
        testIssue.id,
        null,
        'anonymous-session-123',
        'Anonymous flag',
        'inappropriate'
      );

      expect(result.success).toBe(true);
      expect(result.flag.reason).toBe('Anonymous flag');
    });

    it('should prevent duplicate anonymous flags from same session', async () => {
      const sessionToken = 'anonymous-session-123';

      // First flag
      await FlaggingService.flagIssue(
        testIssue.id,
        null,
        sessionToken,
        'First anonymous flag',
        'spam'
      );

      // Second flag attempt
      const result = await FlaggingService.flagIssue(
        testIssue.id,
        null,
        sessionToken,
        'Second anonymous flag',
        'spam'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already flagged');
    });
  });

  describe('getFlaggedIssues', () => {
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

    it('should get pending flagged issues', async () => {
      const result = await FlaggingService.getFlaggedIssues({
        status: 'pending'
      });

      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].id).toBe(testIssue.id);
      expect(result.issues[0].flags).toHaveLength(1);
    });

    it('should filter by flag type', async () => {
      const result = await FlaggingService.getFlaggedIssues({
        flagType: 'spam'
      });

      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].flags[0].flag_type).toBe('spam');
    });

    it('should paginate results', async () => {
      const result = await FlaggingService.getFlaggedIssues({
        limit: 1,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.metadata.limit).toBe(1);
      expect(result.metadata.offset).toBe(0);
    });
  });

  describe('reviewFlaggedIssue', () => {
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

    it('should approve flagged issue', async () => {
      const result = await FlaggingService.reviewFlaggedIssue(
        testIssue.id,
        testAdmin.id,
        'approve',
        'Content is appropriate'
      );

      expect(result.success).toBe(true);
      expect(result.review.action).toBe('approve');
      
      // Check if issue is no longer hidden
      const updatedIssue = await Issue.findByPk(testIssue.id);
      expect(updatedIssue.is_hidden).toBe(false);
      
      // Check if flags are marked as reviewed
      const flags = await Flag.findAll({
        where: { issue_id: testIssue.id }
      });
      flags.forEach(flag => {
        expect(flag.reviewed_at).toBeTruthy();
        expect(flag.reviewed_by).toBe(testAdmin.id);
        expect(flag.review_action).toBe('approve');
      });
    });

    it('should reject flagged issue', async () => {
      const result = await FlaggingService.reviewFlaggedIssue(
        testIssue.id,
        testAdmin.id,
        'reject',
        'Content is inappropriate'
      );

      expect(result.success).toBe(true);
      expect(result.review.action).toBe('reject');
      
      // Check if issue remains hidden
      const updatedIssue = await Issue.findByPk(testIssue.id);
      expect(updatedIssue.is_hidden).toBe(true);
    });

    it('should delete flagged issue', async () => {
      const result = await FlaggingService.reviewFlaggedIssue(
        testIssue.id,
        testAdmin.id,
        'delete',
        'Content violates terms'
      );

      expect(result.success).toBe(true);
      expect(result.review.action).toBe('delete');
      
      // Check if issue remains hidden (soft delete)
      const updatedIssue = await Issue.findByPk(testIssue.id);
      expect(updatedIssue.is_hidden).toBe(true);
    });

    it('should handle non-existent issue', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const result = await FlaggingService.reviewFlaggedIssue(
        fakeId,
        testAdmin.id,
        'approve',
        'Test comment'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getUserFlaggingStats', () => {
    beforeEach(async () => {
      // Create multiple flags for user
      await Flag.create({
        issue_id: testIssue.id,
        flagged_by: testUser.id,
        reason: 'Spam flag',
        flag_type: 'spam'
      });

      // Create another issue and flag
      const anotherIssue = await Issue.create({
        title: 'Another Issue',
        description: 'Another test issue',
        category: 'lighting',
        latitude: 40.7128,
        longitude: -74.0060,
        reporter_id: testAdmin.id,
        is_anonymous: false
      });

      await Flag.create({
        issue_id: anotherIssue.id,
        flagged_by: testUser.id,
        reason: 'Inappropriate flag',
        flag_type: 'inappropriate'
      });
    });

    it('should get user flagging statistics', async () => {
      const result = await FlaggingService.getUserFlaggingStats(testUser.id);

      expect(result.success).toBe(true);
      expect(result.stats.total_flags).toBe(2);
      expect(result.stats.by_type.spam).toBe(1);
      expect(result.stats.by_type.inappropriate).toBe(1);
    });

    it('should handle user with no flags', async () => {
      const result = await FlaggingService.getUserFlaggingStats(testAdmin.id);

      expect(result.success).toBe(true);
      expect(result.stats.total_flags).toBe(0);
      expect(result.stats.by_type).toEqual({});
    });
  });

  describe('checkUserForBan', () => {
    it('should recommend ban for excessive flagging', async () => {
      // Create many flags for user
      for (let i = 0; i < 12; i++) {
        const issue = await Issue.create({
          title: `Issue ${i}`,
          description: `Test issue ${i}`,
          category: 'roads',
          latitude: 40.7128,
          longitude: -74.0060,
          reporter_id: testAdmin.id,
          is_anonymous: false
        });

        await Flag.create({
          issue_id: issue.id,
          flagged_by: testUser.id,
          reason: `Flag ${i}`,
          flag_type: 'spam'
        });
      }

      const result = await FlaggingService.checkUserForBan(testUser.id);

      expect(result.success).toBe(true);
      expect(result.should_ban).toBe(true);
      expect(result.stats.recent_flags).toBeGreaterThan(10);
    });

    it('should not recommend ban for normal flagging', async () => {
      // Create a few flags
      await Flag.create({
        issue_id: testIssue.id,
        flagged_by: testUser.id,
        reason: 'Valid flag',
        flag_type: 'spam'
      });

      const result = await FlaggingService.checkUserForBan(testUser.id);

      expect(result.success).toBe(true);
      expect(result.should_ban).toBe(false);
      expect(result.stats.recent_flags).toBeLessThanOrEqual(10);
    });

    it('should recommend ban for high rejection rate', async () => {
      // Create flags that will be marked as rejected (approved issues)
      for (let i = 0; i < 6; i++) {
        const issue = await Issue.create({
          title: `Issue ${i}`,
          description: `Test issue ${i}`,
          category: 'roads',
          latitude: 40.7128,
          longitude: -74.0060,
          reporter_id: testAdmin.id,
          is_anonymous: false
        });

        await Flag.create({
          issue_id: issue.id,
          flagged_by: testUser.id,
          reason: `Flag ${i}`,
          flag_type: 'spam',
          reviewed_at: new Date(),
          reviewed_by: testAdmin.id,
          review_action: 'approved' // This means the flag was invalid
        });
      }

      const result = await FlaggingService.checkUserForBan(testUser.id);

      expect(result.success).toBe(true);
      expect(result.should_ban).toBe(true);
      expect(result.stats.rejection_rate).toBeGreaterThan(0.8);
    });
  });
});