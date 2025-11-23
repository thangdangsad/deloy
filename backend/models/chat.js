'use strict';
module.exports = (sequelize, DataTypes) => {
    const Chat = sequelize.define('Chat', {
        ChatID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        SenderID: { type: DataTypes.INTEGER, allowNull: false },
        ReceiverID: { type: DataTypes.INTEGER, allowNull: false },
        Message: { type: DataTypes.TEXT, allowNull: false },
    }, {
        tableName: 'Chats',
        timestamps: true,
        createdAt: 'CreatedAt',
        updatedAt: 'UpdatedAt'
    });

    Chat.associate = (models) => {
        Chat.belongsTo(models.User, { foreignKey: 'SenderID', as: 'sender' });
        Chat.belongsTo(models.User, { foreignKey: 'ReceiverID', as: 'receiver' });
    };

    return Chat;
};
