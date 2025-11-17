const ghnService = require('../services/ghn.service');

/**
 * @route   GET /api/ghn/provinces
 * @desc    Lấy danh sách tỉnh/thành phố
 * @access  Public
 */
exports.getProvinces = async (req, res) => {
    try {
        const result = await ghnService.getProvinces();
        res.json(result);
    } catch (error) {
        console.error('GET_PROVINCES_ERROR:', error);
        // Fallback với mock data nếu GHN API lỗi
        res.json({
            code: 200,
            message: "Success (Mock Data)",
            data: [
                { ProvinceID: 201, ProvinceName: "Hà Nội" },
                { ProvinceID: 202, ProvinceName: "Hồ Chí Minh" },
                { ProvinceID: 203, ProvinceName: "Đà Nẵng" },
                { ProvinceID: 204, ProvinceName: "Hải Phòng" },
                { ProvinceID: 205, ProvinceName: "Cần Thơ" }
            ]
        });
    }
};

/**
 * @route   GET /api/ghn/districts/:provinceId
 * @desc    Lấy danh sách quận/huyện
 * @access  Public
 */
exports.getDistricts = async (req, res) => {
    try {
        const { provinceId } = req.params;
        const result = await ghnService.getDistricts(provinceId);
        res.json(result);
    } catch (error) {
        console.error('GET_DISTRICTS_ERROR:', error);
        // Fallback với mock data
        res.json({
            code: 200,
            message: "Success (Mock Data)",
            data: [
                { DistrictID: 1001, DistrictName: "Quận Ba Đình" },
                { DistrictID: 1002, DistrictName: "Quận Hoàn Kiếm" },
                { DistrictID: 1003, DistrictName: "Quận Cầu Giấy" }
            ]
        });
    }
};

/**
 * @route   GET /api/ghn/wards/:districtId
 * @desc    Lấy danh sách phường/xã
 * @access  Public
 */
exports.getWards = async (req, res) => {
    try {
        const { districtId } = req.params;
        const result = await ghnService.getWards(districtId);
        res.json(result);
    } catch (error) {
        console.error('GET_WARDS_ERROR:', error);
        // Fallback với mock data
        res.json({
            code: 200,
            message: "Success (Mock Data)",
            data: [
                { WardCode: "10001", WardName: "Phường Cống Vị" },
                { WardCode: "10002", WardName: "Phường Điện Biên" },
                { WardCode: "10003", WardName: "Phường Đội Cấn" }
            ]
        });
    }
};

/**
 * @route   POST /api/ghn/calculate-fee
 * @desc    Tính phí vận chuyển
 * @access  Public
 */
exports.calculateFee = async (req, res) => {
    try {
        const result = await ghnService.calculateShippingFee(req.body);
        res.json(result);
    } catch (error) {
        console.error('CALCULATE_FEE_ERROR:', error);
        // Fallback với mock fee
        res.json({
            code: 200,
            message: "Success (Mock Data)",
            data: {
                total: 30000,
                service_fee: 30000,
                insurance_fee: 0,
                pick_station_fee: 0,
                coupon_value: 0
            }
        });
    }
};

/**
 * @route   POST /api/ghn/available-services
 * @desc    Lấy danh sách dịch vụ có sẵn
 * @access  Public
 */
exports.getAvailableServices = async (req, res) => {
    try {
        const result = await ghnService.getAvailableServices(req.body);
        res.json(result);
    } catch (error) {
        console.error('GET_AVAILABLE_SERVICES_ERROR:', error);
        res.status(500).json({ errors: [{ msg: error.message || 'Lỗi máy chủ' }] });
    }
};
