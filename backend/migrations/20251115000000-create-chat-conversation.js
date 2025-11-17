'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tạo bảng ChatConversation - lưu phiên chat của mỗi user
    await queryInterface.createTable('ChatConversations', {
      ConversationID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      UserID: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'UserID',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      SessionID: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Session ID từ localStorage của user (cho guest)',
      },
      Status: {
        type: Sequelize.ENUM('active', 'closed'),
        defaultValue: 'active',
      },
      LastMessageAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      CreatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('GETDATE()'),
      },
      UpdatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('GETDATE()'),
      },
    });

    // Tạo bảng ChatMessage - lưu từng tin nhắn
    await queryInterface.createTable('ChatMessages', {
      MessageID: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      ConversationID: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ChatConversations',
          key: 'ConversationID',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      SenderType: {
        type: Sequelize.ENUM('user', 'agent', 'admin'),
        allowNull: false,
        comment: 'user = khách hàng, agent = bot tự động, admin = nhân viên',
      },
      SenderID: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'UserID nếu là user/admin',
      },
      MessageText: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      IsRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      CreatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('GETDATE()'),
      },
    });

    // Tạo index để query nhanh
    await queryInterface.addIndex('ChatConversations', ['SessionID']);
    await queryInterface.addIndex('ChatConversations', ['UserID']);
    await queryInterface.addIndex('ChatConversations', ['Status']);
    await queryInterface.addIndex('ChatMessages', ['ConversationID']);
    await queryInterface.addIndex('ChatMessages', ['CreatedAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ChatMessages');
    await queryInterface.dropTable('ChatConversations');
  }
};
