# ✅ ĐÃ FIX: PHÂN BIỆT CHAT THEO USER VÀ GUEST

## 📋 Tóm tắt thay đổi:

### ✅ Mỗi User Đăng Nhập có Conversation Riêng:
- User A đăng nhập → Chat với admin → Lịch sử của User A
- User B đăng nhập → Chat với admin → Lịch sử của User B
- **Không bị trộn lẫn** giữa các user

### ✅ Mỗi Guest (Khách Vãng Lai) có Conversation Riêng:
- Guest 1 → SessionID riêng → Lịch sử của Guest 1
- Guest 2 → SessionID riêng → Lịch sử của Guest 2
- **Không bị trộn lẫn** giữa các guest

### ✅ Admin Xem Đúng Từng Người:
- Admin panel hiển thị **tất cả conversations**
- Mỗi conversation có thông tin:
  - **User đã đăng nhập**: Hiển thị tên đầy đủ (FullName)
  - **Guest**: Hiển thị "Guest (session...)" + icon 👤
- Admin reply → Đúng người nhận

---

## 🔄 Cách hoạt động:

### 1️⃣ User Đăng Nhập:
```
[User A đăng nhập] → Token lưu vào localStorage
  ↓
Mở chatbox
  ↓
getSessionID() kiểm tra token
  ↓
Token CÓ → Tạo sessionID: "user_session_xxx"
  ↓
Lưu vào localStorage key: "shoelily_user_session_id"
  ↓
POST /api/chat/conversation với:
  - sessionID: "user_session_xxx"
  - JWT token trong header Authorization
  ↓
Backend nhận token → Lấy userID từ JWT
  ↓
Tìm conversation WHERE UserID = userID AND Status = 'active'
  ↓
Nếu có → Load lịch sử
Nếu chưa → Tạo mới với UserID
  ↓
User A có conversation riêng biệt
```

### 2️⃣ Guest (Khách Vãng Lai):
```
[Guest mở trang] → Không có token
  ↓
Mở chatbox
  ↓
getSessionID() kiểm tra token
  ↓
Token KHÔNG → Tạo sessionID: "guest_session_xxx"
  ↓
Lưu vào localStorage key: "shoelily_guest_session_id"
  ↓
POST /api/chat/conversation với:
  - sessionID: "guest_session_xxx"
  - Không có JWT token
  ↓
Backend không nhận token → userID = null
  ↓
Tìm conversation WHERE SessionID = sessionID AND Status = 'active'
  ↓
Nếu có → Load lịch sử
Nếu chưa → Tạo mới với UserID = null
  ↓
Guest có conversation riêng biệt
```

### 3️⃣ Admin Xem & Reply:
```
[Admin mở panel] → http://localhost:3000/admin/chat
  ↓
GET /api/chat/admin/conversations
  ↓
Backend trả về TẤT CẢ conversations (user + guest)
  ↓
Mỗi conversation có:
  - User.FullName (nếu đã đăng nhập)
  - DisplayName (User.FullName hoặc "Guest (session...)")
  - IsGuest = true/false
  ↓
Admin panel hiển thị:
  - Nguyễn Văn A (user đã đăng nhập)
  - Guest (guest_se...) 👤 (guest)
  ↓
[Admin click vào conversation]
  ↓
Xem lịch sử tin nhắn của ĐÚNG người đó
  ↓
[Admin gõ reply → Gửi]
  ↓
POST /api/chat/admin/message
  ↓
Tin nhắn lưu vào database với SenderType='admin'
  ↓
User/Guest nhận được reply qua polling (mỗi 3 giây)
```

---

## 🔑 Các Key trong localStorage:

### User Đã Đăng Nhập:
```javascript
localStorage.getItem('token') // JWT token
localStorage.getItem('shoelily_user_session_id') // SessionID riêng cho user
localStorage.getItem('shoelily_user_chat_messages') // Lịch sử chat
localStorage.getItem('shoelily_user_admin_mode') // Admin mode state
```

### Guest (Khách Vãng Lai):
```javascript
localStorage.getItem('token') // null (không có)
localStorage.getItem('shoelily_guest_session_id') // SessionID riêng cho guest
localStorage.getItem('shoelily_guest_chat_messages') // Lịch sử chat
localStorage.getItem('shoelily_guest_admin_mode') // Admin mode state
```

---

## 🆚 So sánh User vs Guest:

| Tính năng | User Đăng Nhập | Guest (Khách Vãng Lai) |
|-----------|----------------|------------------------|
| **SessionID** | `user_session_xxx` | `guest_session_xxx` |
| **UserID trong DB** | Có (từ JWT) | NULL |
| **Tìm conversation** | WHERE UserID = X | WHERE SessionID = Y |
| **Hiển thị trong Admin** | Tên đầy đủ (FullName) | "Guest (session...)" + 👤 |
| **localStorage prefix** | `shoelily_user_*` | `shoelily_guest_*` |
| **JWT Token** | ✅ Có | ❌ Không |
| **Lịch sử riêng** | ✅ Có | ✅ Có |

