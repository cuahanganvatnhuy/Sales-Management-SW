// New Retail Orders Management System
// Tạo và quản lý đơn hàng bán lẻ

let retailOrdersData = [];
let retailItemCounter = 0;

// Initialize retail orders system
function initRetailOrders() {
    console.log('Initializing retail orders system...');
    
    // Set current date and time
    const now = new Date();
    document.getElementById('retailOrderDate').value = now.toISOString().split('T')[0];
    document.getElementById('retailOrderTime').value = now.toTimeString().slice(0, 5);
    
    // Add first item
    addRetailItem();
    
    // Load existing orders
    loadRetailOrders();
}

// Add new retail item
function addRetailItem() {
    retailItemCounter++;
    const container = document.getElementById('retailItemsContainer');
    
    const itemHTML = `
        <div class="retail-item" id="retailItem${retailItemCounter}">
            <div class="retail-item-header">
                <span class="retail-item-number">Sản phẩm ${retailItemCounter}</span>
                <button type="button" class="retail-remove-btn" onclick="removeRetailItem(${retailItemCounter})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="retail-form-row">
                <div class="retail-form-group">
                    <label>Tên Sản Phẩm *</label>
                    <select class="retail-product-select" onchange="updateRetailItemPrice(${retailItemCounter})" required>
                        <option value="">Chọn sản phẩm</option>
                        ${generateProductOptions()}
                    </select>
                </div>
                <div class="retail-form-group">
                    <label>Số Lượng (kg) *</label>
                    <input type="number" class="retail-quantity" min="0.1" step="0.1" value="1" 
                           onchange="updateRetailItemTotal(${retailItemCounter})" required>
                </div>
            </div>
            <div class="retail-form-row">
                <div class="retail-form-group">
                    <label>Giá Bán (VNĐ) *</label>
                    <input type="number" class="retail-price" min="0" value="0" 
                           onchange="updateRetailItemTotal(${retailItemCounter})" required>
                </div>
                <div class="retail-form-group">
                    <label>Thành Tiền</label>
                    <div class="retail-item-total">0 VNĐ</div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHTML);
    updateRetailSummary();
}

// Remove retail item
function removeRetailItem(itemId) {
    const item = document.getElementById(`retailItem${itemId}`);
    if (item) {
        item.remove();
        updateRetailSummary();
        
        // If no items left, add one
        const container = document.getElementById('retailItemsContainer');
        if (container.children.length === 0) {
            addRetailItem();
        }
    }
}

// Update item price based on selected product
function updateRetailItemPrice(itemId) {
    const item = document.getElementById(`retailItem${itemId}`);
    if (!item) return;
    
    const productSelect = item.querySelector('.retail-product-select');
    const priceInput = item.querySelector('.retail-price');
    const selectedProductId = productSelect.value;
    
    if (selectedProductId && window.productsData && window.productsData[selectedProductId]) {
        const product = window.productsData[selectedProductId];
        priceInput.value = product.price || 0;
        updateRetailItemTotal(itemId);
    }
}

// Update item total
function updateRetailItemTotal(itemId) {
    const item = document.getElementById(`retailItem${itemId}`);
    if (!item) return;
    
    const quantity = parseFloat(item.querySelector('.retail-quantity').value) || 0;
    const price = parseInt(item.querySelector('.retail-price').value) || 0;
    const total = quantity * price;
    
    item.querySelector('.retail-item-total').textContent = formatCurrency(total) + ' VNĐ';
    updateRetailSummary();
}

// Update order summary
function updateRetailSummary() {
    const items = document.querySelectorAll('.retail-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.retail-quantity').value) || 0;
        const price = parseInt(item.querySelector('.retail-price').value) || 0;
        subtotal += quantity * price;
    });
    
    const discount = parseInt(document.getElementById('retailDiscount').value) || 0;
    const shipping = parseInt(document.getElementById('retailShipping').value) || 0;
    const total = subtotal - discount + shipping;
    
    document.getElementById('retailSubtotal').textContent = formatCurrency(subtotal) + ' VNĐ';
    document.getElementById('retailTotal').textContent = formatCurrency(total) + ' VNĐ';
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

// Create retail order
function createRetailOrder(event) {
    event.preventDefault();
    
    // Show loading
    showLoading();
    
    try {
        // Get form data
        const formData = {
            customerName: document.getElementById('retailCustomerName').value.trim(),
            customerPhone: document.getElementById('retailCustomerPhone').value.trim(),
            orderDate: document.getElementById('retailOrderDate').value,
            orderTime: document.getElementById('retailOrderTime').value,
            items: [],
            discount: parseInt(document.getElementById('retailDiscount').value) || 0,
            shipping: parseInt(document.getElementById('retailShipping').value) || 0
        };
        
        // Validate required fields
        if (!formData.customerName) {
            throw new Error('Vui lòng nhập tên khách hàng');
        }
        
        if (!formData.orderDate || !formData.orderTime) {
            throw new Error('Vui lòng nhập ngày và giờ bán');
        }
        
        // Get items data
        const items = document.querySelectorAll('.retail-item');
        items.forEach((item, index) => {
            const productSelect = item.querySelector('.retail-product-select');
            const quantity = parseFloat(item.querySelector('.retail-quantity').value) || 0;
            const price = parseInt(item.querySelector('.retail-price').value) || 0;
            
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
        
        // Create order object
        const order = {
            id: 'retail_' + Date.now(),
            type: 'retail',
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            orderDate: formData.orderDate,
            orderTime: formData.orderTime,
            items: formData.items,
            subtotal: subtotal,
            discount: formData.discount,
            shipping: formData.shipping,
            total: total,
            createdAt: new Date().toISOString(),
            status: 'completed'
        };
        
        // Save to Firebase
        saveRetailOrderToFirebase(order);
        
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

// Save order to Firebase
function saveRetailOrderToFirebase(order) {
    if (!window.database) {
        hideLoading();
        showNotification('Lỗi kết nối cơ sở dữ liệu', 'error');
        return;
    }
    
    const ordersRef = window.database.ref('orders/' + order.id);
    
    ordersRef.set(order)
        .then(() => {
            hideLoading();
            showNotification('Tạo đơn hàng bán lẻ thành công!', 'success');
            
            // Add to local data
            retailOrdersData.unshift(order);
            
            // Refresh orders list
            displayRetailOrders();
            
            // Clear form
            clearRetailForm();
        })
        .catch((error) => {
            hideLoading();
            console.error('Error saving order:', error);
            showNotification('Lỗi khi lưu đơn hàng: ' + error.message, 'error');
        });
}

// Clear form
function clearRetailForm() {
    // Reset form fields
    document.getElementById('retailCustomerName').value = '';
    document.getElementById('retailCustomerPhone').value = '';
    document.getElementById('retailDiscount').value = '0';
    document.getElementById('retailShipping').value = '0';
    
    // Set current date and time
    const now = new Date();
    document.getElementById('retailOrderDate').value = now.toISOString().split('T')[0];
    document.getElementById('retailOrderTime').value = now.toTimeString().slice(0, 5);
    
    // Clear items
    document.getElementById('retailItemsContainer').innerHTML = '';
    retailItemCounter = 0;
    
    // Add first item
    addRetailItem();
    
    // Update summary
    updateRetailSummary();
}

// Load retail orders from Firebase
function loadRetailOrders() {
    if (!window.database) {
        console.error('Database not initialized');
        return;
    }
    
    const ordersRef = window.database.ref('orders');
    
    ordersRef.orderByChild('type').equalTo('retail').on('value', (snapshot) => {
        retailOrdersData = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                retailOrdersData.push(order);
            });
            
            // Sort by creation date (newest first)
            retailOrdersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        displayRetailOrders();
    });
}

// Display retail orders
function displayRetailOrders() {
    const tbody = document.getElementById('retailOrdersBody');
    const emptyState = document.getElementById('retailEmptyState');
    
    if (retailOrdersData.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    retailOrdersData.forEach((order, index) => {
        const itemsText = order.items.map(item => `${item.productName} (${item.quantity}kg)`).join(', ');
        const orderDateTime = `${order.orderDate} ${order.orderTime}`;
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${order.customerName}</td>
                <td>${order.customerPhone || 'N/A'}</td>
                <td>${orderDateTime}</td>
                <td title="${itemsText}">${itemsText.length > 50 ? itemsText.substring(0, 50) + '...' : itemsText}</td>
                <td><strong>${formatCurrency(order.total)} VNĐ</strong></td>
                <td>
                    <button class="retail-btn retail-btn-secondary retail-btn-small" onclick="viewRetailOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="retail-btn retail-btn-danger retail-btn-small" onclick="deleteRetailOrder('${order.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// View retail order details
function viewRetailOrder(orderId) {
    const order = retailOrdersData.find(o => o.id === orderId);
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
                    <h3>Chi Tiết Đơn Hàng Bán Lẻ</h3>
                    <button class="modal-close" onclick="closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="order-info">
                        <h4>Thông Tin Khách Hàng</h4>
                        <p><strong>Tên:</strong> ${order.customerName}</p>
                        <p><strong>Số điện thoại:</strong> ${order.customerPhone || 'N/A'}</p>
                        <p><strong>Ngày bán:</strong> ${order.orderDate} ${order.orderTime}</p>
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
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Delete retail order
function deleteRetailOrder(orderId) {
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
            retailOrdersData = retailOrdersData.filter(order => order.id !== orderId);
            displayRetailOrders();
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
window.initRetailOrders = initRetailOrders;
window.addRetailItem = addRetailItem;
window.removeRetailItem = removeRetailItem;
window.updateRetailItemPrice = updateRetailItemPrice;
window.updateRetailItemTotal = updateRetailItemTotal;
window.updateRetailSummary = updateRetailSummary;
window.createRetailOrder = createRetailOrder;
window.clearRetailForm = clearRetailForm;
window.viewRetailOrder = viewRetailOrder;
window.deleteRetailOrder = deleteRetailOrder;
window.closeModal = closeModal;