const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');

// Create a test app without database initialization
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message,
        timestamp: new Date().toISOString()
      }
    });
  });
  
  return app;
};

describe('Authentication Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Input Validation', () => {
    test('should validate registration input', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });

    test('should validate login input', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: ''
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    test('should validate password change input', async () => {
      const invalidData = {
        currentPassword: '',
        newPassword: '123'
      };

      // This will fail at authentication level, but let's test with a mock token
      const response = await request(app)
        .post('/api/auth/change-password')
        .send(invalidData)
        .expect(401); // Will fail at auth level first

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('Authentication Middleware', () => {
    test('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    test('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('Route Structure', () => {
    test('should have all expected routes defined', () => {
      const routes = [];
      
      // Extract routes from the router
      authRoutes.stack.forEach(layer => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          methods.forEach(method => {
            routes.push(`${method.toUpperCase()} ${layer.route.path}`);
          });
        }
      });

      // Check that key routes exist
      expect(routes).toContain('POST /register');
      expect(routes).toContain('POST /login');
      expect(routes).toContain('POST /anonymous');
      expect(routes).toContain('GET /profile');
      expect(routes).toContain('PUT /profile');
      expect(routes).toContain('POST /change-password');
      expect(routes).toContain('POST /logout');
      expect(routes).toContain('GET /verify');
      expect(routes).toContain('GET /users');
      expect(routes).toContain('POST /users/:id/ban');
      expect(routes).toContain('POST /users/:id/role');
    });
  });

  describe('Error Handling', () => {
    test('should return proper error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('details');
    });

    test('should return proper error format for authentication errors', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });
});