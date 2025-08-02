const { sequelize } = require('../config/database');
const User = require('./User');
const Issue = require('./Issue');
const StatusHistory = require('./StatusHistory');
const Flag = require('./Flag');
const AdminLog = require('./AdminLog');

// Define model associations
const defineAssociations = () => {
  // User associations
  User.hasMany(Issue, { 
    foreignKey: 'reporter_id', 
    as: 'reportedIssues',
    onDelete: 'SET NULL'
  });
  
  User.hasMany(StatusHistory, { 
    foreignKey: 'updated_by', 
    as: 'statusUpdates',
    onDelete: 'CASCADE'
  });
  
  User.hasMany(Flag, { 
    foreignKey: 'flagged_by', 
    as: 'flags',
    onDelete: 'SET NULL'
  });
  
  User.hasMany(Flag, { 
    foreignKey: 'reviewed_by', 
    as: 'reviewedFlags',
    onDelete: 'SET NULL'
  });

  // Issue associations
  Issue.belongsTo(User, { 
    foreignKey: 'reporter_id', 
    as: 'reporter',
    allowNull: true
  });
  
  Issue.hasMany(StatusHistory, { 
    foreignKey: 'issue_id', 
    as: 'statusHistory',
    onDelete: 'CASCADE'
  });
  
  Issue.hasMany(Flag, { 
    foreignKey: 'issue_id', 
    as: 'flags',
    onDelete: 'CASCADE'
  });

  // StatusHistory associations
  StatusHistory.belongsTo(Issue, { 
    foreignKey: 'issue_id', 
    as: 'issue'
  });
  
  StatusHistory.belongsTo(User, { 
    foreignKey: 'updated_by', 
    as: 'updatedBy'
  });

  // Flag associations
  Flag.belongsTo(Issue, { 
    foreignKey: 'issue_id', 
    as: 'issue'
  });
  
  Flag.belongsTo(User, { 
    foreignKey: 'flagged_by', 
    as: 'flaggedBy',
    allowNull: true
  });
  
  Flag.belongsTo(User, { 
    foreignKey: 'reviewed_by', 
    as: 'reviewedBy',
    allowNull: true
  });

  // AdminLog associations
  AdminLog.belongsTo(User, { 
    foreignKey: 'admin_id', 
    as: 'admin'
  });
  
  User.hasMany(AdminLog, { 
    foreignKey: 'admin_id', 
    as: 'adminLogs',
    onDelete: 'CASCADE'
  });
};

// Initialize associations
defineAssociations();

// Database initialization function
const initializeDatabase = async () => {
  try {
    // Test connection and enable PostGIS
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Enable PostGIS extension
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS extension enabled.');
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database models synchronized.');
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  User,
  Issue,
  StatusHistory,
  Flag,
  AdminLog,
  initializeDatabase
};