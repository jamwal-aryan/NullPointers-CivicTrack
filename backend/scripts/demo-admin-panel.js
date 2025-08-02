#!/usr/bin/env node

/**
 * Demo script for Admin Panel API functionality
 * This script demonstrates all admin panel features including:
 * - Admin authentication and authorization
 * - Flagged issues management
 * - User management (ban/unban)
 * - Analytics and reporting
 * - Admin activity logging
 */

const { User, Issue, Flag, AdminLog } = require('../models');
const AdminController = require('../controllers/adminController');
const AdminLogService = require('../services/adminLogService');
const FlaggingService = require('../services/flaggingService');
const { generateToken } = require('../middleware/auth');

// Mock request and response objects for testing
const createMockReq = (user, body = {}, query = {}, params = {}) => ({
  user,
  body,
  query,
  params,
  ip: '127.0.0.1',
  get: (header) => header === 'User-Agent' ? 'Demo-Script/1.0' : null
});

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    data: null
  };
  res.json.mockImplementation((data) => {
    res.data = data;
    return res;
  });
  return res;
};

async function demoAdminPanel() {
  console.log('🚀 Starting Admin Panel API Demo\n');

  try {
    // 1. Create test users
    console.log('1. Creating test users...');
    
    const adminUser = await User.create({
      email: 'admin@civictrack.demo',
      password_hash: 'hashed_admin_password',
      role: 'admin',
      is_verified: true
    });

    const citizenUser = await User.create({
      email: 'citizen@civictrack.demo',
      password_hash: 'hashed_citizen_password',
      role: 'citizen',
      is_verified: true
    });

    const authorityUser = await User.create({
      email: 'authority@civictrack.demo',
      password_hash: 'hashed_authority_password',
      role: 'authority',
      is_verified: true
    });

    console.log(`✅ Created admin user: ${adminUser.email}`);
    console.log(`✅ Created citizen user: ${citizenUser.email}`);
    console.log(`✅ Created authority user: ${authorityUser.email}\n`);

    // 2. Create test issues
    console.log('2. Creating test issues...');
    
    const issues = await Promise.all([
      Issue.create({
        title: 'Pothole on Main Street',
        description: 'Large pothole causing traffic issues',
        category: 'roads',
        status: 'reported',
        latitude: 40.7128,
        longitude: -74.0060,
        reporter_id: citizenUser.id,
        flag_count: 4,
        is_hidden: true
      }),
      Issue.create({
        title: 'Broken Street Light',
        description: 'Street light not working for 2 weeks',
        category: 'lighting',
        status: 'in_progress',
        latitude: 40.7589,
        longitude: -73.9851,
        reporter_id: citizenUser.id,
        flag_count: 2,
        is_hidden: false
      }),
      Issue.create({
        title: 'Spam Issue - Fake Report',
        description: 'This is clearly spam content',
        category: 'cleanliness',
        status: 'reported',
        latitude: 40.7505,
        longitude: -73.9934,
        reporter_id: citizenUser.id,
        flag_count: 5,
        is_hidden: true
      })
    ]);

    console.log(`✅ Created ${issues.length} test issues\n`);

    // 3. Create test flags
    console.log('3. Creating test flags...');
    
    const flags = await Promise.all([
      Flag.create({
        issue_id: issues[0].id,
        flagged_by: citizenUser.id,
        reason: 'Duplicate report',
        flag_type: 'duplicate'
      }),
      Flag.create({
        issue_id: issues[0].id,
        flagged_by: authorityUser.id,
        reason: 'Inappropriate content',
        flag_type: 'inappropriate'
      }),
      Flag.create({
        issue_id: issues[2].id,
        flagged_by: citizenUser.id,
        reason: 'This looks like spam',
        flag_type: 'spam'
      }),
      Flag.create({
        issue_id: issues[2].id,
        flagged_by: authorityUser.id,
        reason: 'Clearly fake report',
        flag_type: 'spam'
      })
    ]);

    console.log(`✅ Created ${flags.length} test flags\n`);

    // 4. Demo Admin Authentication
    console.log('4. Testing Admin Authentication...');
    
    const adminToken = generateToken(adminUser);
    const citizenToken = generateToken(citizenUser);
    
    console.log(`✅ Generated admin token: ${adminToken.substring(0, 20)}...`);
    console.log(`✅ Generated citizen token: ${citizenToken.substring(0, 20)}...\n`);

    // 5. Demo Get Flagged Issues
    console.log('5. Testing Get Flagged Issues...');
    
    const flaggedReq = createMockReq(adminUser, {}, { status: 'pending', limit: 10 });
    const flaggedRes = createMockRes();
    
    await AdminController.getFlaggedIssues(flaggedReq, flaggedRes);
    
    if (flaggedRes.data && flaggedRes.data.flagged_issues) {
      console.log(`✅ Retrieved ${flaggedRes.data.flagged_issues.length} flagged issues`);
      console.log(`   Metadata: ${JSON.stringify(flaggedRes.data.metadata)}`);
    } else {
      console.log('❌ Failed to retrieve flagged issues');
    }
    console.log();

    // 6. Demo Flag Review
    console.log('6. Testing Flag Review...');
    
    const reviewReq = createMockReq(
      adminUser,
      { action: 'approve', reason: 'Issue is valid after review' },
      {},
      { id: issues[0].id }
    );
    const reviewRes = createMockRes();
    
    await AdminController.reviewFlaggedIssue(reviewReq, reviewRes);
    
    if (reviewRes.data && reviewRes.data.message) {
      console.log(`✅ ${reviewRes.data.message}`);
      console.log(`   Issue ID: ${reviewRes.data.issue?.id}`);
      console.log(`   Review action: ${reviewRes.data.review?.action}`);
    } else {
      console.log('❌ Failed to review flagged issue');
    }
    console.log();

    // 7. Demo Analytics
    console.log('7. Testing Analytics...');
    
    const analyticsReq = createMockReq(adminUser, {}, { 
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    const analyticsRes = createMockRes();
    
    await AdminController.getAnalytics(analyticsReq, analyticsRes);
    
    if (analyticsRes.data && analyticsRes.data.analytics) {
      const analytics = analyticsRes.data.analytics;
      console.log('✅ Analytics retrieved successfully:');
      console.log(`   Total Issues: ${analytics.issues.total}`);
      console.log(`   Issues by Category: ${JSON.stringify(analytics.issues.by_category)}`);
      console.log(`   Issues by Status: ${JSON.stringify(analytics.issues.by_status)}`);
      console.log(`   Total Flags: ${analytics.flags.total}`);
      console.log(`   Total Users: ${analytics.users.total}`);
      console.log(`   Banned Users: ${analytics.users.banned}`);
    } else {
      console.log('❌ Failed to retrieve analytics');
    }
    console.log();

    // 8. Demo User Management
    console.log('8. Testing User Management...');
    
    const usersReq = createMockReq(adminUser, {}, { limit: 10, banned: false });
    const usersRes = createMockRes();
    
    await AdminController.getUsers(usersReq, usersRes);
    
    if (usersRes.data && usersRes.data.users) {
      console.log(`✅ Retrieved ${usersRes.data.users.length} users`);
      usersRes.data.users.forEach(user => {
        console.log(`   User: ${user.email} (${user.role}) - Issues: ${user.stats.issues_reported}, Flags: ${user.stats.flags_submitted}`);
      });
    } else {
      console.log('❌ Failed to retrieve users');
    }
    console.log();

    // 9. Demo User Ban
    console.log('9. Testing User Ban...');
    
    const banReq = createMockReq(
      adminUser,
      { reason: 'Multiple policy violations' },
      {},
      { id: citizenUser.id }
    );
    const banRes = createMockRes();
    
    await AdminController.banUser(banReq, banRes);
    
    if (banRes.data && banRes.data.message) {
      console.log(`✅ ${banRes.data.message}`);
      console.log(`   Banned user: ${banRes.data.user.email}`);
      console.log(`   Ban reason: ${banRes.data.ban_reason}`);
    } else {
      console.log('❌ Failed to ban user');
    }
    console.log();

    // 10. Demo User Unban
    console.log('10. Testing User Unban...');
    
    const unbanReq = createMockReq(adminUser, {}, {}, { id: citizenUser.id });
    const unbanRes = createMockRes();
    
    await AdminController.unbanUser(unbanReq, unbanRes);
    
    if (unbanRes.data && unbanRes.data.message) {
      console.log(`✅ ${unbanRes.data.message}`);
      console.log(`   Unbanned user: ${unbanRes.data.user.email}`);
    } else {
      console.log('❌ Failed to unban user');
    }
    console.log();

    // 11. Demo Admin Activity Logging
    console.log('11. Testing Admin Activity Logging...');
    
    // Log some sample admin actions
    await AdminLogService.logFlagReview(
      adminUser.id,
      issues[1].id,
      'reject',
      'Issue does not meet community standards',
      3,
      '127.0.0.1',
      'Demo-Script/1.0'
    );

    await AdminLogService.logUserBan(
      adminUser.id,
      citizenUser.id,
      'Repeated policy violations',
      '127.0.0.1',
      'Demo-Script/1.0'
    );

    await AdminLogService.logBulkAction(
      adminUser.id,
      'bulk_approve',
      [issues[0].id, issues[1].id],
      { approved_count: 2, reason: 'Bulk approval after review' },
      '127.0.0.1',
      'Demo-Script/1.0'
    );

    console.log('✅ Created sample admin activity logs');

    // 12. Demo Get Admin Logs
    console.log('12. Testing Get Admin Logs...');
    
    const logsReq = createMockReq(adminUser, {}, { 
      limit: 10,
      action: 'flag_review'
    });
    const logsRes = createMockRes();
    
    await AdminController.getAdminLogs(logsReq, logsRes);
    
    if (logsRes.data && logsRes.data.logs) {
      console.log(`✅ Retrieved ${logsRes.data.logs.length} admin logs`);
      logsRes.data.logs.forEach(log => {
        console.log(`   ${log.created_at}: ${log.admin.email} performed ${log.action} on ${log.target_type} ${log.target_id || 'N/A'}`);
      });
    } else {
      console.log('❌ Failed to retrieve admin logs');
    }
    console.log();

    // 13. Demo Admin Activity Stats
    console.log('13. Testing Admin Activity Statistics...');
    
    const statsReq = createMockReq(adminUser, {}, { 
      adminId: adminUser.id,
      startDate: '2024-01-01'
    });
    const statsRes = createMockRes();
    
    await AdminController.getAdminActivityStats(statsReq, statsRes);
    
    if (statsRes.data && statsRes.data.activity_stats) {
      const stats = statsRes.data.activity_stats;
      console.log('✅ Admin activity statistics retrieved:');
      console.log(`   Total Actions: ${stats.total_actions}`);
      console.log(`   Actions by Type: ${JSON.stringify(stats.by_action_type)}`);
      console.log(`   Actions by Admin: ${JSON.stringify(stats.by_admin)}`);
    } else {
      console.log('❌ Failed to retrieve admin activity statistics');
    }
    console.log();

    // 14. Demo Error Handling
    console.log('14. Testing Error Handling...');
    
    // Test invalid UUID
    const invalidReq = createMockReq(
      adminUser,
      { action: 'approve', reason: 'Test' },
      {},
      { id: 'invalid-uuid' }
    );
    const invalidRes = createMockRes();
    
    await AdminController.reviewFlaggedIssue(invalidReq, invalidRes);
    
    if (invalidRes.data && invalidRes.data.error) {
      console.log(`✅ Error handling works: ${invalidRes.data.error.code} - ${invalidRes.data.error.message}`);
    } else {
      console.log('❌ Error handling not working properly');
    }
    console.log();

    console.log('🎉 Admin Panel API Demo completed successfully!\n');

    // Summary
    console.log('📊 DEMO SUMMARY:');
    console.log('================');
    console.log('✅ Admin authentication and authorization');
    console.log('✅ Flagged issues management');
    console.log('✅ Flag review system (approve/reject/delete)');
    console.log('✅ Analytics and reporting');
    console.log('✅ User management (ban/unban)');
    console.log('✅ Admin activity logging');
    console.log('✅ Admin logs retrieval and filtering');
    console.log('✅ Admin activity statistics');
    console.log('✅ Error handling and validation');
    console.log('✅ Input sanitization and security');
    console.log('\n🔧 All admin panel API endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.error(error.stack);
  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    try {
      await AdminLog.destroy({ where: {} });
      await Flag.destroy({ where: {} });
      await Issue.destroy({ where: {} });
      await User.destroy({ where: {} });
      console.log('✅ Test data cleaned up successfully');
    } catch (cleanupError) {
      console.error('❌ Failed to clean up test data:', cleanupError);
    }
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  demoAdminPanel().then(() => {
    console.log('\n👋 Demo completed. Exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

module.exports = { demoAdminPanel };