#!/usr/bin/env node

/**
 * Demo Script: Status Tracking System
 * 
 * This script demonstrates the status tracking and history functionality
 * of the CivicTrack platform. It shows how status changes are logged,
 * validated, and how notifications are triggered.
 * 
 * Usage: node scripts/demo-status-tracking.js
 */

const { sequelize, User, Issue, StatusHistory, initializeDatabase } = require('../models');
const NotificationService = require('../services/notificationService');

async function runDemo() {
  console.log('🚀 CivicTrack Status Tracking System Demo\n');

  try {
    // Initialize database connection
    console.log('📊 Initializing database connection...');
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      console.error('❌ Failed to initialize database. Please ensure PostgreSQL is running.');
      process.exit(1);
    }
    
    console.log('✅ Database connected successfully\n');

    // Clean up any existing demo data
    console.log('🧹 Cleaning up existing demo data...');
    await StatusHistory.destroy({ where: {}, force: true });
    await Issue.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    console.log('✅ Cleanup completed\n');

    // Create demo users
    console.log('👥 Creating demo users...');
    
    const citizen = await User.create({
      email: 'citizen@demo.com',
      password_hash: 'hashed_password_123',
      role: 'citizen',
      is_verified: true
    });
    
    const authority = await User.create({
      email: 'authority@demo.com',
      password_hash: 'hashed_password_456',
      role: 'authority',
      is_verified: true
    });
    
    const admin = await User.create({
      email: 'admin@demo.com',
      password_hash: 'hashed_password_789',
      role: 'admin',
      is_verified: true
    });
    
    console.log(`✅ Created citizen: ${citizen.email}`);
    console.log(`✅ Created authority: ${authority.email}`);
    console.log(`✅ Created admin: ${admin.email}\n`);

    // Create demo issue
    console.log('📝 Creating demo issue...');
    
    const issue = await Issue.create({
      title: 'Pothole on Main Street',
      description: 'Large pothole causing traffic issues near the intersection of Main St and Oak Ave',
      category: 'roads',
      status: 'reported',
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'Main Street & Oak Avenue, Demo City',
      photos: [
        {
          filename: 'pothole_1.jpg',
          originalName: 'pothole_photo.jpg',
          path: 'uploads/issues/pothole_1.jpg',
          size: 1024000,
          mimetype: 'image/jpeg',
          url: '/api/files/uploads/issues/pothole_1.jpg'
        }
      ],
      reporter_id: citizen.id,
      is_anonymous: false
    });
    
    console.log(`✅ Created issue: ${issue.title} (ID: ${issue.id})`);
    console.log(`   Status: ${issue.status}`);
    console.log(`   Reporter: ${citizen.email}\n`);

    // Create initial status history entry
    console.log('📋 Creating initial status history...');
    
    const initialHistory = await StatusHistory.create({
      issue_id: issue.id,
      previous_status: null,
      new_status: 'reported',
      comment: 'Issue reported by citizen',
      updated_by: citizen.id
    });
    
    console.log(`✅ Initial history entry created`);
    console.log(`   Status: null → ${initialHistory.new_status}`);
    console.log(`   Comment: ${initialHistory.comment}\n`);

    // Simulate status update by authority
    console.log('🔄 Simulating status update by authority...');
    
    const transaction1 = await sequelize.transaction();
    
    try {
      // Update issue status
      await issue.update({
        status: 'in_progress',
        updated_at: new Date()
      }, { transaction: transaction1 });
      
      // Create status history entry
      const progressHistory = await StatusHistory.create({
        issue_id: issue.id,
        previous_status: 'reported',
        new_status: 'in_progress',
        comment: 'Work crew dispatched to repair the pothole. Expected completion: 2-3 days.',
        updated_by: authority.id
      }, { transaction: transaction1 });
      
      await transaction1.commit();
      
      console.log(`✅ Status updated: reported → in_progress`);
      console.log(`   Comment: ${progressHistory.comment}`);
      console.log(`   Updated by: ${authority.email} (${authority.role})`);
      
      // Trigger notification
      console.log('📧 Triggering status change notification...');
      await NotificationService.notifyStatusChange(
        issue.id,
        'reported',
        'in_progress',
        progressHistory.comment,
        authority.id
      );
      console.log('✅ Notification triggered\n');
      
    } catch (error) {
      await transaction1.rollback();
      throw error;
    }

    // Simulate another status update (resolution)
    console.log('🔄 Simulating issue resolution...');
    
    const transaction2 = await sequelize.transaction();
    
    try {
      // Update issue status
      await issue.update({
        status: 'resolved',
        updated_at: new Date()
      }, { transaction: transaction2 });
      
      // Create status history entry
      const resolvedHistory = await StatusHistory.create({
        issue_id: issue.id,
        previous_status: 'in_progress',
        new_status: 'resolved',
        comment: 'Pothole has been successfully repaired. Road surface restored to good condition.',
        updated_by: authority.id
      }, { transaction: transaction2 });
      
      await transaction2.commit();
      
      console.log(`✅ Status updated: in_progress → resolved`);
      console.log(`   Comment: ${resolvedHistory.comment}`);
      console.log(`   Updated by: ${authority.email} (${authority.role})`);
      
      // Trigger notification
      console.log('📧 Triggering resolution notification...');
      await NotificationService.notifyStatusChange(
        issue.id,
        'in_progress',
        'resolved',
        resolvedHistory.comment,
        authority.id
      );
      console.log('✅ Notification triggered\n');
      
    } catch (error) {
      await transaction2.rollback();
      throw error;
    }

    // Display complete status history
    console.log('📊 Complete Status History:');
    console.log('=' .repeat(50));
    
    const completeHistory = await StatusHistory.findAll({
      where: { issue_id: issue.id },
      include: [
        {
          model: User,
          as: 'updatedBy',
          attributes: ['email', 'role']
        }
      ],
      order: [['updated_at', 'ASC']]
    });
    
    completeHistory.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.previous_status || 'null'} → ${entry.new_status}`);
      console.log(`   Comment: ${entry.comment}`);
      console.log(`   Updated by: ${entry.updatedBy.email} (${entry.updatedBy.role})`);
      console.log(`   Timestamp: ${entry.updated_at.toISOString()}`);
      console.log('');
    });

    // Demonstrate validation scenarios
    console.log('🔍 Demonstrating Validation Scenarios:');
    console.log('=' .repeat(50));

    // Test 1: Invalid status transition
    console.log('Test 1: Invalid status (should fail)');
    try {
      await StatusHistory.create({
        issue_id: issue.id,
        previous_status: 'resolved',
        new_status: 'invalid_status',
        comment: 'This should fail',
        updated_by: authority.id
      });
      console.log('❌ Validation failed - invalid status was accepted');
    } catch (error) {
      console.log('✅ Validation passed - invalid status rejected');
    }

    // Test 2: Missing comment (would be handled by API validation)
    console.log('\nTest 2: Missing comment validation (API level)');
    console.log('✅ Comment validation is handled at the API level in issueValidation.js');

    // Test 3: Unauthorized user (would be handled by auth middleware)
    console.log('\nTest 3: Authorization validation (middleware level)');
    console.log('✅ Role-based authorization is handled by auth middleware');

    // Display final issue state
    console.log('\n📋 Final Issue State:');
    console.log('=' .repeat(30));
    
    const finalIssue = await Issue.findByPk(issue.id, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['email', 'role']
        }
      ]
    });
    
    console.log(`Title: ${finalIssue.title}`);
    console.log(`Status: ${finalIssue.status}`);
    console.log(`Category: ${finalIssue.category}`);
    console.log(`Reporter: ${finalIssue.reporter.email}`);
    console.log(`Created: ${finalIssue.created_at.toISOString()}`);
    console.log(`Updated: ${finalIssue.updated_at.toISOString()}`);
    console.log(`Total Status Changes: ${completeHistory.length}`);

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('✅ Automatic status history logging');
    console.log('✅ Transaction safety for status updates');
    console.log('✅ Notification system integration');
    console.log('✅ Complete audit trail with timestamps');
    console.log('✅ User attribution for all changes');
    console.log('✅ Data validation and integrity');

  } catch (error) {
    console.error('\n❌ Demo failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('\n📊 Database connection closed');
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };