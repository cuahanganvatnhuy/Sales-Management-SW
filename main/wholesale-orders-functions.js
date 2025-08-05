// Clean wholesale orders functions - rebuilt from scratch

// Get payment status badge
function getPaymentStatusBadge(status) {
    switch (status) {
        case 'paid':
            return '<span class="wholesale-status-badge wholesale-status-paid">Đã Thanh Toán</span>';
        case 'partial':
            return '<span class="wholesale-status-badge wholesale-status-partial">Thanh Toán 1 Phần</span>';
        default:
            return '<span class="wholesale-status-badge wholesale-status-pending">Chưa Thanh Toán</span>';
    }
}

// View wholesale order details - Basic UI with store information
function viewWholesaleOrderDetails(orderId) {
    console.log('Opening wholesale order details for:', orderId);
    
    // Find the order
    const order = window.wholesaleOrdersData.find(o => o.id === orderId);
    if (!order) {
        console.error('Order not found:', orderId);
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    
    console.log('Order found:', order);
    
    // Remove any existing modal
    const existingModal = document.getElementById('wholesaleOrderModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Get store information
    const storeData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
    const storeName = storeData.name || 'Cửa Hàng';
    const storeAddress = storeData.address || 'Địa chỉ cửa hàng';
    const storePhone = storeData.phone || 'Số điện thoại';
    
    // Calculate order totals
    const subtotal = order.subtotal || 0;
    const discount = order.discount || 0;
    const shipping = order.shipping || 0;
    const deposit = order.deposit || 0;
    const total = order.total || 0;
    const remaining = total - deposit;
    
    // Generate items HTML
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
            const itemTotal = (item.quantity || 0) * (item.price || 0);
            itemsHtml += `
                <tr>
                    <td style="padding: 12px; border: 1px solid #ddd; font-size: 15px;">${item.productName || 'N/A'}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 15px;">${item.sku || 'N/A'}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 15px;">${item.quantity || 0} kg</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: right; font-size: 15px;">${formatCurrency(item.price || 0)} VNĐ</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 15px;">${formatCurrency(itemTotal)} VNĐ</td>
                </tr>
            `;
        });
    } else {
        itemsHtml = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #666;">Không có sản phẩm</td></tr>';
    }
    
    // Get payment status display
    const paymentStatus = order.paymentStatus || 'pending';
    let statusText = '';
    switch (paymentStatus) {
        case 'paid':
            statusText = '<span style="color: #28a745; font-weight: bold;">Đã Thanh Toán</span>';
            break;
        case 'partial':
            statusText = '<span style="color: #ffc107; font-weight: bold;">Thanh Toán 1 Phần</span>';
            break;
        default:
            statusText = '<span style="color: #dc3545; font-weight: bold;">Chưa Thanh Toán</span>';
    }
    
    // Create modal HTML with basic UI
    const modalHtml = `
        <div id="wholesaleOrderModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        " onclick="closeOrderDetailsModal()">
            <div style="
                background: white;
                border-radius: 8px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                border: 1px solid #ddd;
            " onclick="event.stopPropagation()">
                
                <!-- Modal Header -->
                <div style="
                    background: #f8f9fa;
                    padding: 25px;
                    border-bottom: 2px solid #007bff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <h3 style="margin: 0; font-size: 24px; color: #333; font-weight: bold;">Chi Tiết Đơn Hàng Bán Sỉ</h3>
                        <p style="margin: 8px 0 0 0; color: #666; font-size: 16px;">Mã đơn hàng: <strong>${order.id}</strong></p>
                    </div>
                    <button onclick="closeOrderDetailsModal()" style="
                        background: #dc3545;
                        border: none;
                        color: white;
                        width: 35px;
                        height: 35px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 18px;
                        font-weight: bold;
                    ">×</button>
                </div>
                
                <!-- Modal Body -->
                <div style="padding: 20px;">
                    
                    <!-- Store Information -->
                    <div style="background: #e3f2fd; padding: 20px; margin-bottom: 25px; border-radius: 5px; border-left: 4px solid #2196f3;">
                        <h4 style="margin: 0 0 15px 0; color: #1976d2; font-size: 20px; font-weight: bold;">Thông Tin Cửa Hàng</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Tên cửa hàng:</strong> ${storeName}</p>
                                <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Số điện thoại:</strong> ${storePhone}</p>
                            </div>
                            <div>
                                <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Địa chỉ:</strong> ${storeAddress}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Customer & Order Info -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
                        <!-- Customer Info -->
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745;">
                            <h4 style="margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: bold;">Thông Tin Khách Hàng</h4>
                            <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Tên:</strong> ${order.customerName || 'N/A'}</p>
                            <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>SĐT:</strong> ${order.customerPhone || 'N/A'}</p>
                            <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Địa chỉ:</strong> ${order.customerAddress || 'N/A'}</p>
                        </div>
                        
                        <!-- Order Info -->
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107;">
                            <h4 style="margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: bold;">Thông Tin Đơn Hàng</h4>
                            <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Ngày đặt:</strong> ${order.orderDate || 'N/A'}</p>
                            <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Ngày giao:</strong> ${order.deliveryDate || 'N/A'}</p>
                            <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Trạng thái:</strong> ${statusText}</p>
                        </div>
                    </div>
                    
                    <!-- Products Table -->
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: bold;">Danh Sách Sản Phẩm</h4>
                        <div style="border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f8f9fa;">
                                        <th style="padding: 15px; text-align: left; font-weight: 600; border-bottom: 2px solid #dee2e6; font-size: 16px;">Sản Phẩm</th>
                                        <th style="padding: 15px; text-align: center; font-weight: 600; border-bottom: 2px solid #dee2e6; font-size: 16px;">SKU</th>
                                        <th style="padding: 15px; text-align: center; font-weight: 600; border-bottom: 2px solid #dee2e6; font-size: 16px;">Số Lượng</th>
                                        <th style="padding: 15px; text-align: right; font-weight: 600; border-bottom: 2px solid #dee2e6; font-size: 16px;">Đơn Giá</th>
                                        <th style="padding: 15px; text-align: right; font-weight: 600; border-bottom: 2px solid #dee2e6; font-size: 16px;">Thành Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Order Summary -->
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: bold;">Tổng Kết Đơn Hàng</h4>
                        <div style="background: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                                    <span style="color: #333; font-size: 16px;">Tạm tính:</span>
                                    <span style="font-weight: 600; color: #333; font-size: 16px;">${formatCurrency(subtotal)} VNĐ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                                    <span style="color: #333; font-size: 16px;">Giảm giá:</span>
                                    <span style="font-weight: 600; color: #dc3545; font-size: 16px;">-${formatCurrency(discount)} VNĐ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                                    <span style="color: #333; font-size: 16px;">Phí vận chuyển:</span>
                                    <span style="font-weight: 600; color: #333; font-size: 16px;">${formatCurrency(shipping)} VNĐ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #ffc107; margin-top: 8px; font-size: 18px; font-weight: bold;">
                                    <span style="color: #333;">Tổng cộng:</span>
                                    <span style="font-weight: 800; color: #dc3545;">${formatCurrency(total)} VNĐ</span>
                                </div>
                                ${deposit && deposit > 0 ? `
                                <div style="background: #e8f5e8; padding: 12px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #28a745;">
                                    <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 16px;">
                                        <span style="font-weight: 600; color: #28a745;">Tiền cọc đã trả:</span>
                                        <span style="font-weight: 700; color: #28a745;">${formatCurrency(deposit)} VNĐ</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 16px;">
                                        <span style="font-weight: 600; color: #856404;">Còn lại phải trả:</span>
                                        <span style="font-weight: 700; color: #856404;">${formatCurrency(remaining)} VNĐ</span>
                                    </div>
                                    ${order.paymentStatus === 'partial' ? `
                                    <div style="background: #d1ecf1; padding: 8px; border-radius: 4px; margin-top: 8px; border: 2px solid #0c5460; text-align: center;">
                                        <span style="color: #0c5460; font-weight: bold; font-size: 14px; text-transform: uppercase;">🔄 TRẠNG THÁI: THANH TOÁN 1 PHẦN</span>
                                    </div>` : ''}
                                </div>` : `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 18px;">
                                    <span style="font-weight: 700; color: #333;">Còn lại:</span>
                                    <span style="font-weight: 800; color: #dc3545;">${formatCurrency(remaining)} VNĐ</span>
                                </div>`}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="display: flex; justify-content: center; gap: 15px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                        <button onclick="printWholesaleInvoice('${order.id}')" style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 15px 30px;
                            border-radius: 4px;
                            font-weight: 600;
                            cursor: pointer;
                            font-size: 16px;
                        " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                            In Hóa Đơn
                        </button>
                        
                        <button onclick="closeOrderDetailsModal()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 15px 30px;
                            border-radius: 4px;
                            font-weight: 600;
                            cursor: pointer;
                            font-size: 16px;
                        " onmouseover="this.style.background='#545b62'" onmouseout="this.style.background='#6c757d'">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    console.log('Modal created and added to DOM');
}

// Close order details modal
function closeOrderDetailsModal() {
    const modal = document.getElementById('wholesaleOrderModal');
    if (modal) {
        modal.remove();
    }
}

// Print wholesale invoice
function printWholesaleInvoice(orderId) {
    console.log('Printing invoice for order:', orderId);
    
    // Find the order in our local data
    const order = window.wholesaleOrdersData.find(o => o.id === orderId);
    
    if (!order) {
        showNotification('Không tìm thấy đơn hàng để in', 'error');
        return;
    }
    
    // Get store information
    const storeData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
    const storeName = storeData.name || 'TẠP HÓA BÁNH BEO';
    const storeAddress = storeData.address || 'Địa chỉ: Phú yên';
    const storePhone = storeData.phone || '1234567898';
    const storeEmail = storeData.email || 'info@cuahang.com';
    
    // Get current date and time
    const now = new Date();
    const orderDate = order.orderDate || now.toLocaleDateString('vi-VN');
    const orderTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    // Create a printable HTML content with beautiful design
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hóa Đơn ${order.id}</title>
            <meta charset="UTF-8">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    background: white;
                    color: #333;
                    line-height: 1.4;
                }
                
                .invoice {
                    max-width: 800px;
                    margin: 20px auto;
                    padding: 30px;
                    background: white;
                    border: 1px solid #ddd;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #28a745;
                    padding-bottom: 20px;
                }
                
                .store-name {
                    font-size: 28px;
                    font-weight: bold;
                    color: #28a745;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                
                .store-info {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 5px;
                }
                
                .invoice-title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #333;
                    margin-top: 20px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .info-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    gap: 40px;
                }
                
                .info-box {
                    flex: 1;
                }
                
                .info-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #28a745;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                    border-bottom: 2px solid #28a745;
                    padding-bottom: 5px;
                }
                
                .info-row {
                    display: flex;
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                
                .info-label {
                    font-weight: bold;
                    min-width: 120px;
                    color: #333;
                }
                
                .info-value {
                    color: #666;
                }
                
                .products-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                    border: 2px solid #28a745;
                }
                
                .products-table thead {
                    background: #28a745;
                    color: white;
                }
                
                .products-table th {
                    padding: 15px 10px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 14px;
                    text-transform: uppercase;
                    border: 1px solid #fff;
                }
                
                .products-table td {
                    padding: 12px 10px;
                    border: 1px solid #ddd;
                    font-size: 14px;
                }
                
                .products-table tbody tr:nth-child(even) {
                    background: #f8f9fa;
                }
                
                .products-table tbody tr:hover {
                    background: #e8f5e8;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                
                .summary-section {
                    margin-top: 30px;
                    border-top: 2px solid #28a745;
                    padding-top: 20px;
                }
                
                .summary-table {
                    width: 100%;
                    max-width: 400px;
                    margin-left: auto;
                }
                
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    font-size: 14px;
                    border-bottom: 1px solid #eee;
                }
                
                .summary-label {
                    font-weight: bold;
                    color: #333;
                }
                
                .summary-value {
                    color: #666;
                    font-weight: 500;
                }
                
                .total-row {
                    border-top: 2px solid #28a745;
                    border-bottom: 3px double #28a745;
                    margin-top: 10px;
                    padding: 15px 0;
                    font-size: 18px;
                    font-weight: bold;
                }
                
                .total-row .summary-label {
                    color: #28a745;
                    font-size: 18px;
                }
                
                .total-row .summary-value {
                    color: #28a745;
                    font-size: 18px;
                    font-weight: bold;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 14px;
                }
                
                @media print {
                    body { margin: 0; }
                    .invoice { margin: 0; box-shadow: none; border: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice">
                <!-- Header -->
                <div class="header">
                    <div class="store-name">${storeName}</div>
                    <div class="store-info">Địa chỉ: ${storeAddress}</div>
                    <div class="store-info">Điện thoại: ${storePhone} | Email: ${storeEmail}</div>
                    <div class="invoice-title">HÓA ĐƠN BÁN LẺ</div>
                </div>
                
                <!-- Info Section -->
                <div class="info-section">
                    <div class="info-box">
                        <div class="info-title">Thông Tin Khách Hàng</div>
                        <div class="info-row">
                            <span class="info-label">Tên khách hàng:</span>
                            <span class="info-value">${order.customerName || 'Khách lẻ'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Số điện thoại:</span>
                            <span class="info-value">${order.customerPhone || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Địa chỉ:</span>
                            <span class="info-value">${order.customerAddress || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="info-box">
                        <div class="info-title">Thông Tin Đơn Hàng</div>
                        <div class="info-row">
                            <span class="info-label">Mã đơn hàng:</span>
                            <span class="info-value">${order.id}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Ngày đặt hàng:</span>
                            <span class="info-value">${order.orderDate || orderDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Ngày giao hàng:</span>
                            <span class="info-value">${order.deliveryDate || 'Chưa xác định'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Giờ in hóa đơn:</span>
                            <span class="info-value">${orderTime}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Trạng thái thanh toán:</span>
                            <span class="info-value">${order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentStatus === 'partial' ? 'Thanh toán 1 phần' : 'Chưa thanh toán'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Products Table -->
                <table class="products-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;">STT</th>
                            <th>Tên Sản Phẩm</th>
                            <th style="width: 100px;">Mã SKU</th>
                            <th style="width: 100px;">Số Lượng</th>
                            <th style="width: 120px;">Đơn Giá</th>
                            <th style="width: 120px;">Thành Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map((item, index) => {
                            const itemTotal = (item.quantity || 0) * (item.price || 0);
                            return `
                                <tr>
                                    <td class="text-center">${index + 1}</td>
                                    <td class="text-left">${item.productName || 'N/A'}</td>
                                    <td class="text-center">${item.sku || 'N/A'}</td>
                                    <td class="text-center">${item.quantity || 0} kg</td>
                                    <td class="text-right">${formatCurrency(item.price || 0)} VNĐ</td>
                                    <td class="text-right">${formatCurrency(itemTotal)} VNĐ</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <!-- Summary and Additional Info Section -->
                <div class="summary-section" style="margin-top: 30px; border-top: 2px solid #28a745; padding-top: 20px;">
                    <div style="display: flex; justify-content: space-between; gap: 40px;">
                        <!-- Additional Information (Left) -->
                        <div style="flex: 1;">
                            <div style="font-size: 16px; font-weight: bold; color: #28a745; margin-bottom: 15px; text-transform: uppercase; border-bottom: 2px solid #28a745; padding-bottom: 5px;">Thông Tin Khác</div>
                            <div style="font-size: 14px; margin-bottom: 8px;"><strong>NV bán hàng:</strong> ${order.staffName || 'Admin'}</div>
                            <div style="font-size: 14px; margin-bottom: 8px;"><strong>Thanh toán:</strong> ${order.paymentMethod || 'Tiền mặt'}</div>
                            ${order.notes && order.notes !== 'Không có ghi chú' ? `
                            <div style="margin-top: 15px;">
                                <div style="font-size: 14px; font-weight: bold; color: #28a745; margin-bottom: 8px;">Ghi Chú:</div>
                                <div style="font-size: 12px; color: #666; font-style: italic; background: #f9f9f9; padding: 8px; border-radius: 4px;">${order.notes}</div>
                            </div>` : ''}
                        </div>
                        
                        <!-- Summary (Right) -->
                        <div class="summary-table" style="width: 100%; max-width: 400px;">
                            <div class="summary-row">
                                <span class="summary-label">Tạm tính:</span>
                                <span class="summary-value">${formatCurrency(order.subtotal || 0)} VNĐ</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Giảm giá:</span>
                                <span class="summary-value">-${formatCurrency(order.discount || 0)} VNĐ</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Phí vận chuyển:</span>
                                <span class="summary-value">${formatCurrency(order.shipping || 0)} VNĐ</span>
                            </div>
                            <div class="summary-row total-row">
                                <span class="summary-label">TỔNG CỘNG:</span>
                                <span class="summary-value">${formatCurrency(order.total || 0)} VNĐ</span>
                            </div>
                            ${order.deposit && order.deposit > 0 ? `
                            <div class="summary-row" style="background: #e8f5e8; padding: 8px; border-radius: 4px; margin-top: 10px;">
                                <span class="summary-label" style="color: #28a745; font-weight: bold;">Tiền cọc đã trả:</span>
                                <span class="summary-value" style="color: #28a745; font-weight: bold;">${formatCurrency(order.deposit)} VNĐ</span>
                            </div>
                            <div class="summary-row" style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 5px;">
                                <span class="summary-label" style="color: #856404; font-weight: bold;">Còn lại phải trả:</span>
                                <span class="summary-value" style="color: #856404; font-weight: bold;">${formatCurrency((order.total || 0) - (order.deposit || 0))} VNĐ</span>
                            </div>
                            ${order.paymentStatus === 'partial' ? `
                            <div class="summary-row" style="background: #d1ecf1; padding: 8px; border-radius: 4px; margin-top: 5px; border: 2px solid #0c5460;">
                                <span class="summary-label" style="color: #0c5460; font-weight: bold; font-size: 14px;">TRẠNG THÁI:</span>
                                <span class="summary-value" style="color: #0c5460; font-weight: bold; font-size: 14px; text-transform: uppercase;">THANH TOÁN 1 PHẦN</span>
                            </div>` : ''}` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Signature Section -->
                <div class="signature-section" style="margin-top: 20px; display: flex; justify-content: space-between;">
                    <div style="text-align: center; width: 150px;">
                        <div style="border-bottom: 1px solid #333; margin-bottom: 5px; height: 50px;"></div>
                        <div style="font-size: 12px; font-weight: bold;">Ký khách hàng</div>
                    </div>
                    <div style="text-align: center; width: 150px;">
                        <div style="border-bottom: 1px solid #333; margin-bottom: 5px; height: 50px;"></div>
                        <div style="font-size: 12px; font-weight: bold;">Ký nhân viên</div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="footer" style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">
                    <p style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">Cảm ơn quý khách đã mua hàng!</p>
                    <p style="font-size: 11px; color: #666; margin-bottom: 2px;">Kiểm tra kỹ trước khi rời cửa hàng | Liên hệ: ${storePhone}</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Search wholesale orders
function searchWholesaleOrders() {
    console.log('=== searchWholesaleOrders called ===');
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearOrderSearchBtn');
    
    console.log('Search term:', searchTerm);
    
    if (searchTerm) {
        clearBtn.style.display = 'flex';
    } else {
        clearBtn.style.display = 'none';
    }
    
    // Use displayWholesaleOrders with search term for clean UI
    if (typeof displayWholesaleOrders === 'function') {
        displayWholesaleOrders(searchTerm);
    } else {
        console.error('displayWholesaleOrders function not available!');
    }
}

// Clear order search
function clearOrderSearch() {
    console.log('=== clearOrderSearch called ===');
    document.getElementById('orderSearch').value = '';
    document.getElementById('clearOrderSearchBtn').style.display = 'none';
    
    // Use displayWholesaleOrders without search term for clean UI
    if (typeof displayWholesaleOrders === 'function') {
        displayWholesaleOrders('');
    } else {
        console.error('displayWholesaleOrders function not available!');
    }
}

// Filter orders by date
function filterOrdersByDate(period) {
    // Remove active class from all filter buttons
    document.querySelectorAll('.btn-filter:not(.btn-clear-filter)').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Set current filter
    window.currentDateFilter = period;
    
    filterAndDisplayOrders();
}

// Clear all filters
function clearOrderFilters() {
    // Clear search
    document.getElementById('orderSearch').value = '';
    document.getElementById('clearOrderSearchBtn').style.display = 'none';
    
    // Remove active class from filter buttons
    document.querySelectorAll('.btn-filter:not(.btn-clear-filter)').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Clear date filter
    window.currentDateFilter = null;
    
    // Clear selection
    clearOrderSelection();
    
    filterAndDisplayOrders();
}

// Filter and display orders based on search and date filters
function filterAndDisplayOrders() {
    console.log('=== filterAndDisplayOrders called ===');
    
    // Use the most up-to-date data source
    let dataSource = window.wholesaleOrdersData;
    if (!dataSource || !Array.isArray(dataSource)) {
        // Fallback to global wholesaleOrdersData if window version is not available
        if (typeof wholesaleOrdersData !== 'undefined' && Array.isArray(wholesaleOrdersData)) {
            dataSource = wholesaleOrdersData;
            console.log('Using global wholesaleOrdersData as fallback');
        } else {
            console.log('No data source available');
            return;
        }
    }
    
    console.log('Data source has', dataSource.length, 'orders');
    
    if (dataSource.length === 0) {
        console.log('No orders to display');
        displayEmptyState();
        return;
    }
    
    // Function to display empty state
    function displayEmptyState() {
        const tbody = document.getElementById('wholesaleOrdersBody');
        const emptyState = document.getElementById('wholesaleEmptyState');
        
        if (tbody) tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    }
    
    const searchTerm = document.getElementById('orderSearch')?.value?.toLowerCase().trim() || '';
    const dateFilter = window.currentDateFilter;
    
    let filteredOrders = dataSource.filter(order => {
        // Search filter
        let matchesSearch = true;
        if (searchTerm) {
            const customerName = (order.customerName || '').toLowerCase();
            const customerPhone = (order.customerPhone || '').toLowerCase();
            const orderId = (order.id || '').toLowerCase();
            
            matchesSearch = customerName.includes(searchTerm) || 
                          customerPhone.includes(searchTerm) || 
                          orderId.includes(searchTerm);
        }
        
        // Date filter
        let matchesDate = true;
        if (dateFilter && order.orderDate) {
            const orderDate = new Date(order.orderDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            switch (dateFilter) {
                case 'today':
                    const todayEnd = new Date(today);
                    todayEnd.setHours(23, 59, 59, 999);
                    matchesDate = orderDate >= today && orderDate <= todayEnd;
                    break;
                    
                case 'thisWeek':
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    weekEnd.setHours(23, 59, 59, 999);
                    matchesDate = orderDate >= weekStart && orderDate <= weekEnd;
                    break;
                    
                case 'thisMonth':
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    monthEnd.setHours(23, 59, 59, 999);
                    matchesDate = orderDate >= monthStart && orderDate <= monthEnd;
                    break;
            }
        }
        
        return matchesSearch && matchesDate;
    });
    
    displayWholesaleOrders(filteredOrders);
}

// Toggle all order selection
function toggleAllOrderSelection() {
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkDeleteButton();
}

// Toggle individual order selection
function toggleOrderSelection() {
    updateBulkDeleteButton();
    
    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
    
    if (checkedBoxes.length === orderCheckboxes.length && orderCheckboxes.length > 0) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedBoxes.length > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

// Update bulk delete button state
function updateBulkDeleteButton() {
    const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const selectedCount = document.getElementById('selectedCount');
    
    if (checkedBoxes.length > 0) {
        bulkDeleteBtn.disabled = false;
        bulkDeleteBtn.classList.remove('disabled');
        selectedCount.textContent = `(${checkedBoxes.length})`;
    } else {
        bulkDeleteBtn.disabled = true;
        bulkDeleteBtn.classList.add('disabled');
        selectedCount.textContent = '';
    }
}

// Clear order selection
function clearOrderSelection() {
    document.getElementById('selectAllOrders').checked = false;
    document.getElementById('selectAllOrders').indeterminate = false;
    document.querySelectorAll('.order-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateBulkDeleteButton();
}

// Bulk delete orders
function bulkDeleteOrders() {
    const selectedOrders = getSelectedOrderIds();
    
    if (selectedOrders.length === 0) {
        showNotification('Vui lòng chọn ít nhất một đơn hàng để xóa', 'warning');
        return;
    }
    
    const confirmMessage = `Bạn có chắc chắn muốn xóa ${selectedOrders.length} đơn hàng đã chọn?\nHành động này không thể hoàn tác!`;
    
    if (confirm(confirmMessage)) {
        // Delete all selected orders from Firebase
        const deletePromises = selectedOrders.map(orderId => deleteOrderFromFirebase(orderId));
        
        Promise.all(deletePromises)
            .then(() => {
                // Remove selected orders from both data sources
                if (window.wholesaleOrdersData && Array.isArray(window.wholesaleOrdersData)) {
                    window.wholesaleOrdersData = window.wholesaleOrdersData.filter(order => 
                        !selectedOrders.includes(order.id)
                    );
                }
                
                // Also remove from global wholesaleOrdersData if it exists
                if (typeof wholesaleOrdersData !== 'undefined' && Array.isArray(wholesaleOrdersData)) {
                    wholesaleOrdersData = wholesaleOrdersData.filter(order => 
                        !selectedOrders.includes(order.id)
                    );
                }
                
                // Clear selection
                clearOrderSelection();
                
                // Refresh display - use the clean UI only
                if (typeof displayWholesaleOrders === 'function') {
                    displayWholesaleOrders();
                } else {
                    console.error('displayWholesaleOrders function not available!');
                }
                
                showNotification(`Đã xóa ${selectedOrders.length} đơn hàng thành công`, 'success');
                
                // Data is already saved to Firebase database - no need for localStorage
            })
            .catch(error => {
                console.error('Error deleting orders:', error);
                showNotification('Lỗi khi xóa đơn hàng: ' + error.message, 'error');
            });
    }
}

// Delete order from Firebase
function deleteOrderFromFirebase(orderId) {
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    
    if (!selectedStoreId) {
        console.error('No store selected');
        return Promise.reject('No store selected');
    }
    
    if (!window.database) {
        console.error('Firebase database not available');
        return Promise.reject('Firebase database not available');
    }
    
    console.log('Deleting order from Firebase:', orderId);
    
    return window.database.ref(`stores/${selectedStoreId}/orders/${orderId}`)
        .remove()
        .then(() => {
            console.log('Order deleted from Firebase successfully:', orderId);
        })
        .catch(error => {
            console.error('Error deleting order from Firebase:', error);
            throw error;
        });
}

// Delete single order
function deleteWholesaleOrder(orderId) {
    console.log('=== deleteWholesaleOrder called ===', orderId);
    console.log('Current data before delete:', {
        windowData: window.wholesaleOrdersData ? window.wholesaleOrdersData.length : 'undefined',
        globalData: typeof wholesaleOrdersData !== 'undefined' ? wholesaleOrdersData.length : 'undefined'
    });
    
    if (confirm('Bạn có chắc chắn muốn xóa đơn hàng này?\nHành động này không thể hoàn tác!')) {
        // First delete from Firebase
        deleteOrderFromFirebase(orderId)
            .then(() => {
                console.log('Firebase delete successful, updating local data...');
                
                // Remove order from both data sources
                const beforeWindow = window.wholesaleOrdersData ? window.wholesaleOrdersData.length : 0;
                const beforeGlobal = typeof wholesaleOrdersData !== 'undefined' ? wholesaleOrdersData.length : 0;
                
                if (window.wholesaleOrdersData && Array.isArray(window.wholesaleOrdersData)) {
                    window.wholesaleOrdersData = window.wholesaleOrdersData.filter(order => 
                        order.id !== orderId
                    );
                    console.log('Window data updated:', beforeWindow, '->', window.wholesaleOrdersData.length);
                }
                
                // Also remove from global wholesaleOrdersData if it exists
                if (typeof wholesaleOrdersData !== 'undefined' && Array.isArray(wholesaleOrdersData)) {
                    wholesaleOrdersData = wholesaleOrdersData.filter(order => 
                        order.id !== orderId
                    );
                    console.log('Global data updated:', beforeGlobal, '->', wholesaleOrdersData.length);
                }
                
                console.log('Data after delete:', {
                    windowData: window.wholesaleOrdersData ? window.wholesaleOrdersData.length : 'undefined',
                    globalData: typeof wholesaleOrdersData !== 'undefined' ? wholesaleOrdersData.length : 'undefined'
                });
                
                // Refresh display - use the clean UI only
                console.log('Refreshing display...');
                if (typeof displayWholesaleOrders === 'function') {
                    console.log('Using displayWholesaleOrders (clean UI)');
                    displayWholesaleOrders();
                } else {
                    console.error('displayWholesaleOrders function not available!');
                }
                
                showNotification('Đã xóa đơn hàng thành công', 'success');
                
                // Data is already saved to Firebase database - no need for localStorage
            })
            .catch(error => {
                console.error('Error deleting order from Firebase:', error);
                showNotification('Lỗi khi xóa đơn hàng: ' + error.message, 'error');
            });
    }
}

// Edit wholesale order (placeholder function)
function editWholesaleOrder(orderId) {
    showNotification('Chức năng chỉnh sửa đang được phát triển', 'info');
    console.log('Edit order:', orderId);
}

// Export functions to global scope
window.viewWholesaleOrderDetails = viewWholesaleOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.printWholesaleInvoice = printWholesaleInvoice;
window.getPaymentStatusBadge = getPaymentStatusBadge;
window.searchWholesaleOrders = searchWholesaleOrders;
window.clearOrderSearch = clearOrderSearch;
window.filterOrdersByDate = filterOrdersByDate;
window.clearOrderFilters = clearOrderFilters;
window.toggleAllOrderSelection = toggleAllOrderSelection;
window.toggleOrderSelection = toggleOrderSelection;
window.bulkDeleteOrders = bulkDeleteOrders;
window.deleteWholesaleOrder = deleteWholesaleOrder;
window.editWholesaleOrder = editWholesaleOrder;
window.displayWholesaleOrders = displayWholesaleOrders;

console.log('Wholesale orders functions updated with search, filter, and delete functionality');
