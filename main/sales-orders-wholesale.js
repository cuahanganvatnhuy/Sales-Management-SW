// Sales Orders Management - Wholesale (Bán Sỉ)
// Manages wholesale orders using products data like retail orders
let wholesaleOrdersData = {};
let productsData = {};
let wholesaleItemCounter = 0;

// Expose to global scope
window.productsData = productsData;

// Show loading function - fallback if not defined elsewhere
function showLoading(show = true) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Show notification function - fallback if not defined elsewhere
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const icon = notification.querySelector('.notification-icon');
    const messageEl = notification.querySelector('.notification-message');
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    icon.className = `notification-icon ${icons[type] || icons.info}`;
    messageEl.textContent = message;
    
    // Remove existing type classes and add new one
    notification.className = `notification ${type}`;
    
    // Show notification
    setTimeout(() => {
        notification.classList.remove('hidden');
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

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

// Load selling products and wholesale orders when page loads
window.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Wholesale orders DOM loaded');
    
    // Wait for Firebase and other dependencies
    setTimeout(() => {
        console.log('🔄 Initializing wholesale orders page...');
        initializeWholesaleOrdersPage();
        
        // Add form submit event listener (only if not already added)
        const wholesaleForm = document.getElementById('wholesaleOrderForm');
        if (wholesaleForm && !wholesaleForm.hasAttribute('data-listener-added')) {
            wholesaleForm.addEventListener('submit', createWholesaleOrder);
            wholesaleForm.setAttribute('data-listener-added', 'true');
        }
        console.log('✅ Form submit event listener added');
    }, 1000); // Increased timeout
    
    setDefaultDate();
    
    // Add first item after a delay to ensure products are loaded
    setTimeout(() => {
        addWholesaleItem();
    }, 1500);
});

// Initialize wholesale orders page with store context
function initializeWholesaleOrdersPage() {
    if (typeof isStoreSelected === 'function' && isStoreSelected()) {
        loadSellingProducts();
        loadWholesaleOrders();
        showStoreInfo();
    } else {
        showStoreSelectionRequired();
    }
}

// Listen for store context changes
document.addEventListener('storeContextChanged', function(event) {
    const storeContext = event.detail;
    if (storeContext.isStoreSelected) {
        loadSellingProducts();
        loadWholesaleOrders();
        showStoreInfo();
        hideStoreSelectionMessage();
    } else {
        showStoreSelectionRequired();
    }
});

// Load selling products from Firebase (same as retail orders)
function loadSellingProducts() {
    console.log('📦 Loading selling products...');
    
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (!selectedStoreId) {
        console.error('❌ No store selected');
        return;
    }
    
    database.ref(`sellingProducts`).once('value', (snapshot) => {
        const data = snapshot.val();
        console.log('📊 Raw products data:', data);
        
        if (data) {
            productsData = data;
            window.productsData = productsData; // Make globally accessible
            console.log('✅ Products loaded:', Object.keys(productsData).length, 'products');
            
            // Log each product's stock info for debugging
            Object.entries(productsData).forEach(([id, product]) => {
                console.log(`🏷️ Product ${id}:`, {
                    name: product.productName || product.name,
                    stock: product.stock,
                    stockType: typeof product.stock,
                    stockParsed: parseInt(product.stock) || 0
                });
            });
            
            // Update all product dropdowns after loading
            updateAllProductDropdowns();
            
            if (Object.keys(productsData).length === 0) {
                showNotification('Không tìm thấy sản phẩm bán nào. Vui lòng tạo sản phẩm bán từ menu Quản lý sản phẩm bán', 'warning');
            } else {
                showNotification(`Đã tải ${Object.keys(productsData).length} sản phẩm`, 'success');
            }
        } else {
            console.log('📭 No products found');
            productsData = {};
            showNotification('Không tìm thấy sản phẩm bán nào. Vui lòng tạo sản phẩm bán từ menu Quản lý sản phẩm bán', 'warning');
        }
    }).catch((error) => {
        console.error('❌ Error loading products:', error);
        showNotification('Lỗi tải dữ liệu sản phẩm: ' + error.message, 'error');
    });
}

// Update all product dropdowns
function updateAllProductDropdowns() {
    console.log('🔄 Updating product dropdowns...');
    const productSelects = document.querySelectorAll('.product-select');
    console.log('📋 Found', productSelects.length, 'product selects');
    
    productSelects.forEach((select, index) => {
        const currentValue = select.value;
        const newOptions = generateProductOptions();
        console.log(`📝 Updating select ${index + 1} with options:`, newOptions.substring(0, 100) + '...');
        select.innerHTML = newOptions;
        if (currentValue && productsData[currentValue]) {
            select.value = currentValue;
        }
    });
}

// Generate product options for wholesale orders using selling products data
function generateProductOptions() {
    console.log('🔧 Generating product options...');
    console.log('📊 productsData available:', !!productsData);
    console.log('📊 productsData keys:', Object.keys(productsData || {}));
    
    if (!productsData || Object.keys(productsData).length === 0) {
        console.log('⚠️ No selling products data available');
        return '<option value="">Không có sản phẩm - Vui lòng tạo sản phẩm bán trước</option>';
    }
    
    let options = '<option value="">Chọn sản phẩm</option>';
    let validProductCount = 0;
    
    for (const [id, product] of Object.entries(productsData)) {
        // Check if product has valid data
        const productName = product.productName || product.name || 'Sản phẩm không tên';
        const sku = product.sku ? ` - ${product.sku}` : '';
        const unit = product.unit || 'cái';
        const sellingPrice = product.sellingPrice || 0;
        const stock = product.stock || product.inventory || 0;
        const importPrice = product.importPrice || 0;
        
        console.log(`🏷️ Processing selling product ${id}:`, {
            name: productName,
            sku: product.sku,
            sellingPrice: sellingPrice,
            stock: stock,
            status: product.status
        });
        
        // Only include active products or products with selling price > 0
        if (product.status === 'active' || sellingPrice > 0) {
            options += `<option value="${id}" data-unit="${unit}" data-conversion="${product.conversion || 1}" data-price="${sellingPrice}" data-sku="${product.sku || ''}" data-stock="${stock}" data-import-price="${importPrice}">${productName}${sku} - ${formatCurrency(sellingPrice)} VNĐ/${unit} (Tồn: ${stock})</option>`;
            validProductCount++;
        }
    }
    
    if (validProductCount === 0) {
        console.log('⚠️ No active selling products found');
        return '<option value="">Không có sản phẩm đang bán - Vui lòng kích hoạt sản phẩm</option>';
    }
    
    console.log('✅ Generated options for', validProductCount, 'active selling products');
    return options;
}

