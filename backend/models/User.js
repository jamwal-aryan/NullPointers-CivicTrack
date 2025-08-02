const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // null for anonymous users
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: true // null for anonymous users
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  role: {
    type: DataTypes.ENUM('citizen', 'authority', 'admin'),
    defaultValue: 'citizen',
    allowNull: false
  },
  is_banned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_active_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // Anonymous user session tracking
  session_token: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_banned']
    },
    {
      fields: ['session_token']
    }
  ]
});

module.exports = User;