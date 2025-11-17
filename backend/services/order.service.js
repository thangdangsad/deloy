'use strict';

const db = require('../models');
const { Op } = require('sequelize');

/**
 * Service xử lý toàn bộ quy trình đặt hàng trong một transaction.
 * @param {object} orderData - Dữ liệu đơn hàng.
 * @param {boolean} isGuest - Cờ xác định đây là đơn của khách hay user.
 * @returns {object} - Đơn hàng vừa được tạo.
 */
exports.placeOrderTransaction = async (orderData, isGuest = false) => {
    const t = await db.sequelize.transaction();
    try {
        // Giả định totalAmount từ controller là SUBtotal (tiền hàng)
        const subtotal = Number(orderData.totalAmount) || 0;
        const shippingFee = Number(orderData.shippingFee) || 0;
        const userId = isGuest ? null : orderData.userId;

        // Cho phép controller truyền trạng thái ban đầu (phục vụ luồng chờ thanh toán, VNPAY...)
        const initialStatus = orderData.initialStatus || 'Pending';
        const initialPaymentStatus = orderData.initialPaymentStatus || 'Unpaid';

        /** ================== 1. KHÓA & KIỂM TRA TỒN KHO ================== */
        for (const item of orderData.items) {
            const variant = await db.ProductVariant.findByPk(item.variantId, {
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!variant) {
                throw new Error(`Sản phẩm với ID ${item.variantId} không tồn tại.`);
            }

            if (variant.StockQuantity < item.quantity) {
                throw new Error(`Sản phẩm ${variant.SKU} không đủ số lượng tồn kho.`);
            }
        }

        /** ================== 2. XỬ LÝ COUPON & TÍNH TOÁN ================== */
        let finalDiscount = 0;
        let finalTotalAmount = subtotal + shippingFee;
        let validatedCoupon = null;

        const rawCouponCode = orderData.couponCode && orderData.couponCode.trim();
        if (rawCouponCode) {
            const coupon = await db.Coupon.findOne({
                where: { Code: rawCouponCode },
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!coupon) {
                throw new Error('Mã giảm giá không tồn tại.');
            }

            // 2a. Kiểm tra điều kiện chung
            if (new Date(coupon.ExpiryDate) < new Date()) {
                throw new Error('Mã giảm giá đã hết hạn.');
            }

            if (coupon.MaxUses > 0 && coupon.UsedCount >= coupon.MaxUses) {
                throw new Error('Mã giảm giá đã hết lượt sử dụng.');
            }

            if (subtotal < Number(coupon.MinPurchaseAmount)) {
                throw new Error(
                    `Đơn hàng phải đạt tối thiểu ${Number(
                        coupon.MinPurchaseAmount
                    ).toLocaleString('vi-VN')}₫ để dùng mã này.`
                );
            }

            /** ===== 2b. Kiểm tra phạm vi áp dụng: All / Category / Product ===== */
            let eligibleSubtotal = subtotal;

            if (coupon.ApplicableType !== 'All' && coupon.ApplicableIDs) {
                const applicableIds = coupon.ApplicableIDs
                    .split(',')
                    .map((id) => parseInt(id.trim(), 10))
                    .filter(Number.isInteger);

                if (applicableIds.length > 0) {
                    const variantIdsInCart = orderData.items.map((item) => item.variantId);

                    const productsInCart = await db.ProductVariant.findAll({
                        where: { VariantID: { [Op.in]: variantIdsInCart } },
                        include: {
                            model: db.Product,
                            as: 'product',
                            attributes: ['ProductID', 'CategoryID']
                        },
                        attributes: ['VariantID'],
                        transaction: t
                    });

                    let eligibleItems = [];

                    if (coupon.ApplicableType === 'Category') {
                        const eligibleVariantIds = productsInCart
                            .filter((v) => applicableIds.includes(v.product.CategoryID))
                            .map((v) => v.VariantID);

                        eligibleItems = orderData.items.filter((item) =>
                            eligibleVariantIds.includes(item.variantId)
                        );
                    } else if (coupon.ApplicableType === 'Product') {
                        const eligibleVariantIds = productsInCart
                            .filter((v) => applicableIds.includes(v.product.ProductID))
                            .map((v) => v.VariantID);

                        eligibleItems = orderData.items.filter((item) =>
                            eligibleVariantIds.includes(item.variantId)
                        );
                    }

                    if (eligibleItems.length === 0) {
                        throw new Error(
                            'Mã giảm giá này không áp dụng cho bất kỳ sản phẩm nào trong giỏ hàng của bạn.'
                        );
                    }

                    eligibleSubtotal = eligibleItems.reduce(
                        (acc, item) => acc + item.price * item.quantity,
                        0
                    );
                }
            }

            /** ===== 2c. Kiểm tra quyền dùng theo User / Ví voucher / UsesPerUser ===== */
            if (!coupon.IsPublic) {
                // Mã private
                if (isGuest) {
                    throw new Error('Mã này chỉ dành cho thành viên đã đăng nhập.');
                }

                const userVoucher = await db.UserVoucher.findOne({
                    where: {
                        UserID: userId,
                        CouponID: coupon.CouponID,
                        IsUsed: false
                    },
                    transaction: t
                });

                if (!userVoucher) {
                    throw new Error('Bạn không có voucher này hoặc đã sử dụng.');
                }
            } else if (coupon.UsesPerUser > 0 && !isGuest) {
                // Mã public nhưng giới hạn số lần/ user → kiểm tra qua UsageLog
                const userUsageCount = await db.UsageLog.count({
                    where: {
                        CouponID: coupon.CouponID,
                        UserID: userId
                    },
                    transaction: t
                });

                if (userUsageCount >= coupon.UsesPerUser) {
                    throw new Error(
                        `Bạn đã dùng mã này ${coupon.UsesPerUser} lần (tối đa).`
                    );
                }
            }

            /** ===== 2d. Tính số tiền giảm ===== */
            const discountValue = Number(coupon.DiscountValue);

            if (coupon.DiscountType === 'Percent') {
                finalDiscount = Math.round((eligibleSubtotal * discountValue) / 100);
            } else if (coupon.DiscountType === 'FixedAmount') {
                finalDiscount = Math.min(eligibleSubtotal, discountValue);
            }

            validatedCoupon = coupon;
        }

        /** ================== 3. Tổng tiền cuối cùng ================== */
        finalTotalAmount = subtotal + shippingFee - finalDiscount;

        /** ================== 4. Tạo Order / GuestOrder ================== */
        let newOrder;
        const commonOrderData = {
            Subtotal: subtotal,
            ShippingFee: shippingFee,
            DiscountAmount: finalDiscount,
            TotalAmount: finalTotalAmount,
            CouponCode: validatedCoupon ? rawCouponCode : null,
            PaymentMethod: orderData.paymentMethod,
            ShippingProvider: orderData.ShippingProvider,
            ShippingProviderID: orderData.ShippingProviderID,
            Status: initialStatus,             // <-- từ file 2
            PaymentStatus: initialPaymentStatus // <-- từ file 2
        };

        if (isGuest) {
            // orderData.shipping: { Email, FullName, Phone, Address, ... }
            newOrder = await db.GuestOrder.create(
                {
                    ...commonOrderData,
                    ...orderData.shipping,
                    WardCode: orderData.wardCode || null,
                    DistrictID: orderData.districtId || null
                },
                { transaction: t }
            );
        } else {
            newOrder = await db.Order.create(
                {
                    ...commonOrderData,
                    UserID: userId,
                    ShippingAddressID: orderData.shippingAddressId,
                    WardCode: orderData.wardCode || null,
                    DistrictID: orderData.districtId || null
                },
                { transaction: t }
            );
        }

        /** ================== 5. Tạo OrderItems / GuestOrderItems ================== */
        const orderIdField = isGuest ? 'GuestOrderID' : 'OrderID';

        const orderItemsData = orderData.items.map((item) => ({
            [orderIdField]: newOrder[orderIdField],
            VariantID: item.variantId,
            Quantity: item.quantity,
            Price: item.price
        }));

        const OrderItemModel = isGuest ? db.GuestOrderItem : db.OrderItem;
        await OrderItemModel.bulkCreate(orderItemsData, { transaction: t });

        /** ================== 6. Trừ tồn kho ================== */
        for (const item of orderData.items) {
            await db.ProductVariant.decrement('StockQuantity', {
                by: item.quantity,
                where: { VariantID: item.variantId },
                transaction: t
            });
        }

        /** ================== 7. Xoá khỏi giỏ hàng (nếu không phải Buy Now) ================== */
        if (orderData.source !== 'buy-now') {
            const cartWhere = isGuest
                ? { SessionID: orderData.sessionId }
                : { UserID: userId };

            const cart = await db.Cart.findOne({ where: cartWhere, transaction: t });
            if (cart) {
                await db.CartItem.destroy({
                    where: {
                        CartID: cart.CartID,
                        VariantID: { [Op.in]: orderData.items.map((i) => i.variantId) }
                    },
                    transaction: t
                });
            }
        }

        /** ================== 8. Ghi log & cập nhật sử dụng coupon ================== */
        if (validatedCoupon) {
            // 8a. Ghi log sử dụng
            await db.UsageLog.create(
                {
                    CouponID: validatedCoupon.CouponID,
                    UserID: isGuest ? null : userId,
                    OrderID: isGuest ? null : newOrder.OrderID,
                    GuestOrderID: isGuest ? newOrder.GuestOrderID : null
                },
                { transaction: t }
            );

            // 8b. Tăng UsedCount tổng
            await validatedCoupon.increment('UsedCount', { by: 1, transaction: t });

            // 8c. Cập nhật 1 instance trong ví voucher (cho user đăng nhập)
            if (!isGuest && userId) {
                const instanceToUse = await db.UserVoucher.findOne({
                    where: {
                        UserID: userId,
                        CouponID: validatedCoupon.CouponID,
                        IsUsed: false
                    },
                    transaction: t
                });

                if (instanceToUse) {
                    await instanceToUse.update(
                        { IsUsed: true },
                        { transaction: t }
                    );
                }
            }
        }

        /** ================== HOÀN TẤT ================== */
        await t.commit();
        return newOrder;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

/**
 * Tạo đơn hàng GHN tự động
 * @param {object} order - Order hoặc GuestOrder instance
 * @param {boolean} isGuest - Có phải guest order không
 * @returns {object} - GHN response với order_code
 */
exports.createGHNShippingOrder = async (order, isGuest = false) => {
    try {
        const ghnService = require('./ghn.service');
        
        // Skip nếu không có wardCode và districtId (địa chỉ không phải từ GHN)
        if (!order.WardCode || !order.DistrictID) {
            console.log('Skipping GHN order creation: Missing wardCode or districtId');
            return null;
        }
        
        console.log('=== GHN ORDER DEBUG ===');
        console.log('WardCode:', order.WardCode);
        console.log('DistrictID:', order.DistrictID);
        console.log('Address:', order.Address || order.Street);
        console.log('City:', order.City);
        
        // Reload order với associations để có getOrderItems/getGuestOrderItems methods
        const fullOrder = isGuest
            ? await db.GuestOrder.findByPk(order.GuestOrderID)
            : await db.Order.findByPk(order.OrderID);
        
        if (!fullOrder) {
            console.error('Order not found for GHN shipping');
            return null;
        }
        
        // Lấy items của đơn hàng trực tiếp từ DB
        const ItemModel = isGuest ? db.GuestOrderItem : db.OrderItem;
        const orderIdField = isGuest ? 'GuestOrderID' : 'OrderID';
        
        const items = await ItemModel.findAll({
            where: { [orderIdField]: fullOrder[orderIdField] },
            include: [{
                model: db.ProductVariant,
                as: 'variant',
                include: [{
                    model: db.Product,
                    as: 'product'
                }]
            }]
        });

        // Parse địa chỉ từ City field (format: "Phường X, Quận Y, Tỉnh Z")
        const cityParts = order.City ? order.City.split(',').map(s => s.trim()) : [];
        const wardName = cityParts[0] || '';
        const districtName = cityParts[1] || '';
        const provinceName = cityParts[2] || '';

        // Tính tổng khối lượng (mỗi đôi giày ~500g)
        const totalWeight = items.reduce((sum, item) => sum + (item.Quantity * 500), 0);

        const ghnOrderData = {
            payment_type_id: fullOrder.PaymentMethod === 'COD' ? 2 : 1, // 1: Shop trả ship, 2: Người nhận trả
            note: `Đơn hàng #${fullOrder.OrderID || fullOrder.GuestOrderID}`,
            required_note: 'KHONGCHOXEMHANG',
            client_order_code: `SHOE_${isGuest ? 'G' : ''}${fullOrder.OrderID || fullOrder.GuestOrderID}_${Date.now()}`,
            // KHÔNG truyền from_* để GHN tự động lấy từ ShopID đã xác minh
            to_name: fullOrder.FullName,
            to_phone: fullOrder.Phone || fullOrder.PhoneNumber,
            to_address: fullOrder.Address || fullOrder.Street,
            to_ward_code: fullOrder.WardCode || '20308', // Default nếu không có
            to_district_id: parseInt(fullOrder.DistrictID || 1490), // Default nếu không có
            cod_amount: order.PaymentMethod === 'COD' ? order.TotalAmount : 0,
            content: 'Giày dép thời trang',
            weight: totalWeight,
            length: 35,
            width: 25,
            height: 15,
            insurance_value: Math.floor(order.TotalAmount),
            service_type_id: 2,
            items: items.map(item => ({
                name: item.variant?.product?.Name || 'Giày',
                code: item.variant?.SKU || '',
                quantity: item.Quantity,
                price: item.Price
            }))
        };

        const ghnResponse = await ghnService.createShippingOrder(ghnOrderData);
        
        if (ghnResponse.code === 200 && ghnResponse.data) {
            // Cập nhật TrackingCode vào đơn hàng
            const ModelToUpdate = isGuest ? db.GuestOrder : db.Order;
            const idField = isGuest ? 'GuestOrderID' : 'OrderID';
            
            await ModelToUpdate.update(
                {
                    TrackingCode: ghnResponse.data.order_code,
                    ShippingProvider: 'GHN'
                },
                { where: { [idField]: fullOrder[idField] } }
            );

            return ghnResponse.data;
        }

        throw new Error('GHN không trả về order_code');
    } catch (error) {
        console.error('Create GHN Shipping Order Error:', error);
        
        // Nếu lỗi do địa chỉ Google Maps, trả về cảnh báo
        if (error.message && error.message.includes('Address convert from fail')) {
            console.warn('⚠️ Không thể tạo đơn GHN do lỗi xác minh địa chỉ từ Google Maps API.');
            console.warn('⚠️ Đơn hàng đã được lưu thành công. Vui lòng tạo vận đơn thủ công trên GHN.');
            return { 
                warning: 'Đơn hàng đã được tạo nhưng chưa tạo được vận đơn GHN do lỗi xác minh địa chỉ.',
                suggestion: 'Vui lòng tạo vận đơn thủ công trên trang GHN hoặc kiểm tra cấu hình địa chỉ gửi hàng.'
            };
        }
        
        // Không throw error để không làm fail toàn bộ order flow
        return null;
    }
};
