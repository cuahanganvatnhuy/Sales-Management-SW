// TEMPORARILY DISABLED - This file is causing conflicts with new-retail-orders.js
// All functions in this file have been commented out to prevent duplicate order creation

/*
// Retail Orders Functions

// Add retail order item
function addRetailOrderItem() {
    const container = document.getElementById('retailOrderItems');
    if (!container) return;
    
    const itemIndex = container.children.length;
    const itemHTML = `
        <div class="order-item" data-index="${itemIndex}">
            <div class="form-row">
                <div class="form-group">
                    <label>Sản Phẩm:</label>
                    <select class="product-select" onchange="window.updateRetailItemPrice(${itemIndex})">
                        <option value="">Chọn sản phẩm</option>
                        ${generateProductOptions()}
                    </select>
                </div>
                <div class="form-group">
                    <label>Số Lượng (kg):</label>
                    <input type="number" class="quantity-input" min="0.1" step="0.1" 
                           value="1" onchange="window.updateRetailItemTotal(${itemIndex})">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Giá Bán (VNĐ):</label>
                    <input type="number" class="price-input" min="0" 
                           value="0" onchange="window.updateRetailItemTotal(${itemIndex})">
                </div>
                <div class="form-group">
                    <label>Tổng Tiền:</label>
                    <span class="total-display">0 VNĐ</span>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger btn-small" 
                            onclick="window.removeRetailOrderItem(${itemIndex})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHTML);
    window.updateRetailOrderSummary();
}

// Remove retail order item
function removeRetailOrderItem(index) {
    const item = document.querySelector(`.order-item[data-index="${index}"]`);
    if (item) {
        item.remove();
        window.updateRetailOrderSummary();
    }
}

// Update retail item price based on selected product
function updateRetailItemPrice(index) {
    const item = document.querySelector(`.order-item[data-index="${index}"]`);
    if (!item) return;
    
    const productSelect = item.querySelector('.product-select');
    const priceInput = item.querySelector('.price-input');
    const selectedProductId = productSelect.value;
    
    if (selectedProductId && productsData[selectedProductId]) {
        const product = productsData[selectedProductId];
        priceInput.value = product.price || 0;
        window.updateRetailItemTotal(index);
    }
}

// Update retail item total
function updateRetailItemTotal(index) {
    const item = document.querySelector(`.order-item[data-index="${index}"]`);
    if (!item) return;
    
    const quantityInput = item.querySelector('.quantity-input');
    const priceInput = item.querySelector('.price-input');
    const totalDisplay = item.querySelector('.total-display');
    
    const quantity = parseFloat(quantityInput.value) || 0;
    const price = parseInt(priceInput.value) || 0;
    const total = quantity * price;
    
    totalDisplay.textContent = formatCurrency(total) + ' VNĐ';
    window.updateRetailOrderSummary();
}

// Update retail order summary
function updateRetailOrderSummary() {
    const items = document.querySelectorAll('#retailOrderItems .order-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.quantity-input').value) || 0;
        const price = parseInt(item.querySelector('.price-input').value) || 0;
        subtotal += quantity * price;
    });
    
    const discount = parseInt(document.getElementById('retailDiscount').value) || 0;
    const shippingFee = parseInt(document.getElementById('retailShippingFee').value) || 0;
    const total = subtotal - discount + shippingFee;
    
    document.getElementById('retailSubtotal').textContent = formatCurrency(subtotal) + ' VNĐ';
    document.getElementById('retailTotal').textContent = formatCurrency(total) + ' VNĐ';
}

// Create retail orders
async function createRetailOrders(event) {
    event.preventDefault();
    
    // Get form data
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const orderDate = document.getElementById('retailOrderDate').value;
    const orderTime = document.getElementById('retailOrderTime').value;
    
    const items = document.querySelectorAll('#retailOrderItems .order-item');
    const discount = parseInt(document.getElementById('retailDiscount').value) || 0;
    const shippingFee = parseInt(document.getElementById('retailShippingFee').value) || 0;
    
    // Validate items
    if (items.length === 0) {
        showNotification('Vui lòng thêm ít nhất một sản phẩm!', 'error');
        return;
    }
    
    // Prepare order data
    const orderItems = [];
    let subtotal = 0;
    
    items.forEach(item => {
        const productSelect = item.querySelector('.product-select');
        const quantityInput = item.querySelector('.quantity-input');
        const priceInput = item.querySelector('.price-input');
        
        const productId = productSelect.value;
        const quantity = parseFloat(quantityInput.value) || 0;
        const price = parseInt(priceInput.value) || 0;
        const total = quantity * price;
        
        if (productId && quantity > 0) {
            orderItems.push({
                productId: productId,
                productName: productsData[productId]?.name || 'Unknown Product',
                productSKU: productsData[productId]?.sku || 'Unknown SKU',
                quantity: quantity,
                price: price,
                total: total
            });
            subtotal += total;
        }
    });
    
    const total = subtotal - discount + shippingFee;
    
    // Create order object
    const orderData = {
        type: 'retail',
        customerName: customerName,
        customerPhone: customerPhone,
        orderDate: orderDate,
        orderTime: orderTime,
        items: orderItems,
        subtotal: subtotal,
        discount: discount,
        shippingFee: shippingFee,
        total: total,
        status: 'completed',
        createdAt: new Date().toISOString()
    };
    
    try {
        showLoading(true);
        
        // Save to Firebase
        const ordersRef = database.ref('orders');
        const newOrderRef = ordersRef.push();
        await newOrderRef.set(orderData);
        
        showLoading(false);
        showNotification('Đơn hàng bán lẻ đã được tạo thành công!', 'success');
        
        // Reset form
        document.getElementById('addOrderForm').reset();
        document.getElementById('retailOrderItems').innerHTML = '';
        window.addRetailOrderItem(); // Add first item again
        window.updateRetailOrderSummary();
        
    } catch (error) {
        showLoading(false);
        console.error('Error creating retail order:', error);
        showNotification('Lỗi tạo đơn hàng bán lẻ!', 'error');
    }
}

// Generate retail order form
function generateRetailOrderForm(container) {
    container.innerHTML = `
        <div id="retailOrderSection" class="order-form-section">
            <div class="form-row">
                <div class="form-group">
                    <label for="customerName">Tên Khách Hàng:</label>
                    <input type="text" id="customerName" name="customerName" 
                           placeholder="Nhập tên khách hàng" required>
                </div>
                <div class="form-group">
                    <label for="customerPhone">Số Điện Thoại:</label>
                    <input type="tel" id="customerPhone" name="customerPhone" 
                           placeholder="Nhập số điện thoại">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="retailOrderDate">Ngày Bán:</label>
                    <input type="date" id="retailOrderDate" name="retailOrderDate" required>
                </div>
                <div class="form-group">
                    <label for="retailOrderTime">Giờ Bán:</label>
                    <input type="time" id="retailOrderTime" name="retailOrderTime" required>
                </div>
            </div>
            
            <div class="form-section">
                <h4><i class="fas fa-box"></i> Sản Phẩm</h4>
                <div id="retailOrderItems" class="order-items-container">
                    <!-- Retail order items will be generated here -->
                </div>
                <button type="button" class="btn btn-primary btn-small" onclick="addRetailOrderItem()">
                    <i class="fas fa-plus"></i> Thêm Sản Phẩm
                </button>
            </div>
            
            <div class="form-section">
                <h4><i class="fas fa-calculator"></i> Tổng Kết</h4>
                <div class="summary-row">
                    <span>Tạm Tính:</span>
                    <span id="retailSubtotal">0 VNĐ</span>
                </div>
                <div class="summary-row">
                    <span>Giảm Giá:</span>
                    <input type="number" id="retailDiscount" min="0" value="0" 
                           onchange="updateRetailOrderSummary()">
                </div>
                <div class="summary-row">
                    <span>Phí Vận Chuyển:</span>
                    <input type="number" id="retailShippingFee" min="0" value="0" 
                           onchange="updateRetailOrderSummary()">
                </div>
                <div class="summary-row total">
                    <span>Tổng Cộng:</span>
                    <span id="retailTotal">0 VNĐ</span>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Tạo Đơn Hàng Bán Lẻ
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.clearRetailForm()">
                    <i class="fas fa-undo"></i> Làm Mới
                </button>
            </div>
        </div>
    `;
    
    // Add first item
    addRetailOrderItem();
}

// Clear retail form
function clearRetailForm() {
    const retailSection = document.getElementById('retailOrderSection');
    if (retailSection) {
        // Reset form fields
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('retailOrderDate').value = '';
        document.getElementById('retailOrderTime').value = '';
        document.getElementById('retailDiscount').value = '0';
        document.getElementById('retailShippingFee').value = '0';
        
        // Clear items
        document.getElementById('retailOrderItems').innerHTML = '';
        
        // Add first item
        window.addRetailOrderItem();
        
        // Update summary
        window.updateRetailOrderSummary();
    }
}

// Export functions
window.generateRetailOrderForm = generateRetailOrderForm;
window.clearRetailForm = clearRetailForm;
window.createRetailOrders = createRetailOrders;
window.updateRetailOrderSummary = updateRetailOrderSummary;
window.addRetailOrderItem = addRetailOrderItem;
window.removeRetailOrderItem = removeRetailOrderItem;
window.updateRetailItemPrice = updateRetailItemPrice;
window.updateRetailItemTotal = updateRetailItemTotal;
*/
