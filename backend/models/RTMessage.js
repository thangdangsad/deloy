module.exports = (sequelize, DataTypes) => {
    const RTMessage = sequelize.define(
        "RTMessage",
        {
            MessageID: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            ConversationID: DataTypes.UUID,
            SenderType: DataTypes.ENUM("user", "admin"),
            SenderID: DataTypes.INTEGER,
            MessageText: DataTypes.TEXT,
            CreatedAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        },
        {
            tableName: "RT_Messages",
            timestamps: false
        }
    );

    RTMessage.associate = (models) => {
        RTMessage.belongsTo(models.RTConversation, {
            foreignKey: "ConversationID",
            as: "Conversation"
        });
    };

    return RTMessage;
};
