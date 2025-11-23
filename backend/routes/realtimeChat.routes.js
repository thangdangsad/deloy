const express = require("express");
const router = express.Router();
const chatController = require("../controllers/realtimeChat.controller");

// user
router.post("/conversation", chatController.getOrCreateConversation);
router.post("/message", chatController.sendMessage);
router.get("/conversation/:id/messages", chatController.getMessages);

// admin
router.get("/admin/conversations", chatController.getAllConversations);

module.exports = router;
