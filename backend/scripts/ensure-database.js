#!/usr/bin/env node

/**
 * Database Initialization Helper
 * Ensures database is ready before starting the server
 */

const { sequelize, testConnection } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function ensureDatabase() {
  try {
    // Test if we can connect to the database
    await testConnection();
    
    // Check if we need to sync the database (for SQLite)
    const usePostgres = process.env.USE_POSTGRES !== 'false' && process.env.NODE_ENV !== 'sqlite';
    
    if (!usePostgres) {
      // For SQLite, check if database file exists and has tables
      const dbPath = path.join(__dirname, '..', 'civic_track_dev.sqlite');
      
      if (!fs.existsSync(dbPath)) {
        console.log('🔄 SQLite database not found, creating...');
        await require('./init-sqlite').initSQLiteDatabase();
        return true;
      }
      
      // Check if tables exist
      try {
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users';");
        if (results.length === 0) {
          console.log('🔄 Database tables not found, initializing...');
          await require('./init-sqlite').initSQLiteDatabase();
          return true;
        }
      } catch (error) {
        console.log('🔄 Database needs initialization...');
        await require('./init-sqlite').initSQLiteDatabase();
        return true;
      }
    }
    
    console.log('✅ Database is ready');
    return true;
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

module.exports = { ensureDatabase };

// Run if called directly
if (require.main === module) {
  ensureDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}