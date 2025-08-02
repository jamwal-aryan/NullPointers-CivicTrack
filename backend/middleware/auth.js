const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.is_verified
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate session token for anonymous users
 */
const generateSessionToken = () => {
  const payload = {
    type: 'anonymous',
    timestamp: Date.now()
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Access token is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // For anonymous users, just attach the decoded token
    if (decoded.type === 'anonymous') {
      req.user = { 
        id: null, 
        role: 'citizen', 
        isAnonymous: true,
        sessionToken: token 
      };
      return next();
    }
    
    // For registered users, fetch from database
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (user.is_banned) {
      return res.status(403).json({
        error: {
          code: 'USER_BANNED',
          message: 'User account has been banned',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Update last active timestamp
    await user.update({ last_active_at: new Date() });
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      isAnonymous: false
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    return res.status(403).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid access token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Middleware to optionally authenticate tokens (allows anonymous access)
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = { id: null, role: 'citizen', isAnonymous: true };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type === 'anonymous') {
      req.user = { 
        id: null, 
        role: 'citizen', 
        isAnonymous: true,
        sessionToken: token 
      };
      return next();
    }
    
    const user = await User.findByPk(decoded.id);
    
    if (!user || user.is_banned) {
      req.user = { id: null, role: 'citizen', isAnonymous: true };
      return next();
    }
    
    await user.update({ last_active_at: new Date() });
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      isAnonymous: false
    };
    
    next();
  } catch (error) {
    req.user = { id: null, role: 'citizen', isAnonymous: true };
    next();
  }
};

/**
 * Middleware to check user roles
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this action',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    next();
  };
};

/**
 * Middleware to require verified users only
 */
const requireVerified = (req, res, next) => {
  if (!req.user || req.user.isAnonymous) {
    return res.status(401).json({
      error: {
        code: 'VERIFICATION_REQUIRED',
        message: 'Verified account required',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  if (!req.user.isVerified) {
    return res.status(403).json({
      error: {
        code: 'ACCOUNT_NOT_VERIFIED',
        message: 'Account email verification required',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
};

module.exports = {
  generateToken,
  generateSessionToken,
  authenticateToken,
  optionalAuth,
  requireRole,
  requireVerified
};