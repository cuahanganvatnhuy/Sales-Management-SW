// New Wholesale Orders Management System
// Tạo và quản lý đơn hàng bán sỉ

let wholesaleOrdersData = [];
let wholesaleItemCounter = 0;

// Initialize wholesale orders system
function initWholesaleOrders() {
    console.log('Initializing wholesale orders system...');
    
    // Set current date
    const now = new Date();
    document.getElementById('wholesaleOrderDate').value = now.toISOString().split('T')[0];
    
    // Add first item
    addWholesaleItem();
    
    // Load existing orders
    loadWholesaleOrders();
}

// Add new wholesale item
function addWholesaleItem() {
    wholesaleItemCounter++;
    const container = document.getElementById('wholesaleItemsContainer');
    
    const itemHTML = `
        <div class="wholesale-item" id="wholesaleItem${wholesaleItemCounter}">
            <div class="wholesale-item-header">
                <span class="wholesale-item-number">Sản phẩm ${wholesaleItemCounter}</span>
                <button type="button" class="wholesale-remove-btn" onclick="removeWholesaleItem(${wholesaleItemCounter})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="wholesale-form-row">
                <div class="wholesale-form-group">
                    <label>Tên Sản Phẩm *</label>
                    <select class="wholesale-product-select" onchange="updateWholesaleItemPrice(${wholesaleItemCounter})" required>
                        <option value="">Chọn sản phẩm</option>
                        ${generateProductOptions()}
                    </select>
                </div>
                <div class="wholesale-form-group">
                    <label>Số Lượng (kg) *</label>
                    <input type="number" class="wholesale-quantity" min="0.1" step="0.1" value="10" 
                           onchange="updateWholesaleItemTotal(${wholesaleItemCounter})" required>
                </div>
            </div>
            <div class="wholesale-form-row">
                <div class="wholesale-form-group">
                    <label>Giá Bán (VNĐ) *</label>
                    <input type="number" class="wholesale-price" min="0" value="0" 
                           onchange="updateWholesaleItemTotal(${wholesaleItemCounter})" required>
                </div>
                <div class="wholesale-form-group">
                    <label>Thành Tiền</label>
                    <div class="wholesale-item-total">0 VNĐ</div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHTML);
    updateWholesaleSummary();
}

// Remove wholesale item
function removeWholesaleItem(itemId) {
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (item) {
        item.remove();
        updateWholesaleSummary();
        
        // If no items left, add one
        const container = document.getElementById('wholesaleItemsContainer');
        if (container.children.length === 0) {
            addWholesaleItem();
        }
    }
}

// Update item price based on selected product
function updateWholesaleItemPrice(itemId) {
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (!item) return;
    
    const productSelect = item.querySelector('.wholesale-product-select');
    const priceInput = item.querySelector('.wholesale-price');
    const selectedProductId = productSelect.value;
    
    if (selectedProductId && window.productsData && window.productsData[selectedProductId]) {
        const product = window.productsData[selectedProductId];
        // Use wholesale price (usually lower than retail)
        const wholesalePrice = product.wholesalePrice || (product.price * 0.8); // 20% discount for wholesale
        priceInput.value = Math.round(wholesalePrice);
        updateWholesaleItemTotal(itemId);
    }
}

// Update item total
function updateWholesaleItemTotal(itemId) {
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (!item) return;
    
    const quantity = parseFloat(item.querySelector('.wholesale-quantity').value) || 0;
    const price = parseInt(item.querySelector('.wholesale-price').value) || 0;
    const total = quantity * price;
    
    item.querySelector('.wholesale-item-total').textContent = formatCurrency(total) + ' VNĐ';
    updateWholesaleSummary();
}

// Update order summary
function updateWholesaleSummary() {
    const items = document.querySelectorAll('.wholesale-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.wholesale-quantity').value) || 0;
        const price = parseInt(item.querySelector('.wholesale-price').value) || 0;
        subtotal += quantity * price;
    });
    
    const discount = parseInt(document.getElementById('wholesaleDiscount').value) || 0;
    const shipping = parseInt(document.getElementById('wholesaleShipping').value) || 0;
    const deposit = parseInt(document.getElementById('wholesaleDeposit').value) || 0;
    
    const total = subtotal - discount + shipping;
    const remaining = total - deposit;
    
    document.getElementById('wholesaleSubtotal').textContent = formatCurrency(subtotal) + ' VNĐ';
    document.getElementById('wholesaleTotal').textContent = formatCurrency(total) + ' VNĐ';
    document.getElementById('wholesaleRemaining').textContent = formatCurrency(remaining) + ' VNĐ';
}

// Generate product options
function generateProductOptions() {
    if (!window.productsData) {
        return '<option value="">Đang tải sản phẩm...</option>';
    }
    
    let options = '';
    for (const [id, product] of Object.entries(window.productsData)) {
        options += `<option value="${id}">${product.name} - ${product.sku}</option>`;
    }
    return options;
}

// Create wholesale order
function createWholesaleOrder(event) {
    event.preventDefault();
    
    // Show loading
    showLoading();
    
    try {
        // Get form data
        const formData = {
            customerName: document.getElementById('wholesaleCustomerName').value.trim(),
            customerPhone: document.getElementById('wholesaleCustomerPhone').value.trim(),
            customerAddress: document.getElementById('wholesaleCustomerAddress').value.trim(),
            orderDate: document.getElementById('wholesaleOrderDate').value,
            deliveryDate: document.getElementById('wholesaleDeliveryDate').value,
            items: [],
            discount: parseInt(document.getElementById('wholesaleDiscount').value) || 0,
            shipping: parseInt(document.getElementById('wholesaleShipping').value) || 0,
            deposit: parseInt(document.getElementById('wholesaleDeposit').value) || 0
        };
        
        // Validate required fields
        if (!formData.customerName) {
            throw new Error('Vui lòng nhập tên khách hàng');
        }
        
        if (!formData.orderDate) {
            throw new Error('Vui lòng nhập ngày đặt hàng');
        }
        
        // Get items data
        const items = document.querySelectorAll('.wholesale-item');
        items.forEach((item, index) => {
            const productSelect = item.querySelector('.wholesale-product-select');
            const quantity = parseFloat(item.querySelector('.wholesale-quantity').value) || 0;
            const price = parseInt(item.querySelector('.wholesale-price').value) || 0;
            
            if (!productSelect.value) {
                throw new Error(`Vui lòng chọn sản phẩm cho mục ${index + 1}`);
            }
            
            if (quantity <= 0) {
                throw new Error(`Số lượng sản phẩm ${index + 1} phải lớn hơn 0`);
            }
            
            if (price <= 0) {
                throw new Error(`Giá bán sản phẩm ${index + 1} phải lớn hơn 0`);
            }
            
            const product = window.productsData[productSelect.value];
            formData.items.push({
                productId: productSelect.value,
                productName: product.name,
                sku: product.sku,
                quantity: quantity,
                price: price,
                total: quantity * price
            });
        });
        
        if (formData.items.length === 0) {
            throw new Error('Vui lòng thêm ít nhất một sản phẩm');
        }
        
        // Calculate totals
        const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal - formData.discount + formData.shipping;
        const remaining = total - formData.deposit;
        
        // Determine payment status
        let paymentStatus = 'pending';
        if (formData.deposit >= total) {
            paymentStatus = 'paid';
        } else if (formData.deposit > 0) {
            paymentStatus = 'partial';
        }
        
        // Create order object
        const order = {
            id: 'wholesale_' + Date.now(),
            type: 'wholesale',
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            customerAddress: formData.customerAddress,
            orderDate: formData.orderDate,
            deliveryDate: formData.deliveryDate,
            items: formData.items,
            subtotal: subtotal,
            discount: formData.discount,
            shipping: formData.shipping,
            deposit: formData.deposit,
            total: total,
            remaining: remaining,
            paymentStatus: paymentStatus,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        
        // Save to Firebase
        saveWholesaleOrderToFirebase(order);
        
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

// Save order to Firebase
function saveWholesaleOrderToFirebase(order) {
    if (!window.database) {
        hideLoading();
        showNotification('Lỗi kết nối cơ sở dữ liệu', 'error');
        return;
    }
    
    const ordersRef = window.database.ref('orders/' + order.id);
    
    ordersRef.set(order)
        .then(() => {
            hideLoading();
            showNotification('Tạo đơn hàng bán sỉ thành công!', 'success');
            
            // Add to local data
            wholesaleOrdersData.unshift(order);
            
            // Refresh orders list
            displayWholesaleOrders();
            
            // Clear form
            clearWholesaleForm();
        })
        .catch((error) => {
            hideLoading();
            console.error('Error saving order:', error);
            showNotification('Lỗi khi lưu đơn hàng: ' + error.message, 'error');
        });
}

// Clear form
function clearWholesaleForm() {
    // Reset form fields
    document.getElementById('wholesaleCustomerName').value = '';
    document.getElementById('wholesaleCustomerPhone').value = '';
    document.getElementById('wholesaleCustomerAddress').value = '';
    document.getElementById('wholesaleDeliveryDate').value = '';
    document.getElementById('wholesaleDiscount').value = '0';
    document.getElementById('wholesaleShipping').value = '0';
    document.getElementById('wholesaleDeposit').value = '0';
    
    // Set current date
    const now = new Date();
    document.getElementById('wholesaleOrderDate').value = now.toISOString().split('T')[0];
    
    // Clear items
    document.getElementById('wholesaleItemsContainer').innerHTML = '';
    wholesaleItemCounter = 0;
    
    // Add first item
    addWholesaleItem();
    
    // Update summary
    updateWholesaleSummary();
}

// Load wholesale orders from Firebase
function loadWholesaleOrders() {
    if (!window.database) {
        console.error('Database not initialized');
        return;
    }
    
    const ordersRef = window.database.ref('orders');
    
    ordersRef.orderByChild('type').equalTo('wholesale').on('value', (snapshot) => {
        wholesaleOrdersData = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                wholesaleOrdersData.push(order);
            });
            
            // Sort by creation date (newest first)
            wholesaleOrdersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        displayWholesaleOrders();
    });
}

// Display wholesale orders
function displayWholesaleOrders() {
    const tbody = document.getElementById('wholesaleOrdersBody');
    const emptyState = document.getElementById('wholesaleEmptyState');
    
    if (wholesaleOrdersData.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    wholesaleOrdersData.forEach((order, index) => {
        const itemsText = order.items.map(item => `${item.productName} (${item.quantity}kg)`).join(', ');
        const statusBadge = getPaymentStatusBadge(order.paymentStatus);
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${order.customerName}</td>
                <td>${order.customerPhone || 'N/A'}</td>
                <td>${order.orderDate}</td>
                <td title="${itemsText}">${itemsText.length > 40 ? itemsText.substring(0, 40) + '...' : itemsText}</td>
                <td><strong>${formatCurrency(order.total)} VNĐ</strong></td>
                <td>${formatCurrency(order.deposit)} VNĐ</td>
                <td>${formatCurrency(order.remaining)} VNĐ</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="wholesale-btn wholesale-btn-secondary wholesale-btn-small" onclick="viewWholesaleOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="wholesale-btn wholesale-btn-success wholesale-btn-small" onclick="updatePayment('${order.id}')">
                        <i class="fas fa-dollar-sign"></i>
                    </button>
                    <button class="wholesale-btn wholesale-btn-danger wholesale-btn-small" onclick="deleteWholesaleOrder('${order.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

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

// View wholesale order details
function viewWholesaleOrder(orderId) {
    const order = wholesaleOrdersData.find(o => o.id === orderId);
    if (!order) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    
    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td>${item.productName}</td>
                <td>${item.sku}</td>
                <td>${item.quantity} kg</td>
                <td>${formatCurrency(item.price)} VNĐ</td>
                <td>${formatCurrency(item.total)} VNĐ</td>
            </tr>
        `;
    });
    
    const modalHtml = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Chi Tiết Đơn Hàng Bán Sỉ</h3>
                    <button class="modal-close" onclick="closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="order-info">
                        <h4>Thông Tin Khách Hàng</h4>
                        <p><strong>Tên:</strong> ${order.customerName}</p>
                        <p><strong>Số điện thoại:</strong> ${order.customerPhone || 'N/A'}</p>
                        <p><strong>Địa chỉ:</strong> ${order.customerAddress || 'N/A'}</p>
                        <p><strong>Ngày đặt hàng:</strong> ${order.orderDate}</p>
                        <p><strong>Ngày giao hàng:</strong> ${order.deliveryDate || 'Chưa xác định'}</p>
                    </div>
                    
                    <div class="order-items">
                        <h4>Sản Phẩm</h4>
                        <table class="modal-table">
                            <thead>
                                <tr>
                                    <th>Sản Phẩm</th>
                                    <th>SKU</th>
                                    <th>Số Lượng</th>
                                    <th>Giá</th>
                                    <th>Thành Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="order-summary">
                        <h4>Tổng Kết</h4>
                        <p><strong>Tạm tính:</strong> ${formatCurrency(order.subtotal)} VNĐ</p>
                        <p><strong>Giảm giá:</strong> ${formatCurrency(order.discount)} VNĐ</p>
                        <p><strong>Phí vận chuyển:</strong> ${formatCurrency(order.shipping)} VNĐ</p>
                        <p class="total"><strong>Tổng cộng:</strong> ${formatCurrency(order.total)} VNĐ</p>
                        <p class="deposit"><strong>Tiền cọc:</strong> ${formatCurrency(order.deposit)} VNĐ</p>
                        <p class="remaining"><strong>Còn phải trả:</strong> ${formatCurrency(order.remaining)} VNĐ</p>
                        <p><strong>Trạng thái:</strong> ${getPaymentStatusBadge(order.paymentStatus)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Update payment
function updatePayment(orderId) {
    const order = wholesaleOrdersData.find(o => o.id === orderId);
    if (!order) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    
    const newPayment = prompt(`Nhập số tiền thanh toán thêm (hiện tại: ${formatCurrency(order.deposit)} VNĐ):`);
    if (newPayment === null) return;
    
    const paymentAmount = parseInt(newPayment) || 0;
    if (paymentAmount <= 0) {
        showNotification('Số tiền thanh toán phải lớn hơn 0', 'error');
        return;
    }
    
    const newDeposit = order.deposit + paymentAmount;
    const newRemaining = order.total - newDeposit;
    
    let newPaymentStatus = 'pending';
    if (newDeposit >= order.total) {
        newPaymentStatus = 'paid';
    } else if (newDeposit > 0) {
        newPaymentStatus = 'partial';
    }
    
    // Update order
    const updatedOrder = {
        ...order,
        deposit: newDeposit,
        remaining: Math.max(0, newRemaining),
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString()
    };
    
    // Save to Firebase
    showLoading();
    const orderRef = window.database.ref('orders/' + orderId);
    orderRef.set(updatedOrder)
        .then(() => {
            hideLoading();
            showNotification('Cập nhật thanh toán thành công!', 'success');
        })
        .catch((error) => {
            hideLoading();
            console.error('Error updating payment:', error);
            showNotification('Lỗi khi cập nhật thanh toán: ' + error.message, 'error');
        });
}

// Delete wholesale order
function deleteWholesaleOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
        return;
    }
    
    showLoading();
    
    const orderRef = window.database.ref('orders/' + orderId);
    orderRef.remove()
        .then(() => {
            hideLoading();
            showNotification('Xóa đơn hàng thành công!', 'success');
            
            // Remove from local data
            wholesaleOrdersData = wholesaleOrdersData.filter(order => order.id !== orderId);
            displayWholesaleOrders();
        })
        .catch((error) => {
            hideLoading();
            console.error('Error deleting order:', error);
            showNotification('Lỗi khi xóa đơn hàng: ' + error.message, 'error');
        });
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const messageSpan = notification.querySelector('.notification-message');
    
    // Set icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    icon.className = `notification-icon ${iconClass}`;
    messageSpan.textContent = message;
    
    // Set notification type class
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

// Export functions to global scope
window.initWholesaleOrders = initWholesaleOrders;
window.addWholesaleItem = addWholesaleItem;
window.removeWholesaleItem = removeWholesaleItem;
window.updateWholesaleItemPrice = updateWholesaleItemPrice;
window.updateWholesaleItemTotal = updateWholesaleItemTotal;
window.updateWholesaleSummary = updateWholesaleSummary;
window.createWholesaleOrder = createWholesaleOrder;
window.clearWholesaleForm = clearWholesaleForm;
window.viewWholesaleOrder = viewWholesaleOrder;
window.updatePayment = updatePayment;
window.deleteWholesaleOrder = deleteWholesaleOrder;
window.closeModal = closeModal;