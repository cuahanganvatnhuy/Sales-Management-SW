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

// View wholesale order details - Clean implementation
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
                <tr style="border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;" 
                    onmouseover="this.style.backgroundColor='#f8fafc'" 
                    onmouseout="this.style.backgroundColor=''">
                    <td style="padding: 15px; font-weight: 600; color: #374151;">${item.productName || 'N/A'}</td>
                    <td style="padding: 15px; text-align: center; color: #6b7280; font-family: monospace;">${item.sku || 'N/A'}</td>
                    <td style="padding: 15px; text-align: center; font-weight: 600; color: #059669;">${item.quantity || 0} kg</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600; color: #3b82f6;">${formatCurrency(item.price || 0)} VNĐ</td>
                    <td style="padding: 15px; text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(itemTotal)} VNĐ</td>
                </tr>
            `;
        });
    } else {
        itemsHtml = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #6b7280;">Không có sản phẩm</td></tr>';
    }
    
    // Get payment status display
    const paymentStatus = order.paymentStatus || 'pending';
    let statusBadge = '';
    switch (paymentStatus) {
        case 'paid':
            statusBadge = '<span style="background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">Đã Thanh Toán</span>';
            break;
        case 'partial':
            statusBadge = '<span style="background: #f59e0b; color: white; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">Thanh Toán 1 Phần</span>';
            break;
        default:
            statusBadge = '<span style="background: #ef4444; color: white; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">Chưa Thanh Toán</span>';
    }
    
    // Create modal HTML
    const modalHtml = `
        <div id="wholesaleOrderModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        " onclick="closeOrderDetailsModal()">
            <div style="
                background: white;
                border-radius: 20px;
                width: 90%;
                max-width: 900px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalFadeIn 0.3s ease-out;
            " onclick="event.stopPropagation()">
                <style>
                    @keyframes modalFadeIn {
                        from { opacity: 0; transform: scale(0.9); }
                        to { opacity: 1; transform: scale(1); }
                    }
                </style>
                
                <!-- Modal Header -->
                <div style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 25px 30px;
                    border-radius: 20px 20px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="
                            width: 50px;
                            height: 50px;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                        ">📋</div>
                        <div>
                            <h3 style="margin: 0; font-size: 22px; font-weight: 700;">Chi Tiết Đơn Hàng Bán Sỉ</h3>
                            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Mã: <strong>${order.id}</strong></p>
                        </div>
                    </div>
                    <button onclick="closeOrderDetailsModal()" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 16px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✕</button>
                </div>
                
                <!-- Modal Body -->
                <div style="padding: 30px;">
                    <!-- Customer & Order Info -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px;">
                        <!-- Customer Info -->
                        <div style="
                            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                            padding: 20px;
                            border-radius: 15px;
                            border-left: 4px solid #3b82f6;
                        ">
                            <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                                👤 Thông Tin Khách Hàng
                            </h4>
                            <div style="space-y: 8px;">
                                <p style="margin: 8px 0; color: #475569;"><strong>Tên:</strong> ${order.customerName || 'N/A'}</p>
                                <p style="margin: 8px 0; color: #475569;"><strong>SĐT:</strong> ${order.customerPhone || 'N/A'}</p>
                                <p style="margin: 8px 0; color: #475569;"><strong>Địa chỉ:</strong> ${order.customerAddress || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <!-- Order Info -->
                        <div style="
                            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                            padding: 20px;
                            border-radius: 15px;
                            border-left: 4px solid #10b981;
                        ">
                            <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                                📦 Thông Tin Đơn Hàng
                            </h4>
                            <div style="space-y: 8px;">
                                <p style="margin: 8px 0; color: #475569;"><strong>Ngày đặt:</strong> ${order.orderDate || 'N/A'}</p>
                                <p style="margin: 8px 0; color: #475569;"><strong>Ngày giao:</strong> ${order.deliveryDate || 'N/A'}</p>
                                <p style="margin: 8px 0; color: #475569; display: flex; align-items: center; gap: 8px;"><strong>Trạng thái:</strong> ${statusBadge}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Products Table -->
                    <div style="margin-bottom: 30px;">
                        <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                            🛍️ Danh Sách Sản Phẩm
                        </h4>
                        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                        <th style="padding: 15px; text-align: left; font-weight: 600;">Sản Phẩm</th>
                                        <th style="padding: 15px; text-align: center; font-weight: 600;">SKU</th>
                                        <th style="padding: 15px; text-align: center; font-weight: 600;">Số Lượng</th>
                                        <th style="padding: 15px; text-align: right; font-weight: 600;">Đơn Giá</th>
                                        <th style="padding: 15px; text-align: right; font-weight: 600;">Thành Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Order Summary -->
                    <div style="margin-bottom: 30px;">
                        <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                            💰 Tổng Kết Đơn Hàng
                        </h4>
                        <div style="
                            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                            padding: 20px;
                            border-radius: 12px;
                            border-left: 4px solid #f59e0b;
                        ">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                                    <span style="font-weight: 600; color: #92400e;">Tạm tính:</span>
                                    <span style="font-weight: 700; color: #92400e;">${formatCurrency(subtotal)} VNĐ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                                    <span style="font-weight: 600; color: #92400e;">Giảm giá:</span>
                                    <span style="font-weight: 700; color: #dc2626;">-${formatCurrency(discount)} VNĐ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                                    <span style="font-weight: 600; color: #92400e;">Phí vận chuyển:</span>
                                    <span style="font-weight: 700; color: #92400e;">${formatCurrency(shipping)} VNĐ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                                    <span style="font-weight: 600; color: #92400e;">Tiền cọc:</span>
                                    <span style="font-weight: 700; color: #10b981;">${formatCurrency(deposit)} VNĐ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #f59e0b; margin-top: 10px;">
                                    <span style="font-weight: 700; color: #92400e; font-size: 16px;">Tổng cộng:</span>
                                    <span style="font-weight: 800; color: #dc2626; font-size: 18px;">${formatCurrency(total)} VNĐ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                    <span style="font-weight: 700; color: #92400e; font-size: 16px;">Còn lại:</span>
                                    <span style="font-weight: 800; color: #ef4444; font-size: 18px;">${formatCurrency(remaining)} VNĐ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                        <button onclick="printWholesaleInvoice('${order.id}')" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 10px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(16, 185, 129, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow=''">
                            🖨️ In Hóa Đơn
                        </button>
                        
                        <button onclick="closeOrderDetailsModal()" style="
                            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 10px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(107, 114, 128, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow=''">
                            ❌ Đóng
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
    
    // Create a printable HTML content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hóa Đơn ${order.id}</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .invoice { max-width: 800px; margin: 0 auto; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .total { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="invoice">
                <h2>Hóa Đơn Bán Sỉ</h2>
                <p><strong>Mã đơn hàng:</strong> ${order.id}</p>
                <p><strong>Khách hàng:</strong> ${order.customerName}</p>
                <p><strong>Số điện thoại:</strong> ${order.customerPhone || 'N/A'}</p>
                <p><strong>Địa chỉ:</strong> ${order.customerAddress || 'N/A'}</p>
                <p><strong>Ngày đặt:</strong> ${order.orderDate}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th>SKU</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.productName}</td>
                                <td>${item.sku || 'N/A'}</td>
                                <td>${item.quantity} kg</td>
                                <td>${formatCurrency(item.price)} VNĐ</td>
                                <td>${formatCurrency(item.quantity * item.price)} VNĐ</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="total">
                    <p>Tạm tính: ${formatCurrency(order.subtotal || 0)} VNĐ</p>
                    <p>Giảm giá: ${formatCurrency(order.discount || 0)} VNĐ</p>
                    <p>Phí vận chuyển: ${formatCurrency(order.shipping || 0)} VNĐ</p>
                    <p>Tổng cộng: ${formatCurrency(order.total || 0)} VNĐ</p>
                    <p>Tiền cọc: ${formatCurrency(order.deposit || 0)} VNĐ</p>
                    <p>Còn lại: ${formatCurrency(order.total - (order.deposit || 0))} VNĐ</p>
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

// Export functions to global scope
window.viewWholesaleOrderDetails = viewWholesaleOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.printWholesaleInvoice = printWholesaleInvoice;
window.getPaymentStatusBadge = getPaymentStatusBadge;

console.log('Clean wholesale orders functions loaded successfully');
