'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update the photos column to use JSONB instead of ARRAY(STRING)
    await queryInterface.changeColumn('issues', 'photos', {
      type: Sequelize.JSONB,
      defaultValue: [],
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to ARRAY(STRING) - note: this will lose photo metadata
    await queryInterface.changeColumn('issues', 'photos', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      allowNull: false
    });
  }
};