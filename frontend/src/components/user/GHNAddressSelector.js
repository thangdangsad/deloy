import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Spinner } from 'react-bootstrap';
import { getGHNProvincesAPI, getGHNDistrictsAPI, getGHNWardsAPI, calculateGHNFeeAPI } from '../../api';

const GHNAddressSelector = ({ onAddressChange, onShippingFeeChange }) => {
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [street, setStreet] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [calculatingFee, setCalculatingFee] = useState(false);

    // Load provinces on mount
    useEffect(() => {
        loadProvinces();
    }, []);

    const loadProvinces = async () => {
        try {
            setLoading(true);
            const { data } = await getGHNProvincesAPI();
            setProvinces(data.data || []);
        } catch (error) {
            console.error('Load provinces error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProvinceChange = async (e) => {
        const provinceId = e.target.value;
        const provinceName = e.target.options[e.target.selectedIndex].text;
        
        setSelectedProvince(provinceId);
        setSelectedDistrict('');
        setSelectedWard('');
        setDistricts([]);
        setWards([]);

        if (provinceId) {
            try {
                setLoading(true);
                const { data } = await getGHNDistrictsAPI(provinceId);
                setDistricts(data.data || []);
            } catch (error) {
                console.error('Load districts error:', error);
            } finally {
                setLoading(false);
            }
        }

        updateAddress({ province: provinceName, provinceId });
    };

    const handleDistrictChange = async (e) => {
        const districtId = e.target.value;
        const districtName = e.target.options[e.target.selectedIndex].text;
        
        setSelectedDistrict(districtId);
        setSelectedWard('');
        setWards([]);

        if (districtId) {
            try {
                setLoading(true);
                const { data } = await getGHNWardsAPI(districtId);
                setWards(data.data || []);
            } catch (error) {
                console.error('Load wards error:', error);
            } finally {
                setLoading(false);
            }
        }

        updateAddress({ district: districtName, districtId });
    };

    const handleWardChange = (e) => {
        const wardCode = e.target.value;
        const wardName = e.target.options[e.target.selectedIndex].text;
        
        setSelectedWard(wardCode);
        updateAddress({ ward: wardName, wardCode });
        
        // Calculate shipping fee when ward is selected
        if (wardCode && selectedDistrict) {
            calculateShippingFee(selectedDistrict, wardCode);
        }
    };

    const handleStreetChange = (e) => {
        const streetValue = e.target.value;
        setStreet(streetValue);
        updateAddress({ street: streetValue });
    };

    const updateAddress = (updates) => {
        const province = provinces.find(p => p.ProvinceID == (updates.provinceId || selectedProvince));
        const district = districts.find(d => d.DistrictID == (updates.districtId || selectedDistrict));
        const ward = wards.find(w => w.WardCode == (updates.wardCode || selectedWard));

        const fullAddress = {
            street: updates.street !== undefined ? updates.street : street,
            ward: updates.ward || ward?.WardName || '',
            district: updates.district || district?.DistrictName || '',
            province: updates.province || province?.ProvinceName || '',
            wardCode: updates.wardCode || selectedWard,
            districtId: updates.districtId || selectedDistrict,
            provinceId: updates.provinceId || selectedProvince,
        };

        if (onAddressChange) {
            onAddressChange(fullAddress);
        }
    };

    const calculateShippingFee = async (districtId, wardCode) => {
        try {
            setCalculatingFee(true);
            const { data } = await calculateGHNFeeAPI({
                from_district_id: 1542, // Default shop district (Hà Nội - cần thay bằng district thực tế của shop)
                to_district_id: parseInt(districtId),
                to_ward_code: String(wardCode),
                weight: 1000, // 1kg default
                insurance_value: 0,
                service_type_id: 2
            });
            
            const fee = data.data?.total || 30000;
            if (onShippingFeeChange) {
                onShippingFeeChange(fee);
            }
        } catch (error) {
            console.error('Calculate shipping fee error:', error);
            // Fallback to default fee
            if (onShippingFeeChange) {
                onShippingFeeChange(30000);
            }
        } finally {
            setCalculatingFee(false);
        }
    };

    return (
        <div>
            <Row className="mb-3">
                <Col md={12}>
                    <Form.Group>
                        <Form.Label>Tỉnh/Thành phố <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                            value={selectedProvince}
                            onChange={handleProvinceChange}
                            disabled={loading}
                            required
                        >
                            <option value="">-- Chọn Tỉnh/Thành phố --</option>
                            {provinces.map(p => (
                                <option key={p.ProvinceID} value={p.ProvinceID}>
                                    {p.ProvinceName}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Quận/Huyện <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                            value={selectedDistrict}
                            onChange={handleDistrictChange}
                            disabled={!selectedProvince || loading}
                            required
                        >
                            <option value="">-- Chọn Quận/Huyện --</option>
                            {districts.map(d => (
                                <option key={d.DistrictID} value={d.DistrictID}>
                                    {d.DistrictName}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Phường/Xã <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                            value={selectedWard}
                            onChange={handleWardChange}
                            disabled={!selectedDistrict || loading}
                            required
                        >
                            <option value="">-- Chọn Phường/Xã --</option>
                            {wards.map(w => (
                                <option key={w.WardCode} value={w.WardCode}>
                                    {w.WardName}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            <Row className="mb-3">
                <Col md={12}>
                    <Form.Group>
                        <Form.Label>Địa chỉ cụ thể (Số nhà, tên đường) <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            value={street}
                            onChange={handleStreetChange}
                            placeholder="Ví dụ: Số 123, Đường ABC"
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            {calculatingFee && (
                <div className="text-muted small">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang tính phí vận chuyển...
                </div>
            )}
        </div>
    );
};

export default GHNAddressSelector;
