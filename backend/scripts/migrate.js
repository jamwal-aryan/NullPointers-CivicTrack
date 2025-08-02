const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

const runMigrations = async () => {
  try {
    console.log('Starting database migrations...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files.`);
    
    // Run each migration
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsDir, file));
      
      try {
        await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
        console.log(`✓ Migration ${file} completed successfully.`);
      } catch (error) {
        console.error(`✗ Migration ${file} failed:`, error.message);
        throw error;
      }
    }
    
    console.log('All migrations completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };