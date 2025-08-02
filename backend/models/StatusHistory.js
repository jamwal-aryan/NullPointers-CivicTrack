const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StatusHistory = sequelize.define('StatusHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  issue_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'issues',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  previous_status: {
    type: DataTypes.ENUM('reported', 'in_progress', 'resolved'),
    allowNull: true // null for initial status
  },
  new_status: {
    type: DataTypes.ENUM('reported', 'in_progress', 'resolved'),
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'status_history',
  timestamps: false, // We manage updated_at manually
  indexes: [
    {
      fields: ['issue_id']
    },
    {
      fields: ['updated_by']
    },
    {
      fields: ['updated_at']
    },
    {
      fields: ['issue_id', 'updated_at']
    }
  ]
});

module.exports = StatusHistory;