#!/usr/bin/env node

/**
 * Demo script for file upload system
 * Shows how the file upload middleware and service work
 */

const path = require('path');
const fs = require('fs');
const fileService = require('../services/fileService');

console.log('🔧 CivicTrack File Upload System Demo\n');

// Demo 1: Directory structure
console.log('📁 Upload Directory Structure:');
const uploadsDir = path.join(__dirname, '../uploads');
const issuesDir = path.join(uploadsDir, 'issues');
const tempDir = path.join(uploadsDir, 'temp');

console.log(`   Uploads: ${uploadsDir}`);
console.log(`   Issues:  ${issuesDir}`);
console.log(`   Temp:    ${tempDir}`);
console.log(`   Uploads exists: ${fs.existsSync(uploadsDir)}`);
console.log(`   Issues exists:  ${fs.existsSync(issuesDir)}`);
console.log(`   Temp exists:    ${fs.existsSync(tempDir)}\n`);

// Demo 2: File path handling
console.log('🔗 File Path Handling:');
const testPaths = [
  'issues/2024/01/15/test.jpg',
  'issues\\2024\\01\\15\\test.jpg', // Windows path
  'temp/upload.png'
];

testPaths.forEach(testPath => {
  const publicUrl = fileService.generatePublicUrl(testPath);
  const fullPath = fileService.getFullPath(testPath);
  console.log(`   Input:  ${testPath}`);
  console.log(`   URL:    ${publicUrl}`);
  console.log(`   Full:   ${fullPath}`);
  console.log('');
});

// Demo 3: Security validation
console.log('🔒 Security Validation:');
const securityTests = [
  'issues/valid-file.jpg',
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  'issues/../../../secret.txt',
  'normal/path/file.png'
];

console.log('Testing path traversal protection:');
securityTests.forEach(async (testPath) => {
  const isValid = await fileService.validateFileAccess(testPath);
  const status = isValid ? '✅ ALLOWED' : '❌ BLOCKED';
  console.log(`   ${status}: ${testPath}`);
});

// Demo 4: File validation rules
console.log('\n📋 File Validation Rules:');
console.log('   Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp');
console.log('   Allowed extensions: .jpg, .jpeg, .png, .webp');
console.log('   Maximum file size: 5MB');
console.log('   Maximum files per request: 3');

const fileTests = [
  { name: 'photo.jpg', valid: true },
  { name: 'image.png', valid: true },
  { name: 'picture.webp', valid: true },
  { name: 'document.pdf', valid: false },
  { name: 'script.js', valid: false },
  { name: 'archive.zip', valid: false }
];

console.log('\nFile extension validation:');
fileTests.forEach(test => {
  const extension = path.extname(test.name).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const isValid = allowedExtensions.includes(extension);
  const status = isValid ? '✅ VALID' : '❌ INVALID';
  console.log(`   ${status}: ${test.name} (${extension})`);
});

// Demo 5: Example file metadata
console.log('\n📊 Example File Metadata:');
const exampleFile = {
  filename: 'issue_1642248600000_a1b2c3d4e5f6.jpg',
  originalName: 'pothole_photo.jpg',
  path: 'issues/2024/01/15/issue_1642248600000_a1b2c3d4e5f6.jpg',
  size: 1024000,
  mimetype: 'image/jpeg',
  url: '/api/files/issues/2024/01/15/issue_1642248600000_a1b2c3d4e5f6.jpg'
};

console.log('   Example uploaded file metadata:');
Object.entries(exampleFile).forEach(([key, value]) => {
  console.log(`   ${key.padEnd(12)}: ${value}`);
});

// Demo 6: API endpoints
console.log('\n🌐 API Endpoints:');
console.log('   POST /api/issues          - Upload photos with issue creation');
console.log('   GET  /api/files/{path}    - Serve uploaded files');
console.log('   GET  /api/files/info/{path} - Get file info (admin)');
console.log('   DELETE /api/files/{path}  - Delete files (admin)');
console.log('   POST /api/files/cleanup   - Clean up old files (admin)');

console.log('\n✅ File upload system is ready!');
console.log('📖 See backend/docs/FILE_UPLOAD.md for detailed documentation.');