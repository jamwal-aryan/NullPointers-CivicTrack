#!/usr/bin/env node

/**
 * SQLite Database Initialization for Development
 * This creates a local SQLite database for testing when PostgreSQL is not available
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// Import models
const UserModel = require('../models/User');
const IssueModel = require('../models/Issue');
const StatusHistoryModel = require('../models/StatusHistory');
const FlagModel = require('../models/Flag');

async function initSQLiteDatabase() {
  console.log('🔄 Initializing SQLite database for development...\n');

  // Create SQLite database
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'civic_track_dev.sqlite'),
    logging: console.log
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established');

    // Initialize models
    const User = UserModel(sequelize, Sequelize.DataTypes);
    const Issue = IssueModel(sequelize, Sequelize.DataTypes);
    const StatusHistory = StatusHistoryModel(sequelize, Sequelize.DataTypes);
    const Flag = FlagModel(sequelize, Sequelize.DataTypes);

    // Set up associations
    User.hasMany(Issue, { foreignKey: 'reporter_id', as: 'reportedIssues' });
    Issue.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

    Issue.hasMany(StatusHistory, { foreignKey: 'issue_id', as: 'statusHistory' });
    StatusHistory.belongsTo(Issue, { foreignKey: 'issue_id', as: 'issue' });
    StatusHistory.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy' });

    Issue.hasMany(Flag, { foreignKey: 'issue_id', as: 'flags' });
    Flag.belongsTo(Issue, { foreignKey: 'issue_id', as: 'issue' });
    Flag.belongsTo(User, { foreignKey: 'flagged_by', as: 'flagger' });

    // Sync database
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created successfully');

    // Create sample data
    console.log('🌱 Creating sample data...');

    // Create admin user
    const adminUser = await User.create({
      email: 'admin@civictrack.com',
      password_hash: '$2a$10$example.hash.for.password123', // This would be properly hashed
      role: 'admin',
      is_verified: true
    });

    // Create authority user
    const authorityUser = await User.create({
      email: 'authority@city.gov',
      password_hash: '$2a$10$example.hash.for.password123',
      role: 'authority',
      is_verified: true
    });

    // Create citizen user
    const citizenUser = await User.create({
      email: 'citizen@example.com',
      password_hash: '$2a$10$example.hash.for.password123',
      role: 'citizen',
      is_verified: true
    });

    // Create sample issues
    const issue1 = await Issue.create({
      title: 'Pothole on Main Street',
      description: 'Large pothole causing damage to vehicles near the intersection of Main St and Oak Ave.',
      category: 'roads',
      status: 'reported',
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Main St, New York, NY',
      photos: [],
      is_anonymous: false,
      reporter_id: citizenUser.id
    });

    const issue2 = await Issue.create({
      title: 'Broken Street Light',
      description: 'Street light has been out for over a week, making the area unsafe at night.',
      category: 'lighting',
      status: 'in_progress',
      latitude: 40.7589,
      longitude: -73.9851,
      address: '456 Park Ave, New York, NY',
      photos: [],
      is_anonymous: false,
      reporter_id: citizenUser.id
    });

    // Create status history
    await StatusHistory.create({
      issue_id: issue2.id,
      previous_status: 'reported',
      new_status: 'in_progress',
      comment: 'Work order has been created and assigned to maintenance team.',
      updated_by: authorityUser.id
    });

    console.log('✅ Sample data created successfully');
    console.log('\n🎉 SQLite database is ready!');
    console.log(`📁 Database file: ${path.join(__dirname, '..', 'civic_track_dev.sqlite')}`);
    console.log('\n📝 Sample accounts created:');
    console.log('   Admin: admin@civictrack.com');
    console.log('   Authority: authority@city.gov');
    console.log('   Citizen: citizen@example.com');
    console.log('   Password for all: password123');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initSQLiteDatabase().catch(console.error);
}

module.exports = { initSQLiteDatabase };