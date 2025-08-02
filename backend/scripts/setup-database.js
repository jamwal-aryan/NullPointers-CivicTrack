#!/usr/bin/env node

/**
 * Database Setup Script
 * This script helps set up the PostgreSQL database for CivicTrack
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 CivicTrack Database Setup');
console.log('============================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from .env.example...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please edit the .env file with your database credentials.\n');
  } else {
    console.log('❌ .env.example file not found!');
    process.exit(1);
  }
}

console.log('📋 Database Setup Instructions:');
console.log('================================\n');

console.log('1. Install PostgreSQL:');
console.log('   - Windows: Download from https://www.postgresql.org/download/windows/');
console.log('   - macOS: brew install postgresql');
console.log('   - Linux: sudo apt-get install postgresql postgresql-contrib\n');

console.log('2. Start PostgreSQL service:');
console.log('   - Windows: Start "PostgreSQL" service from Services');
console.log('   - macOS: brew services start postgresql');
console.log('   - Linux: sudo systemctl start postgresql\n');

console.log('3. Create database and user:');
console.log('   Run these commands in PostgreSQL (psql):');
console.log('   ```');
console.log('   CREATE DATABASE civic_track;');
console.log('   CREATE USER civic_user WITH PASSWORD \'your_password\';');
console.log('   GRANT ALL PRIVILEGES ON DATABASE civic_track TO civic_user;');
console.log('   ALTER USER civic_user CREATEDB;');
console.log('   ```\n');

console.log('4. Update your .env file with the correct database credentials:');
console.log('   ```');
console.log('   DB_HOST=localhost');
console.log('   DB_PORT=5432');
console.log('   DB_NAME=civic_track');
console.log('   DB_USER=civic_user');
console.log('   DB_PASSWORD=your_password');
console.log('   JWT_SECRET=your_random_secret_key_here');
console.log('   ```\n');

console.log('5. Install PostGIS extension (required for geospatial features):');
console.log('   - Windows: Install PostGIS from https://postgis.net/windows_downloads/');
console.log('   - macOS: brew install postgis');
console.log('   - Linux: sudo apt-get install postgis postgresql-contrib\n');

console.log('6. Run database migrations:');
console.log('   npm run migrate\n');

console.log('7. Seed the database (optional):');
console.log('   npm run seed\n');

console.log('🎉 After completing these steps, run: npm run dev');

// Check if PostgreSQL is running
console.log('🔍 Checking if PostgreSQL is running...');
try {
  execSync('pg_isready', { stdio: 'ignore' });
  console.log('✅ PostgreSQL is running!');
} catch (error) {
  console.log('❌ PostgreSQL is not running or not installed.');
  console.log('   Please install and start PostgreSQL first.');
}

console.log('\n📚 For more help, check the DATABASE.md file.');