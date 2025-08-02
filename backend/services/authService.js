const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { generateToken, generateSessionToken } = require('../middleware/auth');

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return errors;
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return errors;
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Register a new user
 */
const registerUser = async (userData) => {
  const { email, password, role = 'citizen' } = userData;
  
  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    throw new Error(passwordErrors.join(', '));
  }
  
  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const user = await User.create({
    email,
    password_hash: passwordHash,
    role,
    is_verified: false // Email verification would be implemented later
  });
  
  // Generate token
  const token = generateToken(user);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      createdAt: user.createdAt
    },
    token
  };
};

/**
 * Login user
 */
const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Check if user is banned
  if (user.is_banned) {
    throw new Error('Account has been banned');
  }
  
  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }
  
  // Update last active
  await user.update({ last_active_at: new Date() });
  
  // Generate token
  const token = generateToken(user);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      lastActiveAt: user.last_active_at
    },
    token
  };
};

/**
 * Create anonymous session
 */
const createAnonymousSession = async () => {
  const sessionToken = generateSessionToken();
  
  // Optionally store anonymous session in database for tracking
  const anonymousUser = await User.create({
    email: null,
    password_hash: null,
    role: 'citizen',
    is_verified: false,
    session_token: sessionToken
  });
  
  return {
    user: {
      id: anonymousUser.id,
      email: null,
      role: 'citizen',
      isVerified: false,
      isAnonymous: true
    },
    sessionToken
  };
};

/**
 * Get user profile
 */
const getUserProfile = async (userId) => {
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.is_verified,
    isBanned: user.is_banned,
    createdAt: user.createdAt,
    lastActiveAt: user.last_active_at
  };
};

/**
 * Update user profile
 */
const updateUserProfile = async (userId, updateData) => {
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Only allow certain fields to be updated
  const allowedFields = ['email'];
  const filteredData = {};
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'email' && !validateEmail(updateData[field])) {
        throw new Error('Invalid email format');
      }
      
      // Check if email is already taken
      if (field === 'email') {
        const existingUser = await User.findOne({ 
          where: { email: updateData[field] } 
        });
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email already in use');
        }
        // Reset verification status if email changes
        filteredData.is_verified = false;
      }
      
      filteredData[field] = updateData[field];
    }
  }
  
  await user.update(filteredData);
  
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.is_verified,
    isBanned: user.is_banned,
    updatedAt: user.updatedAt
  };
};

/**
 * Change user password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify current password
  const isValidPassword = await comparePassword(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }
  
  // Validate new password
  const passwordErrors = validatePassword(newPassword);
  if (passwordErrors.length > 0) {
    throw new Error(passwordErrors.join(', '));
  }
  
  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);
  
  // Update password
  await user.update({ password_hash: newPasswordHash });
  
  return { message: 'Password updated successfully' };
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword,
  validateEmail,
  registerUser,
  loginUser,
  createAnonymousSession,
  getUserProfile,
  updateUserProfile,
  changePassword
};