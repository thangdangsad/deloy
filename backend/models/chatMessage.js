module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define(
    'ChatMessage',
    {
      MessageID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ConversationID: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      SenderType: {
        type: DataTypes.ENUM('user', 'agent', 'admin'),
        allowNull: false,
      },
      SenderID: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      MessageText: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      IsRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'ChatMessages',
      timestamps: true,
      createdAt: 'CreatedAt',
      updatedAt: false,
    }
  );

  ChatMessage.associate = (models) => {
    ChatMessage.belongsTo(models.ChatConversation, {
      foreignKey: 'ConversationID',
      as: 'Conversation',
    });
  };

  return ChatMessage;
};
