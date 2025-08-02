#!/usr/bin/env node

/**
 * Demo script for content flagging system
 * This script demonstrates the flagging workflow including:
 * - Flagging issues
 * - Auto-hiding when threshold is reached
 * - Admin review process
 * - User banning functionality
 */

const { sequelize, User, Issue, Flag } = require('../models');
const FlaggingService = require('../services/flaggingService');

async function runFlaggingDemo() {
  try {
    console.log('🚀 Starting Content Flagging System Demo...\n');

    // Initialize database connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');

    // Clean up existing demo data
    console.log('🧹 Cleaning up existing demo data...');
    await Flag.destroy({ where: {}, force: true });
    await Issue.destroy({ where: { title: { [require('sequelize').Op.like]: 'Demo%' } }, force: true });
    await User.destroy({ where: { email: { [require('sequelize').Op.like]: 'demo%' } }, force: true });

    // Create demo users
    console.log('👥 Creating demo users...');
    const reporter = await User.create({
      email: 'demo.reporter@example.com',
      password_hash: 'hashedpassword',
      role: 'citizen',
      is_verified: true
    });

    const flaggers = [];
    for (let i = 1; i <= 4; i++) {
      const flagger = await User.create({
        email: `demo.flagger${i}@example.com`,
        password_hash: 'hashedpassword',
        role: 'citizen',
        is_verified: true
      });
      flaggers.push(flagger);
    }

    const admin = await User.create({
      email: 'demo.admin@example.com',
      password_hash: 'hashedpassword',
      role: 'admin',
      is_verified: true
    });

    console.log(`✅ Created ${flaggers.length + 2} demo users\n`);

    // Create demo issues
    console.log('📝 Creating demo issues...');
    const issues = [];
    for (let i = 1; i <= 3; i++) {
      const issue = await Issue.create({
        title: `Demo Issue ${i}`,
        description: `This is demo issue ${i} for testing flagging functionality`,
        category: ['roads', 'lighting', 'water'][i - 1],
        latitude: 40.7128 + (i * 0.001),
        longitude: -74.0060 + (i * 0.001),
        reporter_id: reporter.id,
        is_anonymous: false
      });
      issues.push(issue);
    }
    console.log(`✅ Created ${issues.length} demo issues\n`);

    // Demo 1: Single flag (should not auto-hide)
    console.log('🚩 Demo 1: Single flag (should not auto-hide)');
    console.log('----------------------------------------');
    
    const singleFlagResult = await FlaggingService.flagIssue(
      issues[0].id,
      flaggers[0].id,
      null,
      'This content appears to be spam',
      'spam'
    );

    if (singleFlagResult.success) {
      console.log('✅ Issue flagged successfully');
      console.log(`   Flag ID: ${singleFlagResult.flag.id}`);
      console.log(`   Flag count: ${singleFlagResult.issue.flag_count}`);
      console.log(`   Auto-hidden: ${singleFlagResult.issue.auto_hidden || false}`);
      console.log(`   Is hidden: ${singleFlagResult.issue.is_hidden}\n`);
    } else {
      console.log(`❌ Failed to flag issue: ${singleFlagResult.error}\n`);
    }

    // Demo 2: Multiple flags reaching threshold (should auto-hide)
    console.log('🚩 Demo 2: Multiple flags reaching threshold (should auto-hide)');
    console.log('---------------------------------------------------------------');
    
    for (let i = 0; i < 3; i++) {
      const flagResult = await FlaggingService.flagIssue(
        issues[1].id,
        flaggers[i].id,
        null,
        `Flag reason from user ${i + 1}`,
        'inappropriate'
      );

      if (flagResult.success) {
        console.log(`✅ Flag ${i + 1}/3 added successfully`);
        console.log(`   Flag count: ${flagResult.issue.flag_count}`);
        console.log(`   Auto-hidden: ${flagResult.issue.auto_hidden || false}`);
        console.log(`   Is hidden: ${flagResult.issue.is_hidden}`);
        
        if (flagResult.issue.auto_hidden) {
          console.log('🔒 Issue automatically hidden due to flag threshold!');
        }
        console.log('');
      } else {
        console.log(`❌ Failed to add flag ${i + 1}: ${flagResult.error}\n`);
      }
    }

    // Demo 3: Duplicate flag attempt
    console.log('🚩 Demo 3: Duplicate flag attempt (should fail)');
    console.log('-----------------------------------------------');
    
    const duplicateFlagResult = await FlaggingService.flagIssue(
      issues[1].id,
      flaggers[0].id, // Same user who already flagged
      null,
      'Another flag from same user',
      'spam'
    );

    if (!duplicateFlagResult.success) {
      console.log('✅ Duplicate flag correctly prevented');
      console.log(`   Error: ${duplicateFlagResult.error}\n`);
    } else {
      console.log('❌ Duplicate flag was incorrectly allowed\n');
    }

    // Demo 4: Anonymous flagging
    console.log('🚩 Demo 4: Anonymous flagging');
    console.log('-----------------------------');
    
    const anonymousFlagResult = await FlaggingService.flagIssue(
      issues[2].id,
      null,
      'anonymous-session-demo-123',
      'Anonymous user reporting inappropriate content',
      'inappropriate'
    );

    if (anonymousFlagResult.success) {
      console.log('✅ Anonymous flag added successfully');
      console.log(`   Flag ID: ${anonymousFlagResult.flag.id}`);
      console.log(`   Flag count: ${anonymousFlagResult.issue.flag_count}\n`);
    } else {
      console.log(`❌ Failed to add anonymous flag: ${anonymousFlagResult.error}\n`);
    }

    // Demo 5: Get flagged issues for admin review
    console.log('👨‍💼 Demo 5: Admin reviewing flagged issues');
    console.log('------------------------------------------');
    
    const flaggedIssuesResult = await FlaggingService.getFlaggedIssues({
      status: 'pending',
      limit: 10
    });

    if (flaggedIssuesResult.success) {
      console.log(`✅ Found ${flaggedIssuesResult.issues.length} flagged issues`);
      flaggedIssuesResult.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. Issue: "${issue.title}"`);
        console.log(`      Flag count: ${issue.flag_count}`);
        console.log(`      Is hidden: ${issue.is_hidden}`);
        console.log(`      Flags: ${issue.flags.length}`);
        issue.flags.forEach((flag, flagIndex) => {
          console.log(`         ${flagIndex + 1}. ${flag.flag_type}: "${flag.reason}"`);
        });
        console.log('');
      });
    } else {
      console.log(`❌ Failed to get flagged issues: ${flaggedIssuesResult.error}\n`);
    }

    // Demo 6: Admin reviewing and approving a flagged issue
    console.log('👨‍💼 Demo 6: Admin approving a flagged issue');
    console.log('--------------------------------------------');
    
    if (flaggedIssuesResult.success && flaggedIssuesResult.issues.length > 0) {
      const issueToReview = flaggedIssuesResult.issues[0];
      
      const reviewResult = await FlaggingService.reviewFlaggedIssue(
        issueToReview.id,
        admin.id,
        'approve',
        'After review, this content is appropriate and does not violate community guidelines'
      );

      if (reviewResult.success) {
        console.log('✅ Issue approved successfully');
        console.log(`   Issue: "${reviewResult.issue.title}"`);
        console.log(`   Action: ${reviewResult.review.action}`);
        console.log(`   Is hidden: ${reviewResult.issue.is_hidden}`);
        console.log(`   Review comment: "${reviewResult.review.comment}"\n`);
      } else {
        console.log(`❌ Failed to review issue: ${reviewResult.error}\n`);
      }
    }

    // Demo 7: Admin rejecting a flagged issue
    console.log('👨‍💼 Demo 7: Admin rejecting a flagged issue');
    console.log('--------------------------------------------');
    
    if (flaggedIssuesResult.success && flaggedIssuesResult.issues.length > 1) {
      const issueToReject = flaggedIssuesResult.issues[1];
      
      const rejectResult = await FlaggingService.reviewFlaggedIssue(
        issueToReject.id,
        admin.id,
        'reject',
        'This content violates community guidelines and will remain hidden'
      );

      if (rejectResult.success) {
        console.log('✅ Issue rejected successfully');
        console.log(`   Issue: "${rejectResult.issue.title}"`);
        console.log(`   Action: ${rejectResult.review.action}`);
        console.log(`   Is hidden: ${rejectResult.issue.is_hidden}`);
        console.log(`   Review comment: "${rejectResult.review.comment}"\n`);
      } else {
        console.log(`❌ Failed to reject issue: ${rejectResult.error}\n`);
      }
    }

    // Demo 8: User flagging statistics
    console.log('📊 Demo 8: User flagging statistics');
    console.log('----------------------------------');
    
    const statsResult = await FlaggingService.getUserFlaggingStats(flaggers[0].id);
    
    if (statsResult.success) {
      console.log('✅ User flagging statistics retrieved');
      console.log(`   Total flags: ${statsResult.stats.total_flags}`);
      console.log('   Flags by type:');
      Object.entries(statsResult.stats.by_type).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
      console.log('');
    } else {
      console.log(`❌ Failed to get user stats: ${statsResult.error}\n`);
    }

    // Demo 9: Check user for potential ban
    console.log('⚠️  Demo 9: Check user for potential ban');
    console.log('---------------------------------------');
    
    const banCheckResult = await FlaggingService.checkUserForBan(flaggers[0].id);
    
    if (banCheckResult.success) {
      console.log('✅ Ban check completed');
      console.log(`   Should ban: ${banCheckResult.should_ban}`);
      console.log(`   Recent flags (7 days): ${banCheckResult.stats.recent_flags}`);
      console.log(`   Total flags: ${banCheckResult.stats.total_flags}`);
      console.log(`   Rejected flags: ${banCheckResult.stats.rejected_flags}`);
      console.log(`   Rejection rate: ${(banCheckResult.stats.rejection_rate * 100).toFixed(1)}%\n`);
    } else {
      console.log(`❌ Failed to check ban status: ${banCheckResult.error}\n`);
    }

    console.log('🎉 Content Flagging System Demo completed successfully!');
    console.log('\nKey features demonstrated:');
    console.log('✅ Issue flagging by authenticated users');
    console.log('✅ Anonymous flagging with session tracking');
    console.log('✅ Automatic hiding when flag threshold is reached');
    console.log('✅ Duplicate flag prevention');
    console.log('✅ Admin review and moderation');
    console.log('✅ User flagging statistics');
    console.log('✅ Ban recommendation system');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runFlaggingDemo();
}

module.exports = { runFlaggingDemo };