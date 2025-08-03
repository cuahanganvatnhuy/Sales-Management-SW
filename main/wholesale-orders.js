// Wholesale Orders Functions

// Add wholesale order item
function addWholesaleOrderItem() {
    const container = document.getElementById('wholesaleOrderItems');
    if (!container) return;
    
    const itemIndex = container.children.length;
    const itemHTML = `
        <div class="order-item" data-index="${itemIndex}">
            <div class="form-row">
                <div class="form-group">
                    <label>Sản Phẩm:</label>
                    <select class="product-select" onchange="window.updateWholesaleItemPrice(${itemIndex})">
                        <option value="">Chọn sản phẩm</option>
                        ${generateProductOptions()}
                    </select>
                </div>
                <div class="form-group">
                    <label>Số Lượng (kg):</label>
                    <input type="number" class="quantity-input" min="0.1" step="0.1" 
                           value="1" onchange="window.updateWholesaleItemTotal(${itemIndex})">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Giá Bán (VNĐ):</label>
                    <input type="number" class="price-input" min="0" 
                           value="0" onchange="window.updateWholesaleItemTotal(${itemIndex})">
                </div>
                <div class="form-group">
                    <label>Tổng Tiền:</label>
                    <span class="total-display">0 VNĐ</span>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger btn-small" 
                            onclick="window.removeWholesaleOrderItem(${itemIndex})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHTML);
    window.updateWholesaleOrderSummary();
}

// Remove wholesale order item
function removeWholesaleOrderItem(index) {
    const item = document.querySelector(`.order-item[data-index="${index}"]`);
    if (item) {
        item.remove();
        window.updateWholesaleOrderSummary();
    }
}

// Update wholesale item price based on selected product
function updateWholesaleItemPrice(index) {
    const item = document.querySelector(`.order-item[data-index="${index}"]`);
    if (!item) return;
    
    const productSelect = item.querySelector('.product-select');
    const priceInput = item.querySelector('.price-input');
    const selectedProductId = productSelect.value;
    
    if (selectedProductId && productsData[selectedProductId]) {
        const product = productsData[selectedProductId];
        priceInput.value = product.price || 0;
        window.updateWholesaleItemTotal(index);
    }
}

// Update wholesale item total
function updateWholesaleItemTotal(index) {
    const item = document.querySelector(`.order-item[data-index="${index}"]`);
    if (!item) return;
    
    const quantityInput = item.querySelector('.quantity-input');
    const priceInput = item.querySelector('.price-input');
    const totalDisplay = item.querySelector('.total-display');
    
    const quantity = parseFloat(quantityInput.value) || 0;
    const price = parseInt(priceInput.value) || 0;
    const total = quantity * price;
    
    totalDisplay.textContent = formatCurrency(total) + ' VNĐ';
    window.updateWholesaleOrderSummary();
}

// Update wholesale order summary
function updateWholesaleOrderSummary() {
    const items = document.querySelectorAll('#wholesaleOrderItems .order-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.quantity-input').value) || 0;
        const price = parseInt(item.querySelector('.price-input').value) || 0;
        subtotal += quantity * price;
    });
    
    const discount = parseInt(document.getElementById('wholesaleDiscount').value) || 0;
    const shippingFee = parseInt(document.getElementById('wholesaleShippingFee').value) || 0;
    const deposit = parseInt(document.getElementById('wholesaleDeposit').value) || 0;
    const total = subtotal - discount + shippingFee;
    
    document.getElementById('wholesaleSubtotal').textContent = formatCurrency(subtotal) + ' VNĐ';
    document.getElementById('wholesaleTotal').textContent = formatCurrency(total) + ' VNĐ';
}

// Create wholesale orders
async function createWholesaleOrders(event) {
    event.preventDefault();
    
    // Get form data
    const customerName = document.getElementById('wholesaleCustomerName').value;
    const customerPhone = document.getElementById('wholesaleCustomerPhone').value;
    const customerAddress = document.getElementById('wholesaleCustomerAddress').value;
    const orderDate = document.getElementById('wholesaleOrderDate').value;
    
    const items = document.querySelectorAll('#wholesaleOrderItems .order-item');
    const discount = parseInt(document.getElementById('wholesaleDiscount').value) || 0;
    const shippingFee = parseInt(document.getElementById('wholesaleShippingFee').value) || 0;
    const deposit = parseInt(document.getElementById('wholesaleDeposit').value) || 0;
    
    // Validate required fields
    if (!customerName) {
        showNotification('Vui lòng nhập tên khách hàng!', 'error');
        return;
    }
    
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
        type: 'wholesale',
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        orderDate: orderDate,
        items: orderItems,
        subtotal: subtotal,
        discount: discount,
        shippingFee: shippingFee,
        deposit: deposit,
        total: total,
        remaining: total - deposit,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    try {
        showLoading(true);
        
        // Save to Firebase
        const ordersRef = database.ref('orders');
        const newOrderRef = ordersRef.push();
        await newOrderRef.set(orderData);
        
        showLoading(false);
        showNotification('Đơn hàng bán sỉ đã được tạo thành công!', 'success');
        
        // Reset form
        document.getElementById('addOrderForm').reset();
        document.getElementById('wholesaleOrderItems').innerHTML = '';
        window.addWholesaleOrderItem(); // Add first item again
        window.updateWholesaleOrderSummary();
        
    } catch (error) {
        showLoading(false);
        console.error('Error creating wholesale order:', error);
        showNotification('Lỗi tạo đơn hàng bán sỉ!', 'error');
    }
}

// Generate wholesale order form
function generateWholesaleOrderForm(container) {
    container.innerHTML = `
        <div id="wholesaleOrderSection" class="order-form-section">
            <div class="form-row">
                <div class="form-group">
                    <label for="wholesaleCustomerName">Tên Khách Hàng:</label>
                    <input type="text" id="wholesaleCustomerName" name="wholesaleCustomerName" 
                           placeholder="Nhập tên khách hàng" required>
                </div>
                <div class="form-group">
                    <label for="wholesaleCustomerPhone">Số Điện Thoại:</label>
                    <input type="tel" id="wholesaleCustomerPhone" name="wholesaleCustomerPhone" 
                           placeholder="Nhập số điện thoại">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="wholesaleCustomerAddress">Địa Chỉ:</label>
                    <input type="text" id="wholesaleCustomerAddress" name="wholesaleCustomerAddress" 
                           placeholder="Nhập địa chỉ khách hàng">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="wholesaleOrderDate">Ngày Bán:</label>
                    <input type="date" id="wholesaleOrderDate" name="wholesaleOrderDate" required>
                </div>
            </div>
            
            <div class="form-section">
                <h4><i class="fas fa-box"></i> Sản Phẩm</h4>
                <div id="wholesaleOrderItems" class="order-items-container">
                    <!-- Wholesale order items will be generated here -->
                </div>
                <button type="button" class="btn btn-primary btn-small" onclick="addWholesaleOrderItem()">
                    <i class="fas fa-plus"></i> Thêm Sản Phẩm
                </button>
            </div>
            
            <div class="form-section">
                <h4><i class="fas fa-calculator"></i> Tổng Kết</h4>
                <div class="summary-row">
                    <span>Tạm Tính:</span>
                    <span id="wholesaleSubtotal">0 VNĐ</span>
                </div>
                <div class="summary-row">
                    <span>Giảm Giá:</span>
                    <input type="number" id="wholesaleDiscount" min="0" value="0" 
                           onchange="updateWholesaleOrderSummary()">
                </div>
                <div class="summary-row">
                    <span>Phí Vận Chuyển:</span>
                    <input type="number" id="wholesaleShippingFee" min="0" value="0" 
                           onchange="updateWholesaleOrderSummary()">
                </div>
                <div class="summary-row">
                    <span>Tiền Cọc:</span>
                    <input type="number" id="wholesaleDeposit" min="0" value="0" 
                           onchange="updateWholesaleOrderSummary()">
                </div>
                <div class="summary-row total">
                    <span>Tổng Cộng:</span>
                    <span id="wholesaleTotal">0 VNĐ</span>
                </div>
                <div class="summary-row total">
                    <span>Còn Phải Trả:</span>
                    <span id="wholesaleRemaining">0 VNĐ</span>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Tạo Đơn Hàng Bán Sỉ
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.clearWholesaleForm()">
                    <i class="fas fa-undo"></i> Làm Mới
                </button>
            </div>
        </div>
    `;
    
    // Add first item
    addWholesaleOrderItem();
}

// Clear wholesale form
function clearWholesaleForm() {
    const wholesaleSection = document.getElementById('wholesaleOrderSection');
    if (wholesaleSection) {
        // Reset form fields
        document.getElementById('wholesaleCustomerName').value = '';
        document.getElementById('wholesaleCustomerPhone').value = '';
        document.getElementById('wholesaleCustomerAddress').value = '';
        document.getElementById('wholesaleOrderDate').value = '';
        document.getElementById('wholesaleDiscount').value = '0';
        document.getElementById('wholesaleShippingFee').value = '0';
        document.getElementById('wholesaleDeposit').value = '0';
        
        // Clear items
        document.getElementById('wholesaleOrderItems').innerHTML = '';
        
        // Add first item
        window.addWholesaleOrderItem();
        
        // Update summary
        window.updateWholesaleOrderSummary();
    }
}

// Export functions
window.generateWholesaleOrderForm = generateWholesaleOrderForm;
window.clearWholesaleForm = clearWholesaleForm;
window.createWholesaleOrders = createWholesaleOrders;
window.updateWholesaleOrderSummary = updateWholesaleOrderSummary;
window.addWholesaleOrderItem = addWholesaleOrderItem;
window.removeWholesaleOrderItem = removeWholesaleOrderItem;
window.updateWholesaleItemPrice = updateWholesaleItemPrice;
window.updateWholesaleItemTotal = updateWholesaleItemTotal;
