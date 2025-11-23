'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Chats', {
      ChatID: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      SenderID: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Users', key: 'UserID' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      ReceiverID: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Users', key: 'UserID' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      Message: { type: Sequelize.TEXT, allowNull: false },
      CreatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('GETDATE()') },
      UpdatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('GETDATE()') }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Chats');
  }
};
