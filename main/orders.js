// Orders Management
let ordersData = {};
let productsData = {};

// Format currency (135000 -> 135.000)
function formatCurrency(amount) {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return '0';
    return new Intl.NumberFormat('vi-VN').format(numAmount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Load products and orders when page loads
window.addEventListener('DOMContentLoaded', function() {
    // Wait for store context to be ready
    setTimeout(() => {
        initializeOrdersPage();
    }, 200);
    
    setDefaultDate();
    generateOrderForms();
    setupPlatformSelection();
});

// Initialize orders page with store context
function initializeOrdersPage() {
    // Check if store is selected
    if (typeof isStoreSelected === 'function' && isStoreSelected()) {
        loadProducts();
        loadOrders();
        showStoreInfo();
    } else {
        showStoreSelectionRequired();
    }
}

// Listen for store context changes
document.addEventListener('storeContextChanged', function(event) {
    const storeContext = event.detail;
    if (storeContext.isStoreSelected) {
        loadProducts();
        loadOrders();
        showStoreInfo();
        hideStoreSelectionMessage();
    } else {
        showStoreSelectionRequired();
    }
});

// Show store info
function showStoreInfo() {
    if (typeof getCurrentStoreData === 'function') {
        const storeData = getCurrentStoreData();
        if (storeData) {
            // Update page title or show store info
            console.log('Loading orders for store:', storeData.name);
        }
    }
}

// Show store selection required message
function showStoreSelectionRequired() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="store-selection-required">
                <div class="store-selection-icon">
                    <i class="fas fa-store"></i>
                </div>
                <h3>Vui lòng chọn cửa hàng</h3>
                <p>Bạn cần chọn cửa hàng trước khi tạo đơn hàng.</p>
                <button type="button" class="btn btn-primary" onclick="openStoreSelector()">
                    <i class="fas fa-store"></i> Chọn Cửa Hàng
                </button>
            </div>
        `;
    }
}

// Hide store selection message
function hideStoreSelectionMessage() {
    const storeSelectionMsg = document.querySelector('.store-selection-required');
    if (storeSelectionMsg) {
        location.reload(); // Reload to show normal content
    }
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('orderDate').value = today;
}

// Setup platform selection functionality
function setupPlatformSelection() {
    const platformSelect = document.getElementById('ecommercePlatform');
    const otherPlatformGroup = document.getElementById('otherPlatformGroup');
    
    if (platformSelect) {
        platformSelect.addEventListener('change', function() {
            if (this.value === 'other') {
                otherPlatformGroup.style.display = 'block';
                document.getElementById('otherPlatformName').required = true;
            } else {
                otherPlatformGroup.style.display = 'none';
                document.getElementById('otherPlatformName').required = false;
                document.getElementById('otherPlatformName').value = '';
            }
        });
    }
}

// Get selected platform information
function getSelectedPlatform() {
    const platformSelect = document.getElementById('ecommercePlatform');
    const otherPlatformName = document.getElementById('otherPlatformName');
    
    if (!platformSelect || !platformSelect.value) {
        return null;
    }
    
    if (platformSelect.value === 'other') {
        return {
            platform: 'other',
            platformName: otherPlatformName.value.trim() || 'Khác'
        };
    }
    
    const platformNames = {
        'shopee': 'Shopee',
        'lazada': 'Lazada', 
        'tiktok': 'TikTok Shop',
        'sendo': 'Sendo',
        'tiki': 'Tiki',
        'facebook': 'Facebook Shop',
        'zalo': 'Zalo Shop'
    };
    
    return {
        platform: platformSelect.value,
        platformName: platformNames[platformSelect.value] || platformSelect.value
    };
}

// Load products from Firebase (global products shared across all stores)
async function loadProducts() {
    try {
        // Always load global products (shared across all stores)
        productsData = await getAllProducts();
        console.log('Global products loaded:', productsData);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Lỗi tải danh sách sản phẩm!', 'error');
    }
}

// Load orders from Firebase
async function loadOrders() {
    try {
        let allOrdersData = {};
        
        // Check if store is selected
        if (typeof getStoreDataPath === 'function') {
            const ordersPath = getStoreDataPath('orders');
            const snapshot = await database.ref(ordersPath).once('value');
            allOrdersData = snapshot.val() || {};
        } else {
            // Fallback to global orders
            allOrdersData = await getAllOrders();
        }
        
        // Filter to show only TMĐT orders (exclude wholesale and retail orders)
        ordersData = {};
        for (const [orderId, order] of Object.entries(allOrdersData)) {
            // Check both 'orderType' and 'type' fields for compatibility
            const orderType = order.orderType || order.type;
            
            // EXCLUDE orders that are explicitly wholesale or retail
            if (orderType === 'wholesale' || orderType === 'retail') {
                continue; // Skip this order
            }
            
            // INCLUDE orders that are:
            // 1. TMĐT/ecommerce orders (orderType/type = 'ecommerce', 'tmdt', 'online')
            // 2. Orders without any type specified (legacy orders, assume TMĐT)
            if (!orderType || 
                orderType === 'ecommerce' || 
                orderType === 'tmdt' || 
                orderType === 'online') {
                ordersData[orderId] = order;
            }
        }
        
        console.log('Filtered TMĐT orders:', Object.keys(ordersData).length, 'out of', Object.keys(allOrdersData).length, 'total orders');
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Lỗi tải danh sách đơn hàng!', 'error');
    }
}

// Generate order forms based on count
function generateOrderForms() {
    const orderCountInput = document.getElementById('orderCount');
    const orderCount = parseInt(orderCountInput.value);
    const container = document.getElementById('orderFormsContainer');
    
    // Validation
    if (!orderCount || orderCount < 1) {
        showNotification('Vui lòng nhập số lượng đơn hàng hợp lệ!', 'error');
        orderCountInput.focus();
        return;
    }
    
    if (orderCount > 5000) {
        showNotification('Số lượng đơn hàng không được vượt quá 5000!', 'error');
        orderCountInput.focus();
        return;
    }
    
    // Check if products exist
    if (!productsData || Object.keys(productsData).length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Chưa có sản phẩm nào trong hệ thống!</p>
                <p>Vui lòng <a href="products.html">thêm sản phẩm</a> trước khi tạo đơn hàng.</p>
            </div>
        `;
        return;
    }
    
    // Show loading
    showLoading(true);
    
    // Add small delay for better UX
    setTimeout(() => {
        generateOrderFormsContent(orderCount, container);
        showLoading(false);
        showNotification(`Đã tạo ${orderCount}  đơn hàng!`, 'success');
    }, 300);
}

