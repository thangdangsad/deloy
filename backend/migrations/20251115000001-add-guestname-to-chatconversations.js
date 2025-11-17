'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ChatConversations', 'GuestName', {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: 'SessionID'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ChatConversations', 'GuestName');
  }
};
