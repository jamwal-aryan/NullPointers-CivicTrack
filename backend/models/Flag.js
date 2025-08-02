const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Flag = sequelize.define('Flag', {
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
  flagged_by: {
    type: DataTypes.UUID,
    allowNull: true, // null for anonymous flaggers
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // For anonymous flagging session tracking
  flagger_session: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 500]
    }
  },
  flag_type: {
    type: DataTypes.ENUM('spam', 'inappropriate', 'irrelevant', 'duplicate', 'other'),
    defaultValue: 'spam',
    allowNull: false
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reviewed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  review_action: {
    type: DataTypes.ENUM('approved', 'rejected', 'deleted'),
    allowNull: true
  },
  review_comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  }
}, {
  tableName: 'flags',
  indexes: [
    {
      fields: ['issue_id']
    },
    {
      fields: ['flagged_by']
    },
    {
      fields: ['reviewed_at']
    },
    {
      fields: ['reviewed_by']
    },
    {
      fields: ['flag_type']
    },
    // Prevent duplicate flags from same user/session for same issue
    {
      unique: true,
      fields: ['issue_id', 'flagged_by'],
      name: 'unique_user_flag_per_issue'
    },
    {
      unique: true,
      fields: ['issue_id', 'flagger_session'],
      name: 'unique_session_flag_per_issue'
    }
  ]
});

module.exports = Flag;