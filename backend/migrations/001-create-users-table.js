const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: true
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
      session_token: {
        type: DataTypes.STRING,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['is_banned']);
    await queryInterface.addIndex('users', ['session_token']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};