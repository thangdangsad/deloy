module.exports = (sequelize, DataTypes) => {
  const ChatConversation = sequelize.define(
    'ChatConversation',
    {
      ConversationID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      UserID: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      SessionID: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      GuestName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      Status: {
        type: DataTypes.ENUM('active', 'pending_admin', 'closed'),
        defaultValue: 'active',
      },
      LastMessageAt: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: 'ChatConversations',
      timestamps: true,
      createdAt: 'CreatedAt',
      updatedAt: 'UpdatedAt',
    }
  );

  ChatConversation.associate = (models) => {
    ChatConversation.belongsTo(models.User, {
      foreignKey: 'UserID',
      as: 'User',
    });
    ChatConversation.hasMany(models.ChatMessage, {
      foreignKey: 'ConversationID',
      as: 'Messages',
    });
  };

  return ChatConversation;
};
