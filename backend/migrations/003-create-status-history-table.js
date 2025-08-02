const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('status_history', {
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
        allowNull: true
      },
      new_status: {
        type: DataTypes.ENUM('reported', 'in_progress', 'resolved'),
        allowNull: false
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true
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
    });

    // Create indexes
    await queryInterface.addIndex('status_history', ['issue_id']);
    await queryInterface.addIndex('status_history', ['updated_by']);
    await queryInterface.addIndex('status_history', ['updated_at']);
    await queryInterface.addIndex('status_history', ['issue_id', 'updated_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('status_history');
  }
};