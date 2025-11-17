const { ChatConversation, ChatMessage, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Lấy hoặc tạo conversation cho user
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { sessionID } = req.body;
    const userID = req.user?.id || null; // JWT payload có field "id"
    
    console.log('📝 getOrCreateConversation - UserID:', userID, 'SessionID:', sessionID);
    console.log('📝 req.user:', req.user);

    if (!sessionID) {
      return res.status(400).json({ message: 'SessionID là bắt buộc' });
    }

    // Xây dựng điều kiện tìm kiếm
    let whereClause = { SessionID: sessionID, Status: 'active' };
    
    // Nếu user đã đăng nhập, tìm theo UserID thay vì SessionID
    // Điều này đảm bảo mỗi user có 1 conversation riêng
    if (userID) {
      whereClause = { UserID: userID, Status: 'active' };
    }
    
    console.log('🔍 Finding conversation with:', whereClause);

    // Tìm conversation hiện tại
    let conversation = await ChatConversation.findOne({
      where: whereClause,
      include: [
        {
          model: ChatMessage,
          as: 'Messages',
          order: [['CreatedAt', 'ASC']],
        },
      ],
    });

    // Nếu chưa có thì tạo mới
    if (!conversation) {
      console.log('  ✨ Creating NEW conversation');
      conversation = await ChatConversation.create({
        ConversationID: uuidv4(),
        SessionID: sessionID,
        UserID: userID,
        Status: 'active',
      });
      
      conversation = await ChatConversation.findByPk(conversation.ConversationID, {
        include: [
          {
            model: ChatMessage,
            as: 'Messages',
            order: [['CreatedAt', 'ASC']],
          },
        ],
      });
      console.log('  ✅ New conversation created:', conversation.ConversationID);
    } else {
      console.log('  🔄 Found existing conversation:', conversation.ConversationID);
      console.log('  📝 Messages count:', conversation.Messages?.length || 0);
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Gửi tin nhắn từ user
exports.sendMessage = async (req, res) => {
  try {
    const { conversationID, messageText } = req.body;
    const userID = req.user?.id || null; // JWT payload có field "id"

    if (!conversationID || !messageText) {
      return res.status(400).json({ message: 'ConversationID và messageText là bắt buộc' });
    }

    // Kiểm tra conversation tồn tại
    const conversation = await ChatConversation.findByPk(conversationID);
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Tạo tin nhắn mới
    const message = await ChatMessage.create({
      ConversationID: conversationID,
      SenderType: 'user',
      SenderID: userID,
      MessageText: messageText,
      IsRead: false,
    });

    // Cập nhật LastMessageAt
    await conversation.update({ LastMessageAt: new Date() });

    // Nếu user yêu cầu liên hệ admin, đánh dấu conversation là "pending_admin"
    const lowerMsg = messageText.toLowerCase();
    if (lowerMsg.includes('liên hệ nhân viên') || lowerMsg.includes('🆘') || 
        lowerMsg.includes('nói chuyện với admin') || lowerMsg.includes('gặp nhân viên') ||
        lowerMsg.includes('hỗ trợ tư vấn') || lowerMsg.includes('tư vấn')) {
      await conversation.update({ Status: 'pending_admin' });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy tin nhắn mới (polling)
exports.getNewMessages = async (req, res) => {
  try {
    const { conversationID, lastMessageID } = req.query;

    if (!conversationID) {
      return res.status(400).json({ message: 'ConversationID là bắt buộc' });
    }

    const whereClause = { ConversationID: conversationID };
    if (lastMessageID) {
      whereClause.MessageID = { [require('sequelize').Op.gt]: parseInt(lastMessageID) };
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      order: [['CreatedAt', 'ASC']],
    });

    res.json({ messages });
  } catch (error) {
    console.error('Error in getNewMessages:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ===== ADMIN ENDPOINTS =====

// Lấy danh sách tất cả conversations
exports.getAllConversations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Nếu không có status param thì lấy TẤT CẢ conversations
    const whereClause = status ? { Status: status } : {};

    const { count, rows: conversations } = await ChatConversation.findAndCountAll({
      where: whereClause,
      attributes: ['ConversationID', 'SessionID', 'UserID', 'GuestName', 'Status', 'LastMessageAt', 'CreatedAt'],
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['UserID', 'FullName', 'Email'],
          required: false, // LEFT JOIN để lấy cả Guest (UserID null)
        },
        {
          model: ChatMessage,
          as: 'Messages',
          separate: true,
          limit: 1,
          order: [['CreatedAt', 'DESC']],
        },
      ],
      order: [['LastMessageAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Format conversations với tên hiển thị
    const formattedConversations = conversations.map(conv => {
      const plainConv = conv.toJSON();
      // Xác định tên hiển thị: User > GuestName > SessionID
      plainConv.DisplayName = plainConv.User?.FullName || plainConv.GuestName || `Guest (${plainConv.SessionID.substring(0, 8)}...)`;
      plainConv.DisplayEmail = plainConv.User?.Email || null;
      plainConv.IsGuest = !plainConv.UserID;
      return plainConv;
    });

    res.json({
      conversations: formattedConversations,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error in getAllConversations:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy chi tiết một conversation
exports.getConversationDetail = async (req, res) => {
  try {
    const { conversationID } = req.params;

    const conversation = await ChatConversation.findByPk(conversationID, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['UserID', 'FullName', 'Email'],
        },
        {
          model: ChatMessage,
          as: 'Messages',
          order: [['CreatedAt', 'ASC']],
        },
      ],
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Đánh dấu tất cả tin nhắn là đã đọc
    await ChatMessage.update(
      { IsRead: true },
      { where: { ConversationID: conversationID, SenderType: 'user' } }
    );

    // Add display name
    const plainConv = conversation.toJSON();
    plainConv.DisplayName = plainConv.User?.FullName || plainConv.GuestName || `Guest (${plainConv.SessionID.substring(0, 8)}...)`;
    plainConv.DisplayEmail = plainConv.User?.Email || null;
    plainConv.IsGuest = !plainConv.UserID;

    res.json({ conversation: plainConv });
  } catch (error) {
    console.error('Error in getConversationDetail:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Admin gửi tin nhắn phản hồi
exports.sendAdminMessage = async (req, res) => {
  try {
    const { conversationID, messageText } = req.body;
    const adminID = req.user.id; // JWT payload có field "id"

    if (!conversationID || !messageText) {
      return res.status(400).json({ message: 'ConversationID và messageText là bắt buộc' });
    }

    // Kiểm tra conversation tồn tại
    const conversation = await ChatConversation.findByPk(conversationID);
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    // Tạo tin nhắn từ admin
    const message = await ChatMessage.create({
      ConversationID: conversationID,
      SenderType: 'admin',
      SenderID: adminID,
      MessageText: messageText,
      IsRead: false,
    });

    // Cập nhật LastMessageAt
    await conversation.update({ LastMessageAt: new Date() });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error in sendAdminMessage:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Đóng conversation
exports.closeConversation = async (req, res) => {
  try {
    const { conversationID } = req.params;

    const conversation = await ChatConversation.findByPk(conversationID);
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy conversation' });
    }

    await conversation.update({ Status: 'closed' });

    res.json({ message: 'Đã đóng conversation', conversation });
  } catch (error) {
    console.error('Error in closeConversation:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
