# 💬 Hướng dẫn sử dụng hệ thống Chat Admin

## 🎯 Cách khách hàng kết nối với Admin

### **Phương án 1: Nhấn nút "🆘 Liên hệ nhân viên"**
1. Khách hàng mở chatbox (góc dưới bên phải)
2. Nhấn vào nút **"🆘 Liên hệ nhân viên"** trong phần Quick Replies
3. Bot sẽ tự động:
   - Gửi thông báo "Đã kết nối với nhân viên"
   - Đánh dấu conversation là `pending_admin` trong database
   - Hiển thị icon 🆘 trong danh sách admin
4. Admin vào `/admin/chat` sẽ thấy conversation có icon 🆘 (màu vàng nổi bật)
5. Admin click vào conversation → Gõ tin nhắn → Khách hàng nhận được sau 3 giây (polling)

### **Phương án 2: Gõ từ khóa yêu cầu admin**
Khách hàng có thể gõ bất kỳ câu nào có chứa:
- "liên hệ nhân viên"
- "nói chuyện với admin"
- "gặp nhân viên"
- "🆘"

→ Hệ thống sẽ tự động đánh dấu conversation cần admin xử lý

---

## 🔄 Flow hoạt động

```
KHÁCH HÀNG                  SERVER                      ADMIN
    |                         |                          |
    |---(1) Mở chat---------->|                          |
    |<--Tạo conversation------|                          |
    |                         |                          |
    |---(2) Nhấn "🆘"-------->|                          |
    |<--Bot reply-------------|                          |
    |                         |--Status: pending_admin-->|
    |                         |                          |
    |                         |                          |<--(3) Vào /admin/chat
    |                         |                          |<--Thấy icon 🆘
    |                         |                          |
    |                         |<--(4) Admin reply--------|
    |<--(5) Polling 3s--------|                          |
    |  Nhận tin nhắn admin    |                          |
    |  (có label "👤 Nhân viên hỗ trợ")                 |
```

---

## 📊 Trạng thái Conversation

| Status | Mô tả | Màu sắc |
|--------|-------|---------|
| `active` | Chat thường, bot tự trả lời | Trắng |
| `pending_admin` | Khách yêu cầu nhân viên | **Vàng 🆘** |
| `closed` | Đã đóng conversation | Xám |

---

## 🎨 Giao diện Admin Chat

### **Sidebar (Trái)**
- Danh sách tất cả conversations
- Icon 🆘 = Khách đang chờ admin
- Badge đỏ = Số tin nhắn chưa đọc
- Tự động refresh mỗi 10 giây

### **Main (Phải)**
- Lịch sử chat đầy đủ
- Phân biệt 3 loại tin nhắn:
  - 💬 **User** (xanh dương - trái)
  - 🤖 **Bot** (tím - phải)
  - 👤 **Admin** (xanh lá - phải)
- Form reply ở dưới
- Polling tự động mỗi 3 giây

---

## 🚀 Test thử

### **Bước 1: Khách hàng gửi yêu cầu**
```bash
# Mở trang web
http://localhost:3000

# Nhấn nút chat góc dưới phải
# Nhấn "🆘 Liên hệ nhân viên"
```

### **Bước 2: Admin vào xử lý**
```bash
# Login admin
http://localhost:3000/login
# Email: admin@example.com
# Password: (admin password)

# Vào Chat
http://localhost:3000/admin/chat

# Tìm conversation có icon 🆘
# Click vào → Gõ reply → Khách nhận được sau 3s
```

---

## 💡 Lưu ý

### **Bot vẫn tự động trả lời**
- Khi khách hỏi về size, giá, chính sách → Bot trả lời ngay
- Admin CHỈ cần reply khi:
  - Khách nhấn "🆘 Liên hệ nhân viên"
  - Câu hỏi phức tạp bot không xử lý được
  - Khách yêu cầu hỗ trợ đặc biệt

### **Phân biệt tin nhắn**
- **Bot** (agent): Icon 🤖, không có label
- **Admin**: Icon 👤, có label "Nhân viên hỗ trợ Shoelily"

### **Performance**
- Polling interval: 3 giây (user), 10 giây (admin list)
- Có thể nâng cấp lên WebSocket nếu cần real-time cao hơn

---

## 🛠️ API Endpoints

```javascript
// User endpoints (không cần login)
POST /api/chat/conversation        // Tạo/lấy conversation
POST /api/chat/message              // Gửi tin nhắn
GET  /api/chat/messages/new         // Polling tin nhắn mới

// Admin endpoints (cần login + role admin)
GET  /api/chat/admin/conversations           // Lấy danh sách
GET  /api/chat/admin/conversations/:id       // Chi tiết conversation
POST /api/chat/admin/message                 // Admin reply
PUT  /api/chat/admin/conversations/:id/close // Đóng conversation
```

---

## 🎯 Tính năng đã hoàn thành

✅ Bot tự động trả lời 10 loại câu hỏi  
✅ Real-time stock checking từ database  
✅ Product context awareness  
✅ Lưu chat history (localStorage)  
✅ Gửi tin nhắn lên server (database)  
✅ Admin panel với danh sách conversations  
✅ Admin reply thủ công  
✅ Polling tự động cập nhật  
✅ Phân biệt bot/admin messages  
✅ Nút "Liên hệ nhân viên" với icon 🆘  
✅ Đánh dấu conversation urgent (pending_admin)  
✅ Highlight màu vàng cho conversation cần admin  

---

## 🔮 Nâng cấp trong tương lai

- WebSocket cho real-time messaging
- Notification sound khi có tin nhắn mới
- Upload ảnh trong chat
- Emoji picker
- Chat history export
- AI sentiment analysis
- Multi-language support
