const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const issueRoutes = require('./issues');
const fileRoutes = require('./files');
const adminRoutes = require('./admin');

// API routes
router.use('/auth', authRoutes);
router.use('/issues', issueRoutes);
router.use('/files', fileRoutes);
router.use('/admin', adminRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'CivicTrack API',
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;