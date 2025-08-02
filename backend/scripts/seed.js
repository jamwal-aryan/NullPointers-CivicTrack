const bcrypt = require('bcryptjs');
const { User, Issue, StatusHistory, Flag, sequelize } = require('../models');

const seedData = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      await Flag.destroy({ where: {}, force: true });
      await StatusHistory.destroy({ where: {}, force: true });
      await Issue.destroy({ where: {}, force: true });
      await User.destroy({ where: {}, force: true });
      console.log('Existing data cleared.');
    }
    
    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await User.bulkCreate([
      {
        email: 'admin@civictrack.com',
        password_hash: hashedPassword,
        is_verified: true,
        role: 'admin'
      },
      {
        email: 'authority@city.gov',
        password_hash: hashedPassword,
        is_verified: true,
        role: 'authority'
      },
      {
        email: 'citizen1@example.com',
        password_hash: hashedPassword,
        is_verified: true,
        role: 'citizen'
      },
      {
        email: 'citizen2@example.com',
        password_hash: hashedPassword,
        is_verified: true,
        role: 'citizen'
      },
      {
        // Anonymous user placeholder
        email: null,
        password_hash: null,
        is_verified: false,
        role: 'citizen',
        session_token: 'anonymous_session_123'
      }
    ], { returning: true });
    
    console.log(`Created ${users.length} test users.`);
    
    // Create test issues with various locations (using coordinates around a city center)
    const baseLatitude = 40.7128; // New York City coordinates as example
    const baseLongitude = -74.0060;
    
    const issues = await Issue.bulkCreate([
      {
        title: 'Pothole on Main Street',
        description: 'Large pothole causing damage to vehicles. Located near the intersection with Oak Avenue.',
        category: 'roads',
        status: 'reported',
        latitude: baseLatitude + 0.001,
        longitude: baseLongitude + 0.001,
        address: '123 Main Street',
        photos: ['pothole1.jpg', 'pothole2.jpg'],
        reporter_id: users[2].id,
        is_anonymous: false
      },
      {
        title: 'Broken Street Light',
        description: 'Street light has been out for over a week, making the area unsafe at night.',
        category: 'lighting',
        status: 'in_progress',
        latitude: baseLatitude + 0.002,
        longitude: baseLongitude - 0.001,
        address: '456 Elm Street',
        photos: ['streetlight.jpg'],
        reporter_id: users[3].id,
        is_anonymous: false
      },
      {
        title: 'Water Leak in Park',
        description: 'Continuous water leak from underground pipe creating muddy conditions.',
        category: 'water',
        status: 'resolved',
        latitude: baseLatitude - 0.001,
        longitude: baseLongitude + 0.002,
        address: 'Central Park, near fountain',
        photos: ['waterleak1.jpg'],
        reporter_id: users[2].id,
        is_anonymous: false
      },
      {
        title: 'Overflowing Trash Bins',
        description: 'Multiple trash bins overflowing, attracting pests and creating unsanitary conditions.',
        category: 'cleanliness',
        status: 'reported',
        latitude: baseLatitude + 0.003,
        longitude: baseLongitude - 0.002,
        address: '789 Pine Street',
        photos: ['trash1.jpg', 'trash2.jpg', 'trash3.jpg'],
        reporter_id: null,
        is_anonymous: true,
        reporter_session: 'anonymous_session_123'
      },
      {
        title: 'Fallen Tree Blocking Sidewalk',
        description: 'Large tree fell during last storm, completely blocking pedestrian access.',
        category: 'obstructions',
        status: 'in_progress',
        latitude: baseLatitude - 0.002,
        longitude: baseLongitude - 0.001,
        address: '321 Cedar Avenue',
        photos: ['fallen_tree.jpg'],
        reporter_id: users[3].id,
        is_anonymous: false
      },
      {
        title: 'Suspicious Activity Report',
        description: 'Ongoing suspicious activity in the area during late night hours.',
        category: 'safety',
        status: 'reported',
        latitude: baseLatitude + 0.001,
        longitude: baseLongitude - 0.003,
        address: '654 Maple Drive',
        photos: [],
        reporter_id: users[2].id,
        is_anonymous: false,
        flag_count: 2,
        is_hidden: true // This issue has been flagged and hidden
      }
    ], { returning: true });
    
    console.log(`Created ${issues.length} test issues.`);
    
    // Create status history entries
    const statusHistories = await StatusHistory.bulkCreate([
      {
        issue_id: issues[1].id, // Broken Street Light
        previous_status: 'reported',
        new_status: 'in_progress',
        comment: 'Work order created. Maintenance crew assigned.',
        updated_by: users[1].id // authority user
      },
      {
        issue_id: issues[2].id, // Water Leak
        previous_status: 'reported',
        new_status: 'in_progress',
        comment: 'Plumbing crew dispatched to location.',
        updated_by: users[1].id
      },
      {
        issue_id: issues[2].id, // Water Leak
        previous_status: 'in_progress',
        new_status: 'resolved',
        comment: 'Pipe repaired and area cleaned up.',
        updated_by: users[1].id
      },
      {
        issue_id: issues[4].id, // Fallen Tree
        previous_status: 'reported',
        new_status: 'in_progress',
        comment: 'Tree removal crew scheduled for tomorrow morning.',
        updated_by: users[1].id
      }
    ]);
    
    console.log(`Created ${statusHistories.length} status history entries.`);
    
    // Create flag entries
    const flags = await Flag.bulkCreate([
      {
        issue_id: issues[5].id, // Suspicious Activity Report
        flagged_by: users[2].id,
        reason: 'This seems like spam or irrelevant content',
        flag_type: 'spam'
      },
      {
        issue_id: issues[5].id, // Suspicious Activity Report
        flagged_by: users[3].id,
        reason: 'Inappropriate content that doesn\'t belong on this platform',
        flag_type: 'inappropriate'
      }
    ]);
    
    console.log(`Created ${flags.length} flag entries.`);
    
    console.log('Database seeding completed successfully!');
    console.log('\nTest accounts created:');
    console.log('Admin: admin@civictrack.com / password123');
    console.log('Authority: authority@city.gov / password123');
    console.log('Citizen 1: citizen1@example.com / password123');
    console.log('Citizen 2: citizen2@example.com / password123');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
};

// Run seeding if this script is executed directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('Seeding completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };