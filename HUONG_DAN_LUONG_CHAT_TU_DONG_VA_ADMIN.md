# ✅ ĐÃ FIX: LUỒNG CHAT TỰ ĐỘNG & ADMIN MODE

## 📋 Tóm tắt các thay đổi:

### ✅ Chế độ Chat Tự Động (Mặc định):
- User gõ tin nhắn hoặc chọn tin nhắn nhanh → **Bot tự động reply (LOCAL)**
- Tin nhắn bot **KHÔNG lưu vào database** (chỉ hiển thị trên UI)
- **KHÔNG tạo conversation** trên server
- Nhanh, ngay lập tức, không cần chờ server

### ✅ Chế độ Admin Mode:
- User bấm **"🆘 Liên hệ nhân viên"** hoặc gõ từ khóa tương tự
- Chuyển sang **Admin Mode**
- Từ giờ **TẤT CẢ tin nhắn** (user + admin) đều lưu vào database
- User và Admin có thể **trao đổi qua lại** real-time
- **Lịch sử tin nhắn** được lưu và load lại khi mở chat

### ✅ Xóa Lịch Sử:
- Bấm nút 🗑️ → Xóa tất cả tin nhắn
- Reset về **chế độ chat tự động**
- Xóa conversation, localStorage, admin mode
- Trở về trạng thái ban đầu (tin nhắn chào mặc định)

---

## 🔄 Luồng hoạt động chi tiết:

### 1️⃣ Lần đầu mở chat (Chế độ Tự Động):
```
[User mở chatbox]
  ↓
Hiển thị tin nhắn chào ban đầu (2 tin nhắn từ bot)
  ↓
[User gõ "Hướng dẫn chọn size" hoặc chọn tin nhắn nhanh]
  ↓
Bot tự động reply NGAY LẬP TỨC (LOCAL, không qua server)
  ↓
Tin nhắn bot hiển thị trong chat (isLocal: true)
  ↓
KHÔNG lưu vào database
```

**Đặc điểm:**
- ⚡ Nhanh, không delay
- 💾 Không lưu database → Tiết kiệm tài nguyên
- 🤖 Bot reply thông minh dựa trên keywords
- ❌ Không có lịch sử khi tắt/mở lại chat

---

### 2️⃣ Chuyển sang Admin Mode:
```
[User bấm "🆘 Liên hệ nhân viên" hoặc gõ "tư vấn", "hỗ trợ"]
  ↓
Tin nhắn user GỬI LÊN SERVER (POST /api/chat/message)
  ↓
Backend lưu vào database + cập nhật Status='pending_admin'
  ↓
setIsAdminMode(true) → Chuyển sang Admin Mode
  ↓
localStorage.setItem('shoelily_admin_mode', 'true')
  ↓
Hiển thị thông báo: "✅ Đã kết nối bạn với nhân viên hỗ trợ!"
  ↓
[Từ giờ trở đi]
  ↓
MỌI tin nhắn user GỬI → Server → Database
  ↓
User chat POLLING mỗi 3 giây để nhận tin nhắn mới từ admin
  ↓
Admin reply → User nhận trong vòng 3 giây
```

**Đặc điểm:**
- 👤 Hiển thị badge "👤 Admin Mode" trên header
- 💬 User và Admin trao đổi real-time
- 💾 Tất cả tin nhắn lưu vào database
- 🔄 Polling để nhận tin nhắn mới từ admin
- 📜 Lịch sử được lưu, load lại khi mở chat

---

### 3️⃣ Load lại chat (Giữ lịch sử):
```
[User đóng chat rồi mở lại]
  ↓
loadMessages() kiểm tra localStorage
  ↓
Có 'shoelily_admin_mode' = 'true'? 
  ├─ CÓ → Load tin nhắn từ localStorage
  │         ↓
  │    createOrGetConversation()
  │         ↓
  │    Backend trả về lịch sử tin nhắn từ database
  │         ↓
  │    Merge: initialMessages + serverMessages
  │         ↓
  │    Hiển thị đầy đủ lịch sử
  │
  └─ KHÔNG → Hiển thị tin nhắn chào ban đầu (chế độ tự động)
```

**Đặc điểm:**
- 📜 Giữ nguyên lịch sử nếu đã vào Admin Mode
- 🔄 Tự động kết nối lại conversation
- 💬 Tiếp tục trao đổi với admin
- 🆔 Dùng cùng 1 SessionID và ConversationID

---

### 4️⃣ Xóa lịch sử chat:
```
[User bấm nút 🗑️]
  ↓
Confirm: "Bạn có chắc muốn xóa toàn bộ lịch sử chat? Bạn sẽ trở về chế độ chat tự động."
  ↓
[User xác nhận]
  ↓
setMessages(initialMessages) → Reset về tin nhắn chào
  ↓
setIsAdminMode(false) → Tắt Admin Mode
  ↓
setConversationID(null) → Xóa conversation
  ↓
setLastMessageID(0) → Reset lastMessageID
  ↓
localStorage.removeItem('shoelily_chat_messages')
localStorage.removeItem('shoelily_admin_mode')
  ↓
stopPolling() → Dừng polling
  ↓
Trở về chế độ chat tự động ban đầu
```

