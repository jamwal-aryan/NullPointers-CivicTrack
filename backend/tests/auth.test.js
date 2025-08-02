const request = require('supertest');
const app = require('../server');
const { User } = require('../models');
const authService = require('../services/authService');

describe('Authentication System', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Clean up test data
    await User.destroy({ where: {} });
  });

  afterAll(async () => {
    // Clean up test data
    await User.destroy({ where: {} });
  });

  describe('Password Validation', () => {
    test('should validate password strength', () => {
      const weakPassword = '123';
      const errors = authService.validatePassword(weakPassword);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Password must be at least 8 characters long');
    });

    test('should accept strong password', () => {
      const strongPassword = 'StrongPass123!';
      const errors = authService.validatePassword(strongPassword);
      expect(errors.length).toBe(0);
    });
  });

  describe('Email Validation', () => {
    test('should validate email format', () => {
      expect(authService.validateEmail('test@example.com')).toBe(true);
      expect(authService.validateEmail('invalid-email')).toBe(false);
      expect(authService.validateEmail('')).toBe(false);
    });
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        role: 'citizen'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe(userData.role);
      expect(response.body.token).toBeDefined();

      testUser = response.body.user;
      authToken = response.body.token;
    });

    test('should not register user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        role: 'citizen'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.code).toBe('REGISTRATION_FAILED');
      expect(response.body.error.message).toContain('already exists');
    });

    test('should not register user with weak password', async () => {
      const userData = {
        email: 'weak@example.com',
        password: '123',
        role: 'citizen'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should not register user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPass123!',
        role: 'citizen'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.token).toBeDefined();
    });

    test('should not login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('LOGIN_FAILED');
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    test('should not login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('LOGIN_FAILED');
      expect(response.body.error.message).toContain('Invalid email or password');
    });
  });

  describe('Anonymous Sessions', () => {
    test('should create anonymous session', async () => {
      const response = await request(app)
        .post('/api/auth/anonymous')
        .expect(200);

      expect(response.body.message).toBe('Anonymous session created');
      expect(response.body.user.isAnonymous).toBe(true);
      expect(response.body.user.role).toBe('citizen');
      expect(response.body.sessionToken).toBeDefined();
    });
  });

  describe('Protected Routes', () => {
    test('should access profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should not access protected route without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    test('should not access protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Profile Management', () => {
    test('should update user profile', async () => {
      const updateData = {
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.email).toBe(updateData.email);
    });

    test('should change password', async () => {
      const passwordData = {
        currentPassword: 'TestPass123!',
        newPassword: 'NewTestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.message).toBe('Password updated successfully');
    });

    test('should not change password with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewTestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.error.code).toBe('PASSWORD_CHANGE_FAILED');
    });
  });

  describe('Role-Based Access Control', () => {
    beforeAll(async () => {
      // Create admin user
      const adminData = {
        email: 'admin@example.com',
        password: 'AdminPass123!',
        role: 'admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(adminData);

      adminUser = response.body.user;
      adminToken = response.body.token;
    });

    test('should allow admin to access admin routes', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('should not allow non-admin to access admin routes', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should allow admin to ban users', async () => {
      const response = await request(app)
        .post(`/api/auth/users/${testUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ banned: true, reason: 'Test ban' })
        .expect(200);

      expect(response.body.message).toContain('banned successfully');
    });

    test('should not allow banned user to login', async () => {
      const loginData = {
        email: 'updated@example.com',
        password: 'NewTestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.message).toContain('banned');
    });

    test('should allow admin to unban users', async () => {
      const response = await request(app)
        .post(`/api/auth/users/${testUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ banned: false })
        .expect(200);

      expect(response.body.message).toContain('unbanned successfully');
    });

    test('should allow admin to update user roles', async () => {
      const response = await request(app)
        .post(`/api/auth/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'authority' })
        .expect(200);

      expect(response.body.message).toBe('User role updated successfully');
      expect(response.body.user.role).toBe('authority');
    });
  });

  describe('Token Verification', () => {
    test('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('Logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('Logout successful');
    });
  });
});