// Clear order forms when input changes
function clearOrderForms() {
    const container = document.getElementById('orderFormsContainer');
    if (container && container.innerHTML.trim() !== '') {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <p>Nhập số lượng đơn hàng và nhấn "Xác Nhận" để tạo các  đơn hàng.</p>
            </div>
        `;
    }
}

// Add event listener for order count input
document.addEventListener('DOMContentLoaded', function() {
    const orderCountInput = document.getElementById('orderCount');
    if (orderCountInput) {
        orderCountInput.addEventListener('input', clearOrderForms);
    }
});

// Generate order forms content
function generateOrderFormsContent(orderCount, container) {
    
    let formsHTML = '';
    
    for (let i = 1; i <= orderCount; i++) {
        formsHTML += `
            <div class="form-section order-form-item" id="orderForm_${i}">
                <div class="order-form-header">
                    <div class="order-form-title">
                        <i class="fas fa-shopping-bag"></i> 
                        Đơn Hàng ${i}
                    </div>
                    ${orderCount > 1 ? `
                        <button type="button" class="delete-order-btn" onclick="deleteOrderForm(${i})">
                            <i class="fas fa-trash"></i>
                            Xóa
                        </button>
                    ` : ''}
                </div>
                <div class="form-row four-fields-row">
                    <div class="form-group">
                        <label for="product_${i}">Sản Phẩm:</label>
                        <div id="productSelect_${i}" class="product-select-container"></div>
                        <input type="hidden" id="product_${i}" name="product_${i}" required>
                    </div>
                    <div class="form-group">
                        <label for="sku_${i}">SKU:</label>
                        <input type="text" id="sku_${i}" name="sku_${i}" readonly 
                               placeholder="SKU sẽ tự động cập nhật">
                    </div>
                    <div class="form-group">
                        <label for="quantity_${i}" id="quantityLabel_${i}">Số Lượng:</label>
                        <input type="number" id="quantity_${i}" name="quantity_${i}" 
                               min="0.1" step="0.1" required 
                               oninput="calculateOrderTotal(${i})" 
                               placeholder="Nhập số lượng">
                    </div>
                    <div class="form-group">
                        <label for="price_${i}" id="priceLabel_${i}">Giá:</label>
                        <input type="text" id="price_${i}" name="price_${i}" readonly 
                               placeholder="Giá sẽ tự động cập nhật">
                    </div>
                </div>
                <div class="total-row">
                    <div class="form-group total-group">
                        <label for="total_${i}" >Tổng Tiền:</label>
                        <input type="text" id="total_${i}" name="total_${i} VND" readonly 
                               placeholder="Tổng tiền sẽ tự động tính" value="Tổng tiền"> 
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = formsHTML;
    
    // Initialize SearchableSelect for each product dropdown
    initializeProductSelects(orderCount);
    
    // Update total orders count
    // updateTotalOrdersCount(); // Function not needed for form generation
}

// Initialize SearchableSelect for product dropdowns
function initializeProductSelects(orderCount) {
    // Prepare product data for SearchableSelect
    const productData = Object.keys(productsData).map(id => ({
        id: id,
        name: productsData[id].name,
        price: productsData[id].price
    }));
    
    // Initialize SearchableSelect for each order form
    for (let i = 1; i <= orderCount; i++) {
        const container = document.getElementById(`productSelect_${i}`);
        if (container) {
            const searchableSelect = new SearchableSelect(container, {
                placeholder: 'Chọn sản phẩm...',
                searchPlaceholder: 'Tìm kiếm sản phẩm...',
                noResultsText: 'Không tìm thấy sản phẩm nào'
            });
            
            searchableSelect.setData(productData);
            
            // Handle selection
            searchableSelect.onSelect = (selectedProduct) => {
                // Update hidden input
                const hiddenInput = document.getElementById(`product_${i}`);
                hiddenInput.value = selectedProduct.id;
                
                // Update price
                updateOrderPrice(i, selectedProduct.id);
            };
        }
    }
}

// Update order price when product is selected
function updateOrderPrice(orderIndex, productId = null) {
    if (!productId) {
        const hiddenInput = document.getElementById(`product_${orderIndex}`);
        productId = hiddenInput.value;
    }
    
    if (!productId || !productsData[productId]) {
        document.getElementById(`price_${orderIndex}`).value = '';
        document.getElementById(`sku_${orderIndex}`).value = '';
        document.getElementById(`total_${orderIndex}`).value = '';
        return;
    }
    
    const product = productsData[productId];
    const priceInput = document.getElementById(`price_${orderIndex}`);
    const skuInput = document.getElementById(`sku_${orderIndex}`);
    const quantityInput = document.getElementById(`quantity_${orderIndex}`);
    const totalInput = document.getElementById(`total_${orderIndex}`);
    const quantityLabel = document.getElementById(`quantityLabel_${orderIndex}`);
    const priceLabel = document.getElementById(`priceLabel_${orderIndex}`);
    
    // Get unit and update labels
    const unit = product.unit || 'cái';
    if (quantityLabel) {
        quantityLabel.textContent = `Số Lượng (${unit}):`;
    }
    if (priceLabel) {
        priceLabel.textContent = `Giá (VNĐ/${unit}):`;
    }
    
    // Set price and SKU
    priceInput.value = formatCurrency(product.price);
    skuInput.value = product.sku || 'N/A';
    
    // Calculate total if quantity exists
    const quantity = parseFloat(quantityInput.value) || 0;
    if (quantity > 0) {
        const total = product.price * quantity;
        totalInput.value = formatCurrency(total);
    } else {
        totalInput.value = '';
    }
}

// Calculate order total when quantity changes
function calculateOrderTotal(orderIndex) {
    const hiddenInput = document.getElementById(`product_${orderIndex}`);
    const productId = hiddenInput.value;
    
    if (productId && productsData[productId]) {
        updateOrderPrice(orderIndex, productId);
    }
}

// Generate product options for select
function generateProductOptions() {
    if (!productsData) return '';
    
    return Object.entries(productsData).map(([id, product]) => {
        const unit = product.unit || 'cái';
        const price = product.price || 0;
        return `<option value="${id}" data-price="${price}" data-unit="${unit}" data-conversion="${product.conversion || 1}">${product.name} - ${formatCurrency(price)}/${unit}</option>`;
    }).join('');
}

// Update price when product is selected
function updatePrice(orderIndex) {
    const productSelect = document.getElementById(`product_${orderIndex}`);
    const priceInput = document.getElementById(`price_${orderIndex}`);
    
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.price) {
        const price = selectedOption.dataset.price;
        priceInput.value = formatCurrency(price);
        calculateTotal(orderIndex);
    } else {
        priceInput.value = '';
        document.getElementById(`total_${orderIndex}`).value = '';
    }
}