**Đặc điểm:**
- 🗑️ Xóa hoàn toàn lịch sử
- 🔄 Reset về trạng thái ban đầu
- 🤖 Quay lại chế độ bot tự động
- 💾 Xóa localStorage

---

## 🆚 So sánh 2 chế độ:

| Tính năng | Chat Tự Động (Bot) | Admin Mode |
|-----------|-------------------|------------|
| **Kích hoạt** | Mặc định | Bấm "🆘 Liên hệ nhân viên" |
| **Reply** | Bot LOCAL (ngay lập tức) | Admin (1-5 phút) |
| **Lưu database** | ❌ KHÔNG | ✅ CÓ |
| **Lịch sử** | ❌ Mất khi tắt chat | ✅ Giữ khi mở lại |
| **Trao đổi 2 chiều** | ❌ Không | ✅ Có (User ↔ Admin) |
| **Polling** | ❌ Không | ✅ Mỗi 3 giây |
| **Header badge** | Không | "👤 Admin Mode" |
| **Subtitle** | "Tư vấn mua hàng 24/7" | "Đang kết nối với nhân viên hỗ trợ" |

---

## 🔧 Các thay đổi kỹ thuật:

### 1. State Management:
```javascript
// Load admin mode từ localStorage khi khởi tạo
const [isAdminMode, setIsAdminMode] = useState(() => {
  return localStorage.getItem('shoelily_admin_mode') === 'true';
});

// Save admin mode vào localStorage khi thay đổi
useEffect(() => {
  localStorage.setItem('shoelily_admin_mode', isAdminMode.toString());
}, [isAdminMode]);
```

### 2. Load Messages:
```javascript
const loadMessages = () => {
  try {
    const savedMessages = localStorage.getItem('shoelily_chat_messages');
    const savedAdminMode = localStorage.getItem('shoelily_admin_mode');
    
    // CHỈ load lịch sử nếu đã từng vào admin mode
    if (savedMessages && savedAdminMode === 'true') {
      return JSON.parse(savedMessages);
    }
  } catch (error) {
    console.error('Error loading chat messages:', error);
  }
  return initialMessages; // Mặc định: tin nhắn chào
};
```

### 3. Save Messages:
```javascript
useEffect(() => {
  try {
    // CHỈ lưu tin nhắn khi đang ở admin mode
    if (isAdminMode) {
      // Chỉ lưu tin nhắn từ server (user + admin), KHÔNG lưu bot local
      const messagesToSave = messages.filter(m => !m.isLocal);
      localStorage.setItem('shoelily_chat_messages', JSON.stringify(messagesToSave));
    }
  } catch (error) {
    console.error('Error saving chat messages:', error);
  }
}, [messages, isAdminMode]);
```

### 4. Send Message Logic:
```javascript
const handleSendMessage = (text) => {
  // Tạo tin nhắn user
  const message = {
    id: `temp_${Date.now()}`,
    sender: "user",
    text: trimmed,
    time: formatTime(new Date()),
  };
  setMessages((prev) => [...prev, message]);
  
  // Kiểm tra yêu cầu admin
  const isAdminRequest = lowerMsg.includes('liên hệ nhân viên') || ...;
  
  if (isAdminRequest) {
    // Bật admin mode + gửi lên server
    setIsAdminMode(true);
    sendMessageToServer(trimmed);
    // Hiển thị thông báo kết nối...
  } else if (isAdminMode) {
    // Đang ở admin mode → Gửi lên server
    sendMessageToServer(trimmed);
  } else {
    // Chế độ bot tự động → Reply local
    triggerAutoReply(trimmed);
  }
};
```

### 5. Clear History:
```javascript
const handleClearHistory = () => {
  if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat? Bạn sẽ trở về chế độ chat tự động.')) {
    // Reset tất cả về trạng thái ban đầu
    setMessages(initialMessages);
    setIsAdminMode(false);
    setConversationID(null);
    setLastMessageID(0);
    
    // Xóa localStorage
    localStorage.removeItem('shoelily_chat_messages');
    localStorage.removeItem('shoelily_admin_mode');
    
    // Stop polling
    stopPolling();
  }
};
```

### 6. UI Header Update:
```javascript
<header className="chat-panel__header">
  <div>
    <p className="chat-panel__title">
      Shoelily Chat
      {isAdminMode && (
        <span style={{ 
          fontSize: '12px', 
          marginLeft: '8px', 
          background: '#4caf50', 
          padding: '2px 8px', 
          borderRadius: '10px' 
        }}>
          👤 Admin Mode
        </span>
      )}
    </p>
    <p className="chat-panel__subtitle">
      {isAdminMode 
        ? 'Đang kết nối với nhân viên hỗ trợ' 
        : 'Tư vấn mua hàng 24/7'}
    </p>
  </div>
  ...
</header>
```

---

## 🧪 Test Scenarios:

