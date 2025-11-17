import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { IoChatbubblesSharp, IoClose } from "react-icons/io5";
import axios from 'axios';
import "./chatWidget.css";

const API_URL = 'http://localhost:5000/api/chat';

const initialMessages = [
  {
    id: 1,
    sender: "agent",
    text: "Chào bạn! Mình là Linh - tư vấn viên Shoelily 👋",
    time: "08:30",
  },
  {
    id: 2,
    sender: "agent",
    text: "Mình có thể giúp bạn: chọn size, xem sản phẩm, chính sách đổi trả, thanh toán. Bạn cần tư vấn gì nhỉ?",
    time: "08:31",
  },
];

const quickReplies = [
  "Hướng dẫn chọn size",
  "Chính sách đổi trả",
  "Giày công sở nữ",
  "Giày thể thao nam",
  "🆘 Liên hệ nhân viên",
];

// Smart reply system based on keywords
const smartReplies = {
  size: {
    keywords: ["size", "cỡ", "số", "đo", "chân", "bao nhiêu"],
    responses: [
      "📏 Để chọn size chính xác, bạn nên:\n1. Đo chiều dài bàn chân (từ gót đến ngón dài nhất)\n2. So sánh với bảng size: Size 36 (~23cm), 37 (~23.5cm), 38 (~24cm)...\n3. Nếu chân bè, nên chọn size lớn hơn 0.5-1 size.\n\n👉 Xem chi tiết tại: <a href='/products'>Trang sản phẩm</a>",
      "Size giày của shop: 36-40 (nữ), 39-43 (nam). Bạn thường đi size bao nhiêu? Mình tư vấn cụ thể cho bạn nhé 😊\n\n👉 <a href='/products'>Xem tất cả sản phẩm</a>",
    ],
  },
  price: {
    keywords: ["giá", "bao nhiêu tiền", "tiền", "cost", "đắt", "rẻ", "giá cả"],
    responses: [
      "💰 Giá giày tại Shoelily:\n- Giày thể thao: 450k - 1.2tr\n- Giày công sở: 550k - 1.5tr\n- Giày boot: 700k - 2tr\n\nHiện đang có mã giảm 15% cho đơn từ 500k!\n\n👉 <a href='/products'>Xem sản phẩm & giá</a>\n👉 <a href='/vouchers'>Lấy mã giảm giá</a>",
      "Shop đang có chương trình sale đến 30% cho một số mẫu.\n\n👉 <a href='/products'>Xem sản phẩm sale ngay</a>",
    ],
  },
  return: {
    keywords: ["đổi", "trả", "bảo hành", "lỗi", "hỏng", "policy", "chính sách"],
    responses: [
      "🔄 Chính sách đổi trả Shoelily:\n✅ Đổi size miễn phí trong 7 ngày\n✅ Hoàn tiền 100% nếu lỗi từ nhà sản xuất\n✅ Bảo hành 6 tháng\n\nĐiều kiện: Giày chưa qua sử dụng, còn nguyên tem mác.\n\n👉 <a href='/about'>Xem chính sách chi tiết</a>",
      "Shop hỗ trợ đổi trả trong 7 ngày với sản phẩm còn nguyên tem. Nếu size không vừa, bạn cứ báo mình đổi ngay nhé! 😊\n\n👉 <a href='/about'>Điều khoản đổi trả</a>",
    ],
  },
  stock: {
    keywords: ["còn", "hàng", "kho", "available", "bán hết", "hết hàng", "stock"],
    responses: [
      "📦 Để kiểm tra còn hàng, bạn cho mình biết:\n- Mã sản phẩm hoặc tên giày\n- Size và màu bạn muốn\n\nHoặc bạn có thể xem trực tiếp trên trang sản phẩm, phần chọn size sẽ hiện 'Hết hàng' nếu không còn nhé!\n\n👉 <a href='/products'>Xem sản phẩm còn hàng</a>",
      "Tất cả sản phẩm trên web đều còn hàng, bạn cứ đặt thoải mái. Nếu size nào hết, hệ thống sẽ báo ngay khi bạn chọn 😊\n\n👉 <a href='/products'>Mua ngay tại đây</a>",
    ],
  },
  payment: {
    keywords: ["thanh toán", "ship", "giao hàng", "cod", "chuyển khoản", "payment", "momo", "vnpay"],
    responses: [
      "💳 Shoelily hỗ trợ thanh toán:\n✅ COD (nhận hàng trả tiền)\n✅ Chuyển khoản ngân hàng\n✅ VNPay, Momo\n\n📦 Giao hàng toàn quốc qua GHN (2-4 ngày). Phí ship từ 25k tùy khu vực.\n\n👉 <a href='/checkout'>Đặt hàng ngay</a>",
      "Shop nhận COD và thanh toán online qua VNPay. Giao hàng nhanh trong 2-3 ngày.\n\n👉 <a href='/cart'>Xem giỏ hàng</a>\n👉 <a href='/checkout'>Thanh toán</a>",
    ],
  },
  product: {
    keywords: ["giày", "shoe", "sandal", "dép", "sản phẩm", "mẫu", "loại", "xem", "có những gì"],
    responses: [
      "👟 Shoelily có 6 dòng sản phẩm chính:\n\n👞 Giày công sở nam\n👠 Giày công sở nữ\n🏃 Giày thể thao nam\n👟 Giày thể thao nữ\n🩴 Giày sandal nam\n👡 Giày sandal nữ\n\nBạn quan tâm đến dòng nào? Mình tư vấn chi tiết cho bạn nhé!\n\n👉 <a href='/products'>Xem tất cả sản phẩm</a>",
      "Shop có đầy đủ giày nam/nữ cho mọi nhu cầu: công sở, thể thao, và sandal. Bạn đang tìm giày cho mục đích gì?\n\n👉 <a href='/products'>Khám phá ngay</a>",
    ],
  },
  greeting: {
    keywords: ["chào", "hello", "hi", "hey", "xin chào", "alo"],
    responses: [
      "Chào bạn! 😊 Mình là Linh, sẵn sàng tư vấn giày đẹp cho bạn. Bạn cần tìm giày gì hôm nay?\n\n👉 <a href='/products'>Xem sản phẩm hot</a>",
      "Hi bạn! Rất vui được hỗ trợ bạn. Bạn muốn hỏi về sản phẩm, giá cả hay chính sách đổi trả nhỉ?\n\n👉 <a href='/'>Về trang chủ</a>",
    ],
  },
  thanks: {
    keywords: ["cảm ơn", "thank", "cám ơn", "thanks", "ok", "được"],
    responses: [
      "Không có gì! Nếu bạn cần gì thêm cứ nhắn mình nhé 😊 Chúc bạn mua sắm vui vẻ!\n\n👉 <a href='/products'>Tiếp tục mua sắm</a>",
      "Rất vui được giúp bạn! Đừng ngại inbox nếu có thắc mắc thêm nha 💕\n\n👉 <a href='/cart'>Xem giỏ hàng</a>",
    ],
  },
  voucher: {
    keywords: ["voucher", "mã giảm", "mã khuyến mại", "coupon", "khuyến mãi", "discount code"],
    responses: [
      "🎁 Mã giảm giá hiện có:\n✨ Giảm 15% cho đơn từ 500k\n✨ Giảm 20% cho đơn từ 1tr\n✨ Freeship cho đơn từ 300k\n\n👉 <a href='/vouchers'>Lấy mã ngay</a>",
      "Shop đang có nhiều mã giảm giá hấp dẫn! Vào trang voucher để nhận về nhé 😊\n\n👉 <a href='/vouchers'>Kho voucher</a>",
    ],
  },
  order: {
    keywords: ["đơn hàng", "order", "tra cứu", "kiểm tra đơn", "tracking", "mã đơn", "đơn của tôi"],
    responses: [
      "📋 Để tra cứu đơn hàng, bạn cần:\n- Mã đơn hàng (trong email xác nhận)\n- Email hoặc số điện thoại đặt hàng\n\n👉 <a href='/order-lookup'>Tra cứu đơn hàng</a>",
      "Bạn muốn kiểm tra tình trạng đơn hàng? Nhập mã đơn tại trang tra cứu nhé!\n\n👉 <a href='/order-lookup'>Tra cứu ngay</a>",
    ],
  },
};

