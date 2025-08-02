const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * File Upload Middleware using Multer
 * Handles image uploads for issue reports with validation and organization
 */

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const uploadDirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/issues'),
    path.join(__dirname, '../uploads/temp')
  ];
  
  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize upload directories
ensureUploadDirs();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organize files by date for better management
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const uploadPath = path.join(__dirname, '../uploads/issues', year.toString(), month, day);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `issue_${timestamp}_${randomString}${extension}`;
    
    cb(null, filename);
  }
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    const error = new Error('Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed.');
    error.code = 'INVALID_FILE_EXTENSION';
    return cb(error, false);
  }
  
  cb(null, true);
};

// Configure multer with limits and validation
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 3 // Maximum 3 files per request
  }
});

/**
 * Middleware for handling issue photo uploads
 * Validates file count, size, and type according to requirements
 */
const uploadIssuePhotos = upload.array('photos', 3);

/**
 * Error handling middleware for upload errors
 */
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large. Maximum size is 5MB per file.';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum 3 photos allowed per issue.';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field. Use "photos" field for image uploads.';
        code = 'UNEXPECTED_FILE_FIELD';
        break;
      default:
        message = error.message;
    }
    
    return res.status(400).json({
      error: {
        code: code,
        message: message,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Handle custom file validation errors
  if (error.code === 'INVALID_FILE_TYPE' || error.code === 'INVALID_FILE_EXTENSION') {
    return res.status(400).json({
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next(error);
};

/**
 * Middleware to process uploaded files and add metadata
 */
const processUploadedFiles = (req, res, next) => {
  if (req.files && req.files.length > 0) {
    // Add file metadata to request
    req.uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      relativePath: path.relative(path.join(__dirname, '../uploads'), file.path)
    }));
  } else {
    req.uploadedFiles = [];
  }
  
  next();
};

module.exports = {
  uploadIssuePhotos,
  handleUploadErrors,
  processUploadedFiles,
  ensureUploadDirs
};