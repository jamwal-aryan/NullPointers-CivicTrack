const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Determine which database to use
const usePostgres = process.env.USE_POSTGRES !== 'false' && process.env.NODE_ENV !== 'sqlite';

let sequelize;

if (usePostgres) {
  // PostgreSQL configuration
  sequelize = new Sequelize({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'civic_track',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    dialectOptions: {
      // Enable PostGIS extension
      application_name: 'civic-track'
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
} else {
  // SQLite configuration for development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'civic_track_dev.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
}

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connection established successfully (${usePostgres ? 'PostgreSQL' : 'SQLite'}).`);
    
    // Enable PostGIS extension only for PostgreSQL
    if (usePostgres) {
      try {
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        console.log('PostGIS extension enabled.');
      } catch (error) {
        console.warn('PostGIS extension could not be enabled:', error.message);
      }
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    
    if (usePostgres) {
      console.log('\n💡 PostgreSQL connection failed. You can:');
      console.log('   1. Install and start PostgreSQL');
      console.log('   2. Run: npm run db:setup-help for setup instructions');
      console.log('   3. Or use SQLite for development by setting USE_POSTGRES=false in .env');
    }
    
    throw error;
  }
};

module.exports = { sequelize, testConnection };