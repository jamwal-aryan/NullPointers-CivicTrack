const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Enable PostGIS extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    await queryInterface.createTable('issues', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      category: {
        type: DataTypes.ENUM('roads', 'lighting', 'water', 'cleanliness', 'safety', 'obstructions'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('reported', 'in_progress', 'resolved'),
        defaultValue: 'reported',
        allowNull: false
      },
      location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      photos: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
      },
      reporter_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      is_anonymous: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_hidden: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      flag_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      reporter_session: {
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
    await queryInterface.addIndex('issues', ['status']);
    await queryInterface.addIndex('issues', ['category']);
    await queryInterface.addIndex('issues', ['is_hidden']);
    await queryInterface.addIndex('issues', ['reporter_id']);
    await queryInterface.addIndex('issues', ['created_at']);
    await queryInterface.addIndex('issues', ['status', 'category', 'is_hidden']);
    
    // Create spatial index for location-based queries
    await queryInterface.sequelize.query(
      'CREATE INDEX issues_location_gist ON issues USING gist(location);'
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('issues');
  }
};