const formatTime = (date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const ChatWidget = forwardRef((props, ref) => {
  // Generate or load sessionID from localStorage
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

  // Load messages from localStorage on initial render
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

  const [messages, setMessages] = useState(loadMessages);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [conversationID, setConversationID] = useState(null);
  const [sessionID] = useState(getSessionID);
  const [lastMessageID, setLastMessageID] = useState(0);
  const [isAdminMode, setIsAdminMode] = useState(() => {
    // Load admin mode từ localStorage theo user/guest
    const token = localStorage.getItem('token');
    const adminModeKey = token ? 'shoelily_user_admin_mode' : 'shoelily_guest_admin_mode';
    return localStorage.getItem(adminModeKey) === 'true';
  }); // Chế độ chat với admin
  const messageEndRef = useRef(null);
  const autoReplyTimeout = useRef(null);
  const pollingInterval = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      // CHỈ lưu tin nhắn khi đang ở admin mode
      if (isAdminMode) {
        // Chỉ lưu tin nhắn user và admin từ server, KHÔNG lưu bot local replies
        const messagesToSave = messages.filter(m => !m.isLocal);
        const token = localStorage.getItem('token');
        const storageKey = token ? 'shoelily_user_chat_messages' : 'shoelily_guest_chat_messages';
        localStorage.setItem(storageKey, JSON.stringify(messagesToSave));
      }
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  }, [messages, isAdminMode]);

  // Save admin mode state to localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const adminModeKey = token ? 'shoelily_user_admin_mode' : 'shoelily_guest_admin_mode';
    localStorage.setItem(adminModeKey, isAdminMode.toString());
  }, [isAdminMode]);

  // Create or get conversation when chat opens OR when entering admin mode
  useEffect(() => {
    if ((isOpen || isAdminMode) && !conversationID) {
      createOrGetConversation();
    }
  }, [isOpen, isAdminMode]);

  // Start polling for new messages when conversation is created AND in admin mode
  useEffect(() => {
    // Polling chạy khi đang ở admin mode và có conversationID
    // Không phụ thuộc vào isOpen để nhận tin nhắn cả khi chat đóng
    if (conversationID && isAdminMode) {
      startPolling();
      return () => stopPolling();
    }
  }, [conversationID, isAdminMode]);

  const createOrGetConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.post(
        `${API_URL}/conversation`, 
        { sessionID: sessionID },
        { headers }
      );
      setConversationID(response.data.conversation.ConversationID);
      
      // Load existing messages from server if any
      if (response.data.conversation.Messages && response.data.conversation.Messages.length > 0) {
        const serverMessages = response.data.conversation.Messages.map(msg => ({
          id: msg.MessageID,
          sender: msg.SenderType === 'user' ? 'user' : 'agent',
          text: msg.MessageText,
          time: formatTime(new Date(msg.CreatedAt)),
          isAdmin: msg.SenderType === 'admin',
          isFromServer: true // Đánh dấu tin nhắn từ server
        }));
        
        // Nếu có tin nhắn từ server → Load lịch sử
        if (serverMessages.length > 0) {
          // Kiểm tra xem có phải conversation cũ không (có tin nhắn user/admin)
          const hasUserOrAdminMessages = serverMessages.some(m => m.sender === 'user' || m.isAdmin);
          
          if (hasUserOrAdminMessages) {
            // Conversation cũ → Bật admin mode và load lịch sử
            setIsAdminMode(true);
            setMessages([...initialMessages, ...serverMessages]);
          }
          
          // Update lastMessageID
          setLastMessageID(serverMessages[serverMessages.length - 1].id);
        }
      }
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
    }
  };

  const startPolling = () => {
    // Poll every 3 seconds for new messages
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/messages/new`, {
          params: {
            conversationID: conversationID,
            lastMessageID: lastMessageID
          }
        });
        
        if (response.data.messages && response.data.messages.length > 0) {
          const newMessages = response.data.messages.map(msg => ({
            id: msg.MessageID,
            sender: msg.SenderType === 'user' ? 'user' : 'agent',
            text: msg.MessageText,
            time: formatTime(new Date(msg.CreatedAt)),
            isAdmin: msg.SenderType === 'admin',
            isFromServer: true
          }));
          
          // Lọc duplicate: Kiểm tra cả ID và text
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const existingTexts = new Set(prev.filter(m => m.isFromServer).map(m => m.text));
            
            const uniqueNewMessages = newMessages.filter(m => 
              !existingIds.has(m.id) && !existingTexts.has(m.text)
            );
            
            if (uniqueNewMessages.length > 0) {
              // CẬP NHẬT lastMessageID ngay khi có tin nhắn mới
              const maxId = Math.max(...newMessages.map(m => m.id));
              setLastMessageID(maxId);
              return [...prev, ...uniqueNewMessages];
            }
            
            return prev;
          });
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

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
        { headers }
      );
      
      // Update lastMessageID và thay thế tin nhắn temp bằng ID thật từ server
      if (response.data.message) {
        const realMessageID = response.data.message.MessageID;
        setLastMessageID(realMessageID);
        
        // Thay thế tin nhắn có ID tạm (temp_) bằng ID thật từ server
        setMessages(prev => prev.map(msg => 
          msg.text === messageText && msg.sender === 'user' && msg.id.toString().startsWith('temp_')
            ? { ...msg, id: realMessageID, isFromServer: true }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message to server:', error);
    }
  };

  // Expose openWithProduct method to parent components
  useImperativeHandle(ref, () => ({
    openWithProduct: (productName, productUrl, variants = []) => {
      setIsOpen(true);
      setCurrentProduct({ name: productName, url: productUrl, variants }); // Save variants data
      const welcomeMsg = {
        id: Date.now(),
        sender: "agent",
        text: `Bạn đang xem sản phẩm "${productName}". Mình có thể tư vấn gì về sản phẩm này không? 😊\n\n👉 <a href='${productUrl}'>Xem lại sản phẩm</a>`,
        time: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, welcomeMsg]);
    },
  }));

  useEffect(() => {
    if (isOpen && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    return () => {
      if (autoReplyTimeout.current) {
        clearTimeout(autoReplyTimeout.current);
      }
    };
  }, []);

  const getSmartReply = (userMessage) => {
    const lowerMsg = userMessage.toLowerCase().trim();
    
    // ===== DETECT IF USER IS ASKING ABOUT A DIFFERENT PRODUCT CATEGORY =====
    // If user mentions a different product type, clear product context
    const isDifferentCategory = currentProduct && (
      (lowerMsg.includes('thể thao') && !currentProduct.name.toLowerCase().includes('thể thao')) ||
      (lowerMsg.includes('công sở') && !currentProduct.name.toLowerCase().includes('công sở')) ||
      (lowerMsg.includes('sandal') && !currentProduct.name.toLowerCase().includes('sandal'))
    );
    
    // Check if user is asking about the current product in context
    if (currentProduct && !isDifferentCategory) {
      const productName = currentProduct.name.toLowerCase();
      const productUrl = currentProduct.url;
      const variants = currentProduct.variants || [];
      
      // ===== REAL-TIME STOCK CHECK (highest priority when product context exists) =====
      // If there's a product in context and user asks about stock, assume they're asking about THIS product
      if (lowerMsg.includes('còn') || lowerMsg.includes('hết') || lowerMsg.includes('hàng') || lowerMsg.includes('tồn kho')) {
        // Extract size and color from message (supports both "size 36" and "màu đen size 36" or "36 màu đen")
        const sizeMatch = lowerMsg.match(/size\s*(\d+)|(\d+)/);
        const requestedSize = sizeMatch ? (sizeMatch[1] || sizeMatch[2]) : null;
        
        const colorKeywords = {
          'đen': 'Đen',
          'black': 'Đen',
          'trắng': 'Trắng',
          'white': 'Trắng',
          'nâu': 'Nâu',
          'brown': 'Nâu',
          'xám': 'Xám',
          'gray': 'Xám',
          'be': 'Be',
          'beige': 'Be',
        };
        
        let requestedColor = null;
        for (const [keyword, colorName] of Object.entries(colorKeywords)) {
          if (lowerMsg.includes(keyword)) {
            requestedColor = colorName;
            break;
          }
        }
        
        // Check stock with real data
        if (requestedSize && requestedColor && variants.length > 0) {
          const matchingVariant = variants.find(v => 
            v.Size === requestedSize && v.Color === requestedColor
          );
          
          if (matchingVariant) {
            const stock = matchingVariant.StockQuantity;
            if (stock > 0) {
              return `✅ Có hàng! "${currentProduct.name}" màu ${requestedColor} size ${requestedSize} còn ${stock} đôi trong kho.\n\n👉 <a href='${productUrl}'>Đặt hàng ngay</a>`;
            } else {
              return `❌ Rất tiếc, "${currentProduct.name}" màu ${requestedColor} size ${requestedSize} hiện đã hết hàng. Bạn muốn xem size khác hoặc màu khác không?\n\n👉 <a href='${productUrl}'>Xem các tùy chọn khác</a>`;
            }
          } else {
            return `🔍 Không tìm thấy sản phẩm "${currentProduct.name}" với màu ${requestedColor} size ${requestedSize}. Có thể shop không có tổ hợp này. Bạn xem các màu/size khác nhé!\n\n👉 <a href='${productUrl}'>Xem tất cả tùy chọn</a>`;
          }
        }
        
        // General stock info if no specific size/color mentioned
        if (variants.length > 0) {
          const availableVariants = variants.filter(v => v.StockQuantity > 0);
          const colors = [...new Set(variants.map(v => v.Color))];
          const sizes = [...new Set(variants.map(v => v.Size))].sort((a, b) => parseInt(a) - parseInt(b));
          
          if (availableVariants.length > 0) {
            return `📦 "${currentProduct.name}" đang còn hàng với:\n- Màu: ${colors.join(', ')}\n- Size: ${sizes.join(', ')}\n\nBạn chọn màu và size trên trang sản phẩm để xem chi tiết từng loại nhé!\n\n👉 <a href='${productUrl}'>Chọn size & màu</a>`;
          } else {
            return `😔 Rất tiếc, "${currentProduct.name}" hiện đã hết hàng tất cả các size và màu. Bạn có thể xem sản phẩm tương tự!\n\n👉 <a href='/products'>Xem sản phẩm khác</a>`;
          }
        }
        
        // Fallback if no variants data
        return `📦 Để kiểm tra tình trạng hàng của "${currentProduct.name}", bạn vào trang sản phẩm, chọn màu và size muốn mua. Nếu hết hàng, nút sẽ hiển thị "Hết hàng".\n\n👉 <a href='${productUrl}'>Kiểm tra ngay</a>`;
      }
      
      // ===== SIZE INFO =====
      if (lowerMsg.includes('size') || lowerMsg.includes('cỡ')) {
        if (variants.length > 0) {
          const sizes = [...new Set(variants.map(v => v.Size))].sort((a, b) => parseInt(a) - parseInt(b));
          const availableSizes = [...new Set(variants.filter(v => v.StockQuantity > 0).map(v => v.Size))].sort((a, b) => parseInt(a) - parseInt(b));
          
          return `📏 "${currentProduct.name}" có các size: ${sizes.join(', ')}\n\n${availableSizes.length > 0 ? `✅ Size còn hàng: ${availableSizes.join(', ')}` : '❌ Hiện tại hết hàng tất cả size'}\n\n👉 <a href='${productUrl}'>Chọn size ngay</a>`;
        }
        return `📏 Sản phẩm "${currentProduct.name}" có đầy đủ size từ 36-40. Bạn có thể chọn size và màu trực tiếp trên trang sản phẩm để xem tình trạng hàng chi tiết nhé!\n\n👉 <a href='${productUrl}'>Chọn size ngay</a>`;
      }
      
      // ===== COLOR INFO =====
      if (lowerMsg.includes('màu') || lowerMsg.includes('color')) {
        if (variants.length > 0) {
          const colors = [...new Set(variants.map(v => v.Color))];
          const availableColors = [...new Set(variants.filter(v => v.StockQuantity > 0).map(v => v.Color))];
          
          return `🎨 "${currentProduct.name}" có các màu: ${colors.join(', ')}\n\n${availableColors.length > 0 ? `✅ Màu còn hàng: ${availableColors.join(', ')}` : '❌ Hiện tại hết hàng tất cả màu'}\n\n👉 <a href='${productUrl}'>Xem màu sắc</a>`;
        }
        return `🎨 Để xem các màu sẵn có của "${currentProduct.name}", bạn vào trang sản phẩm và chọn phần màu sắc. Mỗi màu sẽ hiển thị ảnh và tình trạng hàng riêng!\n\n👉 <a href='${productUrl}'>Xem màu sắc</a>`;
      }
      
      // ===== PRICE INFO =====
      if (lowerMsg.includes('giá') || lowerMsg.includes('bao nhiêu')) {
        return `💰 Giá của "${currentProduct.name}" được hiển thị rõ ràng trên trang sản phẩm, có cả giá gốc và giá sau giảm (nếu có).\n\n👉 <a href='${productUrl}'>Xem giá chi tiết</a>`;
      }
      
      // ===== REVIEW INFO =====
      if (lowerMsg.includes('đánh giá') || lowerMsg.includes('review')) {
        return `⭐ Bạn có thể xem đánh giá của khách hàng khác về "${currentProduct.name}" ở phần Review trên trang sản phẩm. Có ảnh thật từ khách và đánh giá chi tiết!\n\n👉 <a href='${productUrl}'>Xem đánh giá</a>`;
      }
      
      // Default product-specific response (only when explicitly mentioning product)
      if (lowerMsg.includes(productName) || lowerMsg.includes('này') || lowerMsg.includes('đó') || 
          lowerMsg.includes('sản phẩm này') || lowerMsg.includes('mẫu này') || 
          lowerMsg.includes('giày này') || lowerMsg.includes('nó')) {
        return `Về sản phẩm "${currentProduct.name}", bạn có thể xem đầy đủ thông tin (size, màu, giá, đánh giá) trên trang sản phẩm. Hoặc bạn muốn hỏi cụ thể về điều gì?\n\n👉 <a href='${productUrl}'>Xem chi tiết sản phẩm</a>`;
      }
    }
    
    // ===== SPECIFIC PRODUCT CATEGORY DETECTION =====
    // Check for specific product types before general product keywords
    if (lowerMsg.includes('giày') || lowerMsg.includes('shoe') || lowerMsg.includes('sandal') || lowerMsg.includes('dép')) {
      // Giày công sở nữ
      if ((lowerMsg.includes('công sở') || lowerMsg.includes('formal') || lowerMsg.includes('office')) && (lowerMsg.includes('nữ') || lowerMsg.includes('women'))) {
        return "👠 Giày Công Sở Nữ - sang trọng, thanh lịch:\n\n✨ Kiểu dáng: Cao gót, búp bê, giày mũi nhọn, giày đế bệt thanh lịch\n💰 Giá: 550,000đ - 1,500,000đ\n📦 Chất liệu: Da cao cấp, đế chống trượt\n🎁 Bảo hành: 6 tháng\n\nPhù hợp: Đi làm, dự tiệc, sự kiện công ty\n\n👉 <a href='/products?category=giay-cong-so-nu'>Xem tất cả Giày Công Sở Nữ</a>";
      }
      // Giày công sở nam
      if ((lowerMsg.includes('công sở') || lowerMsg.includes('formal') || lowerMsg.includes('office')) && (lowerMsg.includes('nam') || lowerMsg.includes('men'))) {
        return "👞 Giày Công Sở Nam - lịch lãm, chuyên nghiệp:\n\n✨ Kiểu dáng: Giày tây, Derby, Loafer, giày buộc dây\n💰 Giá: 600,000đ - 1,800,000đ\n📦 Chất liệu: Da thật, da PU cao cấp\n🎁 Bảo hành: 6 tháng\n\nPhù hợp: Văn phòng, họp hành, phỏng vấn\n\n👉 <a href='/products?category=giay-cong-so-nam'>Xem tất cả Giày Công Sở Nam</a>";
      }
      // Công sở (không nói nam/nữ)
      if (lowerMsg.includes('công sở') || lowerMsg.includes('formal') || lowerMsg.includes('office')) {
        return "👔 Giày Công Sở Shoelily:\n\n👠 Giày Công Sở Nữ: 550k - 1.5tr\n   (Cao gót, búp bê, mũi nhọn)\n\n👞 Giày Công Sở Nam: 600k - 1.8tr\n   (Tây, Derby, Loafer)\n\n✅ Da cao cấp, đế chống trượt, bảo hành 6 tháng\n\n👉 <a href='/products?category=giay-cong-so-nu'>Xem Giày Công Sở Nữ</a>\n👉 <a href='/products?category=giay-cong-so-nam'>Xem Giày Công Sở Nam</a>";
      }
      // Giày thể thao nam
      if ((lowerMsg.includes('thể thao') || lowerMsg.includes('sneaker') || lowerMsg.includes('running') || lowerMsg.includes('sport')) && (lowerMsg.includes('nam') || lowerMsg.includes('men'))) {
        return "👟 Giày Thể Thao Nam - năng động, khỏe khoắn:\n\n✨ Kiểu dáng: Running, sneaker cao/thấp cổ, giày tập gym\n💰 Giá: 500,000đ - 1,300,000đ\n📦 Chất liệu: Vải thoáng khí, đế cao su êm ái\n🎁 Bảo hành: 6 tháng\n\nPhù hợp: Chạy bộ, tập gym, đi chơi, dạo phố\n\n👉 <a href='/products?category=giay-the-thao-nam'>Xem tất cả Giày Thể Thao Nam</a>";
      }
      // Giày thể thao nữ
      if ((lowerMsg.includes('thể thao') || lowerMsg.includes('sneaker') || lowerMsg.includes('running') || lowerMsg.includes('sport')) && (lowerMsg.includes('nữ') || lowerMsg.includes('women'))) {
        return "👟 Giày Thể Thao Nữ - năng động, thời trang:\n\n✨ Kiểu dáng: Sneaker nữ, running shoes, giày tập aerobic\n💰 Giá: 450,000đ - 1,100,000đ\n📦 Chất liệu: Vải thoáng khí, đế êm chân\n🎁 Bảo hành: 6 tháng\n\nPhù hợp: Tập gym, yoga, đi học, đi chơi\n\n👉 <a href='/products?category=giay-the-thao-nu'>Xem tất cả Giày Thể Thao Nữ</a>";
      }
      // Thể thao (không nói nam/nữ)
      if (lowerMsg.includes('thể thao') || lowerMsg.includes('sneaker') || lowerMsg.includes('running') || lowerMsg.includes('sport')) {
        return "👟 Giày Thể Thao Shoelily:\n\n🏃 Giày Thể Thao Nam: 500k - 1.3tr\n   (Running, sneaker, gym)\n\n👟 Giày Thể Thao Nữ: 450k - 1.1tr\n   (Sneaker nữ, aerobic, yoga)\n\n✅ Vải thoáng khí, đế êm ái, bảo hành 6 tháng\n\n👉 <a href='/products?category=giay-the-thao-nam'>Xem Giày Thể Thao Nam</a>\n👉 <a href='/products?category=giay-the-thao-nu'>Xem Giày Thể Thao Nữ</a>";
      }
      // Giày sandal nam
      if ((lowerMsg.includes('sandal') || lowerMsg.includes('dép') || lowerMsg.includes('xăng đan')) && (lowerMsg.includes('nam') || lowerMsg.includes('men'))) {
        return "🩴 Giày Sandal Nam - thoáng mát, tiện lợi:\n\n✨ Kiểu dáng: Sandal quai hậu, dép kẹp nam, sandal da\n💰 Giá: 250,000đ - 800,000đ\n📦 Chất liệu: Da, vải, cao su chống trượt\n🎁 Bảo hành: 3 tháng\n\nPhù hợp: Đi biển, dạo phố, đi chơi hè\n\n👉 <a href='/products?category=giay-sandal-nam'>Xem tất cả Giày Sandal Nam</a>";
      }
      // Giày sandal nữ
      if ((lowerMsg.includes('sandal') || lowerMsg.includes('dép') || lowerMsg.includes('xăng đan')) && (lowerMsg.includes('nữ') || lowerMsg.includes('women'))) {
        return "👡 Giày Sandal Nữ - thoáng mát, thời trang:\n\n✨ Kiểu dáng: Sandal cao gót, sandal đế bệt, dép xỏ ngón\n💰 Giá: 200,000đ - 700,000đ\n📦 Chất liệu: Da, simili, đế cao su\n🎁 Bảo hành: 3 tháng\n\nPhù hợp: Mùa hè, đi biển, dạo phố, mặc nhà\n\n👉 <a href='/products?category=giay-sandal-nu'>Xem tất cả Giày Sandal Nữ</a>";
      }
      // Sandal (không nói nam/nữ)
      if (lowerMsg.includes('sandal') || lowerMsg.includes('dép') || lowerMsg.includes('xăng đan')) {
        return "🩴 Giày Sandal Shoelily:\n\n🩴 Giày Sandal Nam: 250k - 800k\n   (Quai hậu, dép kẹp, sandal da)\n\n👡 Giày Sandal Nữ: 200k - 700k\n   (Cao gót, đế bệt, xỏ ngón)\n\n✅ Thoáng mát, chống trượt, bảo hành 3 tháng\n\n👉 <a href='/products?category=giay-sandal-nam'>Xem Giày Sandal Nam</a>\n👉 <a href='/products?category=giay-sandal-nu'>Xem Giày Sandal Nữ</a>";
      }
    }
    
    // Priority matching - check specific keywords first to avoid conflicts
    const priorityOrder = [
      'voucher',    // Check voucher/mã giảm first
      'order',      // Then order tracking
      'return',     // Then return policy
      'payment',    // Then payment
      'stock',      // Then stock
      'size',       // Then size
      'price',      // Then price (avoid conflict with "giảm giá")
      'product',    // Then product
      'thanks',     // Then thanks
      'greeting',   // Finally greeting
    ];
    
    // Check each category in priority order
    for (const category of priorityOrder) {
      const data = smartReplies[category];
      if (!data) continue;
      
      const hasKeyword = data.keywords.some(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        // Use word boundary to avoid partial matches
        return lowerMsg.includes(lowerKeyword);
      });
      
      if (hasKeyword) {
        // Return random response from matching category
        const responses = data.responses;
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    
    // Default fallback responses
    const fallbacks = [
      "Mình chưa hiểu rõ câu hỏi của bạn lắm. Bạn có thể hỏi về:\n- Chọn size\n- Giá sản phẩm\n- Chính sách đổi trả\n- Phương thức thanh toán\n- Tình trạng hàng\n\n👉 <a href='/contact'>Liên hệ trực tiếp</a>",
      "Để mình hỗ trợ tốt hơn, bạn có thể chọn một trong các câu hỏi gợi ý bên dưới nhé! 😊",
      "Bạn muốn tìm hiểu về sản phẩm nào? Hoặc cần tư vấn gì cụ thể? Mình sẽ giúp bạn ngay!\n\n👉 <a href='/products'>Xem sản phẩm</a>",
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };

  const triggerAutoReply = (userMessage) => {
    if (autoReplyTimeout.current) {
      clearTimeout(autoReplyTimeout.current);
    }

    // Show typing indicator
    setIsTyping(true);

    autoReplyTimeout.current = setTimeout(() => {
      const reply = getSmartReply(userMessage);
      
      // Bot reply chỉ lưu LOCAL, KHÔNG gửi lên server
      // Chỉ admin reply (từ server) mới được lưu vào database
      setMessages((prev) => [
        ...prev,
        {
          id: `temp_${Date.now()}`,
          sender: "agent",
          text: reply,
          time: formatTime(new Date()),
          isLocal: true, // Đánh dấu là bot reply local
        },
      ]);
      
      setIsTyping(false);
    }, 1200);
  };

  const handleSendMessage = (text) => {
    const trimmed = text?.trim();
    if (!trimmed) return;

    // Tạo ID tạm thời với prefix 'temp_' để phân biệt với ID từ server
    const tempId = `temp_${Date.now()}`;
    
    const message = {
      id: tempId,
      sender: "user",
      text: trimmed,
      time: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, message]);
    setInputValue("");
    
    // Kiểm tra xem có phải yêu cầu admin không
    const lowerMsg = trimmed.toLowerCase();
    const isAdminRequest = lowerMsg.includes('liên hệ nhân viên') || 
                           lowerMsg.includes('nói chuyện với admin') || 
                           lowerMsg.includes('gặp nhân viên') || 
                           lowerMsg.includes('hỗ trợ tư vấn') ||
                           lowerMsg.includes('tư vấn') ||
                           lowerMsg.includes('🆘');
    
    if (isAdminRequest) {
      // Nếu yêu cầu admin → Bật chế độ admin mode
      setIsAdminMode(true);
      
      // Gửi tin nhắn lên server
      sendMessageToServer(trimmed);
      
      // Hiển thị thông báo kết nối
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `temp_${Date.now()}`,
            sender: "agent",
            text: "✅ Đã kết nối bạn với nhân viên hỗ trợ!\n\n👤 Từ giờ, tất cả tin nhắn của bạn sẽ được gửi trực tiếp đến nhân viên. Nhân viên sẽ phản hồi trong giây lát.\n\n💬 Vui lòng mô tả chi tiết vấn đề của bạn!\n\n⏰ Thời gian phản hồi: 1-5 phút",
            time: formatTime(new Date()),
            isLocal: true,
          },
        ]);
        setIsTyping(false);
      }, 800);
    } else if (isAdminMode) {
      // Đang ở chế độ admin → Gửi tin nhắn lên server
      sendMessageToServer(trimmed);
    } else {
      // Chế độ bot tự động → Chỉ reply local, KHÔNG gửi lên server
      triggerAutoReply(trimmed);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleQuickReply = (reply) => {
    handleSendMessage(reply);
  };

  const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat? Bạn sẽ trở về chế độ chat tự động.')) {
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
      
      // Stop polling nếu đang chạy
      stopPolling();
    }
  };

  return (
    <div className="chat-widget" data-open={isOpen}>
      {isOpen && (
        <section className="chat-panel" aria-live="polite">
          <header className="chat-panel__header">
            <div>
              <p className="chat-panel__title">
                Shoelily Chat
                {isAdminMode && <span style={{ fontSize: '12px', marginLeft: '8px', background: '#4caf50', padding: '2px 8px', borderRadius: '10px' }}>👤 Admin Mode</span>}
              </p>
              <p className="chat-panel__subtitle">
                {isAdminMode ? 'Đang kết nối với nhân viên hỗ trợ' : 'Tư vấn mua hàng 24/7'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="chat-panel__clear"
                onClick={handleClearHistory}
                aria-label="Xóa lịch sử"
                title="Xóa lịch sử chat"
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px 8px'
                }}
              >
                🗑️
              </button>
              <button
                className="chat-panel__close"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng chat"
              >
                <IoClose />
              </button>
            </div>
          </header>

          <div className="chat-panel__body">
            {messages.map((message, index) => (
              <div
                key={`${message.id}_${index}`}
                className={`chat-message chat-message--${message.sender}`}
              >
                {message.isAdmin && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#4a90e2', 
                    marginBottom: '6px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '14px' }}>👤</span>
                    <span>Nhân viên hỗ trợ Shoelily</span>
                  </div>
                )}
                <p 
                  style={{ whiteSpace: "pre-line" }}
                  dangerouslySetInnerHTML={{ __html: message.text }}
                />
                <span className="chat-message__time">{message.time}</span>
              </div>
            ))}
            {isTyping && (
              <div className="chat-message chat-message--agent chat-typing">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          <div className="chat-panel__quick-replies">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                className="chat-panel__chip"
                onClick={() => handleQuickReply(reply)}
              >
                {reply}
              </button>
            ))}
          </div>

          <form className="chat-panel__footer" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              aria-label="Tin nhắn"
            />
            <button type="submit" className="chat-panel__send">
              Gửi
            </button>
          </form>
        </section>
      )}

      <button
        className="chat-toggle-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="chat-panel"
      >
        <div className="chat-toggle-button__icon">
          <IoChatbubblesSharp />
        </div>
        <div>
          <strong>Chat support</strong>
          <span>Giải đáp nhanh</span>
        </div>
      </button>
    </div>
  );
});

export default ChatWidget;
