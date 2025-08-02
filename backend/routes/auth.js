const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { 
  authenticateToken, 
  optionalAuth, 
  requireRole, 
  requireVerified 
} = require('../middleware/auth');

// Public routes (no authentication required)

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  authController.registerValidation,
  authController.handleValidationErrors,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  authController.loginValidation,
  authController.handleValidationErrors,
  authController.login
);

/**
 * @route   POST /api/auth/anonymous
 * @desc    Create anonymous session
 * @access  Public
 */
router.post('/anonymous', authController.createAnonymousSession);

// Protected routes (authentication required)

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', 
  optionalAuth,
  authController.getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private (verified users only)
 */
router.put('/profile',
  authenticateToken,
  authController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private (verified users only)
 */
router.post('/change-password',
  authenticateToken,
  authController.changePasswordValidation,
  authController.handleValidationErrors,
  authController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  authController.logout
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token validity
 * @access  Private
 */
router.get('/verify',
  authenticateToken,
  authController.verifyToken
);

// Admin routes

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (admin only)
 * @access  Private (admin only)
 */
router.get('/users',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { User } = require('../models');
      const users = await User.findAll({
        attributes: ['id', 'email', 'role', 'is_verified', 'is_banned', 'createdAt', 'last_active_at'],
        order: [['createdAt', 'DESC']]
      });
      
      res.json({ users });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'FETCH_USERS_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * @route   POST /api/auth/users/:id/ban
 * @desc    Ban/unban user (admin only)
 * @access  Private (admin only)
 */
router.post('/users/:id/ban',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { User } = require('../models');
      const { id } = req.params;
      const { banned = true, reason } = req.body;
      
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Prevent admin from banning themselves
      if (user.id === req.user.id) {
        return res.status(400).json({
          error: {
            code: 'CANNOT_BAN_SELF',
            message: 'Cannot ban your own account',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      await user.update({ is_banned: banned });
      
      res.json({
        message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
        user: {
          id: user.id,
          email: user.email,
          is_banned: user.is_banned
        }
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'BAN_USER_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * @route   POST /api/auth/users/:id/role
 * @desc    Update user role (admin only)
 * @access  Private (admin only)
 */
router.post('/users/:id/role',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { User } = require('../models');
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['citizen', 'authority', 'admin'].includes(role)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role specified',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      await user.update({ role });
      
      res.json({
        message: 'User role updated successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'UPDATE_ROLE_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

module.exports = router;