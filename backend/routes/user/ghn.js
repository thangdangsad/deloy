const express = require('express');
const router = express.Router();
const ghnController = require('../../controllers/ghn.controller');

// @route   GET /api/ghn/provinces
router.get('/provinces', ghnController.getProvinces);

// @route   GET /api/ghn/districts/:provinceId
router.get('/districts/:provinceId', ghnController.getDistricts);

// @route   GET /api/ghn/wards/:districtId
router.get('/wards/:districtId', ghnController.getWards);

// @route   POST /api/ghn/calculate-fee
router.post('/calculate-fee', ghnController.calculateFee);

// @route   POST /api/ghn/available-services
router.post('/available-services', ghnController.getAvailableServices);

module.exports = router;
