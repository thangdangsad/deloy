'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("RT_Conversations", {
      ConversationID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      UserID: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      SessionID: {
        type: Sequelize.STRING,
        allowNull: true
      },
      GuestName: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      Status: {
        type: Sequelize.ENUM("active", "pending_admin", "closed"),
        defaultValue: "active"
      },
      LastMessageAt: {
        type: Sequelize.DATE,
        allowNull: true
      },

      CreatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("GETDATE"),
        allowNull: false
      },
      UpdatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("GETDATE"),
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("RT_Conversations");
  }
};
