// Updated Node.js server with Socket.IO integration

'use strict';

const express = require("express");
const cors = require("cors");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const { expressjwt } = require('express-jwt');
const fs = require("fs");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const db = require('./models');
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

const corsOptions = {
    origin: '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
    exposedHeaders: ['X-Session-ID'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'uploads', 'blogs')));

app.use(
    '/api/admin',
    expressjwt({ secret: process.env.JWT_SECRET, algorithms: ['HS256'] }),
    (req, res, next) => {
        req.user = req.auth;
        next();
    }
);

const authenticateUser = expressjwt({ secret: process.env.JWT_SECRET, algorithms: ['HS256'] });

const authenticateWishlistOptional = expressjwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    credentialsRequired: false,
});

app.use(passport.initialize());

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const [user] = await db.User.findOrCreate({
                    where: { Email: email },
                    defaults: {
                        Username: profile.displayName.replace(/\s/g, '') + Date.now().toString().slice(-4),
                        Password: 'provided_by_google',
                        Role: 'user',
                        FullName: profile.displayName,
                        AvatarURL: profile.photos?.[0]?.value || null,
                    },
                });
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.use(
    new FacebookStrategy(
        {
            clientID: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
            callbackURL: process.env.FACEBOOK_CALLBACK_URL,
            profileFields: ["id", "displayName", "photos", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value || `${profile.id}@facebook-placeholder.com`;
                const [user] = await db.User.findOrCreate({
                    where: { Email: email },
                    defaults: {
                        Username: profile.displayName.replace(/\s/g, '') + Date.now().toString().slice(-4),
                        Password: 'provided_by_facebook',
                        Role: 'user',
                        FullName: profile.displayName,
                        AvatarURL: profile.photos?.[0]?.value || null,
                    },
                });
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// IMPORT ROUTES
const authRouter = require('./routes/user/auth');
const profileRouter = require('./routes/user/profile');
const productsUserRouter = require('./routes/user/productsUser');
const cartUserRouter = require('./routes/user/cartUser');
const blogsUserRouter = require('./routes/user/blogsUser');
const addressesUserRouter = require('./routes/user/addressesUser');
const homeRouter = require('./routes/user/homeUser');
const userCouponsRoute = require('./routes/user/coupons');
const shippingRouter = require('./routes/user/shipping');
const userPaymentMethodsRouter = require('./routes/user/paymentMethods');
const { userOrdersRouter, guestOrdersRouter } = require('./routes/user/ordersUser');
const guestHistoryRouter = require('./routes/user/guestHistory');
const passwordRouter = require('./routes/user/password');
const wishlistUserRouter = require('./routes/user/wishlist');
const paymentRoutes = require('./routes/payment.route');
const ghnRouter = require('./routes/user/ghn');
const chatRouter = require('./routes/chat.routes');

const adminAuthRoutes = require("./routes/admin/authAdmin");
const adminBlogsRouter = require("./routes/admin/blogsAdmin");
const adminCategoriesRouter = require("./routes/admin/categoriesAdmin");
const adminCouponsRouter = require("./routes/admin/couponsAdmin");
const adminDashboardRouter = require("./routes/admin/homeAdmin");
const adminOrdersRouter = require("./routes/admin/ordersAdmin");
const adminPaymentMethodsRouter = require("./routes/admin/paymentMethods");
const adminProductsRouter = require("./routes/admin/productsAdmin");
const adminReviewsRouter = require("./routes/admin/reviews");
const adminUsersRouter = require("./routes/admin/usersAdmin")(upload);

app.use('/api/payment', paymentRoutes);

const apiRouter = express.Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productsUserRouter);
apiRouter.use('/cart', cartUserRouter);
apiRouter.use('/blogs', blogsUserRouter);
apiRouter.use('/home', homeRouter);
apiRouter.use('/user/coupons', userCouponsRoute);
apiRouter.use('/shipping', shippingRouter);
apiRouter.use('/payment-methods', userPaymentMethodsRouter);
apiRouter.use('/guest-history', guestHistoryRouter);
apiRouter.use('/guest-orders', guestOrdersRouter);
apiRouter.use('/password', passwordRouter);
apiRouter.use('/payment', paymentRoutes);
apiRouter.use('/ghn', ghnRouter);
apiRouter.use('/chat', chatRouter);

apiRouter.use('/profile', authenticateUser, (req, res, next) => { req.user = req.auth; next(); }, profileRouter);
apiRouter.use('/addresses', authenticateUser, (req, res, next) => { req.user = req.auth; next(); }, addressesUserRouter);
apiRouter.use('/user/orders', authenticateUser, (req, res, next) => { req.user = req.auth; next(); }, userOrdersRouter);
apiRouter.use('/wishlist', authenticateWishlistOptional, (req, res, next) => { req.user = req.auth; next(); }, wishlistUserRouter);

apiRouter.use('/admin/auth', adminAuthRoutes);
apiRouter.use('/admin/blogs', adminBlogsRouter);
apiRouter.use('/admin/categories', adminCategoriesRouter);
apiRouter.use('/admin/coupons', adminCouponsRouter);
apiRouter.use('/admin/home', adminDashboardRouter);
apiRouter.use('/admin/orders', adminOrdersRouter);
apiRouter.use('/admin/payment-methods', adminPaymentMethodsRouter);
apiRouter.use('/admin/products', adminProductsRouter);
apiRouter.use('/admin/reviews', adminReviewsRouter);
apiRouter.use('/admin/users', adminUsersRouter);

app.use('/api', apiRouter);

app.get("/api/current_user", authenticateUser, async (req, res) => {
    try {
        const user = await db.User.findByPk(req.auth.id, {
            attributes: ['UserID', 'Username', 'Email', 'Role', 'AvatarURL'],
        });
        if (!user) return res.status(404).json(null);
        const userData = user.get({ plain: true });
        res.json({
            ...userData,
            avatar: userData.AvatarURL ? `${process.env.BASE_URL || 'http://localhost:5000'}${userData.AvatarURL}` : null,
        });
    } catch {
        res.status(500).json(null);
    }
});

app.use((err, req, res, next) => {
    if (err && err.name === 'UnauthorizedError') {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("send_message", (data) => {
        io.emit("receive_message", data);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Backend + Socket.IO đang chạy tại http://localhost:${PORT}`);
});
