# 📊 HƯỚNG DẪN TEST TÍNH NĂNG UPLOAD EXCEL - FINANCIAL TRANSACTIONS

## 🎯 **TỔNG QUAN**
Tính năng upload file Excel cho trang quản lý giao dịch tài chính đã được sửa lỗi và cải thiện. Hệ thống có thể đọc file Excel từ TikTok Shop và hiển thị dữ liệu giao dịch một cách chính xác.

---

## 🚀 **CÁCH TEST**

### **1. Truy cập trang**
- Mở trình duyệt và vào: `http://127.0.0.1:5502/view/financial-transactions.html`
- Đảm bảo đã đăng nhập vào hệ thống

### **2. Chuẩn bị file Excel**
- Sử dụng file mẫu: `sample-financial-data.csv` (đổi extension thành .xlsx)
- Hoặc tạo file Excel với cấu trúc cột như sau:

| Cột | Tên cột | Mô tả |
|-----|---------|-------|
| A | Order/adjustment ID | Mã đơn hàng |
| B | Type | Loại giao dịch |
| C | Order created time | Thời gian tạo đơn |
| D | Order settled time | Thời gian thanh toán |
| E | Currency | Đơn vị tiền tệ |
| F | Total settlement amount | Tổng thực nhận |
| G | Total Revenue | Tổng doanh thu |
| H | Subtotal after seller discounts | Tổng sau giảm giá |
| I | Subtotal before discounts | Tổng trước giảm giá |
| J | Seller discounts | Giảm giá người bán |
| K | Refund subtotal after seller discounts | Hoàn tiền sau giảm giá |
| L | Refund subtotal before seller discounts | Hoàn tiền trước giảm giá |
| M | Refund of seller discounts | Hoàn tiền giảm giá |
| N | Total Fees | Tổng phí |
| O | Transaction fee | Phí giao dịch |
| P | TikTok Shop commission fee | Hoa hồng TikTok |
| Q | Seller shipping fee | Phí ship người bán |
| R | Actual shipping fee | Phí ship thực tế |
| S | Platform shipping fee | Phí ship nền tảng |

**Lưu ý**: File thực tế từ TikTok Shop có đầy đủ các cột này. Hệ thống sẽ ưu tiên sử dụng cột có sẵn, nếu không có sẽ ước tính.

### **3. Test upload file**

#### **3.1 Upload bằng click**
1. Click vào vùng "Kéo thả file vào đây hoặc nhấn để chọn file"
2. Chọn file Excel (.xlsx hoặc .xls)
3. **File sẽ tự động được phân tích ngay lập tức** ⚡

#### **3.2 Upload bằng drag & drop**
1. Kéo file Excel từ máy tính
2. Thả vào vùng upload
3. **File sẽ tự động được phân tích ngay lập tức** ⚡

### **4. Kiểm tra kết quả**

#### **4.1 Console Log**
- Mở Developer Tools (F12)
- Xem tab Console để theo dõi quá trình xử lý:
  ```
  Processing Excel file: sample.xlsx Size: 1234 bytes
  Raw Excel data: [...]
  First row keys: ["Order/adjustment ID", "Order settled time", ...]
  Available columns in Excel: [...]
  Detected column mapping: {...}
  Excel processing completed. Found 5 transactions
  ```

#### **4.2 Hiển thị dữ liệu**
- **Summary Cards**: Hiển thị tổng doanh thu, tổng phí, thực nhận
- **Transaction Table**: Bảng chi tiết từng giao dịch
- **Footer Totals**: Tổng cộng các cột

#### **4.3 Notification**
- Thông báo thành công: "Đã xử lý thành công X giao dịch từ file Y"
- Thông báo lỗi nếu có vấn đề

---

## 🔧 **TÍNH NĂNG MỚI**

### **1. Auto Processing** ⚡
- **Tự động phân tích** ngay khi chọn file
- Không cần click nút "Tải lên & Phân tích"
- Hoạt động với cả click và drag & drop

### **2. Auto Column Detection**
- Hệ thống tự động nhận diện cột dựa trên tên cột
- Hỗ trợ nhiều format tên cột (tiếng Anh, tiếng Việt)
- Fallback values nếu không tìm thấy cột phù hợp

### **3. Enhanced Error Handling**
- Validation file type (.xlsx, .xls)
- Kiểm tra dữ liệu hợp lệ
- Thông báo lỗi chi tiết
- Console logging để debug

### **4. Improved UI/UX**
- Drag & drop functionality
- Loading overlay
- Toast notifications
- Responsive design

### **5. Data Processing**
- Filter out invalid rows (revenue = 0)
- Format currency (VND)
- Format dates (Vietnamese locale)
- Calculate totals automatically

---

## 🐛 **TROUBLESHOOTING**

### **Lỗi thường gặp:**

#### **1. "Không tìm thấy dữ liệu hợp lệ"**
- **Nguyên nhân**: File Excel không có dữ liệu hoặc cấu trúc sai
- **Giải pháp**: 
  - Kiểm tra file có dữ liệu không
  - Đảm bảo có header row
  - Kiểm tra console log để xem available columns

#### **2. "Có lỗi xảy ra khi xử lý file Excel"**
- **Nguyên nhân**: File bị hỏng hoặc format không đúng
- **Giải pháp**:
  - Thử file khác
  - Kiểm tra file có phải Excel không
  - Xem console log để debug

#### **3. Dữ liệu hiển thị sai**
- **Nguyên nhân**: Mapping cột không đúng
- **Giải pháp**:
  - Kiểm tra console log "Detected column mapping"
  - Đảm bảo tên cột đúng format
  - Có thể cần điều chỉnh code mapping

---

## 📋 **CHECKLIST TEST**

### **Chức năng cơ bản:**
- [ ] Upload file Excel thành công
- [ ] **Tự động phân tích** ngay khi chọn file ⚡
- [ ] Hiển thị dữ liệu trong bảng
- [ ] Tính toán summary cards đúng
- [ ] Hiển thị footer totals
- [ ] Notification thành công

### **Chức năng nâng cao:**
- [ ] Drag & drop hoạt động với auto processing
- [ ] Auto column detection
- [ ] Error handling
- [ ] Console logging
- [ ] Responsive design

### **Edge cases:**
- [ ] File không hợp lệ
- [ ] File rỗng
- [ ] File có cấu trúc khác
- [ ] File lớn (>1MB)

---

## 🎉 **KẾT QUẢ MONG ĐỢI**

Sau khi test thành công, bạn sẽ thấy:

1. **File được upload** và xử lý thành công
2. **Dữ liệu hiển thị** trong bảng với format đúng
3. **Summary cards** cập nhật với số liệu chính xác
4. **Console log** hiển thị quá trình xử lý chi tiết
5. **Notification** thông báo thành công

---

## 📞 **HỖ TRỢ**

Nếu gặp vấn đề:
1. Mở Developer Tools (F12) và xem Console
2. Kiểm tra file Excel có đúng format không
3. Thử với file mẫu `sample-financial-data.csv`
4. Liên hệ để được hỗ trợ thêm

**Chúc bạn test thành công! 🚀**