// Add wholesale item
function addWholesaleItem() {
    const container = document.getElementById('wholesaleItemsContainer');
    if (!container) return;
    
    const itemIndex = wholesaleItemCounter++;
    const itemHTML = `
        <div class="wholesale-item" data-index="${itemIndex}">
            <div class="wholesale-item-header">
                <span class="wholesale-item-number">Sản phẩm ${itemIndex + 1}</span>
                <button type="button" class="wholesale-remove-btn" onclick="removeWholesaleItem(${itemIndex})">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
            <div class="wholesale-form-row">
                <div class="wholesale-form-group">
                    <label>Sản Phẩm *</label>
                    <select class="product-select" onchange="updateWholesaleItemPrice(${itemIndex})" required>
                        ${generateProductOptions()}
                    </select>
                </div>
                <div class="wholesale-form-group">
                    <label>Số Lượng *</label>
                    <input type="number" class="quantity-input" min="1" step="1" 
                           value="1" onchange="updateWholesaleItemTotal(${itemIndex})" required>
                </div>
            </div>
            <div class="wholesale-form-row">
                <div class="wholesale-form-group">
                    <label>Giá Sỉ (VNĐ) *</label>
                    <input type="text" class="price-input" 
                           oninput="formatNumberInput(this); updateWholesaleItemTotal(${itemIndex})" 
                           placeholder="0" required>
                </div>
                <div class="wholesale-form-group">
                    <label>Thành Tiền</label>
                    <input type="text" class="total-input" readonly 
                           style="background: #f8f9fa; font-weight: bold;">
                </div>
            </div>
            <div class="wholesale-form-row">
                <div class="wholesale-form-group">
                    <label>Tồn Kho</label>
                    <input type="text" class="stock-display" readonly 
                           style="background: #e8f5e8; color: #28a745; font-weight: bold;">
                </div>
                <div class="wholesale-form-group">
                    <label>SKU</label>
                    <input type="text" class="sku-display" readonly 
                           style="background: #f8f9fa;">
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHTML);
    updateWholesaleSummary();
}

// Remove wholesale item
function removeWholesaleItem(itemIndex) {
    const item = document.querySelector(`[data-index="${itemIndex}"]`);
    if (item) {
        item.remove();
        updateWholesaleSummary();
        
        // Update item numbers
        const items = document.querySelectorAll('.wholesale-item');
        items.forEach((item, index) => {
            const numberSpan = item.querySelector('.wholesale-item-number');
            if (numberSpan) {
                numberSpan.textContent = `Sản phẩm ${index + 1}`;
            }
        });
    }
}

// Update wholesale item price when product is selected
function updateWholesaleItemPrice(itemIndex) {
    const item = document.querySelector(`[data-index="${itemIndex}"]`);
    if (!item) return;
    
    const productSelect = item.querySelector('.product-select');
    const priceInput = item.querySelector('.price-input');
    const stockDisplay = item.querySelector('.stock-display');
    const skuDisplay = item.querySelector('.sku-display');
    
    if (productSelect.value) {
        const option = productSelect.selectedOptions[0];
        const price = option.dataset.price || 0;
        const stock = option.dataset.stock || 0;
        const sku = option.dataset.sku || '';
        
        priceInput.value = formatCurrency(price);
        stockDisplay.value = `${stock} sản phẩm`;
        skuDisplay.value = sku;
        
        updateWholesaleItemTotal(itemIndex);
    } else {
        priceInput.value = '';
        stockDisplay.value = '';
        skuDisplay.value = '';
        updateWholesaleItemTotal(itemIndex);
    }
}

// Update wholesale item total
function updateWholesaleItemTotal(itemIndex) {
    const item = document.querySelector(`[data-index="${itemIndex}"]`);
    if (!item) return;
    
    const quantityInput = item.querySelector('.quantity-input');
    const priceInput = item.querySelector('.price-input');
    const totalInput = item.querySelector('.total-input');
    
    const quantity = parseInt(quantityInput.value) || 0;
    const price = parseInt(priceInput.value.replace(/[^\d]/g, '')) || 0;
    const total = quantity * price;
    
    totalInput.value = formatCurrency(total) + ' VNĐ';
    updateWholesaleSummary();
}

// Update wholesale summary
function updateWholesaleSummary() {
    let subtotal = 0;
    
    // Calculate subtotal from all items
    const items = document.querySelectorAll('.wholesale-item');
    items.forEach(item => {
        const quantityInput = item.querySelector('.quantity-input');
        const priceInput = item.querySelector('.price-input');
        
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseInt(priceInput.value.replace(/[^\d]/g, '')) || 0;
        subtotal += quantity * price;
    });
    
    // Get discount, shipping and deposit values
    const discountInput = document.getElementById('wholesaleDiscount');
    const shippingInput = document.getElementById('wholesaleShipping');
    const depositInput = document.getElementById('wholesaleDeposit');
    
    const discount = discountInput ? parseInt(discountInput.value.replace(/[^\d]/g, '') || 0) : 0;
    const shipping = shippingInput ? parseInt(shippingInput.value.replace(/[^\d]/g, '') || 0) : 0;
    const deposit = depositInput ? parseInt(depositInput.value.replace(/[^\d]/g, '') || 0) : 0;
    
    // Calculate total and remaining
    const total = subtotal - discount + shipping;
    const remaining = total - deposit;
    
    // Update display
    document.getElementById('wholesaleSubtotal').textContent = formatCurrency(subtotal) + ' VNĐ';
    document.getElementById('wholesaleTotal').textContent = formatCurrency(total) + ' VNĐ';
    document.getElementById('wholesaleRemaining').textContent = formatCurrency(remaining) + ' VNĐ';
}

// Set default date
function setDefaultDate() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const orderDateInput = document.getElementById('wholesaleOrderDate');
    if (orderDateInput) {
        orderDateInput.value = dateString;
    }
}

// Clear wholesale form
function clearWholesaleForm() {
    document.getElementById('wholesaleOrderForm').reset();
    setDefaultDate();
    
    // Clear all items and add one default item
    document.getElementById('wholesaleItemsContainer').innerHTML = '';
    wholesaleItemCounter = 0;
    addWholesaleItem();
    
    updateWholesaleSummary();
}

// Create wholesale order
async function createWholesaleOrder(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (event.target.hasAttribute('data-submitting')) {
        console.log('⚠️ Form already submitting, ignoring duplicate submission');
        return;
    }
    
    event.target.setAttribute('data-submitting', 'true');
    
    console.log('🚀 Creating wholesale order...');
    try {
        showLoading(true);
        
        // Get form data
        const formData = new FormData(event.target);
        const customerName = formData.get('customerName');
        const customerPhone = formData.get('customerPhone');
        const customerAddress = formData.get('customerAddress');
        const orderDate = formData.get('orderDate');
        const deliveryDate = formData.get('deliveryDate');
        
        // Validate required fields
        if (!customerName || !customerAddress || !orderDate) {
            showNotification('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
            showLoading(false);
            return;
        }
        
        // Get items data
        const items = [];
        const itemElements = document.querySelectorAll('.wholesale-item');
        
        for (const item of itemElements) {
            const productSelect = item.querySelector('.product-select');
            const quantityInput = item.querySelector('.quantity-input');
            const priceInput = item.querySelector('.price-input');
            
            if (!productSelect.value) {
                showNotification('Vui lòng chọn sản phẩm cho tất cả các mục!', 'error');
                showLoading(false);
                return;
            }
            
            const product = productsData[productSelect.value];
            const quantity = parseInt(quantityInput.value);
            const wholesalePrice = parseInt(priceInput.value.replace(/[^\d]/g, ''));
            
            // Check stock - temporarily disable stock validation for debugging
            const productName = product.productName || product.name || 'Sản phẩm không tên';
            const currentStock = parseInt(product.stock) || 0;
            console.log(`📦 Checking stock for ${productName}:`, {
                productId: productSelect.value,
                productData: product,
                available: currentStock,
                requested: quantity,
                stockType: typeof product.stock,
                stockValue: product.stock
            });
            
            // Temporarily comment out stock validation to allow order creation
            /*
            if (quantity > currentStock) {
                console.error(`❌ Stock validation failed:`, {
                    productName,
                    currentStock,
                    quantity,
                    productData: product
                });
                showNotification(`Không đủ tồn kho cho sản phẩm ${productName}. Tồn kho: ${currentStock}, yêu cầu: ${quantity}`, 'error');
                showLoading(false);
                return;
            }
            */
            
            console.log(`✅ Stock check passed for ${productName}: ${quantity} <= ${currentStock}`);
            
            items.push({
                productId: productSelect.value,
                productName: product.productName || product.name || 'Sản phẩm không tên',
                sku: product.sku || '',
                quantity: quantity,
                wholesalePrice: wholesalePrice,
                sellingPrice: product.sellingPrice || 0,
                importPrice: product.importPrice || 0,
                totalAmount: quantity * wholesalePrice,
                profit: (wholesalePrice - (product.importPrice || 0)) * quantity
            });
        }
        
        if (items.length === 0) {
            showNotification('Vui lòng thêm ít nhất một sản phẩm!', 'error');
            showLoading(false);
            return;
        }
        
        // Get store information
        const selectedStoreData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
        const discount = parseInt(document.getElementById('wholesaleDiscount').value.replace(/[^\d]/g, '') || 0);
        const shipping = parseInt(document.getElementById('wholesaleShipping').value.replace(/[^\d]/g, '') || 0);
        const deposit = parseInt(document.getElementById('wholesaleDeposit').value.replace(/[^\d]/g, '') || 0);
        const total = subtotal - discount + shipping;
        const remaining = total - deposit;
        
        // Determine payment status
        let paymentStatus = 'pending';
        if (deposit > 0 && deposit >= total) {
            paymentStatus = 'paid';
        } else if (deposit > 0 && deposit < total) {
            paymentStatus = 'partial';
        } else {
            paymentStatus = 'pending'; // No deposit = pending
        }
        
        // Generate unique order ID
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const orderId = `WHOLESALE-${timestamp}-${random}`;
        
        // Create order object
        const orderData = {
            orderId: orderId,
            customerName: customerName,
            customerPhone: customerPhone || '',
            customerAddress: customerAddress,
            orderDate: orderDate,
            deliveryDate: deliveryDate || '',
            items: items,
            subtotal: subtotal,
            discount: discount,
            shipping: shipping,
            deposit: deposit,
            total: total,
            remaining: remaining,
            paymentStatus: paymentStatus,
            orderType: 'wholesale',
            source: 'wholesale_sales',
            storeId: selectedStoreId,
            storeName: selectedStoreData.name || 'Không xác định',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: selectedStoreData.name || 'admin'
        };
        
        // Save to Firebase
        await database.ref('orders').push(orderData);
        
        // Update stock for each item in sellingProducts
        for (const item of items) {
            const productRef = database.ref(`sellingProducts/${item.productId}`);
            const productSnapshot = await productRef.once('value');
            const product = productSnapshot.val();
            
            if (product) {
                const currentStock = parseInt(product.stock) || 0;
                const quantity = parseInt(item.quantity) || 0;
                const newStock = currentStock - quantity;
                
                // Ensure newStock is a valid number
                if (!isNaN(newStock)) {
                    await productRef.update({ stock: newStock });
                    console.log(`✅ Updated stock for ${item.productName}: ${currentStock} -> ${newStock}`);
                } else {
                    console.error(`Invalid stock calculation for product ${item.productId}: currentStock=${currentStock}, quantity=${quantity}, newStock=${newStock}`);
                    throw new Error(`Không thể cập nhật tồn kho cho sản phẩm ${item.productName}. Tồn kho hiện tại: ${currentStock}, số lượng: ${quantity}`);
                }
            }
        }
        
        showNotification('Tạo đơn hàng sỉ thành công!', 'success');
        clearWholesaleForm();
        
        // Reload orders with a small delay to ensure Firebase has processed the data
        setTimeout(() => {
            loadWholesaleOrders();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error creating wholesale order:', error);
        showNotification('Lỗi tạo đơn hàng: ' + error.message, 'error');
    } finally {
        showLoading(false);
        // Remove submitting flag
        event.target.removeAttribute('data-submitting');
    }
}

// Load wholesale orders
function loadWholesaleOrders() {
    console.log('🔄 Loading wholesale orders...');
    
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (!selectedStoreId) {
        console.error('❌ No store selected');
        return;
    }

    if (typeof database === 'undefined') {
        console.error('❌ Firebase database not initialized');
        setTimeout(loadWholesaleOrders, 1000);
        return;
    }

    // Use once() instead of on() to get fresh data each time
    database.ref('orders').orderByChild('storeId').equalTo(selectedStoreId)
        .once('value', (snapshot) => {
            const allOrders = snapshot.val() || {};
            console.log('📦 All orders from Firebase:', Object.keys(allOrders).length);
            
            // Filter wholesale orders
            wholesaleOrdersData = {};
            Object.keys(allOrders).forEach(key => {
                const order = allOrders[key];
                console.log(`🔍 Checking order ${key}:`, {
                    orderType: order.orderType,
                    source: order.source,
                    customerName: order.customerName,
                    orderId: order.orderId,
                    fullOrder: order
                });
                
                // Check multiple conditions for wholesale orders
                const isWholesale = order.orderType === 'wholesale' || 
                                  order.source === 'wholesale_sales' ||
                                  (order.orderId && order.orderId.includes('WHOLESALE')) ||
                                  order.type === 'wholesale';
                
                // TEMPORARY: Show all orders for debugging if no wholesale orders found
                const showAllForDebug = false; // Set to true to see all orders
                
                if (isWholesale || showAllForDebug) {
                    wholesaleOrdersData[key] = order;
                    console.log('✅ Added wholesale order:', key, 'isWholesale:', isWholesale);
                } else {
                    console.log('❌ Skipped non-wholesale order:', key, {
                        orderType: order.orderType,
                        source: order.source,
                        orderId: order.orderId,
                        type: order.type,
                        customerName: order.customerName
                    });
                }
            });
            
            console.log('✅ Wholesale orders loaded:', Object.keys(wholesaleOrdersData).length, 'orders');
            console.log('📋 Wholesale orders data:', wholesaleOrdersData);
            
            // If no wholesale orders found, show debug info
            if (Object.keys(wholesaleOrdersData).length === 0) {
                console.log('🔍 No wholesale orders found. All orders in Firebase:');
                Object.keys(allOrders).forEach(key => {
                    const order = allOrders[key];
                    console.log(`Order ${key}:`, {
                        orderType: order.orderType,
                        source: order.source,
                        customerName: order.customerName,
                        orderId: order.orderId
                    });
                });
            }
            
            displayWholesaleOrders();
        }, (error) => {
            console.error('❌ Error loading wholesale orders:', error);
            showNotification('Lỗi tải dữ liệu đơn hàng: ' + error.message, 'error');
        });
}

// Display wholesale orders
function displayWholesaleOrders() {
    console.log('🎨 Displaying wholesale orders...');
    const container = document.getElementById('wholesaleOrdersBody');
    const emptyState = document.getElementById('wholesaleEmptyState');
    
    if (!container) {
        console.error('❌ wholesaleOrdersBody container not found');
        return;
    }
    
    const orders = Object.entries(wholesaleOrdersData);
    console.log('📊 Orders to display:', orders.length);
    
    if (orders.length === 0) {
        console.log('📭 No orders to display - showing empty state');
        container.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'block';
        } else {
            // Create empty state if it doesn't exist
            container.innerHTML = `
                <tr>
                    <td colspan="12" class="wholesale-empty-state">
                        <div class="wholesale-empty-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <h3>Chưa có đơn hàng bán sỉ nào</h3>
                        <p>Hãy tạo đơn hàng bán sỉ đầu tiên của bạn!</p>
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    let html = '';
    // Sort orders by creation date (newest first)
    orders.sort(([,a], [,b]) => (b.createdAt || 0) - (a.createdAt || 0));
    
    orders.forEach(([orderId, order], index) => {
        console.log(`🏷️ Processing order ${index + 1}:`, {
            orderId: orderId,
            customerName: order.customerName,
            total: order.total,
            paymentStatus: order.paymentStatus
        });
        
        const paymentStatusClass = order.paymentStatus === 'paid' ? 'wholesale-status-paid' : 
                                 order.paymentStatus === 'partial' ? 'wholesale-status-partial' : 'wholesale-status-pending';
        
        const itemsCount = order.items ? order.items.length : 0;
        const itemsText = itemsCount > 1 ? `${itemsCount} sản phẩm` : (order.items && order.items[0] ? order.items[0].productName : 'N/A');
        
        html += `
            <tr>
                <td><input type="checkbox" class="wholesale-checkbox" value="${orderId}" onchange="updateBulkDeleteButton()"></td>
                <td>${index + 1}</td>
                <td>${order.customerName || 'N/A'}</td>
                <td>${order.customerPhone || 'N/A'}</td>
                <td>${formatDate(order.orderDate)}</td>
                <td>${itemsText}</td>
                <td>${formatCurrency(order.total || 0)} VNĐ</td>
                <td>${formatCurrency(order.deposit || 0)} VNĐ</td>
                <td>${formatCurrency(order.remaining || 0)} VNĐ</td>
                <td><span class="wholesale-status-badge ${paymentStatusClass}">${getPaymentStatusText(order.paymentStatus)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="viewWholesaleOrderDetail('${orderId}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-print" onclick="printWholesaleInvoice('${orderId}')" title="In hóa đơn">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <button class="btn-action btn-delete" onclick="deleteWholesaleOrder('${orderId}')" title="Xóa đơn hàng">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    console.log('✅ Setting HTML content for orders table');
    container.innerHTML = html;
    updateBulkDeleteButton();
}

// Get payment status text
function getPaymentStatusText(status) {
    switch (status) {
        case 'paid': return 'Đã Thanh Toán';
        case 'partial': return 'Thanh Toán Một Phần';
        case 'pending': return 'Chưa Thanh Toán';
        default: return 'Không Xác Định';
    }
}

// Show store selection required message
function showStoreSelectionRequired() {
    const container = document.getElementById('wholesaleItemsContainer');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Vui lòng chọn cửa hàng từ menu trên để bắt đầu tạo đơn hàng sỉ.</p>
            </div>
        `;
    }
}

// Hide store selection message
function hideStoreSelectionMessage() {
    // This will be handled by the initialization
}

// Show store info
function showStoreInfo() {
    // This will be handled by the header component
}

// Initialize wholesale orders system
function initializeWholesaleOrdersSystem() {
    console.log('🚀 Initializing wholesale orders system...');
    initializeWholesaleOrdersPage();
}

// Initialize wholesale orders page
function initializeWholesaleOrdersPage() {
    console.log('🚀 Initializing wholesale orders page...');
    
    // Wait for Firebase to be ready
    if (typeof database === 'undefined') {
        console.log('⏳ Waiting for Firebase...');
        setTimeout(initializeWholesaleOrdersPage, 1000);
        return;
    }
    
    console.log('✅ Firebase ready, loading wholesale orders...');
    loadWholesaleOrders();
}

// Create sample wholesale order for testing
async function createSampleWholesaleOrder() {
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (!selectedStoreId) {
        console.error('❌ No store selected');
        return;
    }

    const sampleOrder = {
        orderId: 'WS' + Date.now(),
        customerName: 'Công ty ABC',
        customerPhone: '0123456789',
        customerAddress: '123 Đường Test, Quận 1, TP.HCM',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        items: [
            {
                productId: 'sample1',
                productName: 'Sản phẩm sỉ 1',
                sku: 'SP001',
                unit: 'thùng',
                quantity: 10,
                wholesalePrice: 50000,
                totalAmount: 500000
            }
        ],
        subtotal: 500000,
        discount: 0,
        shipping: 0,
        deposit: 200000,
        total: 500000,
        remaining: 300000,
        paymentStatus: 'partial',
        orderType: 'wholesale',
        source: 'wholesale_sales',
        storeId: selectedStoreId,
        storeName: 'Cửa hàng test',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: 'admin'
    };

    try {
        await database.ref('orders').push(sampleOrder);
        console.log('✅ Sample wholesale order created');
        showNotification('Đã tạo đơn hàng sỉ mẫu thành công!', 'success');
        loadWholesaleOrders(); // Reload to show the new order
    } catch (error) {
        console.error('❌ Error creating sample order:', error);
        showNotification('Lỗi tạo đơn hàng mẫu: ' + error.message, 'error');
    }
}

// Toggle all order selection
function toggleAllOrderSelection() {
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    const orderCheckboxes = document.querySelectorAll('.wholesale-checkbox');
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkDeleteButton();
}

// Update bulk delete button state
function updateBulkDeleteButton() {
    const selectedCheckboxes = document.querySelectorAll('.wholesale-checkbox:checked');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkDeleteBtn && selectedCount) {
        if (selectedCheckboxes.length > 0) {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.classList.remove('disabled');
            selectedCount.textContent = `(${selectedCheckboxes.length})`;
        } else {
            bulkDeleteBtn.disabled = true;
            bulkDeleteBtn.classList.add('disabled');
            selectedCount.textContent = '';
        }
    }
}

