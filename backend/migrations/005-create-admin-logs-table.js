'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('admin_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      admin_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false
      },
      target_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      target_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('admin_logs', ['admin_id']);
    await queryInterface.addIndex('admin_logs', ['action']);
    await queryInterface.addIndex('admin_logs', ['target_type', 'target_id']);
    await queryInterface.addIndex('admin_logs', ['created_at']);

    // Add check constraints
    await queryInterface.addConstraint('admin_logs', {
      fields: ['action'],
      type: 'check',
      name: 'admin_logs_action_check',
      where: {
        action: {
          [Sequelize.Op.in]: ['flag_review', 'user_ban', 'user_unban', 'issue_delete', 'bulk_action']
        }
      }
    });

    await queryInterface.addConstraint('admin_logs', {
      fields: ['target_type'],
      type: 'check',
      name: 'admin_logs_target_type_check',
      where: {
        target_type: {
          [Sequelize.Op.in]: ['issue', 'user', 'flag', 'system']
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('admin_logs');
  }
};