### Test 1: Chat tự động (Bot)
1. ✅ Mở chatbox → Thấy 2 tin nhắn chào
2. ✅ Chọn "Hướng dẫn chọn size" → Bot reply ngay lập tức
3. ✅ Gõ "giá bao nhiêu" → Bot reply về giá
4. ✅ Đóng chat → Mở lại → Chỉ còn 2 tin nhắn chào (lịch sử mất)
5. ✅ Header: "Tư vấn mua hàng 24/7" (không có badge Admin Mode)

### Test 2: Chuyển sang Admin Mode
1. ✅ Mở chatbox
2. ✅ Bấm "🆘 Liên hệ nhân viên" hoặc gõ "tư vấn"
3. ✅ Thấy thông báo "✅ Đã kết nối bạn với nhân viên hỗ trợ!"
4. ✅ Header hiển thị badge "👤 Admin Mode" (xanh lá)
5. ✅ Subtitle đổi thành "Đang kết nối với nhân viên hỗ trợ"
6. ✅ Gõ tin nhắn → Tin nhắn được lưu vào database
7. ✅ Admin panel thấy conversation với status 'pending_admin'

### Test 3: Admin reply
1. ✅ Admin mở panel tại http://localhost:3000/admin/chat
2. ✅ Thấy conversation từ user (có 🆘 nếu pending_admin)
3. ✅ Click vào conversation → Xem lịch sử tin nhắn
4. ✅ Admin gõ reply → Gửi
5. ✅ User chat nhận được reply trong vòng 3 giây
6. ✅ Reply hiển thị với label "👤 Nhân viên hỗ trợ Shoelily"

### Test 4: Load lại lịch sử
1. ✅ Đang ở Admin Mode, có trao đổi tin nhắn với admin
2. ✅ Đóng chatbox
3. ✅ Refresh trang hoặc mở lại chatbox
4. ✅ Lịch sử tin nhắn vẫn còn (bao gồm cả tin nhắn với admin)
5. ✅ Header vẫn hiển thị "👤 Admin Mode"
6. ✅ Có thể tiếp tục trao đổi với admin

### Test 5: Xóa lịch sử
1. ✅ Đang ở Admin Mode với lịch sử tin nhắn
2. ✅ Bấm nút 🗑️
3. ✅ Confirm: "Bạn có chắc muốn xóa toàn bộ lịch sử chat? Bạn sẽ trở về chế độ chat tự động."
4. ✅ Xác nhận → Lịch sử bị xóa
5. ✅ Trở về chế độ chat tự động (chỉ còn 2 tin nhắn chào)
6. ✅ Header không còn badge "Admin Mode"
7. ✅ Subtitle: "Tư vấn mua hàng 24/7"

---

## 🎯 Kết quả cuối cùng:

### ✅ Chế độ Bot (Tự động):
- Nhanh, không delay
- Không lưu database
- Không có lịch sử
- Phù hợp cho câu hỏi đơn giản

### ✅ Chế độ Admin:
- Trao đổi real-time với admin
- Lưu lịch sử đầy đủ
- Load lại khi mở chat
- Phù hợp cho yêu cầu phức tạp

### ✅ Xóa lịch sử:
- Reset hoàn toàn
- Trở về chế độ bot
- Xóa localStorage

---

## 📦 Files đã thay đổi:

1. ✅ `frontend/src/components/chat/ChatWidget.js`:
   - Load/save admin mode state
   - Conditional message saving (chỉ lưu khi admin mode)
   - Update handleSendMessage logic
   - Update handleClearHistory (reset all)
   - Update header UI (badge Admin Mode)
   - Load history từ server khi ở admin mode

---

## 🚀 Hướng dẫn sử dụng:

### Cho User:
1. **Chat nhanh**: Chọn tin nhắn nhanh hoặc gõ câu hỏi → Bot reply ngay
2. **Cần admin**: Bấm "🆘 Liên hệ nhân viên" → Chuyển sang Admin Mode
3. **Xóa lịch sử**: Bấm 🗑️ → Xác nhận → Reset về chế độ bot

### Cho Admin:
1. Mở http://localhost:3000/admin/chat
2. Thấy conversations có 🆘 (pending_admin)
3. Click vào → Xem lịch sử → Reply
4. User nhận reply trong 3 giây

---

## ⚠️ Lưu ý quan trọng:

1. **Tin nhắn bot LOCAL**: Không lưu DB, mất khi đóng chat (ở chế độ tự động)
2. **Admin Mode**: Tất cả tin nhắn lưu DB, giữ lịch sử
3. **localStorage**: Dùng để lưu trạng thái admin mode và messages
4. **Xóa lịch sử**: Xóa hoàn toàn, reset về chế độ bot
5. **SessionID**: Không đổi (để admin có thể liên kết conversations của cùng 1 user)

---

🎉 **Hoàn thành! Hệ thống chat giờ hoạt động đúng như yêu cầu:**
- ✅ Chat tự động (bot local, nhanh)
- ✅ Admin mode (lưu DB, trao đổi 2 chiều, có lịch sử)
- ✅ Xóa lịch sử (reset hoàn toàn)