// Calculate total price
function calculateTotal(orderIndex) {
    const productSelect = document.getElementById(`product_${orderIndex}`);
    const quantityInput = document.getElementById(`quantity_${orderIndex}`);
    const totalInput = document.getElementById(`total_${orderIndex}`);
    
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const quantity = parseFloat(quantityInput.value) || 0;
    
    if (selectedOption && selectedOption.dataset.price && quantity > 0) {
        const price = parseFloat(selectedOption.dataset.price);
        const total = price * quantity;
        totalInput.value = formatCurrency(total);
    } else {
        totalInput.value = '';
    }
}

// Create orders
async function createOrders(event) {
    event.preventDefault();
    
    const orderDate = document.getElementById('orderDate').value;
    const orderCount = parseInt(document.getElementById('orderCount').value);
    
    if (!orderDate) {
        showNotification('Vui lòng chọn ngày tạo đơn!', 'error');
        return;
    }
    
    // Validate platform selection for TMĐT orders
    const platformInfo = getSelectedPlatform();
    if (!platformInfo) {
        showNotification('Vui lòng chọn sàn TMĐT!', 'error');
        return;
    }
    
    if (platformInfo.platform === 'other' && !platformInfo.platformName.trim()) {
        showNotification('Vui lòng nhập tên sàn TMĐT khác!', 'error');
        return;
    }
    
    // Get store information
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    const storeInfo = getCurrentStoreData();
    if (!selectedStoreId || !storeInfo) {
        showNotification('Vui lòng chọn cửa hàng trước khi tạo đơn!', 'error');
        return;
    }
    
    const orders = [];
    let hasError = false;
    
    // Collect all order data
    for (let i = 1; i <= orderCount; i++) {
        const productId = document.getElementById(`product_${i}`).value;
        const quantity = parseFloat(document.getElementById(`quantity_${i}`).value);
        const price = parseFloat(document.getElementById(`price_${i}`).value.replace(/[^\d]/g, ''));
        
        if (!productId) {
            showNotification(`Vui lòng chọn sản phẩm cho đơn hàng ${i}!`, 'error');
            hasError = true;
            break;
        }
        
        if (!quantity || quantity <= 0) {
            showNotification(`Vui lòng nhập số lượng hợp lệ cho đơn hàng ${i}!`, 'error');
            hasError = true;
            break;
        }
        
        const product = productsData[productId];
        if (!product) {
            showNotification(`Sản phẩm không tồn tại cho đơn hàng ${i}!`, 'error');
            hasError = true;
            break;
        }
        
        // Calculate actual quantity for stock deduction based on conversion
        const unit = product.unit || 'cái';
        const conversion = product.conversion || 1;
        const actualQuantityForStock = quantity * conversion;
        
        // Check stock availability
        const currentStock = product.stock || 0;
        if (currentStock < actualQuantityForStock) {
            showNotification(`Không đủ tồn kho cho sản phẩm "${product.name}" trong đơn hàng ${i}! Cần: ${actualQuantityForStock} ${unit}, Còn: ${currentStock} ${unit}`, 'error');
            hasError = true;
            break;
        }
        
        const total = price * quantity;
        
        orders.push({
            productId: productId,
            productName: product.name,
            sku: product.sku || 'N/A',
            quantity: quantity,
            unit: unit,
            conversion: conversion,
            actualQuantityForStock: actualQuantityForStock,
            price: price,
            total: total,
            orderDate: orderDate,
            type: 'ecommerce',
            orderType: 'ecommerce',
            platform: platformInfo.platform,
            platformName: platformInfo.platformName,
            source: 'order_management',
            storeId: selectedStoreId,
            storeName: storeInfo.name,
            storeCode: storeInfo.code || storeInfo.id || 'N/A',
            createdBy: storeInfo.name,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    if (hasError) return;
    
    try {
        showLoading(true);
        console.log('=== Creating TMĐT orders ===');
        console.log('Orders to create:', orders.length);
        console.log('Platform info:', platformInfo);
        console.log('Store info:', storeInfo);
        console.log('Sample order data:', orders[0]);
        
        // Save all orders to the selected store
        if (typeof getStoreDataPath === 'function') {
            // Save to store-specific orders path
            const ordersPath = getStoreDataPath('orders');
            console.log('Saving to store path:', ordersPath);
            
            for (const orderData of orders) {
                const orderRef = database.ref(ordersPath).push();
                await orderRef.set(orderData);
                console.log('Order saved with ID:', orderRef.key);
            }
        } else {
            // Fallback to global orders
            console.log('Saving to global orders (fallback)');
            for (const orderData of orders) {
                await addOrder(orderData);
            }
        }
        
        // Update stock and create warehouse transactions for all ordered products
        console.log('=== Updating product stock and creating warehouse transactions ===');
        for (const orderData of orders) {
            const productRef = database.ref(`products/${orderData.productId}`);
            const productSnapshot = await productRef.once('value');
            const currentProduct = productSnapshot.val();
            
            if (currentProduct) {
                const newStock = (currentProduct.stock || 0) - orderData.actualQuantityForStock;
                await productRef.update({ 
                    stock: Math.max(0, newStock), // Ensure stock doesn't go negative
                    updatedAt: firebase.database.ServerValue.TIMESTAMP 
                });
                console.log(`Updated stock for ${orderData.productName}: ${currentProduct.stock} -> ${newStock}`);
                
                // Create warehouse transaction for stock out
                const transactionId = database.ref('warehouseTransactions').push().key;
                const warehouseTransaction = {
                    id: transactionId,
                    type: 'out',
                    subType: 'ecommerce_order',
                    productId: orderData.productId,
                    productName: orderData.productName,
                    productSku: orderData.sku,
                    productCategory: currentProduct.categoryName || 'Khác',
                    quantity: orderData.actualQuantityForStock,
                    unit: orderData.unit,
                    unitPrice: currentProduct.costPrice || currentProduct.price || orderData.price,
                    totalValue: orderData.actualQuantityForStock * (currentProduct.costPrice || currentProduct.price || orderData.price),
                    reason: 'Bán hàng TMĐT',
                    customReason: `Đơn hàng ${platformInfo.platformName}`,
                    note: `Xuất kho cho đơn hàng TMĐT - Sàn: ${platformInfo.platformName}, SL bán: ${orderData.quantity} ${orderData.unit}`,
                    timestamp: Date.now(),
                    date: new Date().toISOString(),
                    userId: 'system',
                    storeId: orderData.storeId,
                    storeName: orderData.storeName,
                    performedBy: orderData.createdBy,
                    orderId: null, // Will be set after order creation
                    platform: orderData.platform,
                    platformName: orderData.platformName
                };
                
                await database.ref(`warehouseTransactions/${transactionId}`).set(warehouseTransaction);
                console.log(`Created warehouse transaction for ${orderData.productName}: ${transactionId}`);
                console.log('Warehouse transaction data:', {
                    quantity: warehouseTransaction.quantity,
                    unitPrice: warehouseTransaction.unitPrice,
                    totalValue: warehouseTransaction.totalValue,
                    costPrice: currentProduct.costPrice,
                    productPrice: currentProduct.price,
                    orderPrice: orderData.price
                });
            }
        }
        
        showNotification(`Đã tạo thành công ${orders.length} đơn hàng TMĐT từ sàn ${platformInfo.platformName} cho cửa hàng ${storeInfo.name}!`, 'success');
        
        // Reset form with animation
        const form = document.getElementById('addOrderForm');
        const formsContainer = document.getElementById('orderFormsContainer');
        
        // Add reset animation
        form.classList.add('form-reset-animation');
        
        // Reset form after animation
        setTimeout(() => {
            form.reset();
            setDefaultDate();
            
            // Clear forms container
            formsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <p>Nhập số lượng đơn hàng và nhấn "Xác Nhận" để tạo các đơn hàng mới.</p>
                </div>
            `;
            
            form.classList.remove('form-reset-animation');
        }, 250);
        
        // Reload orders list
        await loadOrders();
        
    } catch (error) {
        console.error('=== Error creating orders ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Platform info:', platformInfo);
        console.error('Store info:', storeInfo);
        console.error('Orders data:', orders);
        
        let errorMessage = 'Lỗi tạo đơn hàng!';
        if (error.message) {
            errorMessage += ` Chi tiết: ${error.message}`;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

// Display orders in table
function displayOrders() {
    const container = document.getElementById('ordersContainer');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('ordersTable');
    
    if (!ordersData || Object.keys(ordersData).length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        table.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    table.classList.remove('hidden');
    
    let ordersHTML = '';
    let index = 1;
    
    // Sort orders by creation date (newest first)
    const sortedOrders = Object.entries(ordersData).sort((a, b) => 
        new Date(b[1].createdAt) - new Date(a[1].createdAt)
    );
    
    for (const [orderId, order] of sortedOrders) {
        // Lấy thông tin sản phẩm để hiển thị SKU và đơn vị
        const product = productsData[order.productId] || {};
        const productSKU = order.sku || product.sku || 'N/A';
        const unit = order.unit || product.unit || 'cái';
        
        // Get platform display info
        const platformDisplay = order.platformName || order.platform || 'N/A';
        const storeDisplay = order.storeName || 'N/A';
        
        ordersHTML += `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="product-checkbox" value="${orderId}" onchange="updateBulkActions()">
                </td>
                <td class="text-center">${index}</td>
                <td>${order.productName}</td>
                <td class="text-center sku-cell">${productSKU}</td>
                <td class="text-right quantity-cell">${order.quantity} ${unit}</td>
                <td class="text-right price-cell">${formatCurrency(order.price)}</td>
                <td class="text-right total-cell">${formatCurrency(order.total)}</td>
                <td class="text-center">
                    ${order.platform ? `<span class="platform-badge platform-${order.platform}">${platformDisplay}</span>` : 'N/A'}
                </td>
                <td class="text-center">
                    <span class="store-name">${storeDisplay}</span>
                </td>
                <td class="text-center date-cell">${formatDate(order.orderDate)}</td>
                <td class="text-center">
                    <button class="btn btn-danger btn-small" onclick="deleteOrder('${orderId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        index++;
    }
    
    container.innerHTML = ordersHTML;
    updateBulkActions();
}

// Delete single order
async function deleteOrder(orderId) {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
        return;
    }
    
    try {
        await deleteOrderById(orderId);
        showNotification('Xóa đơn hàng thành công!', 'success');
        await loadOrders();
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification('Lỗi xóa đơn hàng!', 'error');
    }
}

// Helper function to delete order by ID
function deleteOrderById(orderId) {
    // Check if store is selected
    if (typeof getStoreDataPath === 'function') {
        // Delete from store-specific orders path
        const ordersPath = getStoreDataPath('orders');
        return database.ref(`${ordersPath}/${orderId}`).remove();
    } else {
        // Fallback to global orders
        return database.ref(`orders/${orderId}`).remove();
    }
}

// Toggle select all checkboxes
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkActions();
}

// Update bulk actions visibility
function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (checkboxes.length > 0) {
        bulkActions.classList.remove('hidden');
        selectedCount.textContent = checkboxes.length;
    } else {
        bulkActions.classList.add('hidden');
    }
    
    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.product-checkbox');
    const selectAll = document.getElementById('selectAll');
    
    if (checkboxes.length === allCheckboxes.length && allCheckboxes.length > 0) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
    } else if (checkboxes.length > 0) {
        selectAll.checked = false;
        selectAll.indeterminate = true;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    }
}

// Delete selected orders
async function deleteSelectedOrders() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const orderIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (orderIds.length === 0) {
        showNotification('Vui lòng chọn đơn hàng cần xóa!', 'error');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${orderIds.length} đơn hàng đã chọn?`)) {
        return;
    }
    
    try {
        for (const orderId of orderIds) {
            await deleteOrderById(orderId);
        }
        
        showNotification(`Đã xóa ${orderIds.length} đơn hàng thành công!`, 'success');
        await loadOrders();
    } catch (error) {
        console.error('Error deleting orders:', error);
        showNotification('Lỗi xóa đơn hàng!', 'error');
    }
}

// Show loading state
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}
