const { RTConversation, RTMessage } = require("../models");
const { v4: uuidv4 } = require("uuid");

let io;

exports.initSocket = (ioInstance) => {
    io = ioInstance;
};

// tạo conversation mới hoặc lấy conversation cũ
exports.getOrCreateConversation = async (req, res) => {
    try {
        const { sessionID, userID, guestName } = req.body;

        let where = {};
        if (userID) where.UserID = userID;
        else where.SessionID = sessionID;

        where.Status = "active";

        let conv = await RTConversation.findOne({ where });

        if (!conv) {
            conv = await RTConversation.create({
                ConversationID: uuidv4(),
                UserID: userID || null,
                SessionID: sessionID || null,
                GuestName: guestName || null,
            });
        }

        res.json({ conversation: conv });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// user or admin gửi tin nhắn
exports.sendMessage = async (req, res) => {
    try {
        const { conversationID, senderType, senderID, messageText } = req.body;

        const msg = await RTMessage.create({
            ConversationID: conversationID,
            SenderType: senderType,
            SenderID: senderID || null,
            MessageText: messageText,
        });

        await RTConversation.update(
            { LastMessageAt: new Date() },
            { where: { ConversationID: conversationID } }
        );

        io.to(conversationID).emit("newMessage", msg);

        res.json({ message: msg });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// lấy lịch sử chat
exports.getMessages = async (req, res) => {
    try {
        const messages = await RTMessage.findAll({
            where: { ConversationID: req.params.id },
            order: [["CreatedAt", "ASC"]],
        });

        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// admin lấy danh sách conversation
exports.getAllConversations = async (req, res) => {
    try {
        const convs = await RTConversation.findAll({
            order: [["LastMessageAt", "DESC"]],
        });

        res.json({ conversations: convs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
