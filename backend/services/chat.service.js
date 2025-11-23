const { Chat, User } = require('../models');

class ChatService {
    async saveMessage(senderId, receiverId, message) {
        return await Chat.create({ SenderID: senderId, ReceiverID: receiverId, Message: message });
    }

    async getMessagesBetween(senderId, receiverId) {
        return await Chat.findAll({
            where: {
                [Op.or]: [
                    { SenderID: senderId, ReceiverID: receiverId },
                    { SenderID: receiverId, ReceiverID: senderId }
                ]
            },
            include: [
                { model: User, as: 'sender', attributes: ['UserID', 'Username', 'AvatarURL'] },
                { model: User, as: 'receiver', attributes: ['UserID', 'Username', 'AvatarURL'] }
            ],
            order: [['CreatedAt', 'ASC']]
        });
    }
}

module.exports = new ChatService();
