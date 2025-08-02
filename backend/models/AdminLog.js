const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * AdminLog Model - Tracks administrative actions for audit purposes
 */
const AdminLog = sequelize.define('AdminLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['flag_review', 'user_ban', 'user_unban', 'issue_delete', 'bulk_action']]
    }
  },
  target_type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['issue', 'user', 'flag', 'system']]
    }
  },
  target_id: {
    type: DataTypes.UUID,
    allowNull: true // Some actions might not have a specific target
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional details about the action (reason, previous values, etc.)'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'admin_logs',
  timestamps: false, // We only need created_at
  indexes: [
    {
      fields: ['admin_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['target_type', 'target_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Define associations
AdminLog.associate = (models) => {
  // Admin who performed the action
  AdminLog.belongsTo(models.User, {
    foreignKey: 'admin_id',
    as: 'admin'
  });
};

module.exports = AdminLog;