const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authenticateToken = require('../middleware/auth.middleware');
const authenticateTokenOptional = require('../middleware/authenticateTokenOptional');
const checkAdmin = require('../middleware/checkAdmin');

// ===== USER ENDPOINTS =====
// Lấy hoặc tạo conversation (có thể đăng nhập hoặc guest)
router.post('/conversation', authenticateTokenOptional, chatController.getOrCreateConversation);

// Gửi tin nhắn (có thể đăng nhập hoặc guest)
router.post('/message', authenticateTokenOptional, chatController.sendMessage);

// Lấy tin nhắn mới - polling (có thể đăng nhập hoặc guest)
router.get('/messages/new', chatController.getNewMessages);

// ===== ADMIN ENDPOINTS =====
// Lấy danh sách tất cả conversations
router.get('/admin/conversations', authenticateToken, checkAdmin, chatController.getAllConversations);

// Lấy chi tiết một conversation
router.get('/admin/conversations/:conversationID', authenticateToken, checkAdmin, chatController.getConversationDetail);

// Admin gửi tin nhắn phản hồi
router.post('/admin/message', authenticateToken, checkAdmin, chatController.sendAdminMessage);

// Đóng conversation
router.put('/admin/conversations/:conversationID/close', authenticateToken, checkAdmin, chatController.closeConversation);

module.exports = router;
