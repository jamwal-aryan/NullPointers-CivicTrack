const IssueValidation = require('../middleware/issueValidation');
const { validationResult } = require('express-validator');

// Mock request and response objects for testing
const createMockReq = (body = {}, query = {}, params = {}) => ({
  body,
  query,
  params
});

const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

const createMockNext = () => jest.fn();

// Helper function to run validation and get errors
const runValidation = async (validationRules, req) => {
  for (const rule of validationRules) {
    await rule.run(req);
  }
  return validationResult(req);
};

describe('Issue Validation Middleware', () => {
  
  describe('createIssue validation', () => {
    const validIssueData = {
      title: 'Test Issue Title',
      description: 'This is a detailed description of the test issue that is long enough to pass validation',
      category: 'roads',
      latitude: 37.7749,
      longitude: -122.4194,
      address: '123 Test Street, San Francisco, CA',
      photos: ['https://example.com/photo1.jpg'],
      isAnonymous: false
    };

    test('should pass validation with valid data', async () => {
      const req = createMockReq(validIssueData);
      const result = await runValidation(IssueValidation.createIssue(), req);
      
      expect(result.isEmpty()).toBe(true);
    });

    test('should fail validation with short title', async () => {
      const req = createMockReq({
        ...validIssueData,
        title: 'Hi' // Too short
      });
      const result = await runValidation(IssueValidation.createIssue(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'title')).toBe(true);
    });

    test('should fail validation with long title', async () => {
      const req = createMockReq({
        ...validIssueData,
        title: 'A'.repeat(201) // Too long
      });
      const result = await runValidation(IssueValidation.createIssue(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'title')).toBe(true);
    });

    test('should fail validation with short description', async () => {
      const req = createMockReq({
        ...validIssueData,
        description: 'Too short' // Less than 10 characters
      });
      const result = await runValidation(IssueValidation.createIssue(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'description')).toBe(true);
    });

    test('should fail validation with invalid category', async () => {
      const req = createMockReq({
        ...validIssueData,
        category: 'invalid_category'
      });
      const result = await runValidation(IssueValidation.createIssue(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'category')).toBe(true);
    });

    test('should fail validation with invalid latitude', async () => {
      const req = createMockReq({
        ...validIssueData,
        latitude: 91 // Invalid latitude
      });
      const result = await runValidation(IssueValidation.createIssue(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'latitude')).toBe(true);
    });

    test('should fail validation with invalid longitude', async () => {
      const req = createMockReq({
        ...validIssueData,
        longitude: 181 // Invalid longitude
      });
      const result = await runValidation(IssueValidation.createIssue(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'longitude')).toBe(true);
    });

    test('should fail validation with too many photos', async () => {
      const req = createMockReq({
        ...validIssueData,
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'] // More than 3
      });
      const result = await runValidation(IssueValidation.createIssue(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'photos')).toBe(true);
    });

    test('should pass validation with valid categories', async () => {
      const validCategories = ['roads', 'lighting', 'water', 'cleanliness', 'safety', 'obstructions'];
      
      for (const category of validCategories) {
        const req = createMockReq({
          ...validIssueData,
          category
        });
        const result = await runValidation(IssueValidation.createIssue(), req);
        
        expect(result.isEmpty()).toBe(true);
      }
    });
  });

  describe('getIssues validation', () => {
    const validQueryParams = {
      lat: '37.7749',
      lng: '-122.4194',
      radius: '3',
      status: 'reported',
      category: 'roads',
      limit: '50',
      offset: '0'
    };

    test('should pass validation with valid query parameters', async () => {
      const req = createMockReq({}, validQueryParams);
      const result = await runValidation(IssueValidation.getIssues(), req);
      
      expect(result.isEmpty()).toBe(true);
    });

    test('should fail validation with invalid latitude', async () => {
      const req = createMockReq({}, {
        ...validQueryParams,
        lat: '91' // Invalid latitude
      });
      const result = await runValidation(IssueValidation.getIssues(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'lat')).toBe(true);
    });

    test('should fail validation with invalid radius', async () => {
      const req = createMockReq({}, {
        ...validQueryParams,
        radius: '10' // Exceeds maximum
      });
      const result = await runValidation(IssueValidation.getIssues(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'radius')).toBe(true);
    });

    test('should fail validation with invalid status', async () => {
      const req = createMockReq({}, {
        ...validQueryParams,
        status: 'invalid_status'
      });
      const result = await runValidation(IssueValidation.getIssues(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'status')).toBe(true);
    });

    test('should pass validation with multiple valid statuses', async () => {
      const req = createMockReq({}, {
        ...validQueryParams,
        status: 'reported,in_progress,resolved'
      });
      const result = await runValidation(IssueValidation.getIssues(), req);
      
      expect(result.isEmpty()).toBe(true);
    });

    test('should fail validation with mixed valid and invalid statuses', async () => {
      const req = createMockReq({}, {
        ...validQueryParams,
        status: 'reported,invalid_status'
      });
      const result = await runValidation(IssueValidation.getIssues(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'status')).toBe(true);
    });

    test('should pass validation with multiple valid categories', async () => {
      const req = createMockReq({}, {
        ...validQueryParams,
        category: 'roads,lighting,water'
      });
      const result = await runValidation(IssueValidation.getIssues(), req);
      
      expect(result.isEmpty()).toBe(true);
    });

    test('should fail validation with invalid limit', async () => {
      const req = createMockReq({}, {
        ...validQueryParams,
        limit: '101' // Exceeds maximum
      });
      const result = await runValidation(IssueValidation.getIssues(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'limit')).toBe(true);
    });
  });

  describe('getIssueById validation', () => {
    test('should pass validation with valid UUID', async () => {
      const req = createMockReq({}, {}, { id: '123e4567-e89b-12d3-a456-426614174000' });
      const result = await runValidation(IssueValidation.getIssueById(), req);
      
      expect(result.isEmpty()).toBe(true);
    });

    test('should fail validation with invalid UUID', async () => {
      const req = createMockReq({}, {}, { id: 'invalid-uuid' });
      const result = await runValidation(IssueValidation.getIssueById(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'id')).toBe(true);
    });
  });

  describe('updateIssueStatus validation', () => {
    const validStatusData = {
      status: 'in_progress',
      comment: 'Work has begun on this issue and we expect completion soon'
    };

    test('should pass validation with valid data', async () => {
      const req = createMockReq(validStatusData, {}, { id: '123e4567-e89b-12d3-a456-426614174000' });
      const result = await runValidation(IssueValidation.updateIssueStatus(), req);
      
      expect(result.isEmpty()).toBe(true);
    });

    test('should fail validation with invalid status', async () => {
      const req = createMockReq({
        ...validStatusData,
        status: 'invalid_status'
      }, {}, { id: '123e4567-e89b-12d3-a456-426614174000' });
      const result = await runValidation(IssueValidation.updateIssueStatus(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'status')).toBe(true);
    });

    test('should fail validation with short comment', async () => {
      const req = createMockReq({
        ...validStatusData,
        comment: 'Hi' // Too short
      }, {}, { id: '123e4567-e89b-12d3-a456-426614174000' });
      const result = await runValidation(IssueValidation.updateIssueStatus(), req);
      
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(error => error.path === 'comment')).toBe(true);
    });

    test('should pass validation with all valid statuses', async () => {
      const validStatuses = ['reported', 'in_progress', 'resolved'];
      
      for (const status of validStatuses) {
        const req = createMockReq({
          ...validStatusData,
          status
        }, {}, { id: '123e4567-e89b-12d3-a456-426614174000' });
        const result = await runValidation(IssueValidation.updateIssueStatus(), req);
        
        expect(result.isEmpty()).toBe(true);
      }
    });
  });

  describe('sanitizeInput middleware', () => {
    test('should sanitize string fields', () => {
      const req = createMockReq({
        title: '  Test Title  ',
        description: '  Test Description  ',
        comment: '  Test Comment  '
      });
      const res = createMockRes();
      const next = createMockNext();

      IssueValidation.sanitizeInput(req, res, next);

      expect(req.body.title).toBe('Test Title');
      expect(req.body.description).toBe('Test Description');
      expect(req.body.comment).toBe('Test Comment');
      expect(next).toHaveBeenCalled();
    });

    test('should convert numeric fields to numbers', () => {
      const req = createMockReq({
        latitude: '37.7749',
        longitude: '-122.4194'
      }, {
        radius: '3',
        limit: '50'
      });
      const res = createMockRes();
      const next = createMockNext();

      IssueValidation.sanitizeInput(req, res, next);

      expect(typeof req.body.latitude).toBe('number');
      expect(typeof req.body.longitude).toBe('number');
      expect(typeof req.query.radius).toBe('number');
      expect(typeof req.query.limit).toBe('number');
      expect(next).toHaveBeenCalled();
    });

    test('should convert boolean fields properly', () => {
      const req = createMockReq({
        isAnonymous: 'true'
      });
      const res = createMockRes();
      const next = createMockNext();

      IssueValidation.sanitizeInput(req, res, next);

      expect(typeof req.body.isAnonymous).toBe('boolean');
      expect(req.body.isAnonymous).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    test('should remove potentially harmful content', () => {
      const req = createMockReq({
        title: 'Test <script>alert("xss")</script> Title',
        description: 'Test javascript:void(0) Description'
      });
      const res = createMockRes();
      const next = createMockNext();

      IssueValidation.sanitizeInput(req, res, next);

      expect(req.body.title).not.toContain('<script>');
      expect(req.body.description).not.toContain('javascript:');
      expect(next).toHaveBeenCalled();
    });
  });
});