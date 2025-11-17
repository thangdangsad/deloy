import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AdminChat.css';

const API_URL = 'http://localhost:5000/api/chat';

const AdminChat = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const messagesEndRef = useRef(null);
  const pollingInterval = useRef(null);

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      const token = getToken();
      
      const response = await axios.get(`${API_URL}/admin/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: 50 } // Bỏ filter status để hiển thị TẤT CẢ conversations
      });
      
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  // Fetch conversation detail
  const fetchConversationDetail = async (conversationID) => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/admin/conversations/${conversationID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedConversation(response.data.conversation);
      setMessages(response.data.conversation.Messages || []);
    } catch (error) {
      console.error('Error fetching conversation detail:', error);
    }
  };

  // Send admin reply
  const sendAdminReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;

    try {
      setLoading(true);
      const token = getToken();
      await axios.post(
        `${API_URL}/admin/message`,
        {
          conversationID: selectedConversation.ConversationID,
          messageText: replyText
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setReplyText('');
      // Refresh messages
      await fetchConversationDetail(selectedConversation.ConversationID);
    } catch (error) {
      console.error('Error sending admin reply:', error);
      alert('Lỗi khi gửi tin nhắn!');
    } finally {
      setLoading(false);
    }
  };

  // Close conversation
  const closeConversation = async (conversationID) => {
    if (!window.confirm('Bạn có chắc muốn đóng cuộc trò chuyện này?')) return;

    try {
      const token = getToken();
      await axios.put(
        `${API_URL}/admin/conversations/${conversationID}/close`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh conversations list
      await fetchConversations();
      setSelectedConversation(null);
      setMessages([]);
    } catch (error) {
      console.error('Error closing conversation:', error);
      alert('Lỗi khi đóng cuộc trò chuyện!');
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    
    // Refresh conversations every 30 seconds (giảm tần suất polling)
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [page]);

  // Poll for new messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      pollingInterval.current = setInterval(() => {
        fetchConversationDetail(selectedConversation.ConversationID);
      }, 5000); // Polling mỗi 5 giây thay vì 3 giây

      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      };
    }
  }, [selectedConversation]);

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div className="admin-chat">
      <div className="admin-chat__sidebar">
        <div className="admin-chat__header">
          <h2>💬 Chat Conversations</h2>
          <button onClick={fetchConversations} className="admin-chat__refresh">
            🔄 Refresh
          </button>
        </div>

        <div className="admin-chat__list">
          {conversations.length === 0 ? (
            <div className="admin-chat__empty">Chưa có cuộc trò chuyện nào</div>
          ) : (
            conversations.map((conv) => {
              const lastMessage = conv.Messages?.[0];
              const unreadCount = conv.Messages?.filter(m => !m.IsRead && m.SenderType === 'user').length || 0;

              return (
                <div
                  key={conv.ConversationID}
                  className={`admin-chat__item ${selectedConversation?.ConversationID === conv.ConversationID ? 'active' : ''}`}
                  data-urgent={conv.Status === 'pending_admin' ? 'true' : 'false'}
                  onClick={() => fetchConversationDetail(conv.ConversationID)}
                >
                  <div className="admin-chat__item-header">
                    <strong>
                      {conv.DisplayName || conv.User?.FullName || `Guest (${conv.SessionID.slice(0, 8)}...)`}
                      {conv.IsGuest && ' 👤'}
                      {conv.Status === 'pending_admin' && ' 🆘'}
                    </strong>
                    {unreadCount > 0 && (
                      <span className="admin-chat__badge">{unreadCount}</span>
                    )}
                  </div>
                  <div className="admin-chat__item-preview">
                    {lastMessage?.MessageText.substring(0, 50) || 'No messages yet'}
                  </div>
                  <div className="admin-chat__item-time">
                    {formatTime(conv.LastMessageAt || conv.CreatedAt)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="admin-chat__main">
        {selectedConversation ? (
          <>
            <div className="admin-chat__conversation-header">
              <div>
                <h3>
                  {selectedConversation.DisplayName || selectedConversation.User?.FullName || `Guest User`}
                  {selectedConversation.IsGuest && <span style={{ color: '#999', fontSize: '14px', marginLeft: '8px' }}>👤 Guest</span>}
                </h3>
                <small>Session: {selectedConversation.SessionID}</small>
              </div>
              <button
                onClick={() => closeConversation(selectedConversation.ConversationID)}
                className="admin-chat__close-btn"
              >
                ❌ Đóng
              </button>
            </div>

            <div className="admin-chat__messages">
              {messages.map((msg) => (
                <div
                  key={msg.MessageID}
                  className={`admin-chat__message admin-chat__message--${msg.SenderType}`}
                >
                  <div className="admin-chat__message-header">
                    <strong>
                      {msg.SenderType === 'user' ? '👤 User' : 
                       msg.SenderType === 'admin' ? '👨‍💼 Admin' : '🤖 Bot'}
                    </strong>
                    <span className="admin-chat__message-time">
                      {formatTime(msg.CreatedAt)}
                    </span>
                  </div>
                  <div className="admin-chat__message-text">
                    {msg.MessageText}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="admin-chat__reply-box">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập tin nhắn trả lời..."
                rows="3"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAdminReply();
                  }
                }}
              />
              <button
                onClick={sendAdminReply}
                disabled={loading || !replyText.trim()}
                className="admin-chat__send-btn"
              >
                {loading ? '⏳ Đang gửi...' : '📤 Gửi'}
              </button>
            </div>
          </>
        ) : (
          <div className="admin-chat__no-selection">
            <p>👈 Chọn một cuộc trò chuyện để xem chi tiết</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
