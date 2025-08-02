const { sequelize, User, Issue, StatusHistory, Flag } = require('../models');
const GeospatialUtils = require('../utils/geospatial');

describe('Database Models', () => {
  beforeAll(async () => {
    // Test database connection
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('User Model', () => {
    test('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        role: 'citizen',
        is_verified: true
      };

      const user = await User.create(userData);
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.is_verified).toBe(true);
      expect(user.is_banned).toBe(false);

      // Clean up
      await user.destroy();
    });

    test('should create anonymous user without email', async () => {
      const userData = {
        email: null,
        role: 'citizen',
        session_token: 'test_session_123'
      };

      const user = await User.create(userData);
      expect(user.id).toBeDefined();
      expect(user.email).toBeNull();
      expect(user.session_token).toBe(userData.session_token);

      // Clean up
      await user.destroy();
    });
  });

  describe('Issue Model', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'issuetest@example.com',
        role: 'citizen'
      });
    });

    afterEach(async () => {
      await testUser.destroy();
    });

    test('should create an issue with PostGIS location', async () => {
      const issueData = {
        title: 'Test Issue',
        description: 'This is a test issue for database testing',
        category: 'roads',
        latitude: 40.7128,
        longitude: -74.0060,
        reporter_id: testUser.id
      };

      const issue = await Issue.create(issueData);
      expect(issue.id).toBeDefined();
      expect(issue.title).toBe(issueData.title);
      expect(issue.category).toBe(issueData.category);
      expect(issue.status).toBe('reported');
      expect(parseFloat(issue.latitude)).toBe(issueData.latitude);
      expect(parseFloat(issue.longitude)).toBe(issueData.longitude);

      // Clean up
      await issue.destroy();
    });

    test('should validate photo array length', async () => {
      const issueData = {
        title: 'Test Issue',
        description: 'This is a test issue',
        category: 'roads',
        latitude: 40.7128,
        longitude: -74.0060,
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'], // Too many photos
        reporter_id: testUser.id
      };

      await expect(Issue.create(issueData)).rejects.toThrow('Maximum 3 photos allowed per issue');
    });
  });

  describe('Geospatial Utils', () => {
    test('should validate coordinates correctly', () => {
      expect(GeospatialUtils.validateCoordinates(40.7128, -74.0060)).toBe(true);
      expect(GeospatialUtils.validateCoordinates(91, -74.0060)).toBe(false); // Invalid latitude
      expect(GeospatialUtils.validateCoordinates(40.7128, 181)).toBe(false); // Invalid longitude
      expect(GeospatialUtils.validateCoordinates('invalid', -74.0060)).toBe(false); // Non-numeric
    });

    test('should calculate distance between points', async () => {
      // Distance between New York and Los Angeles (approximately 3944 km)
      const distance = await GeospatialUtils.calculateDistance(
        40.7128, -74.0060, // New York
        34.0522, -118.2437 // Los Angeles
      );
      
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    test('should check if point is within radius', async () => {
      // Points very close to each other (should be within 1km)
      const isWithin = await GeospatialUtils.isWithinRadius(
        40.7128, -74.0060,
        40.7130, -74.0062,
        1 // 1km radius
      );
      
      expect(isWithin).toBe(true);
    });
  });

  describe('Model Associations', () => {
    let testUser, testIssue;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'association@example.com',
        role: 'citizen'
      });

      testIssue = await Issue.create({
        title: 'Association Test Issue',
        description: 'Testing model associations',
        category: 'roads',
        latitude: 40.7128,
        longitude: -74.0060,
        reporter_id: testUser.id
      });
    });

    afterEach(async () => {
      await testIssue.destroy();
      await testUser.destroy();
    });

    test('should create status history with associations', async () => {
      const statusHistory = await StatusHistory.create({
        issue_id: testIssue.id,
        previous_status: 'reported',
        new_status: 'in_progress',
        comment: 'Work started',
        updated_by: testUser.id
      });

      expect(statusHistory.id).toBeDefined();
      expect(statusHistory.issue_id).toBe(testIssue.id);
      expect(statusHistory.updated_by).toBe(testUser.id);

      // Test associations
      const issue = await statusHistory.getIssue();
      const updater = await statusHistory.getUpdatedBy();
      
      expect(issue.id).toBe(testIssue.id);
      expect(updater.id).toBe(testUser.id);

      // Clean up
      await statusHistory.destroy();
    });

    test('should create flag with associations', async () => {
      const flag = await Flag.create({
        issue_id: testIssue.id,
        flagged_by: testUser.id,
        reason: 'Test flag',
        flag_type: 'spam'
      });

      expect(flag.id).toBeDefined();
      expect(flag.issue_id).toBe(testIssue.id);
      expect(flag.flagged_by).toBe(testUser.id);

      // Test associations
      const issue = await flag.getIssue();
      const flagger = await flag.getFlagger();
      
      expect(issue.id).toBe(testIssue.id);
      expect(flagger.id).toBe(testUser.id);

      // Clean up
      await flag.destroy();
    });
  });
});