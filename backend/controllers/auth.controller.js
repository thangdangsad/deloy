'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../models'); // Nạp Sequelize và tất cả các model
const { Op } = require('sequelize');
const emailService = require('../services/email.service');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// === THÊM MỚI: Đặt tên cho mã voucher chào mừng ===
// tạo một voucher RIÊNG TƯ (IsPublic: false)
// trong trang Admin với mã code chính xác là 'NEWUSER'
const WELCOME_VOUCHER_CODE = 'NEWUSER'; 

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký người dùng mới
 * @access  Public
 */
exports.register = async (req, res) => {
  // Dữ liệu đã được validate bởi middleware, chỉ cần lấy ra sử dụng
  const { Username, Email, Password, FullName, Phone, Address } = req.body;

  try {
    // 1. Kiểm tra Username hoặc Email đã tồn tại chưa bằng Sequelize
    const existingUser = await db.User.findOne({
      where: {
        [Op.or]: [{ Email: Email }, { Username: Username }]
      }
    });

    if (existingUser) {
      if (existingUser.Email === Email) {
        return res.status(409).json({ errors: [{ msg: 'Email đã tồn tại.', field: 'Email' }] });
      }
      if (existingUser.Username === Username) {
        return res.status(409).json({ errors: [{ msg: 'Username đã tồn tại.', field: 'Username' }] });
      }
    }

    // 2. Băm mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    // 3. Tạo verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 4. Tạo người dùng mới bằng Sequelize (chưa verify email)
    const newUser = await db.User.create({
      Username,
      Email,
      Password: hashedPassword,
      FullName,
      Phone,
      Address,
      Role: 'user',
      IsEmailVerified: false,
      EmailVerificationToken: verificationToken,
      EmailVerificationExpires: verificationExpires
    });

    // 5. Gửi email xác thực
    try {
      await emailService.sendEmailVerificationEmail(newUser.Email, newUser.Username, verificationToken);
    } catch (emailError) {
      console.error(`[Email] Lỗi khi gửi email xác thực:`, emailError.message);
      // Không làm hỏng flow, user vẫn có thể yêu cầu gửi lại
    }

    res.status(201).json({ 
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản. Email xác thực sẽ hết hạn trong 24 giờ.' 
    });

  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({ errors: [{ msg: 'Lỗi máy chủ, vui lòng thử lại sau.' }] });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập và trả về JWT
 * @access  Public
 */
exports.login = async (req, res) => {
  const { identifier, password, remember } = req.body;

  try {
    // 1. Tìm người dùng bằng Username hoặc Email
    const user = await db.User.findOne({
      where: {
        [Op.or]: [{ Email: identifier }, { Username: identifier }]
      }
    });

    if (!user) {
      return res.status(401).json({ errors: [{ msg: 'Tài khoản hoặc mật khẩu không chính xác.' }] });
    }

    // 1.5 === KIỂM TRA EMAIL VERIFIED ===
    // Tự động verify cho user cũ (created before email verification feature) và admin
    if ((user.IsEmailVerified === false || user.IsEmailVerified === null) && user.Role === 'admin') {
      user.IsEmailVerified = true;
      await user.save();
      console.log(`Auto-verified admin user: ${user.Username}`);
    }
    
    // User cũ (created before this feature, có CreatedAt cũ hơn 1 ngày): auto-verify
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (user.IsEmailVerified === false && new Date(user.CreatedAt) < oneDayAgo) {
      user.IsEmailVerified = true;
      await user.save();
      console.log(`Auto-verified existing user: ${user.Username}`);
    }

    // User mới: BẮT BUỘC phải verify email
    if (!user.IsEmailVerified) {
      return res.status(403).json({ 
        errors: [{ msg: 'Email của bạn chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.' }],
        requireEmailVerification: true,
        email: user.Email
      });
    }

    // 2. So khớp mật khẩu
    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
      return res.status(401).json({ errors: [{ msg: 'Tài khoản hoặc mật khẩu không chính xác.' }] });
    }

    // 2.5 === AUTO-ASSIGN WELCOME VOUCHER NẾU LẦN ĐẦU ĐĂNG NHẬP ===
    if (!user.HasReceivedWelcomeVoucher) {
      try {
        const welcomeVoucher = await db.Coupon.findOne({
          where: { Code: WELCOME_VOUCHER_CODE }
        });

        if (welcomeVoucher) {
          // Tạo UserVoucher instances theo UsesPerUser
          const uses = welcomeVoucher.UsesPerUser || 1;
          const voucherInstances = [];
          for (let i = 0; i < uses; i++) {
            voucherInstances.push({
              UserID: user.UserID,
              CouponID: welcomeVoucher.CouponID,
              IsUsed: false
            });
          }
          await db.UserVoucher.bulkCreate(voucherInstances);

          // Cập nhật flag: đã nhận welcome voucher
          user.HasReceivedWelcomeVoucher = true;
          await user.save();

          console.log(`Auto-assigned welcome voucher to user ${user.UserID}`);
        }
      } catch (voucherError) {
        // Nếu lỗi khi assign voucher, không làm hỏng login flow
        console.error(`[Voucher] Lỗi khi assign welcome voucher:`, voucherError.message);
      }
    }

    // 3. Tạo JWT Payload
    const payload = {
      id: user.UserID,
      role: user.Role,
      username: user.Username,
      email: user.Email,
      avatar: user.AvatarURL
    };

    // 4. Ký và gửi Token
    const expiresIn = remember ? '30d' : '2h';
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });

    res.json({
      token,
      role: user.Role,
      expiresIn,
      user: {
        id: user.UserID,
        username: user.Username,
        email: user.Email,
        fullName: user.FullName,
        avatar: user.AvatarURL,
      }
    });

  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ errors: [{ msg: 'Lỗi máy chủ, vui lòng thử lại sau.' }] });
  }
};

