const ChatService = require('../services/chat.service');

class ChatController {
    async getConversation(req, res) {
        const { userId, otherUserId } = req.query;
        const messages = await ChatService.getMessagesBetween(userId, otherUserId);
        res.json(messages);
    }
}

module.exports = new ChatController();
