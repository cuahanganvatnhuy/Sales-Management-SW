# 📦 HƯỚNG DẪN TEST HỆ THỐNG CHI PHÍ THÙNG ĐÓNG GÓI

## 🎯 TỔNG QUAN
Hệ thống chi phí thùng đóng gói cho phép cấu hình chi phí thùng theo loại sản phẩm (Hàng Lạnh, Hàng Khô, Hàng Nước) và khoảng khối lượng. Hệ thống tự động tính toán chi phí thùng khi tạo đơn hàng và tích hợp vào tính toán lợi nhuận.

---

## 🚀 CHUẨN BỊ TEST

### 1. Khởi động hệ thống
```bash
cd /d "e:\CascadeProjects\Sales-Management-SW"
python -m http.server 8080
```

### 2. Truy cập ứng dụng
- Mở trình duyệt: `http://localhost:8080`
- Đăng nhập vào hệ thống
- Chọn cửa hàng để test

---

## 📋 DANH SÁCH TEST CASES

### ✅ TEST 1: GIAO DIỆN QUẢN LÝ SẢN PHẨM

#### 1.1 Kiểm tra trường mới trong Products
**Bước thực hiện:**
1. Vào menu **"Sản Phẩm"** → **"Quản Lý Sản Phẩm Bán"**
2. Click **"+ Thêm Sản Phẩm"**
3. Kiểm tra form có 2 trường mới:
   - **"Loại Sản Phẩm"** (dropdown): Hàng Lạnh, Hàng Khô, Hàng Nước
   - **"Khối Lượng (kg)"** (input number)

**Kết quả mong đợi:**
- ✅ Dropdown loại sản phẩm hiển thị đầy đủ 3 options
- ✅ Input khối lượng chấp nhận số thập phân
- ✅ Validation hoạt động (bắt buộc nhập)

#### 1.2 Test thêm sản phẩm mới
**Bước thực hiện:**
1. Nhập thông tin sản phẩm test:
   - Tên: "Test Sữa Tươi"
   - SKU: "TEST-MILK-001"
   - Loại: "Hàng Lạnh"
   - Khối lượng: "2.5"
   - Giá nhập: "25000"
   - Giá bán: "35000"
2. Click **"Lưu Sản Phẩm"**

**Kết quả mong đợi:**
- ✅ Sản phẩm được lưu thành công
- ✅ Dữ liệu sync giữa `products` và `sellingProducts`
- ✅ Hiển thị trong danh sách với đầy đủ thông tin

---

### ✅ TEST 2: CẤU HÌNH CHI PHÍ THÙNG

#### 2.1 Truy cập giao diện cấu hình
**Bước thực hiện:**
1. Vào **"Quản Lý Lợi Nhuận"**
2. Click tab **"📦 Cấu hình Chi phí Thùng"**

**Kết quả mong đợi:**
- ✅ Giao diện hiển thị sạch sẽ (không có phần phân tích, biểu đồ)
- ✅ Có 3 tab: Hàng Lạnh, Hàng Khô, Hàng Nước
- ✅ Tab "Hàng Lạnh" active mặc định

#### 2.2 Test chuyển đổi tab
**Bước thực hiện:**
1. Click tab **"Hàng Khô"**
2. Click tab **"Hàng Nước"**
3. Click lại tab **"Hàng Lạnh"**

**Kết quả mong đợi:**
- ✅ Tab active thay đổi đúng
- ✅ Nội dung hiển thị theo tab được chọn
- ✅ Animation chuyển đổi mượt mà

#### 2.3 Test thêm khoảng khối lượng
**Bước thực hiện:**
1. Ở tab **"Hàng Lạnh"**, click **"+ Thêm Khoảng Khối Lượng"**
2. Nhập thông tin:
   - Khối lượng tối thiểu: "0"
   - Khối lượng tối đa: "5"
   - Chi phí thùng: "15000"
   - Loại thùng: "Thùng xốp"
   - Mô tả: "Thùng xốp nhỏ cho hàng lạnh dưới 5kg"
3. Click **"Lưu"**

**Kết quả mong đợi:**
- ✅ Modal/form hiển thị đúng
- ✅ Validation hoạt động (không để trống, min < max)
- ✅ Lưu thành công và hiển thị trong danh sách
- ✅ Dữ liệu được lưu vào Firebase

#### 2.4 Test chỉnh sửa khoảng khối lượng
**Bước thực hiện:**
1. Click icon **"✏️ Chỉnh sửa"** trên một khoảng khối lượng
2. Thay đổi thông tin (ví dụ: tăng chi phí lên 18000)
3. Click **"Cập nhật"**

**Kết quả mong đợi:**
- ✅ Form hiển thị với dữ liệu hiện tại
- ✅ Cập nhật thành công
- ✅ Dữ liệu thay đổi trong danh sách

#### 2.5 Test xóa khoảng khối lượng
**Bước thực hiện:**
1. Click icon **"🗑️ Xóa"** trên một khoảng khối lượng
2. Xác nhận xóa