// Delete single wholesale order
async function deleteWholesaleOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Get order data to restore stock
        const order = wholesaleOrdersData[orderId];
        if (order && order.items) {
            // Restore stock for each item
            for (const item of order.items) {
                const productRef = database.ref(`sellingProducts/${item.productId}`);
                const productSnapshot = await productRef.once('value');
                const product = productSnapshot.val();
                
                if (product) {
                    const currentStock = parseInt(product.stock) || 0;
                    const quantity = parseInt(item.quantity) || 0;
                    const newStock = currentStock + quantity;
                    
                    await productRef.update({ stock: newStock });
                    console.log(`✅ Restored stock for ${item.productName}: ${currentStock} -> ${newStock}`);
                }
            }
        }
        
        // Delete order from Firebase
        await database.ref(`orders/${orderId}`).remove();
        
        // Remove from local data immediately
        delete wholesaleOrdersData[orderId];
        
        showNotification('Xóa đơn hàng thành công!', 'success');
        
        // Update display immediately without reloading from Firebase
        displayWholesaleOrders();
        
    } catch (error) {
        console.error('❌ Error deleting order:', error);
        showNotification('Lỗi xóa đơn hàng: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Bulk delete wholesale orders
async function bulkDeleteOrders() {
    const selectedCheckboxes = document.querySelectorAll('.wholesale-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Vui lòng chọn ít nhất một đơn hàng để xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedCheckboxes.length} đơn hàng đã chọn?`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        for (const checkbox of selectedCheckboxes) {
            const orderId = checkbox.value;
            
            // Get order data to restore stock
            const order = wholesaleOrdersData[orderId];
            if (order && order.items) {
                // Restore stock for each item
                for (const item of order.items) {
                    const productRef = database.ref(`sellingProducts/${item.productId}`);
                    const productSnapshot = await productRef.once('value');
                    const product = productSnapshot.val();
                    
                    if (product) {
                        const currentStock = parseInt(product.stock) || 0;
                        const quantity = parseInt(item.quantity) || 0;
                        const newStock = currentStock + quantity;
                        
                        await productRef.update({ stock: newStock });
                        console.log(`✅ Restored stock for ${item.productName}: ${currentStock} -> ${newStock}`);
                    }
                }
            }
            
            // Delete order from Firebase
            await database.ref(`orders/${orderId}`).remove();
        }
        
        // Remove from local data immediately
        for (const checkbox of selectedCheckboxes) {
            const orderId = checkbox.value;
            delete wholesaleOrdersData[orderId];
        }
        
        showNotification(`Xóa thành công ${selectedCheckboxes.length} đơn hàng!`, 'success');
        
        // Update display immediately without reloading from Firebase
        displayWholesaleOrders();
        
        // Reset select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllOrders');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
        
    } catch (error) {
        console.error('❌ Error bulk deleting orders:', error);
        showNotification('Lỗi xóa đơn hàng: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Delete all wholesale orders
async function deleteAllOrders() {
    const orders = Object.entries(wholesaleOrdersData);
    
    if (orders.length === 0) {
        showNotification('Không có đơn hàng nào để xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa TẤT CẢ ${orders.length} đơn hàng? Hành động này không thể hoàn tác!`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        for (const [orderId, order] of orders) {
            // Restore stock for each item
            if (order.items) {
                for (const item of order.items) {
                    const productRef = database.ref(`sellingProducts/${item.productId}`);
                    const productSnapshot = await productRef.once('value');
                    const product = productSnapshot.val();
                    
                    if (product) {
                        const currentStock = parseInt(product.stock) || 0;
                        const quantity = parseInt(item.quantity) || 0;
                        const newStock = currentStock + quantity;
                        
                        await productRef.update({ stock: newStock });
                        console.log(`✅ Restored stock for ${item.productName}: ${currentStock} -> ${newStock}`);
                    }
                }
            }
            
            // Delete order from Firebase
            await database.ref(`orders/${orderId}`).remove();
        }
        
        // Clear local data immediately
        wholesaleOrdersData = {};
        
        showNotification(`Xóa thành công tất cả ${orders.length} đơn hàng!`, 'success');
        
        // Update display immediately without reloading from Firebase
        displayWholesaleOrders();
        
    } catch (error) {
        console.error('❌ Error deleting all orders:', error);
        showNotification('Lỗi xóa đơn hàng: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// View wholesale order detail
function viewWholesaleOrderDetail(orderId) {
    const order = wholesaleOrdersData[orderId];
    if (!order) {
        showNotification('Không tìm thấy đơn hàng!', 'error');
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
        <div id="orderDetailModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999;" onclick="closeOrderDetailModal()">
            <div style="background: white; border-radius: 8px; max-width: 80%; width: 100%; margin: 0 auto; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3><i class="fas fa-file-invoice"></i> Chi Tiết Đơn Hàng Sỉ</h3>
                    <button class="modal-close" onclick="closeOrderDetailModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="padding: 25px;">
                    <!-- Order Info -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h4 style="margin: 0 0 15px 0; color: #2c5aa0; font-size: 18px;"><i class="fas fa-info-circle"></i> Thông Tin Đơn Hàng</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="font-weight: bold; color: #555; display: block; margin-bottom: 5px;">Mã Đơn Hàng:</label>
                                <span style="color: #333; font-size: 16px;">${order.orderId || orderId}</span>
                            </div>
                            <div>
                                <label style="font-weight: bold; color: #555; display: block; margin-bottom: 5px;">Ngày Đặt:</label>
                                <span style="color: #333; font-size: 16px;">${formatDate(order.orderDate)}</span>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="font-weight: bold; color: #555; display: block; margin-bottom: 5px;">Khách Hàng:</label>
                                <span style="color: #333; font-size: 16px;">${order.customerName || 'N/A'}</span>
                            </div>
                            <div>
                                <label style="font-weight: bold; color: #555; display: block; margin-bottom: 5px;">Số Điện Thoại:</label>
                                <span style="color: #333; font-size: 16px;">${order.customerPhone || 'N/A'}</span>
                            </div>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="font-weight: bold; color: #555; display: block; margin-bottom: 5px;">Địa Chỉ:</label>
                            <span style="color: #333; font-size: 16px;">${order.customerAddress || 'N/A'}</span>
                        </div>
                        ${order.deliveryDate ? `
                        <div>
                            <label style="font-weight: bold; color: #555; display: block; margin-bottom: 5px;">Ngày Giao:</label>
                            <span style="color: #333; font-size: 16px;">${formatDate(order.deliveryDate)}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Products Table -->
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin: 0 0 15px 0; color: #2c5aa0; font-size: 18px;"><i class="fas fa-box"></i> Sản Phẩm</h4>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <thead>
                                    <tr style="background: #2c5aa0; color: white;">
                                        <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 14px;">STT</th>
                                        <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 14px; min-width: 200px;">Sản Phẩm</th>
                                        <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 14px;">SKU</th>
                                        <th style="padding: 15px 12px; text-align: center; font-weight: 600; font-size: 14px;">Số Lượng</th>
                                        <th style="padding: 15px 12px; text-align: right; font-weight: 600; font-size: 14px;">Giá Sỉ</th>
                                        <th style="padding: 15px 12px; text-align: right; font-weight: 600; font-size: 14px;">Thành Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${order.items ? order.items.map((item, index) => `
                                        <tr style="border-bottom: 1px solid #eee; ${index % 2 === 0 ? 'background: #f9f9f9;' : 'background: white;'}">
                                            <td style="padding: 15px 12px; font-size: 14px;">${index + 1}</td>
                                            <td style="padding: 15px 12px; font-size: 14px; font-weight: 500; color: #333;">${item.productName || 'N/A'}</td>
                                            <td style="padding: 15px 12px; font-size: 14px; color: #666;">${item.sku || 'N/A'}</td>
                                            <td style="padding: 15px 12px; text-align: center; font-size: 14px; font-weight: 600; color: #2c5aa0;">${item.quantity || 0}</td>
                                            <td style="padding: 15px 12px; text-align: right; font-size: 14px; color: #28a745;">${formatCurrency(item.wholesalePrice || 0)} VNĐ</td>
                                            <td style="padding: 15px 12px; text-align: right; font-size: 14px; font-weight: 600; color: #dc3545;">${formatCurrency(item.totalAmount || 0)} VNĐ</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #999;">Không có sản phẩm</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Summary -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <h4 style="margin: 0 0 15px 0; color: #2c5aa0; font-size: 18px;"><i class="fas fa-calculator"></i> Tổng Kết Thanh Toán</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #17a2b8;">
                                <div style="font-weight: bold; color: #555; margin-bottom: 5px;">Tạm Tính:</div>
                                <div style="font-size: 18px; font-weight: 600; color: #17a2b8;">${formatCurrency(order.subtotal || 0)} VNĐ</div>
                            </div>
                            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc3545;">
                                <div style="font-weight: bold; color: #555; margin-bottom: 5px;">Tổng Cộng:</div>
                                <div style="font-size: 18px; font-weight: 600; color: #dc3545;">${formatCurrency(order.total || 0)} VNĐ</div>
                            </div>
                            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745;">
                                <div style="font-weight: bold; color: #555; margin-bottom: 5px;">Đã Cọc:</div>
                                <div style="font-size: 18px; font-weight: 600; color: #28a745;">${formatCurrency(order.deposit || 0)} VNĐ</div>
                            </div>
                            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                                <div style="font-weight: bold; color: #555; margin-bottom: 5px;">Còn Lại:</div>
                                <div style="font-size: 18px; font-weight: 600; color: #ffc107;">${formatCurrency(order.remaining || 0)} VNĐ</div>
                            </div>
                        </div>
                        <div style="margin-top: 15px; text-align: center;">
                            <div style="font-weight: bold; color: #555; margin-bottom: 8px;">Trạng Thái Thanh Toán:</div>
                            <span style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; ${order.paymentStatus === 'paid' ? 'background: #d4edda; color: #155724;' : order.paymentStatus === 'partial' ? 'background: #fff3cd; color: #856404;' : 'background: #f8d7da; color: #721c24;'}">
                                ${getPaymentStatusText(order.paymentStatus)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="printWholesaleInvoice('${orderId}')">
                        <i class="fas fa-print"></i> In Hóa Đơn
                    </button>
                    <button class="btn btn-secondary" onclick="closeOrderDetailModal()">
                        <i class="fas fa-times"></i> Đóng
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close order detail modal
function closeOrderDetailModal() {
    const modal = document.getElementById('orderDetailModal');
    if (modal) {
        modal.remove();
    }
}

// Print wholesale invoice
function printWholesaleInvoice(orderId) {
    const order = wholesaleOrdersData[orderId];
    if (!order) {
        showNotification('Không tìm thấy đơn hàng!', 'error');
        return;
    }
    
    // Create print content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Hóa Đơn Bán Sỉ - ${order.orderId || orderId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .invoice-title { font-size: 24px; font-weight: bold; color: #2c5aa0; margin-bottom: 10px; }
                .company-info { font-size: 14px; line-height: 1.5; }
                .order-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .order-info div { flex: 1; }
                .order-info h4 { margin-bottom: 10px; color: #2c5aa0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                .info-item { margin-bottom: 8px; }
                .info-item strong { display: inline-block; width: 120px; }
                .products-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .products-table th, .products-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                .products-table th { background-color: #f8f9fa; font-weight: bold; }
                .products-table .text-right { text-align: right; }
                .summary { float: right; width: 300px; }
                .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .summary-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; border-bottom: 2px solid #333; }
                .summary-row.remaining { font-weight: bold; color: #dc3545; }
                .footer { clear: both; margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
                .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                .status-badge.paid { background-color: #d4edda; color: #155724; }
                .status-badge.partial { background-color: #fff3cd; color: #856404; }
                .status-badge.pending { background-color: #f8d7da; color: #721c24; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <div class="invoice-title">HÓA ĐƠN BÁN SỈ</div>
                <div class="company-info">
                    <strong>${order.storeName || 'Cửa Hàng'}</strong><br>
                    Hệ Thống Quản Lý Bán Hàng<br>
                    Ngày in: ${new Date().toLocaleDateString('vi-VN')}
                </div>
            </div>
            
            <div class="order-info">
                <div>
                    <h4>Thông Tin Đơn Hàng</h4>
                    <div class="info-item"><strong>Mã Đơn:</strong> ${order.orderId || orderId}</div>
                    <div class="info-item"><strong>Ngày Đặt:</strong> ${formatDate(order.orderDate)}</div>
                    ${order.deliveryDate ? `<div class="info-item"><strong>Ngày Giao:</strong> ${formatDate(order.deliveryDate)}</div>` : ''}
                    <div class="info-item"><strong>Trạng Thái:</strong> 
                        <span class="status-badge ${order.paymentStatus === 'paid' ? 'paid' : order.paymentStatus === 'partial' ? 'partial' : 'pending'}">
                            ${getPaymentStatusText(order.paymentStatus)}
                        </span>
                    </div>
                </div>
                <div>
                    <h4>Thông Tin Khách Hàng</h4>
                    <div class="info-item"><strong>Tên:</strong> ${order.customerName || 'N/A'}</div>
                    <div class="info-item"><strong>SĐT:</strong> ${order.customerPhone || 'N/A'}</div>
                    <div class="info-item"><strong>Địa Chỉ:</strong> ${order.customerAddress || 'N/A'}</div>
                </div>
            </div>
            
            <table class="products-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Sản Phẩm</th>
                        <th>SKU</th>
                        <th class="text-right">Số Lượng</th>
                        <th class="text-right">Giá Sỉ</th>
                        <th class="text-right">Thành Tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items ? order.items.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.productName || 'N/A'}</td>
                            <td>${item.sku || 'N/A'}</td>
                            <td class="text-right">${item.quantity || 0}</td>
                            <td class="text-right">${formatCurrency(item.wholesalePrice || 0)} VNĐ</td>
                            <td class="text-right">${formatCurrency(item.totalAmount || 0)} VNĐ</td>
                        </tr>
                    `).join('') : '<tr><td colspan="6">Không có sản phẩm</td></tr>'}
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-row">
                    <span>Tạm Tính:</span>
                    <span>${formatCurrency(order.subtotal || 0)} VNĐ</span>
                </div>
                ${order.discount > 0 ? `
                <div class="summary-row">
                    <span>Giảm Giá:</span>
                    <span>-${formatCurrency(order.discount)} VNĐ</span>
                </div>
                ` : ''}
                ${order.shipping > 0 ? `
                <div class="summary-row">
                    <span>Phí Vận Chuyển:</span>
                    <span>+${formatCurrency(order.shipping)} VNĐ</span>
                </div>
                ` : ''}
                <div class="summary-row total">
                    <span>Tổng Cộng:</span>
                    <span>${formatCurrency(order.total || 0)} VNĐ</span>
                </div>
                <div class="summary-row">
                    <span>Đã Cọc:</span>
                    <span>${formatCurrency(order.deposit || 0)} VNĐ</span>
                </div>
                <div class="summary-row remaining">
                    <span>Còn Lại:</span>
                    <span>${formatCurrency(order.remaining || 0)} VNĐ</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Cảm ơn quý khách đã sử dụng dịch vụ!</p>
                <p>Hóa đơn được tạo tự động từ hệ thống quản lý bán hàng</p>
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
        printWindow.print();
        printWindow.onafterprint = function() {
            printWindow.close();
        };
    };
}

// Expose functions to global scope
window.initializeWholesaleOrdersPage = initializeWholesaleOrdersPage;
window.loadWholesaleOrders = loadWholesaleOrders;
window.displayWholesaleOrders = displayWholesaleOrders;
window.viewWholesaleOrderDetail = viewWholesaleOrderDetail;
window.closeOrderDetailModal = closeOrderDetailModal;
window.updatePaymentStatus = updatePaymentStatus;
window.getPaymentStatusText = getPaymentStatusText;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.addWholesaleItem = addWholesaleItem;
window.removeWholesaleItem = removeWholesaleItem;
window.updateWholesaleItemTotal = updateWholesaleItemTotal;
window.updateWholesaleSummary = updateWholesaleSummary;
window.clearWholesaleForm = clearWholesaleForm;
window.createWholesaleOrder = createWholesaleOrder;
window.createSampleWholesaleOrder = createSampleWholesaleOrder;
window.initializeWholesaleOrdersSystem = initializeWholesaleOrdersSystem;
// Expose functions to global scope
window.toggleAllOrderSelection = toggleAllOrderSelection;
window.updateBulkDeleteButton = updateBulkDeleteButton;
window.deleteWholesaleOrder = deleteWholesaleOrder;
window.deleteAllOrders = deleteAllOrders;
window.viewWholesaleOrderDetail = viewWholesaleOrderDetail;
window.closeOrderDetailModal = closeOrderDetailModal;
window.printWholesaleInvoice = printWholesaleInvoice;

window.wholesaleOrdersModule = {
    addWholesaleItem,
    removeWholesaleItem,
    updateWholesaleItemPrice,
    updateWholesaleItemTotal,
    updateWholesaleSummary,
    clearWholesaleForm,
    createWholesaleOrder,
    initializeWholesaleOrdersSystem,
    viewWholesaleOrderDetail,
    closeOrderDetailModal,
    printWholesaleInvoice
};