/**
 * @route   POST /api/auth/verify-email
 * @desc    Xác thực email người dùng
 * @access  Public
 */
exports.verifyEmail = async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ errors: [{ msg: 'Token xác thực không được cung cấp.' }] });
    }

    // 1. Tìm user theo verification token
    const user = await db.User.findOne({
      where: { EmailVerificationToken: token }
    });

    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Token xác thực không hợp lệ.' }] });
    }

    // 2. Kiểm tra hạn của token (24 giờ)
    if (new Date() > new Date(user.EmailVerificationExpires)) {
      return res.status(400).json({ errors: [{ msg: 'Token xác thực đã hết hạn. Vui lòng đăng ký lại hoặc yêu cầu gửi lại email.' }] });
    }

    // 3. Cập nhật user: verify email thành công
    user.IsEmailVerified = true;
    user.EmailVerificationToken = null;
    user.EmailVerificationExpires = null;
    await user.save();

    res.json({ success: true, message: 'Email xác thực thành công! Bây giờ bạn có thể đăng nhập.' });

  } catch (error) {
    console.error('VERIFY EMAIL ERROR:', error);
    res.status(500).json({ errors: [{ msg: 'Lỗi máy chủ, vui lòng thử lại sau.' }] });
  }
};

/**
 * @route   POST /api/auth/resend-verification-email
 * @desc    Gửi lại email xác thực
 * @access  Public
 */
exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ errors: [{ msg: 'Email không được cung cấp.' }] });
    }

    const user = await db.User.findOne({ where: { Email: email } });

    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'Email không tồn tại trong hệ thống.' }] });
    }

    if (user.IsEmailVerified) {
      return res.status(400).json({ errors: [{ msg: 'Email này đã được xác thực rồi.' }] });
    }

    // Tạo token mới
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.EmailVerificationToken = verificationToken;
    user.EmailVerificationExpires = verificationExpires;
    await user.save();

    // Gửi email
    try {
      await emailService.sendEmailVerificationEmail(user.Email, user.Username, verificationToken);
    } catch (emailError) {
      console.error(`[Email] Lỗi khi gửi lại email xác thực:`, emailError.message);
    }

    res.json({ success: true, message: 'Email xác thực đã được gửi lại. Vui lòng kiểm tra email của bạn.' });

  } catch (error) {
    console.error('RESEND VERIFICATION EMAIL ERROR:', error);
    res.status(500).json({ errors: [{ msg: 'Lỗi máy chủ, vui lòng thử lại sau.' }] });
  }
};

/**
 * @route   POST /api/admin/auth/change-password
 * @desc    Người dùng (admin hoặc user) tự thay đổi mật khẩu của mình
 * @access  Private
 */
exports.changePassword = async (req, res) => {
    try {
        // req.user được cung cấp bởi middleware xác thực (authenticateToken hoặc express-jwt)
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        const user = await db.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
        }

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.Password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Mật khẩu cũ không chính xác." });
        }

        // Hash và cập nhật mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.Password = hashedPassword;
        await user.save();

        res.json({ success: true, message: "Đổi mật khẩu thành công!" });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ success: false, message: "Lỗi máy chủ." });
    }
};