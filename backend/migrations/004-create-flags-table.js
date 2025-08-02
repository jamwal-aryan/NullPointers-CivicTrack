const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('flags', {
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
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      flagger_session: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false
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
        },
        onDelete: 'SET NULL'
      },
      review_action: {
        type: DataTypes.ENUM('approved', 'rejected', 'deleted'),
        allowNull: true
      },
      review_comment: {
        type: DataTypes.TEXT,
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
    await queryInterface.addIndex('flags', ['issue_id']);
    await queryInterface.addIndex('flags', ['flagged_by']);
    await queryInterface.addIndex('flags', ['reviewed_at']);
    await queryInterface.addIndex('flags', ['reviewed_by']);
    await queryInterface.addIndex('flags', ['flag_type']);
    
    // Create unique constraints to prevent duplicate flags
    await queryInterface.addConstraint('flags', {
      fields: ['issue_id', 'flagged_by'],
      type: 'unique',
      name: 'unique_user_flag_per_issue'
    });
    
    await queryInterface.addConstraint('flags', {
      fields: ['issue_id', 'flagger_session'],
      type: 'unique',
      name: 'unique_session_flag_per_issue'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('flags');
  }
};