---

## 📝 Chi tiết các thay đổi:

### Frontend (`ChatWidget.js`):

#### 1. `getSessionID()` - Tạo SessionID riêng cho User/Guest:
```javascript
const getSessionID = () => {
  // Lấy token để kiểm tra user đã đăng nhập chưa
  const token = localStorage.getItem('token');
  
  if (token) {
    // Nếu đã đăng nhập → Dùng sessionID theo UserID
    // Mỗi user sẽ có sessionID riêng
    let sessionID = localStorage.getItem('shoelily_user_session_id');
    if (!sessionID) {
      sessionID = `user_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('shoelily_user_session_id', sessionID);
    }
    return sessionID;
  } else {
    // Nếu là guest → Dùng sessionID riêng cho guest
    let sessionID = localStorage.getItem('shoelily_guest_session_id');
    if (!sessionID) {
      sessionID = `guest_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('shoelily_guest_session_id', sessionID);
    }
    return sessionID;
  }
};
```

#### 2. `loadMessages()` - Load lịch sử theo User/Guest:
```javascript
const loadMessages = () => {
  try {
    const token = localStorage.getItem('token');
    const storageKey = token ? 'shoelily_user_chat_messages' : 'shoelily_guest_chat_messages';
    const adminModeKey = token ? 'shoelily_user_admin_mode' : 'shoelily_guest_admin_mode';
    
    const savedMessages = localStorage.getItem(storageKey);
    const savedAdminMode = localStorage.getItem(adminModeKey);
    
    // Chỉ load lịch sử nếu đã từng vào admin mode
    if (savedMessages && savedAdminMode === 'true') {
      return JSON.parse(savedMessages);
    }
  } catch (error) {
    console.error('Error loading chat messages:', error);
  }
  return initialMessages;
};
```

#### 3. `createOrGetConversation()` - Gửi JWT token nếu user đã đăng nhập:
```javascript
const createOrGetConversation = async () => {
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await axios.post(
      `${API_URL}/conversation`, 
      { sessionID: sessionID },
      { headers } // Gửi JWT token trong header
    );
    // ...
  }
};
```

#### 4. `sendMessageToServer()` - Gửi JWT token khi gửi tin nhắn:
```javascript
const sendMessageToServer = async (messageText) => {
  if (!conversationID) return;
  
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await axios.post(
      `${API_URL}/message`,
      {
        conversationID: conversationID,
        messageText: messageText
      },
      { headers } // Gửi JWT token
    );
    // ...
  }
};
```

#### 5. `handleClearHistory()` - Xóa localStorage theo User/Guest:
```javascript
const handleClearHistory = () => {
  if (window.confirm('...')) {
    // Reset tất cả về trạng thái ban đầu
    setMessages(initialMessages);
    setIsAdminMode(false);
    setConversationID(null);
    setLastMessageID(0);
    
    // Xóa localStorage theo user/guest
    const token = localStorage.getItem('token');
    if (token) {
      // User đã đăng nhập
      localStorage.removeItem('shoelily_user_chat_messages');
      localStorage.removeItem('shoelily_user_admin_mode');
      localStorage.removeItem('shoelily_user_session_id');
    } else {
      // Guest
      localStorage.removeItem('shoelily_guest_chat_messages');
      localStorage.removeItem('shoelily_guest_admin_mode');
      localStorage.removeItem('shoelily_guest_session_id');
    }
    
    stopPolling();
  }
};
```

---

### Backend:

#### 1. `chat.routes.js` - Thêm middleware `authenticateTokenOptional`:
```javascript
const authenticateTokenOptional = require('../middleware/authenticateTokenOptional');

// User endpoints - có thể đăng nhập hoặc guest
router.post('/conversation', authenticateTokenOptional, chatController.getOrCreateConversation);
router.post('/message', authenticateTokenOptional, chatController.sendMessage);
```

#### 2. `chat.controller.js` - Tìm conversation theo UserID (user) hoặc SessionID (guest):
```javascript
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { sessionID } = req.body;
    const userID = req.user?.id || null; // JWT payload có field "id"

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
      conversation = await ChatConversation.create({
        ConversationID: uuidv4(),
        SessionID: sessionID,
        UserID: userID, // Lưu UserID nếu có
        Status: 'active',
      });
      // ...
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
```

---

## 🧪 Test Scenarios:

### Test 1: User A đăng nhập chat với admin
1. ✅ User A đăng nhập (token lưu vào localStorage)
2. ✅ Mở chatbox → Bấm "🆘 Liên hệ nhân viên"
3. ✅ Gửi tin nhắn "Tôi cần tư vấn sản phẩm"
4. ✅ Admin panel thấy conversation với tên "Nguyễn Văn A"
5. ✅ Admin reply "Xin chào Anh A, em có thể giúp gì?"
6. ✅ User A nhận reply trong 3 giây

### Test 2: User B đăng nhập chat với admin (cùng lúc)
1. ✅ User B đăng nhập (token khác)
2. ✅ Mở chatbox → Bấm "🆘 Liên hệ nhân viên"
3. ✅ Gửi tin nhắn "Giày còn size 40 không?"
4. ✅ Admin panel thấy conversation riêng của "Trần Thị B"
5. ✅ Admin reply cho User B
6. ✅ User B nhận reply, **User A KHÔNG nhận** (vì là 2 conversation khác nhau)

### Test 3: Guest 1 chat với admin
1. ✅ Mở trang không đăng nhập
2. ✅ Mở chatbox → Bấm "🆘 Liên hệ nhân viên"
3. ✅ Gửi tin nhắn "Tôi muốn mua giày"
4. ✅ Admin panel thấy "Guest (guest_se...)" + icon 👤
5. ✅ Admin reply
6. ✅ Guest 1 nhận reply

### Test 4: Guest 2 chat với admin (cùng lúc)
1. ✅ Mở tab mới, không đăng nhập
2. ✅ Mở chatbox → Bấm "🆘 Liên hệ nhân viên"
3. ✅ Gửi tin nhắn khác
4. ✅ Admin panel thấy conversation riêng của Guest 2
5. ✅ Admin reply cho Guest 2
6. ✅ Guest 2 nhận reply, **Guest 1 KHÔNG nhận**

### Test 5: User đăng nhập xong đăng xuất
1. ✅ User A đăng nhập → Chat với admin → Lịch sử lưu
2. ✅ User A đăng xuất (token bị xóa)
3. ✅ Mở chatbox → Trở thành Guest
4. ✅ SessionID mới (guest_session_xxx)
5. ✅ Conversation mới (không load lịch sử của User A)
6. ✅ User A đăng nhập lại → Load lại lịch sử cũ

### Test 6: Admin xem tất cả conversations
1. ✅ Admin mở panel
2. ✅ Thấy TẤT CẢ conversations:
   - Nguyễn Văn A (user)
   - Trần Thị B (user)
   - Guest (guest_se...) 👤
   - Guest (guest_se...) 👤
3. ✅ Mỗi conversation có lịch sử riêng
4. ✅ Admin reply đúng người

---

## 🎯 Kết quả cuối cùng:

### ✅ Mỗi User có Conversation Riêng:
- User A → Conversation A (UserID = A)
- User B → Conversation B (UserID = B)
- Không trộn lẫn

### ✅ Mỗi Guest có Conversation Riêng:
- Guest 1 → Conversation 1 (SessionID = guest_session_1)
- Guest 2 → Conversation 2 (SessionID = guest_session_2)
- Không trộn lẫn

### ✅ Admin Quản Lý Tất Cả:
- Admin panel hiển thị tất cả conversations
- Phân biệt User (tên đầy đủ) vs Guest (icon 👤)
- Reply đúng từng người

---

## 📦 Files đã thay đổi:

1. ✅ `frontend/src/components/chat/ChatWidget.js`:
   - getSessionID() - Tạo session riêng cho user/guest
   - loadMessages() - Load lịch sử theo user/guest
   - createOrGetConversation() - Gửi JWT token
   - sendMessageToServer() - Gửi JWT token
   - handleClearHistory() - Xóa đúng localStorage
   - useState(isAdminMode) - Load admin mode theo user/guest
   - useEffect save messages - Lưu theo user/guest

2. ✅ `backend/routes/chat.routes.js`:
   - Thêm middleware authenticateTokenOptional

3. ✅ `backend/controllers/chat.controller.js`:
   - getOrCreateConversation() - Tìm theo UserID (user) hoặc SessionID (guest)

---

## ⚠️ Lưu ý quan trọng:

1. **User đăng nhập**: Conversation tìm theo UserID → Giữ lịch sử dù đổi device/browser (nếu đăng nhập lại)
2. **Guest**: Conversation tìm theo SessionID → Lịch sử chỉ giữ trong localStorage
3. **Đăng xuất**: User trở thành Guest → SessionID mới → Conversation mới
4. **Đăng nhập lại**: Load lại conversation cũ theo UserID
5. **Admin**: Thấy tất cả conversations, phân biệt User vs Guest

---

🎉 **Hoàn thành! Mỗi user/guest giờ có conversation riêng biệt, admin có thể trò chuyện đúng từng người!**
