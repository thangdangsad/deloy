import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  ListGroup,
  InputGroup,
  Tabs,
  Tab,
  Ratio,
  Modal,
  Spinner,
  Alert,
  Image,
  ProgressBar,
  Pagination,
} from "react-bootstrap";
import {
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaHeart,
  FaUserCircle,
} from "react-icons/fa";
import { FiMinus, FiPlus, FiCheckCircle, FiShoppingCart, FiZap } from "react-icons/fi";
import { toast } from "react-toastify";

import {
  fetchProductAllData,
  toggleProductWishlist,
  clearProductDetail,
  fetchProductReviewsPage,
} from "../../redux/productDetailSlice";
import { addToCart } from "../../redux/cartSlice";
import { selectUser } from "../../redux/userSlice"; // 👉 Lấy thông tin user

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const PLACEHOLDER = `/placeholder.jpg`;

const formatVND = (n) => (n == null ? "" : n.toLocaleString("vi-VN") + "₫");

// --- Component ProductCardItem ---
function ProductCardItem({ p }) {
  const navigate = useNavigate();
  const hasDiscount = p.DiscountPercent > 0;
  const finalPrice = Number(p.DiscountedPrice || p.Price) || 0;
  const imageUrl = p.DefaultImage ? `${API_BASE_URL}${p.DefaultImage}` : PLACEHOLDER;

  return (
    <Card
      className="h-100 shadow-sm"
      onClick={() => navigate(`/product/${p.ProductID}`)}
      style={{ cursor: "pointer" }}
    >
      {hasDiscount && (
        <Badge bg="danger" className="position-absolute top-0 end-0 m-2">
          -{p.DiscountPercent}%
        </Badge>
      )}
      <Card.Img
        variant="top"
        src={imageUrl}
        style={{ aspectRatio: "4/3", objectFit: "cover" }}
        onError={(e) => {
          e.currentTarget.src = PLACEHOLDER;
        }}
      />
      <Card.Body>
        <Card.Title as="h6" title={p.Name} className="text-truncate">
          {p.Name}
        </Card.Title>
        <div>
          <span className="text-danger fw-bold me-2">{formatVND(finalPrice)}</span>
          {hasDiscount && (
            <del className="text-muted small">{formatVND(p.Price)}</del>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

// --- Component Stars ---
function Stars({ value = 0, size = 16 }) {
  const v = Math.round(Number(value) || 0);
  return (
    <span aria-label={`rating ${v}/5`}>
      {[...Array(5)].map((_, i) => (
        <FaStar key={i} size={size} color={i < v ? "#FFD700" : "#ddd"} />
      ))}
    </span>
  );
}

// === COMPONENT CHÍNH ===
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // 👉 dùng để redirect về sau login
  const dispatch = useDispatch();
  const carouselRef = useRef(null);
  const { chatWidgetRef } = useOutletContext(); // 👉 Get chat widget ref from UserLayout

  const { data, reviews, reviewStats, relatedProducts, wishlist, status, error } =
    useSelector((state) => state.productDetail);
  const { product, variants } = data || { product: null, variants: [] };

  const user = useSelector(selectUser); // 👉 thông tin user (null nếu chưa login)

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [qty, setQty] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // 👉 modal yêu cầu đăng nhập
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 👉 Handler to open chat with product context
  const handleChatNow = () => {
    if (chatWidgetRef?.current && product) {
      chatWidgetRef.current.openWithProduct(
        product.Name,
        `/product/${product.ProductID}`,
        variants // Pass real variants data
      );
    }
  };

  // Lấy data sản phẩm
  useEffect(() => {
    if (id) {
      dispatch(fetchProductAllData(id));
    }
    return () => {
      dispatch(clearProductDetail());
    };
  }, [id, dispatch]);

  // --- Tính toán danh sách size, màu, map màu theo size ---
  const uniqueSizes = useMemo(
    () =>
      [...new Set(variants.map((v) => v.Size))].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      ),
    [variants]
  );

  const uniqueColors = useMemo(
    () => [...new Set(variants.map((v) => v.Color))],
    [variants]
  );

  // colorsBySize: { [size]: Set(colors) }
  const colorsBySize = useMemo(() => {
    return variants.reduce((acc, v) => {
      if (!acc[v.Size]) acc[v.Size] = new Set();
      acc[v.Size].add(v.Color);
      return acc;
    }, {});
  }, [variants]);

  // Chọn size + color mặc định sau khi load xong
  useEffect(() => {
    if (status === "succeeded" && variants.length > 0) {
      const firstVariant = variants.find((v) => v.ImageURL) || variants[0];
      if (firstVariant) {
        setSelectedSize(firstVariant.Size);
        const colorsForSize = Array.from(colorsBySize[firstVariant.Size] || []);
        const initialColor =
          firstVariant.Color || colorsForSize[0] || "";
        setSelectedColor(initialColor);
      }
    }
  }, [status, variants, colorsBySize]);

  // Tìm đúng variant theo SIZE → COLOR
  const selectedVariant = useMemo(
    () =>
      variants.find(
        (v) => v.Size === selectedSize && v.Color === selectedColor
      ) || null,
    [variants, selectedSize, selectedColor]
  );

  // Ảnh đang hiển thị: ưu tiên theo SIZE → COLOR
  const currentImage = useMemo(() => {
    const norm = (u) => (u ? `${API_BASE_URL}${u}` : "");

    // 1️⃣ Biến thể đúng size + màu
    if (selectedVariant?.ImageURL) return norm(selectedVariant.ImageURL);

    // 2️⃣ Nếu chưa có ảnh riêng: lấy ảnh bất kỳ cùng SIZE
    if (selectedSize) {
      const sameSizeImg = variants.find(
        (v) => v.Size === selectedSize && v.ImageURL
      );
      if (sameSizeImg) return norm(sameSizeImg.ImageURL);
    }

    // 3️⃣ Nếu vẫn không có: lấy ảnh bất kỳ cùng MÀU
    if (selectedColor) {
      const sameColorImg = variants.find(
        (v) => v.Color === selectedColor && v.ImageURL
      );
      if (sameColorImg) return norm(sameColorImg.ImageURL);
    }

    // 4️⃣ Fallback: ảnh mặc định của sản phẩm
    if (product?.DefaultImage) return norm(product.DefaultImage);

    // 5️⃣ Cuối cùng: placeholder
    return PLACEHOLDER;
  }, [selectedVariant, selectedSize, selectedColor, variants, product]);

  const price = selectedVariant?.Price ?? product?.DiscountedPrice ?? 0;
  const oldPrice =
    product?.DiscountPercent > 0 ? Number(product?.Price || 0) : null;
  const inStock = selectedVariant?.StockQuantity > 0;
  const isLiked =
    Array.isArray(wishlist) && wishlist.includes(Number(id));
  const listAllUrl = `/products?category=${product?.category?.key}`;

  // --- Handler chọn size trước, rồi mới màu ---
  const handleSizeChange = (size) => {
    setSelectedSize(size);
    const colorsForNewSize = Array.from(colorsBySize[size] || []);
    if (!colorsForNewSize.includes(selectedColor)) {
      setSelectedColor(colorsForNewSize[0] || "");
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant || !inStock)
      return toast.warn("Vui lòng chọn biến thể còn hàng.");
    try {
      await dispatch(
        addToCart({ variantId: selectedVariant.VariantID, quantity: qty })
      ).unwrap();
      toast.success(`Đã thêm ${product.Name} vào giỏ hàng!`);
    } catch (err) {
      toast.error(err.message || "Không thể thêm vào giỏ hàng.");
    }
  };

  const handleBuyNow = () => {
    if (!selectedVariant || !inStock)
      return toast.warn("Vui lòng chọn biến thể còn hàng.");
    const item = {
      CartItemID: `buyNow_${selectedVariant.VariantID}`,
      VariantID: selectedVariant.VariantID,
      Quantity: qty,
      Price: price,
      variant: {
        ProductID: product.ProductID,
        Size: selectedVariant.Size,
        Color: selectedVariant.Color,
        StockQuantity: selectedVariant.StockQuantity,
        ProductImage: currentImage.replace(API_BASE_URL, ""),
        product: {
          Name: product.Name,
          Price: product.Price,
          DiscountPercent: product.DiscountPercent,
        },
      },
    };
    navigate("/checkout", { state: { selectedItems: [item] } });
  };

  // 👉 Kiểm tra login trước khi toggle wishlist
  const handleToggleWishlist = () => {
    if (!user || !user.id) {
      setShowLoginModal(true);
      return;
    }
    dispatch(toggleProductWishlist(Number(id)));
  };

  const scroll = (offset) =>
    carouselRef.current?.scrollBy({ left: offset, behavior: "smooth" });

  const handleReviewPageChange = (page) => {
    dispatch(fetchProductReviewsPage({ productId: id, page: page + 1 }));
  };

  if (status === "loading") {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />{" "}
        <span className="ms-2">Đang tải...</span>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="container py-5">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }
  if (!product)
    return (
      <div className="container py-5">
        <Alert variant="warning">Không tìm thấy sản phẩm.</Alert>
      </div>
    );

  return (
    <div className="container py-4">
      <Row className="g-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <div className="position-relative">
              {product.DiscountPercent > 0 && (
                <Badge
                  bg="danger"
                  className="position-absolute top-0 end-0 m-2 rounded-pill px-3 py-2"
                >
                  -{Number(product.DiscountPercent)}%
                </Badge>
              )}
              <Button
                variant="light"
                className="position-absolute top-0 start-0 m-2 rounded-circle shadow-sm"
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                }}
                onClick={handleToggleWishlist}
                aria-label={isLiked ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
              >
                <FaHeart size={18} color={isLiked ? "#e53935" : "#bbb"} />
              </Button>
              <Ratio aspectRatio="4x3">
                <img
                  src={currentImage}
                  alt={product.Name}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                    background: "#fff",
                  }}
                  onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                />
              </Ratio>
            </div>
          </Card>
        </Col>

        <Col lg={6}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <Stars value={reviewStats.averageRating} size={16} />
            <small className="text-muted">
              {reviewStats.averageRating
                ? `${reviewStats.averageRating.toFixed(1)}/5`
                : "Chưa có"}{" "}
              • {reviewStats.totalReviews} đánh giá
            </small>
          </div>

          <h2 className="fw-bold mb-1">{product.Name}</h2>

          <div className="d-flex align-items-center gap-3 my-2">
            <span className="fs-3 fw-bold text-danger">{formatVND(price)}</span>
            {oldPrice && <del className="text-muted">{formatVND(oldPrice)}</del>}
            {!inStock && <Badge bg="secondary">Hết hàng</Badge>}
          </div>

          {/* Kích cỡ (SIZE) TRƯỚC */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <div className="fw-semibold">Kích cỡ:</div>
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowSizeGuide(true)}
              >
                Hướng dẫn chọn size
              </Button>
            </div>
            {uniqueSizes.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={selectedSize === s ? "primary" : "outline-primary"}
                className="me-2 mb-2 rounded-pill"
                onClick={() => handleSizeChange(s)}
                disabled={!colorsBySize[s] || colorsBySize[s].size === 0}
              >
                {s}
              </Button>
            ))}
            {selectedVariant && (
              <div className="mt-1 small text-muted">
                Tồn kho: {selectedVariant.StockQuantity}
              </div>
            )}
          </div>

          {/* Màu sắc (COLOR) SAU */}
          <div className="mb-3">
            <div className="fw-semibold mb-1">Màu sắc:</div>
            {uniqueColors.map((c) => {
              const isAvailableForSize =
                selectedSize && colorsBySize[selectedSize]?.has(c);
              return (
                <Button
                  key={c}
                  size="sm"
                  variant={selectedColor === c ? "dark" : "outline-dark"}
                  className="me-2 mb-2 rounded-pill"
                  onClick={() =>
                    isAvailableForSize && handleColorChange(c)
                  }
                  disabled={!isAvailableForSize}
                >
                  {c}
                </Button>
              );
            })}
          </div>

          {/* NÚT YÊU THÍCH NGAY DƯỚI PHẦN SIZE & MÀU */}
          <div className="mb-3">
            <Button
              variant={isLiked ? "danger" : "outline-danger"}
              className="rounded-pill d-inline-flex align-items-center px-3"
              onClick={handleToggleWishlist}
            >
              <FaHeart
                className="me-2"
                color={isLiked ? "#fff" : "#e53935"}
              />
              {isLiked ? "Đã thêm vào yêu thích" : "Thêm vào yêu thích"}
            </Button>
          </div>

          <div className="d-flex align-items-center mb-3">
            <div className="fw-semibold me-3">Số lượng:</div>
            <InputGroup style={{ width: 180 }}>
              <Button
                variant="outline-secondary"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <FiMinus />
              </Button>
              <Form.Control value={qty} readOnly className="text-center" />
              <Button
                variant="outline-secondary"
                onClick={() =>
                  setQty((q) =>
                    Math.min(selectedVariant?.StockQuantity || 99, q + 1)
                  )
                }
              >
                <FiPlus />
              </Button>
            </InputGroup>
          </div>

          <Row className="g-2 my-3">
            <Col sm={6}>
              <Button
                variant="primary"
                className="w-100 py-2 rounded-pill shadow-sm"
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                <FiShoppingCart className="me-2" /> Thêm vào giỏ
              </Button>
            </Col>
            <Col sm={6}>
              <Button
                variant="danger"
                className="w-100 py-2 rounded-pill shadow-sm"
                onClick={handleBuyNow}
                disabled={!inStock}
              >
                <FiZap className="me-2" /> Mua ngay
              </Button>
            </Col>
          </Row>

          {/* Chat ngay button */}
          <Button
            variant="outline-dark"
            className="w-100 py-2 rounded-pill mt-2"
            onClick={handleChatNow}
          >
            💬 Chat ngay - Tư vấn về sản phẩm này
          </Button>

          <Card className="border-0 mt-3">
            <Card.Header className="bg-white fw-bold">
              TẠI SAO CHỌN LILY SHOES?
            </Card.Header>
            <ListGroup variant="flush">
              {[
                "Giao hàng toàn quốc",
                "Thanh toán khi nhận hàng",
                "Đổi trả miễn phí trong 7 ngày",
                "Bảo hành chính hãng 12 tháng",
              ].map((t, i) => (
                <ListGroup.Item
                  key={i}
                  className="d-flex align-items-start"
                >
                  <FiCheckCircle className="me-2 text-success mt-1" />
                  <span>{t}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Tabs defaultActiveKey="desc" className="mb-3">
                <Tab eventKey="desc" title="Mô tả">
                  <div
                    className="text-secondary"
                    dangerouslySetInnerHTML={{
                      __html: product?.Description || "",
                    }}
                  />
                </Tab>
                <Tab eventKey="spec" title="Thông số">
                  <ListGroup variant="flush">
                    {product?.SKU && (
                      <ListGroup.Item>
                        <strong>Mã sản phẩm:</strong> {product.SKU}
                      </ListGroup.Item>
                    )}
                    <ListGroup.Item>
                      <strong>Màu sắc có sẵn:</strong>{" "}
                      {uniqueColors.join(", ")}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Kích thước có sẵn:</strong>{" "}
                      {uniqueSizes.join(", ")}
                    </ListGroup.Item>
                  </ListGroup>
                </Tab>

                <Tab
                  eventKey="reviews"
                  title={`Đánh giá (${reviewStats.totalReviews})`}
                >
                  <Row>
                    <Col md={4} className="border-end">
                      <h5 className="mb-0">Tổng quan</h5>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <span className="fs-1 fw-bold">
                          {reviewStats.averageRating.toFixed(1)}
                        </span>
                        <div>
                          <Stars value={reviewStats.averageRating} size={20} />
                          <div className="text-muted small">
                            {reviewStats.totalReviews} lượt đánh giá
                          </div>
                        </div>
                      </div>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviewStats.ratingSummary[star] || 0;
                        const percent =
                          reviewStats.totalReviews > 0
                            ? (count / reviewStats.totalReviews) * 100
                            : 0;
                        return (
                          <div
                            key={star}
                            className="d-flex align-items-center gap-2 mb-1"
                          >
                            <span className="text-muted small">
                              {star} sao
                            </span>
                            <ProgressBar
                              variant="warning"
                              now={percent}
                              style={{ height: 10 }}
                              className="flex-grow-1"
                            />
                            <span
                              className="text-muted small"
                              style={{ width: 40, textAlign: "right" }}
                            >
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </Col>
                    <Col md={8}>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">
                          Khách hàng đánh giá ({reviewStats.totalReviews})
                        </h5>
                      </div>

                      {reviews.length > 0 ? (
                        <>
                          {reviews.map((r) => (
                            <div
                              key={r.ReviewID}
                              className="border-bottom mb-3 pb-3"
                            >
                              <div className="d-flex align-items-center gap-2 mb-2">
                                {r.user?.AvatarURL ? (
                                  <Image
                                    src={r.user.AvatarURL}
                                    roundedCircle
                                    style={{
                                      width: 40,
                                      height: 40,
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <FaUserCircle
                                    size={40}
                                    className="text-muted"
                                  />
                                )}
                                <div>
                                  <div className="fw-semibold">
                                    {r.user?.FullName || "Người dùng"}
                                  </div>
                                  <div className="small text-muted">
                                    {new Date(
                                      r.CreatedAt
                                    ).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="mb-2">
                                <Stars value={r.Rating} size={14} />
                              </div>
                              <p className="text-secondary mb-2">
                                {r.Comment}
                              </p>
                              {r.media && r.media.length > 0 && (
                                <div className="d-flex gap-2 flex-wrap">
                                  {r.media.map((m) =>
                                    m.IsVideo ? (
                                      <video
                                        key={m.MediaURL}
                                        src={m.MediaURL}
                                        controls
                                        style={{
                                          width: 100,
                                          height: 100,
                                          borderRadius: 8,
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      <Image
                                        key={m.MediaURL}
                                        src={m.MediaURL}
                                        style={{
                                          width: 100,
                                          height: 100,
                                          borderRadius: 8,
                                          objectFit: "cover",
                                        }}
                                      />
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {reviewStats.totalPages > 1 && (
                            <Pagination
                              size="sm"
                              className="justify-content-center"
                            >
                              {[
                                ...Array(reviewStats.totalPages).keys(),
                              ].map((page) => (
                                <Pagination.Item
                                  key={page + 1}
                                  active={page + 1 === reviewStats.page}
                                  onClick={() => handleReviewPageChange(page)}
                                >
                                  {page + 1}
                                </Pagination.Item>
                              ))}
                            </Pagination>
                          )}
                        </>
                      ) : (
                        <p className="text-muted mb-0">
                          Chưa có đánh giá nào cho sản phẩm này.
                        </p>
                      )}
                    </Col>
                  </Row>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <section className="mt-5">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="fw-bold mb-0">SẢN PHẨM TƯƠNG TỰ</h4>
          <Button as={Link} to={listAllUrl} variant="outline-primary" size="sm">
            Xem tất cả
          </Button>
        </div>
        {relatedProducts.length > 0 && (
          <div className="position-relative">
            <Button
              variant="light"
              className="position-absolute top-50 start-0 translate-middle-y z-1 shadow-sm rounded-circle p-2"
              onClick={() => scroll(-300)}
              style={{ left: -20 }}
              aria-label="Cuộn trái"
            >
              <FaChevronLeft />
            </Button>
            <Row
              className="g-4 flex-nowrap overflow-auto pb-3"
              ref={carouselRef}
              style={{ scrollSnapType: "x mandatory" }}
            >
              {relatedProducts.map((p) => (
                <Col
                  key={p.ProductID}
                  xs={6}
                  md={4}
                  lg={3}
                  className="flex-shrink-0"
                  style={{ minWidth: 250 }}
                >
                  <ProductCardItem p={p} />
                </Col>
              ))}
            </Row>
            <Button
              variant="light"
              className="position-absolute top-50 end-0 translate-middle-y z-1 shadow-sm rounded-circle p-2"
              onClick={() => scroll(300)}
              style={{ right: -20 }}
              aria-label="Cuộn phải"
            >
              <FaChevronRight />
            </Button>
          </div>
        )}
      </section>

      {/* Modal hướng dẫn size */}
      <Modal
        show={showSizeGuide}
        onHide={() => setShowSizeGuide(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Hướng dẫn chọn size</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <img
            src={`${process.env.PUBLIC_URL}/images/lilysize.jpg`}
            alt="Hướng dẫn size"
            style={{ width: "100%" }}
          />
        </Modal.Body>
      </Modal>

      {/* 👉 Modal yêu cầu đăng nhập khi thêm yêu thích */}
      <Modal
        show={showLoginModal}
        onHide={() => setShowLoginModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Đăng nhập để tiếp tục</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn cần đăng nhập để thêm sản phẩm vào danh sách yêu thích.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLoginModal(false)}>
            Để sau
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              navigate("/login", {
                state: { from: location.pathname },
              });
            }}
          >
            Đăng nhập ngay
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
