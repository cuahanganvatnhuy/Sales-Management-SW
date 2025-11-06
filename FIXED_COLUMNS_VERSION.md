# Phiên bản Bảng Cố Định - Giao Dịch Tài Chính

## ✅ Đã tạo xong!

### Files mới:
- `view/financial-transactions-fixed.html` - HTML với bảng cố định
- `main/financial-transactions-fixed.js` - JavaScript xử lý dữ liệu

## Đặc điểm phiên bản này:

### 1. **Bảng có SẴN 22 cột từ TikTok Shop**

Các cột được kẻ sẵn trong bảng:
1. STT
2. Order/adjustment ID
3. Type
4. Order created time
5. Order settled time
6. Currency
7. Total settlement amount
8. Total Revenue
9. Subtotal after seller discounts
10. Subtotal before discounts
11. Seller discounts
12. Refund subtotal after seller discounts
13. Refund subtotal before seller discounts
14. Refund of seller discounts
15. Total Fees
16. Transaction fee
17. TikTok Shop commission fee
18. Seller shipping fee
19. Actual shipping fee
20. Platform shipping fee
21. Platform VAT
22. Platform income tax

### 2. **Tự động điền dữ liệu**
- Upload file Excel
- Hệ thống tự động tìm sheet "Order details"
- Đọc TOÀN BỘ dữ liệu và điền vào bảng sẵn có
- Hiển thị TẤT CẢ các dòng (không chỉ 1 dòng)

### 3. **Thẻ tổng hợp**
- Hiển thị tổng giá trị cho 16 cột số
- Mỗi cột có thẻ riêng với tổng tiền format VND

### 4. **Dòng tổng cộng (Footer)**
- Tự động tính tổng cho tất cả các cột số
- Hiển thị ở cuối bảng

### 5. **Màu sắc phân biệt**
- ✅ Dòng có Total settlement amount > 0 → Trắng
- ❌ Dòng có Total settlement amount < 0 (hoàn tiền) → Đỏ nhạt
- ⭕ Dòng có Total settlement amount = 0 → Xám
- 🔴 Số âm → Chữ đỏ đậm

### 6. **Sticky columns**
- Cột STT cố định khi scroll ngang
- Tiêu đề bảng (header) cố định khi scroll dọc
- Dễ theo dõi dữ liệu khi có nhiều dòng

## Cách sử dụng:

### Bước 1: Mở trang mới
```
http://127.0.0.1:5502/view/financial-transactions-fixed.html
```

### Bước 2: Upload file Excel
- Kéo thả hoặc chọn file Excel từ TikTok Shop
- File phải có sheet "Order details"

### Bước 3: Xem kết quả
- Thẻ tổng hợp: Hiển thị tổng giá trị các cột số
- Bảng chi tiết: Hiển thị TOÀN BỘ đơn hàng
- Dòng tổng cộng: Tổng giá trị ở cuối bảng

## So sánh 2 phiên bản:

### Phiên bản Động (financial-transactions-dynamic.js)
- ✅ Đọc TẤT CẢ các cột từ file (linh hoạt)
- ✅ Tự động nhận diện cột số
- ❌ Có thể gặp lỗi nếu file có cấu trúc khác

### Phiên bản Cố định (financial-transactions-fixed.js) ⭐ KHUYẾN NGHỊ
- ✅ Bảng có sẵn 22 cột chuẩn TikTok Shop
- ✅ Chắc chắn hiển thị đúng các cột cần thiết
- ✅ Dễ bảo trì và customize
- ✅ Hiển thị TOÀN BỘ dữ liệu từ sheet "Order details"
- ⚠️ Chỉ hoạt động với file có cấu trúc TikTok Shop

## Lưu ý:

### File Excel phải có:
- Sheet tên "Order details" (hoặc "order details")
- Các cột giống với danh sách 22 cột bên trên
- Dữ liệu bắt đầu từ dòng 2 (dòng 1 là header)

### Nếu thiếu cột:
- Cột thiếu sẽ hiển thị trống
- Không ảnh hưởng đến các cột khác
- Tổng giá trị vẫn tính đúng cho các cột có dữ liệu

## Test:

1. ✅ Upload file Excel → Kiểm tra có đọc TẤT CẢ dòng không
2. ✅ Xem thẻ tổng hợp → Có đầy đủ 16 thẻ không
3. ✅ Xem bảng chi tiết → Có đầy đủ 22 cột không
4. ✅ Scroll ngang → Cột STT có cố định không
5. ✅ Xem dòng tổng cộng → Số liệu có đúng không
6. ✅ Kiểm tra dòng hoàn tiền → Có màu đỏ nhạt không

---

**Hoàn thành!** Sử dụng file `financial-transactions-fixed.html` để xem toàn bộ dữ liệu TikTok Shop! 🎉
