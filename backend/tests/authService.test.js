const authService = require('../services/authService');

describe('Authentication Service', () => {
  describe('Password Validation', () => {
    test('should validate password strength correctly', () => {
      // Test weak passwords
      expect(authService.validatePassword('123')).toContain('Password must be at least 8 characters long');
      expect(authService.validatePassword('password')).toContain('Password must contain at least one uppercase letter');
      expect(authService.validatePassword('PASSWORD')).toContain('Password must contain at least one lowercase letter');
      expect(authService.validatePassword('Password')).toContain('Password must contain at least one number');
      expect(authService.validatePassword('Password123')).toContain('Password must contain at least one special character (@$!%*?&)');
      
      // Test strong password
      expect(authService.validatePassword('StrongPass123!')).toEqual([]);
    });

    test('should handle empty password', () => {
      const errors = authService.validatePassword('');
      expect(errors).toContain('Password is required');
    });

    test('should handle null password', () => {
      const errors = authService.validatePassword(null);
      expect(errors).toContain('Password is required');
    });
  });

  describe('Email Validation', () => {
    test('should validate email format correctly', () => {
      // Valid emails
      expect(authService.validateEmail('test@example.com')).toBe(true);
      expect(authService.validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(authService.validateEmail('user+tag@example.org')).toBe(true);
      
      // Invalid emails
      expect(authService.validateEmail('invalid-email')).toBe(false);
      expect(authService.validateEmail('test@')).toBe(false);
      expect(authService.validateEmail('@example.com')).toBe(false);
      expect(authService.validateEmail('test.example.com')).toBe(false);
      expect(authService.validateEmail('')).toBe(false);
      expect(authService.validateEmail(null)).toBe(false);
    });
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 characters
    });

    test('should compare password with hash correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.comparePassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await authService.comparePassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});

describe('JWT Token Generation', () => {
  const { generateToken, generateSessionToken } = require('../middleware/auth');

  test('should generate JWT token for user', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'citizen',
      is_verified: true
    };

    const token = generateToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  test('should generate session token for anonymous users', () => {
    const sessionToken = generateSessionToken();
    expect(sessionToken).toBeDefined();
    expect(typeof sessionToken).toBe('string');
    expect(sessionToken.split('.')).toHaveLength(3); // JWT has 3 parts
  });
});

describe('Authentication Middleware', () => {
  const jwt = require('jsonwebtoken');
  const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  test('should create requireRole middleware correctly', () => {
    const middleware = requireRole('admin');
    expect(typeof middleware).toBe('function');
    
    const multiRoleMiddleware = requireRole(['admin', 'authority']);
    expect(typeof multiRoleMiddleware).toBe('function');
  });

  test('should handle missing authorization header', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'MISSING_TOKEN'
        })
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle invalid token format', async () => {
    const req = { 
      headers: { 
        authorization: 'InvalidTokenFormat' 
      } 
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'MISSING_TOKEN'
        })
      })
    );
  });

  test('should handle anonymous token in optionalAuth', async () => {
    const anonymousPayload = {
      type: 'anonymous',
      timestamp: Date.now()
    };
    const token = jwt.sign(anonymousPayload, JWT_SECRET, { expiresIn: '24h' });

    const req = { 
      headers: { 
        authorization: `Bearer ${token}` 
      } 
    };
    const res = {};
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toEqual({
      id: null,
      role: 'citizen',
      isAnonymous: true,
      sessionToken: token
    });
    expect(next).toHaveBeenCalled();
  });

  test('should handle missing token in optionalAuth', async () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toEqual({
      id: null,
      role: 'citizen',
      isAnonymous: true
    });
    expect(next).toHaveBeenCalled();
  });

  test('should handle role checking', () => {
    const adminMiddleware = requireRole('admin');
    
    // Test with admin user
    const req = { user: { role: 'admin' } };
    const res = {};
    const next = jest.fn();

    adminMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    // Test with non-admin user
    const citizenReq = { user: { role: 'citizen' } };
    const citizenRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const citizenNext = jest.fn();

    adminMiddleware(citizenReq, citizenRes, citizenNext);
    expect(citizenRes.status).toHaveBeenCalledWith(403);
    expect(citizenNext).not.toHaveBeenCalled();
  });
});