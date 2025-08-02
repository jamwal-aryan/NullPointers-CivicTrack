const request = require('supertest');
const app = require('../server');
const { sequelize, User, Issue, StatusHistory } = require('../models');
const { generateToken, generateSessionToken } = require('../middleware/auth');

describe('Issue Management API Endpoints', () => {
  let testUser, authorityUser, adminUser;
  let testIssue;
  let userToken, authorityToken, adminToken, anonymousToken;
  
  // Test coordinates (San Francisco area)
  const testLocation = {
    latitude: 37.7749,
    longitude: -122.4194
  };
  
  const nearbyLocation = {
    latitude: 37.7849, // ~1km away
    longitude: -122.4094
  };
  
  const farLocation = {
    latitude: 37.8749, // ~10km away
    longitude: -122.3194
  };

  beforeAll(async () => {
    // Ensure database is connected
    await sequelize.authenticate();
    
    // Create test users
    testUser = await User.create({
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'citizen',
      is_verified: true
    });
    
    authorityUser = await User.create({
      email: 'authority@example.com',
      password_hash: 'hashedpassword',
      role: 'authority',
      is_verified: true
    });
    
    adminUser = await User.create({
      email: 'admin@example.com',
      password_hash: 'hashedpassword',
      role: 'admin',
      is_verified: true
    });
    
    // Generate tokens
    userToken = generateToken(testUser);
    authorityToken = generateToken(authorityUser);
    adminToken = generateToken(adminUser);
    anonymousToken = generateSessionToken();
    
    // Create a test issue
    testIssue = await Issue.create({
      title: 'Test Road Damage',
      description: 'Large pothole causing traffic issues',
      category: 'roads',
      latitude: testLocation.latitude,
      longitude: testLocation.longitude,
      address: '123 Test Street, San Francisco, CA',
      photos: ['https://example.com/photo1.jpg'],
      reporter_id: testUser.id,
      is_anonymous: false,
      status: 'reported'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await StatusHistory.destroy({ where: {} });
    await Issue.destroy({ where: {} });
    await User.destroy({ where: {} });
    await sequelize.close();
  });

  describe('POST /api/issues', () => {
    const validIssueData = {
      title: 'Broken Street Light',
      description: 'Street light has been out for several days, creating safety concerns',
      category: 'lighting',
      latitude: testLocation.latitude,
      longitude: testLocation.longitude,
      address: '456 Test Avenue, San Francisco, CA',
      photos: ['https://example.com/light.jpg'],
      isAnonymous: false
    };

    test('should create issue with authenticated user', async () => {
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validIssueData)
        .expect(201);

      expect(response.body.message).toBe('Issue created successfully');
      expect(response.body.issue).toHaveProperty('id');
      expect(response.body.issue.title).toBe(validIssueData.title);
      expect(response.body.issue.status).toBe('reported');
      expect(response.body.issue.is_anonymous).toBe(false);
    });

    test('should create anonymous issue', async () => {
      const anonymousIssueData = {
        ...validIssueData,
        title: 'Anonymous Water Leak',
        isAnonymous: true
      };

      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${anonymousToken}`)
        .send(anonymousIssueData)
        .expect(201);

      expect(response.body.issue.is_anonymous).toBe(true);
      expect(response.body.issue.reporter).toBeNull();
    });

    test('should create issue without authentication (anonymous)', async () => {
      const response = await request(app)
        .post('/api/issues')
        .send({
          ...validIssueData,
          title: 'Unauthenticated Issue',
          isAnonymous: true
        })
        .expect(201);

      expect(response.body.issue.is_anonymous).toBe(true);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test',
          description: 'Short'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeInstanceOf(Array);
    });

    test('should validate coordinates', async () => {
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...validIssueData,
          latitude: 91, // Invalid latitude
          longitude: -122.4194
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate category', async () => {
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...validIssueData,
          category: 'invalid_category'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should limit photos to maximum 3', async () => {
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...validIssueData,
          photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg']
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/issues', () => {
    test('should get issues within radius', async () => {
      const response = await request(app)
        .get('/api/issues')
        .query({
          lat: testLocation.latitude,
          lng: testLocation.longitude,
          radius: 3
        })
        .expect(200);

      expect(response.body.issues).toBeInstanceOf(Array);
      expect(response.body.metadata).toHaveProperty('total');
      expect(response.body.metadata).toHaveProperty('radius');
      expect(response.body.metadata.radius).toBe(3);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/issues')
        .query({
          lat: testLocation.latitude,
          lng: testLocation.longitude,
          status: 'reported'
        })
        .expect(200);

      expect(response.body.issues.every(issue => issue.status === 'reported')).toBe(true);
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get('/api/issues')
        .query({
          lat: testLocation.latitude,
          lng: testLocation.longitude,
          category: 'roads'
        })
        .expect(200);

      expect(response.body.issues.every(issue => issue.category === 'roads')).toBe(true);
    });

    test('should filter by multiple categories', async () => {
      const response = await request(app)
        .get('/api/issues')
        .query({
          lat: testLocation.latitude,
          lng: testLocation.longitude,
          category: 'roads,lighting'
        })
        .expect(200);

      expect(response.body.issues.every(issue => 
        ['roads', 'lighting'].includes(issue.category)
      )).toBe(true);
    });

    test('should include distance information', async () => {
      const response = await request(app)
        .get('/api/issues')
        .query({
          lat: testLocation.latitude,
          lng: testLocation.longitude,
          radius: 5
        })
        .expect(200);

      if (response.body.issues.length > 0) {
        expect(response.body.issues[0]).toHaveProperty('distance_km');
        expect(response.body.issues[0]).toHaveProperty('distance_meters');
      }
    });

    test('should validate coordinates', async () => {
      const response = await request(app)
        .get('/api/issues')
        .query({
          lat: 91, // Invalid latitude
          lng: -122.4194
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate radius bounds', async () => {
      const response = await request(app)
        .get('/api/issues')
        .query({
          lat: testLocation.latitude,
          lng: testLocation.longitude,
          radius: 10 // Exceeds maximum
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/issues')
        .query({
          lat: testLocation.latitude,
          lng: testLocation.longitude,
          limit: 10,
          offset: 0
        })
        .expect(200);

      expect(response.body.metadata.limit).toBe(10);
      expect(response.body.metadata.offset).toBe(0);
    });
  });

  describe('GET /api/issues/:id', () => {
    test('should get issue details within radius', async () => {
      const response = await request(app)
        .get(`/api/issues/${testIssue.id}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .expect(200);

      expect(response.body.issue.id).toBe(testIssue.id);
      expect(response.body.issue).toHaveProperty('title');
      expect(response.body.issue).toHaveProperty('description');
      expect(response.body.issue).toHaveProperty('statusHistory');
    });

    test('should include distance information', async () => {
      const response = await request(app)
        .get(`/api/issues/${testIssue.id}`)
        .query({
          userLat: nearbyLocation.latitude,
          userLng: nearbyLocation.longitude
        })
        .expect(200);

      expect(response.body.issue.distance).toHaveProperty('km');
      expect(response.body.issue.distance).toHaveProperty('meters');
    });

    test('should deny access to issues outside radius', async () => {
      const response = await request(app)
        .get(`/api/issues/${testIssue.id}`)
        .query({
          userLat: farLocation.latitude,
          userLng: farLocation.longitude
        })
        .expect(403);

      expect(response.body.error.code).toBe('LOCATION_ACCESS_DENIED');
    });

    test('should return 404 for non-existent issue', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/issues/${fakeId}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .expect(404);

      expect(response.body.error.code).toBe('ISSUE_NOT_FOUND');
    });

    test('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/issues/invalid-uuid')
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should require user location', async () => {
      const response = await request(app)
        .get(`/api/issues/${testIssue.id}`)
        .expect(400);

      expect(response.body.error.code).toBe('USER_LOCATION_REQUIRED');
    });
  });

  describe('PATCH /api/issues/:id/status', () => {
    test('should update status with authority role', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .send({
          status: 'in_progress',
          comment: 'Work has begun on this issue'
        })
        .expect(200);

      expect(response.body.message).toBe('Issue status updated successfully');
      expect(response.body.issue.status).toBe('in_progress');
      expect(response.body.issue.statusHistory).toBeInstanceOf(Array);
      expect(response.body.issue.statusHistory[0].new_status).toBe('in_progress');
    });

    test('should update status with admin role', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .send({
          status: 'resolved',
          comment: 'Issue has been resolved'
        })
        .expect(200);

      expect(response.body.issue.status).toBe('resolved');
    });

    test('should deny access to regular users', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .send({
          status: 'in_progress',
          comment: 'Trying to update status'
        })
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should deny access to anonymous users', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .send({
          status: 'in_progress',
          comment: 'Anonymous update attempt'
        })
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    test('should validate status values', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .send({
          status: 'invalid_status',
          comment: 'Valid comment'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should require comment', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .send({
          status: 'in_progress'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should validate comment length', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .send({
          status: 'in_progress',
          comment: 'Too short'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should deny access to issues outside radius', async () => {
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({
          userLat: farLocation.latitude,
          userLng: farLocation.longitude
        })
        .send({
          status: 'in_progress',
          comment: 'Trying to update from far location'
        })
        .expect(403);

      expect(response.body.error.code).toBe('LOCATION_ACCESS_DENIED');
    });

    test('should prevent duplicate status updates', async () => {
      // First, set issue to a known status
      await testIssue.update({ status: 'reported' });
      
      const response = await request(app)
        .patch(`/api/issues/${testIssue.id}/status`)
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .send({
          status: 'reported', // Same status
          comment: 'Trying to set same status'
        })
        .expect(400);

      expect(response.body.error.code).toBe('STATUS_UNCHANGED');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the error handling middleware works
      const response = await request(app)
        .get('/api/issues/invalid-uuid-format')
        .query({
          userLat: testLocation.latitude,
          userLng: testLocation.longitude
        })
        .expect(400);

      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
    });
  });
});