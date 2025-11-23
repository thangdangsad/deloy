module.exports = (sequelize, DataTypes) => {
    const RTConversation = sequelize.define(
        "RTConversation",
        {
            ConversationID: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            UserID: DataTypes.INTEGER,
            SessionID: DataTypes.STRING,
            GuestName: DataTypes.STRING,
            Status: DataTypes.ENUM("active", "pending_admin", "closed"),
            LastMessageAt: DataTypes.DATE
        },
        {
            tableName: "RT_Conversations",
            timestamps: true,
            createdAt: "CreatedAt",
            updatedAt: "UpdatedAt",
        }
    );

    RTConversation.associate = (models) => {
        RTConversation.hasMany(models.RTMessage, {
            foreignKey: "ConversationID",
            as: "Messages"
        });
    };

    return RTConversation;
};
