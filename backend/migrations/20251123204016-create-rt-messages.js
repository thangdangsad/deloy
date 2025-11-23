'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("RT_Messages", {
      MessageID: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      ConversationID: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "RT_Conversations",
          key: "ConversationID"
        },
        onDelete: "CASCADE"
      },
      SenderType: {
        type: Sequelize.ENUM("user", "admin"),
        allowNull: false
      },
      SenderID: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      MessageText: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      CreatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("GETDATE"),
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("RT_Messages");
  }
};