**Kết quả mong đợi:**
- ✅ Hiển thị dialog xác nhận
- ✅ Xóa thành công khỏi danh sách
- ✅ Dữ liệu bị xóa khỏi Firebase

---

### ✅ TEST 3: TÍNH TOÁN CHI PHÍ THÙNG

#### 3.1 Test calculator function
**Bước thực hiện:**
1. Mở **Developer Console** (F12)
2. Chạy lệnh test:
```javascript
// Test tính chi phí cho hàng lạnh 3kg
const cost = calculatePackagingCost('cold', 3);
console.log('Chi phí thùng cho hàng lạnh 3kg:', cost);

// Test tính chi phí cho hàng khô 8kg
const cost2 = calculatePackagingCost('dry', 8);
console.log('Chi phí thùng cho hàng khô 8kg:', cost2);
```

**Kết quả mong đợi:**
- ✅ Hàm trả về chi phí đúng theo khoảng khối lượng
- ✅ Trả về 0 nếu không tìm thấy khoảng phù hợp
- ✅ Console log hiển thị chi tiết tính toán

#### 3.2 Test preview chi phí trong form
**Bước thực hiện:**
1. Vào form tạo đơn hàng (TMĐT/Retail/Wholesale)
2. Chọn sản phẩm có loại và khối lượng
3. Nhập số lượng
4. Kiểm tra preview chi phí thùng

**Kết quả mong đợi:**
- ✅ Chi phí thùng hiển thị tự động
- ✅ Cập nhật khi thay đổi sản phẩm/số lượng
- ✅ Tính toán đúng: `số lượng × chi phí thùng theo kg`

---

### ✅ TEST 4: TÍCH HỢP VỚI PROFIT CALCULATION

#### 4.1 Test tạo đơn hàng TMĐT
**Bước thực hiện:**
1. Vào **"Tạo Đơn Hàng"** → **"TMĐT"**
2. Chọn sản phẩm test đã tạo (Test Sữa Tươi - 2.5kg)
3. Nhập số lượng: 2
4. Hoàn tất tạo đơn hàng

**Kết quả mong đợi:**
- ✅ Chi phí thùng được tính: 2 × (chi phí cho 2.5kg)
- ✅ Lợi nhuận = Doanh thu - Chi phí sản phẩm - Chi phí thùng - Phí sàn
- ✅ Đơn hàng lưu với đầy đủ thông tin chi phí

#### 4.2 Test báo cáo lợi nhuận
**Bước thực hiện:**
1. Vào **"Quản Lý Lợi Nhuận"** → tab **"Lợi Nhuận TMĐT"**
2. Kiểm tra đơn hàng vừa tạo trong danh sách
3. Click xem chi tiết đơn hàng

**Kết quả mong đợi:**
- ✅ Hiển thị chi phí thùng trong breakdown
- ✅ Lợi nhuận tính đúng (đã trừ chi phí thùng)
- ✅ Chi tiết đơn hàng hiển thị đầy đủ thông tin

---

## 🔧 DEBUG & TROUBLESHOOTING

### Console Commands hữu ích:
```javascript
// Kiểm tra cấu hình packaging hiện tại
console.log('Packaging Config:', packagingConfig);

// Test tính chi phí
calculatePackagingCost('cold', 3);

// Kiểm tra dữ liệu sản phẩm
console.log('Products:', products);
console.log('Selling Products:', sellingProducts);

// Xóa tất cả cấu hình packaging (reset)
clearAllPackagingConfig();
```

### Các lỗi thường gặp:
1. **Giao diện không hiển thị dữ liệu:**
   - Kiểm tra Firebase connection
   - Refresh trang và thử lại

2. **Chi phí không tính đúng:**
   - Kiểm tra khoảng khối lượng có overlap không
   - Verify dữ liệu trong Firebase

3. **Lỗi khi lưu:**
   - Kiểm tra validation
   - Xem console log để debug

---

## ✅ CHECKLIST HOÀN THÀNH

### Giao diện:
- [ ] Form sản phẩm có trường productType và weight
- [ ] Tab cấu hình chi phí thùng hiển thị đúng
- [ ] CRUD khoảng khối lượng hoạt động
- [ ] UI responsive và đẹp

### Chức năng:
- [ ] Sync dữ liệu products ↔ sellingProducts
- [ ] Tính toán chi phí thùng chính xác
- [ ] Tích hợp vào profit calculation
- [ ] Lưu trữ Firebase ổn định

### Tích hợp:
- [ ] Đơn hàng TMĐT tính chi phí thùng
- [ ] Báo cáo lợi nhuận hiển thị chi phí thùng
- [ ] Export data bao gồm chi phí thùng

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề trong quá trình test:
1. Kiểm tra console log để xem lỗi
2. Verify dữ liệu trong Firebase
3. Test từng function riêng lẻ
4. Reset dữ liệu và test lại

**Chúc bạn test thành công! 🎉**