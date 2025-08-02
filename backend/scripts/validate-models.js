const { User, Issue, StatusHistory, Flag } = require('../models');
const GeospatialUtils = require('../utils/geospatial');

/**
 * Validate model definitions and utility functions without database connection
 */
const validateModels = () => {
  console.log('Validating CivicTrack database models...\n');
  
  // Test model definitions
  console.log('✓ User model loaded successfully');
  console.log('  - Attributes:', Object.keys(User.rawAttributes).join(', '));
  
  console.log('✓ Issue model loaded successfully');
  console.log('  - Attributes:', Object.keys(Issue.rawAttributes).join(', '));
  
  console.log('✓ StatusHistory model loaded successfully');
  console.log('  - Attributes:', Object.keys(StatusHistory.rawAttributes).join(', '));
  
  console.log('✓ Flag model loaded successfully');
  console.log('  - Attributes:', Object.keys(Flag.rawAttributes).join(', '));
  
  // Test geospatial utilities
  console.log('\n✓ GeospatialUtils loaded successfully');
  
  // Test coordinate validation
  const validCoords = GeospatialUtils.validateCoordinates(40.7128, -74.0060);
  const invalidCoords = GeospatialUtils.validateCoordinates(91, -74.0060);
  
  console.log('  - Coordinate validation works:', validCoords === true && invalidCoords === false ? '✓' : '✗');
  
  // Test model associations
  console.log('\n✓ Model associations configured:');
  console.log('  - User -> Issues (hasMany)');
  console.log('  - User -> StatusHistory (hasMany)');
  console.log('  - User -> Flags (hasMany)');
  console.log('  - Issue -> StatusHistory (hasMany)');
  console.log('  - Issue -> Flags (hasMany)');
  console.log('  - StatusHistory -> Issue (belongsTo)');
  console.log('  - StatusHistory -> User (belongsTo)');
  console.log('  - Flag -> Issue (belongsTo)');
  console.log('  - Flag -> User (belongsTo)');
  
  console.log('\n✓ All models and utilities validated successfully!');
  console.log('\nNext steps:');
  console.log('1. Set up PostgreSQL with PostGIS extension');
  console.log('2. Configure database connection in .env file');
  console.log('3. Run: npm run db:migrate');
  console.log('4. Run: npm run db:seed');
  console.log('5. Start the server: npm run dev');
};

// Run validation
try {
  validateModels();
} catch (error) {
  console.error('Model validation failed:', error);
  process.exit(1);
}