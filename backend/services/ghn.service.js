const axios = require('axios');

const GHN_API_URL = 'https://dev-online-gateway.ghn.vn/shiip/public-api';
const GHN_TOKEN = process.env.GHN_TOKEN || '';
const GHN_SHOP_ID = process.env.GHN_SHOP_ID || '';

// Địa chỉ gửi hàng mặc định
const GHN_FROM_NAME = process.env.GHN_FROM_NAME || 'Shop Giày';
const GHN_FROM_PHONE = process.env.GHN_FROM_PHONE || '0987654321';
const GHN_FROM_ADDRESS = process.env.GHN_FROM_ADDRESS || '32 ngõ 16 đường Cổ Nhuế';
const GHN_FROM_WARD_CODE = process.env.GHN_FROM_WARD_CODE || '13009';
const GHN_FROM_DISTRICT_ID = process.env.GHN_FROM_DISTRICT_ID || '3440';

/**
 * Lấy danh sách tỉnh/thành phố
 */
exports.getProvinces = async () => {
    try {
        const response = await axios.get(`${GHN_API_URL}/master-data/province`, {
            headers: {
                'Token': GHN_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('GHN getProvinces Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Không thể lấy danh sách tỉnh/thành phố');
    }
};

/**
 * Lấy danh sách quận/huyện theo ProvinceID
 */
exports.getDistricts = async (provinceId) => {
    try {
        const response = await axios.post(`${GHN_API_URL}/master-data/district`, {
            province_id: parseInt(provinceId)
        }, {
            headers: {
                'Token': GHN_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('GHN getDistricts Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Không thể lấy danh sách quận/huyện');
    }
};

/**
 * Lấy danh sách phường/xã theo DistrictID
 */
exports.getWards = async (districtId) => {
    try {
        const response = await axios.post(`${GHN_API_URL}/master-data/ward`, {
            district_id: parseInt(districtId)
        }, {
            headers: {
                'Token': GHN_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('GHN getWards Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Không thể lấy danh sách phường/xã');
    }
};

/**
 * Tính phí vận chuyển
 * @param {Object} params - { from_district_id, to_district_id, to_ward_code, weight, insurance_value, service_type_id }
 */
exports.calculateShippingFee = async (params) => {
    try {
        const {
            from_district_id,
            to_district_id,
            to_ward_code,
            weight = 1000, // gram
            insurance_value = 0,
            service_type_id = 2 // 2: E-commerce Delivery
        } = params;

        const response = await axios.post(`${GHN_API_URL}/v2/shipping-order/fee`, {
            from_district_id: parseInt(from_district_id),
            to_district_id: parseInt(to_district_id),
            to_ward_code: String(to_ward_code),
            weight: parseInt(weight),
            insurance_value: parseInt(insurance_value),
            service_type_id: parseInt(service_type_id),
            shop_id: parseInt(GHN_SHOP_ID)
        }, {
            headers: {
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('GHN calculateShippingFee Error:', error.response?.data || error.message);
        throw new Error('Không thể tính phí vận chuyển');
    }
};

/**
 * Lấy danh sách dịch vụ vận chuyển có sẵn
 */
exports.getAvailableServices = async (params) => {
    try {
        const { from_district, to_district } = params;

        const response = await axios.post(`${GHN_API_URL}/v2/shipping-order/available-services`, {
            shop_id: parseInt(GHN_SHOP_ID),
            from_district: parseInt(from_district),
            to_district: parseInt(to_district)
        }, {
            headers: {
                'Token': GHN_TOKEN
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('GHN getAvailableServices Error:', error.response?.data || error.message);
        throw new Error('Không thể lấy danh sách dịch vụ vận chuyển');
    }
};

/**
 * Tạo đơn hàng vận chuyển GHN
 * @param {Object} orderData - Dữ liệu đơn hàng
 * Format theo: https://api.ghn.vn/home/docs/detail?id=122
 */
exports.createShippingOrder = async (orderData) => {
    try {
        const payload = {
            payment_type_id: orderData.payment_type_id || 1, // 1: Shop trả ship, 2: Người nhận trả
            note: orderData.note || '',
            required_note: orderData.required_note || 'KHONGCHOXEMHANG', // CHOTHUHANG, CHOXEMHANGKHONGTHU, KHONGCHOXEMHANG
            // KHÔNG truyền from_* để GHN tự động lấy địa chỉ từ ShopID đã xác minh
            to_name: orderData.to_name,
            to_phone: orderData.to_phone,
            to_address: orderData.to_address,
            to_ward_code: String(orderData.to_ward_code),
            to_district_id: parseInt(orderData.to_district_id),
            cod_amount: parseInt(orderData.cod_amount || 0), // Tiền thu hộ COD
            content: orderData.content || 'Đơn hàng giày dép',
            weight: parseInt(orderData.weight || 1000), // gram
            length: parseInt(orderData.length || 30), // cm
            width: parseInt(orderData.width || 20), // cm
            height: parseInt(orderData.height || 10), // cm
            insurance_value: parseInt(orderData.insurance_value || 0),
            service_type_id: parseInt(orderData.service_type_id || 2), // 2: E-commerce
            items: orderData.items || []
        };

        const response = await axios.post(`${GHN_API_URL}/v2/shipping-order/create`, payload, {
            headers: {
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('GHN createShippingOrder Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Không thể tạo đơn hàng vận chuyển');
    }
};

/**
 * Hủy đơn hàng vận chuyển
 */
exports.cancelShippingOrder = async (orderCodes) => {
    try {
        const response = await axios.post(`${GHN_API_URL}/v2/switch-status/cancel`, {
            order_codes: Array.isArray(orderCodes) ? orderCodes : [orderCodes]
        }, {
            headers: {
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('GHN cancelShippingOrder Error:', error.response?.data || error.message);
        throw new Error('Không thể hủy đơn hàng vận chuyển');
    }
};

/**
 * Lấy thông tin đơn hàng GHN
 */
exports.getShippingOrderInfo = async (orderCode) => {
    try {
        const response = await axios.post(`${GHN_API_URL}/v2/shipping-order/detail`, {
            order_code: orderCode
        }, {
            headers: {
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('GHN getShippingOrderInfo Error:', error.response?.data || error.message);
        throw new Error('Không thể lấy thông tin đơn hàng');
    }
};

/**
 * In tem đơn hàng GHN
 */
exports.printShippingLabel = async (orderCodes) => {
    try {
        const response = await axios.post(`${GHN_API_URL}/v2/a5/gen-token`, {
            order_codes: Array.isArray(orderCodes) ? orderCodes : [orderCodes]
        }, {
            headers: {
                'Token': GHN_TOKEN
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('GHN printShippingLabel Error:', error.response?.data || error.message);
        throw new Error('Không thể in tem đơn hàng');
    }
};
