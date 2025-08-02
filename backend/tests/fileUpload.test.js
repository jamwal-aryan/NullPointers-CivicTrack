const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../server');
const { initializeDatabase } = require('../models');
const fileService = require('../services/fileService');

describe('File Upload System', () => {
  let testUser;
  let authToken;
  
  beforeAll(async () => {
    // Initialize database
    await initializeDatabase();
    
    // Create test user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'TestPassword123!',
        role: 'citizen'
      });
    
    testUser = userResponse.body.user;
    authToken = userResponse.body.token;
  });

  describe('Issue Photo Upload', () => {
    test('should upload photos with issue creation', async () => {
      // Create a test image buffer
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Issue with Photos')
        .field('description', 'This is a test issue with photo uploads')
        .field('category', 'roads')
        .field('latitude', '40.7128')
        .field('longitude', '-74.0060')
        .field('userLat', '40.7128')
        .field('userLng', '-74.0060')
        .attach('photos', testImageBuffer, 'test-image.jpg')
        .expect(201);

      expect(response.body.issue).toBeDefined();
      expect(response.body.issue.photos).toHaveLength(1);
      expect(response.body.issue.photos[0]).toHaveProperty('filename');
      expect(response.body.issue.photos[0]).toHaveProperty('url');
      expect(response.body.issue.photos[0]).toHaveProperty('originalName', 'test-image.jpg');
    });

    test('should reject files that are too large', async () => {
      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
      
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Issue')
        .field('description', 'This is a test issue')
        .field('category', 'roads')
        .field('latitude', '40.7128')
        .field('longitude', '-74.0060')
        .field('userLat', '40.7128')
        .field('userLng', '-74.0060')
        .attach('photos', largeBuffer, 'large-image.jpg')
        .expect(400);

      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });

    test('should reject more than 3 photos', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Issue')
        .field('description', 'This is a test issue')
        .field('category', 'roads')
        .field('latitude', '40.7128')
        .field('longitude', '-74.0060')
        .field('userLat', '40.7128')
        .field('userLng', '-74.0060')
        .attach('photos', testImageBuffer, 'test1.jpg')
        .attach('photos', testImageBuffer, 'test2.jpg')
        .attach('photos', testImageBuffer, 'test3.jpg')
        .attach('photos', testImageBuffer, 'test4.jpg')
        .expect(400);

      expect(response.body.error.code).toBe('TOO_MANY_FILES');
    });

    test('should reject invalid file types', async () => {
      const testBuffer = Buffer.from('fake-text-data');
      
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Issue')
        .field('description', 'This is a test issue')
        .field('category', 'roads')
        .field('latitude', '40.7128')
        .field('longitude', '-74.0060')
        .field('userLat', '40.7128')
        .field('userLng', '-74.0060')
        .attach('photos', testBuffer, 'test.txt')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_FILE_EXTENSION');
    });
  });

  describe('File Serving', () => {
    let testFilePath;

    beforeAll(async () => {
      // Create a test file
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Issue for File Serving')
        .field('description', 'This is a test issue for file serving')
        .field('category', 'roads')
        .field('latitude', '40.7128')
        .field('longitude', '-74.0060')
        .field('userLat', '40.7128')
        .field('userLng', '-74.0060')
        .attach('photos', testImageBuffer, 'serve-test.jpg');

      testFilePath = response.body.issue.photos[0].path;
    });

    test('should serve uploaded files', async () => {
      const response = await request(app)
        .get(`/api/files/${testFilePath}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    test('should return 404 for non-existent files', async () => {
      const response = await request(app)
        .get('/api/files/non-existent/file.jpg')
        .expect(404);

      expect(response.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('File Service', () => {
    test('should check if file exists', async () => {
      const exists = await fileService.fileExists('non-existent-file.jpg');
      expect(exists).toBe(false);
    });

    test('should generate public URLs', () => {
      const url = fileService.generatePublicUrl('test/path/file.jpg');
      expect(url).toBe('/api/files/test/path/file.jpg');
    });

    test('should validate file access', async () => {
      const hasAccess = await fileService.validateFileAccess('../../../etc/passwd');
      expect(hasAccess).toBe(false);
    });
  });

  describe('File Management (Admin)', () => {
    let adminToken;

    beforeAll(async () => {
      // Create admin user
      const adminResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!',
          role: 'admin'
        });
      
      adminToken = adminResponse.body.token;
    });

    test('should allow admin to get file info', async () => {
      // First create a file
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const issueResponse = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Issue for Admin')
        .field('description', 'This is a test issue for admin operations')
        .field('category', 'roads')
        .field('latitude', '40.7128')
        .field('longitude', '-74.0060')
        .field('userLat', '40.7128')
        .field('userLng', '-74.0060')
        .attach('photos', testImageBuffer, 'admin-test.jpg');

      const filePath = issueResponse.body.issue.photos[0].path;

      const response = await request(app)
        .get(`/api/files/info/${filePath}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.file).toBeDefined();
      expect(response.body.file.path).toBe(filePath);
      expect(response.body.file.size).toBeGreaterThan(0);
    });

    test('should deny non-admin access to file info', async () => {
      const response = await request(app)
        .get('/api/files/info/some/path.jpg')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});