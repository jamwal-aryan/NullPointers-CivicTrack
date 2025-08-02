#!/usr/bin/env node

/**
 * Simple Migration Runner
 * Runs all migration files in order
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  // Create Sequelize instance
  const sequelize = new Sequelize({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'civic_track',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: false
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Enable PostGIS extension
    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      console.log('✅ PostGIS extension enabled');
    } catch (error) {
      console.log('⚠️  PostGIS extension may not be available:', error.message);
    }

    // Get migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files\n`);

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`🔄 Running migration: ${file}`);
      
      try {
        const migration = require(path.join(migrationsDir, file));
        
        if (typeof migration.up === 'function') {
          await migration.up(sequelize.getQueryInterface(), Sequelize);
          console.log(`✅ Migration ${file} completed successfully`);
        } else {
          console.log(`⚠️  Migration ${file} does not have an 'up' function`);
        }
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error.message);
        // Continue with other migrations
      }
    }

    console.log('\n🎉 All migrations completed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 Make sure PostgreSQL is running and your .env file is configured correctly.');
    console.log('   Run: node scripts/setup-database.js for setup instructions.');
  } finally {
    await sequelize.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = { runMigrations };