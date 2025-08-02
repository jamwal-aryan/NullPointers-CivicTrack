const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('role')
    .optional()
    .isIn(['citizen', 'authority', 'admin'])
    .withMessage('Invalid role specified')
];

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for password change
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
};

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    const result = await authService.registerUser({
      email,
      password,
      role
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await authService.loginUser(email, password);
    
    res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'LOGIN_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Create anonymous session
 */
const createAnonymousSession = async (req, res) => {
  try {
    const result = await authService.createAnonymousSession();
    
    res.json({
      message: 'Anonymous session created',
      user: result.user,
      sessionToken: result.sessionToken
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SESSION_CREATION_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    if (req.user.isAnonymous) {
      return res.json({
        user: {
          id: null,
          email: null,
          role: 'citizen',
          isVerified: false,
          isAnonymous: true
        }
      });
    }
    
    const profile = await authService.getUserProfile(req.user.id);
    
    res.json({
      user: profile
    });
  } catch (error) {
    res.status(404).json({
      error: {
        code: 'PROFILE_NOT_FOUND',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    if (req.user.isAnonymous) {
      return res.status(401).json({
        error: {
          code: 'ANONYMOUS_USER',
          message: 'Anonymous users cannot update profile',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const { email } = req.body;
    
    const updatedProfile = await authService.updateUserProfile(req.user.id, {
      email
    });
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedProfile
    });
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Change user password
 */
const changePassword = async (req, res) => {
  try {
    if (req.user.isAnonymous) {
      return res.status(401).json({
        error: {
          code: 'ANONYMOUS_USER',
          message: 'Anonymous users cannot change password',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'PASSWORD_CHANGE_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Logout user (client-side token removal)
 */
const logout = (req, res) => {
  res.json({
    message: 'Logout successful. Please remove the token from client storage.'
  });
};

/**
 * Verify token endpoint
 */
const verifyToken = (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      isVerified: req.user.isVerified,
      isAnonymous: req.user.isAnonymous
    }
  });
};

module.exports = {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  handleValidationErrors,
  register,
  login,
  createAnonymousSession,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken
};