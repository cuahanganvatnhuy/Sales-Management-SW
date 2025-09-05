// Sales Orders Management - Retail (Bán Lẻ)
// Manages retail orders using selling products with profit calculation
let retailOrdersData = {};
let sellingProductsData = {};

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

// Load selling products and retail orders when page loads
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeRetailOrdersPage();
    }, 200);
    
    setDefaultDate();
    generateRetailOrderForms();
});

// Initialize retail orders page with store context
function initializeRetailOrdersPage() {
    if (typeof isStoreSelected === 'function' && isStoreSelected()) {
        loadSellingProducts();
        loadRetailOrders();
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
        loadRetailOrders();
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
            console.log('Loading retail orders for store:', storeData.name);
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
                <p>Bạn cần chọn cửa hàng trước khi tạo đơn hàng bán lẻ.</p>
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
        location.reload();
    }
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const orderDateInput = document.getElementById('orderDate');
    if (orderDateInput) {
        orderDateInput.value = today;
    }
}

// Get selected store ID
function getSelectedStoreId() {
    const storeId = localStorage.getItem('selectedStoreId');
    console.log('Getting selected store ID:', storeId);
    return storeId;
}

async function loadSellingProducts() {
    try {
        console.log('🔥 Starting loadSellingProducts function for retail...');
        console.log('🔥 Firebase database object:', database);
        
        // Always load from sellingProducts table for correct business logic
        const sellingProductsRef = database.ref('sellingProducts');
        console.log('🔥 Created reference to sellingProducts:', sellingProductsRef);
        
        const snapshot = await sellingProductsRef.once('value');
        console.log('🔥 Got snapshot from Firebase:', snapshot);
        
        const data = snapshot.val();
        console.log('🔥 Raw selling products data from Firebase:', data);
        console.log('🔥 Data type:', typeof data);
        console.log('🔥 Data keys:', data ? Object.keys(data) : 'No data');
        
        sellingProductsData = {};
        if (data) {
            Object.keys(data).forEach(key => {
                const product = {
                    id: key,
                    ...data[key]
                };
                console.log(`🔥 Checking product ${key}:`, {
                    productName: product.productName,
                    status: product.status,
                    statusType: typeof product.status,
                    currentStock: product.currentStock,
                    inventory: product.inventory,
                    productId: product.productId
                });
                
                // Only include products with status "active" (matching selling-products.js logic)
                if (product.status === 'active') {
                    console.log(`✅ Product ${key} included - status matches "active"`);
                    sellingProductsData[key] = product;
                } else {
                    console.log(`❌ Product ${key} excluded - status: "${product.status}" !== "active"`);
                }
            });
        }
        
        console.log('🔥 === LOADED SELLING PRODUCTS (RETAIL) ===');
        console.log('🔥 Product count:', Object.keys(sellingProductsData).length);
        console.log('🔥 Filtered sellingProductsData:', sellingProductsData);
        
        // Force regenerate forms if they exist
        const container = document.getElementById('retailOrderFormsContainer');
        if (container && container.innerHTML.trim() !== '' && !container.innerHTML.includes('alert-info')) {
            const orderCountInput = document.getElementById('orderCount');
            if (orderCountInput && orderCountInput.value) {
                generateRetailOrderForms();
            }
        }
        
    } catch (error) {
        console.error('🔥 Error loading selling products:', error);
        console.error('🔥 Error details:', error.message);
        console.error('🔥 Error stack:', error.stack);
        showNotification('Lỗi tải danh sách sản phẩm bán!', 'error');
    }
}

// Load retail orders from Firebase
async function loadRetailOrders() {
    try {
        let allRetailOrdersData = {};
        
        if (typeof getStoreDataPath === 'function') {
            const retailOrdersPath = getStoreDataPath('retailOrders');
            const snapshot = await database.ref(retailOrdersPath).once('value');
            allRetailOrdersData = snapshot.val() || {};
        } else {
            const snapshot = await database.ref('retailOrders').once('value');
            allRetailOrdersData = snapshot.val() || {};
        }
        
        // Filter retail orders
        retailOrdersData = {};
        for (const [orderId, order] of Object.entries(allRetailOrdersData)) {
            const orderType = order.orderType || order.type;
            
            if (!orderType || orderType === 'retail') {
                retailOrdersData[orderId] = order;
            }
        }
        
        console.log('Filtered retail orders:', Object.keys(retailOrdersData).length);
        displayRetailOrders();
    } catch (error) {
        console.error('Error loading retail orders:', error);
        showNotification('Lỗi tải danh sách đơn hàng bán lẻ!', 'error');
    }
}

// Generate retail order forms based on count
function generateRetailOrderForms() {
    const orderCountInput = document.getElementById('orderCount');
    const orderCount = parseInt(orderCountInput.value);
    const container = document.getElementById('retailOrderFormsContainer');
    
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
    
    if (!sellingProductsData || Object.keys(sellingProductsData).length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Chưa có sản phẩm bán nào trong hệ thống!</p>
                <p>Vui lòng <a href="selling-products.html">thêm sản phẩm bán</a> trước khi tạo đơn hàng.</p>
            </div>
        `;
        return;
    }
    
    // Check if showLoading function exists
    if (typeof showLoading === 'function') {
        showLoading(true);
    }
    
    setTimeout(() => {
        generateRetailOrderFormsContent(orderCount, container);
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        showNotification(`Đã tạo ${orderCount} form đơn hàng bán lẻ!`, 'success');
    }, 300);
}

// Generate retail order forms content
function generateRetailOrderFormsContent(orderCount, container) {
    let formsHTML = '';
    
    for (let i = 1; i <= orderCount; i++) {
        formsHTML += `
            <div class="order-form" id="retailOrderForm_${i}">
                <div class="order-header">
                    <div class="order-title">
                        <i class="fas fa-shopping-cart"></i>
                        sản phẩm ${i}
                    </div>
                    ${orderCount > 1 ? `
                        <button type="button" class="delete-order-btn" onclick="deleteRetailOrderForm(${i})">
                            <i class="fas fa-trash"></i>
                            Xóa
                        </button>
                    ` : ''}
                </div>
                <div class="form-row four-fields-row">
                    <div class="form-group">
                        <label for="retailProduct_${i}">Sản Phẩm:</label>
                        <div id="retailProductSelect_${i}" class="product-select-container"></div>
                        <input type="hidden" id="retailProduct_${i}" name="retailProduct_${i}" required>
                    </div>
                    <div class="form-group">
                        <label for="retailSku_${i}">SKU:</label>
                        <input type="text" id="retailSku_${i}" name="retailSku_${i}" readonly 
                               placeholder="SKU sẽ tự động cập nhật">
                    </div>
                    <div class="form-group">
                        <label for="retailQuantity_${i}" id="retailQuantityLabel_${i}">Số Lượng:</label>
                        <input type="number" id="retailQuantity_${i}" name="retailQuantity_${i}" 
                               min="0.1" step="0.1" required 
                               oninput="calculateRetailOrderTotal(${i})" 
                               placeholder="Nhập số lượng">
                    </div>
                    <div class="form-group">
                        <label for="retailImportPrice_${i}">Giá Nhập:</label>
                        <input type="text" id="retailImportPrice_${i}" name="retailImportPrice_${i}" readonly 
                               placeholder="Giá nhập">
                    </div>
                </div>
                <div class="form-row profit-row">
                    <div class="form-group">
                        <label for="retailPrice_${i}" id="retailPriceLabel_${i}">Giá Bán:</label>
                        <input type="text" id="retailPrice_${i}" name="retailPrice_${i}" readonly 
                               placeholder="Giá bán sẽ tự động cập nhật">
                    </div>
                    <div class="form-group">
                        <label for="retailProfit_${i}">Lợi Nhuận:</label>
                        <input type="text" id="retailProfit_${i}" name="retailProfit_${i}" readonly 
                               placeholder="Lợi nhuận sẽ tự động tính" class="profit-input">
                    </div>
                    <div class="form-group">
                        <label for="retailTotal_${i}">Tổng Tiền:</label>
                        <input type="text" id="retailTotal_${i}" name="retailTotal_${i}" readonly 
                               placeholder="Tổng tiền sẽ tự động tính" class="total-input">
                    </div>
                </div>
            </div>
        `;
    }
    
    // Add "Add New Order" button at the end
    // Removed add product button section
    
    container.innerHTML = formsHTML;
    initializeRetailProductSelects(orderCount);
}

// Initialize SearchableSelect for selling product dropdowns
function initializeRetailProductSelects(orderCount, isSingleForm = false) {
    console.log('=== INITIALIZING RETAIL PRODUCT SELECTS ===');
    console.log('Order count:', orderCount);
    console.log('Is single form:', isSingleForm);
    console.log('Selling products data:', sellingProductsData);
    console.log('Number of selling products:', Object.keys(sellingProductsData).length);
    
    const productData = Object.keys(sellingProductsData).map(id => ({
        id: id,
        name: sellingProductsData[id].productName,
        sellingPrice: sellingProductsData[id].sellingPrice,
        importPrice: sellingProductsData[id].importPrice
    }));
    
    console.log('Product data for SearchableSelect:', productData);
    
    // Handle single form initialization (for new added forms)
    if (isSingleForm) {
        const i = orderCount; // orderCount is actually the form number for single form
        const selectElement = document.getElementById(`retailProduct_${i}`);
        
        console.log(`🔍 Initializing SearchableSelect for form ${i}`);
        console.log('Select element found:', !!selectElement);
        console.log('SearchableSelect available:', typeof SearchableSelect !== 'undefined');
        console.log('Product data count:', productData.length);
        
        if (selectElement) {
            console.log(`🔧 Processing select element for form ${i}:`, selectElement);
            
            // Clear existing options first
            selectElement.innerHTML = '<option value="">Chọn sản phẩm bán...</option>';
            
            // Add all products as options (fallback)
            productData.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                selectElement.appendChild(option);
            });
            
            console.log(`📝 Added ${productData.length} options to select element`);
            
            // Force refresh the select element
            selectElement.style.display = 'none';
            selectElement.offsetHeight; // Trigger reflow
            selectElement.style.display = '';
            
            // Try to initialize SearchableSelect
            if (typeof SearchableSelect !== 'undefined') {
                try {
                    // Destroy any existing SearchableSelect instance
                    if (selectElement._searchableSelect) {
                        console.log('🗑️ Destroying existing SearchableSelect instance');
                        selectElement._searchableSelect.destroy();
                        delete selectElement._searchableSelect;
                    }
                    
                    // Wait a bit more before initializing
                    setTimeout(() => {
                        const searchableSelectInstance = new SearchableSelect(selectElement, {
                            data: productData,
                            searchPlaceholder: 'Tìm kiếm sản phẩm...',
                            noResultsText: 'Không tìm thấy sản phẩm nào',
                            onSelect: function(selectedData) {
                                console.log('Product selected:', selectedData);
                                handleRetailProductSelection(i, selectedData);
                            }
                        });
                        
                        // Store reference to destroy later if needed
                        selectElement._searchableSelect = searchableSelectInstance;
                        
                        console.log(`✅ SearchableSelect initialized for form ${i}`);
                    }, 100);
                    
                } catch (error) {
                    console.error('❌ Error initializing SearchableSelect:', error);
                    // Fallback to regular select with change event
                    selectElement.addEventListener('change', function() {
                        if (this.value) {
                            const selectedProduct = productData.find(p => p.id === this.value);
                            if (selectedProduct) {
                                handleRetailProductSelection(i, selectedProduct);
                            }
                        }
                    });
                }
            } else {
                console.warn('⚠️ SearchableSelect not available, using regular select');
                // Add change event listener for regular select
                selectElement.addEventListener('change', function() {
                    if (this.value) {
                        const selectedProduct = productData.find(p => p.id === this.value);
                        if (selectedProduct) {
                            handleRetailProductSelection(i, selectedProduct);
                        }
                    }
                });
            }
        } else {
            console.error('❌ Select element not found for form:', i);
        }
        return;
    }
    
    // Handle multiple forms initialization
    for (let i = 1; i <= orderCount; i++) {
        const container = document.getElementById(`retailProductSelect_${i}`);
        console.log(`Container for product ${i}:`, container);
        
        if (container) {
            // Check if SearchableSelect is available
            if (typeof SearchableSelect === 'undefined') {
                console.error('SearchableSelect is not defined! Creating simple select instead.');
                // Create simple select as fallback
                let selectHTML = '<select class="form-control" onchange="handleRetailProductSelection(' + i + ', this.value)">';
                selectHTML += '<option value="">Chọn sản phẩm bán...</option>';
                productData.forEach(product => {
                    selectHTML += `<option value="${product.id}">${product.name}</option>`;
                });
                selectHTML += '</select>';
                container.innerHTML = selectHTML;
            } else {
                const searchableSelect = new SearchableSelect(container, {
                    placeholder: 'Chọn sản phẩm bán...',
                    searchPlaceholder: 'Tìm kiếm sản phẩm...',
                    noResultsText: 'Không tìm thấy sản phẩm nào'
                });
                
                searchableSelect.setData(productData);
                
                searchableSelect.onSelect = (selectedProduct) => {
                    const hiddenInput = document.getElementById(`retailProduct_${i}`);
                    hiddenInput.value = selectedProduct.id;
                    updateRetailOrderPrice(i, selectedProduct.id);
                };
            }
        }
    }
}

// Fallback function for simple select
function handleRetailProductSelection(orderIndex, productId) {
    const hiddenInput = document.getElementById(`retailProduct_${orderIndex}`);
    hiddenInput.value = productId;
    updateRetailOrderPrice(orderIndex, productId);
}

// Update retail order price when product is selected
function updateRetailOrderPrice(orderIndex, productId = null) {
    if (!productId) {
        const hiddenInput = document.getElementById(`retailProduct_${orderIndex}`);
        productId = hiddenInput.value;
    }
    
    if (!productId || !sellingProductsData[productId]) {
        document.getElementById(`retailPrice_${orderIndex}`).value = '';
        document.getElementById(`retailSku_${orderIndex}`).value = '';
        document.getElementById(`retailImportPrice_${orderIndex}`).value = '';
        document.getElementById(`retailProfit_${orderIndex}`).value = '';
        document.getElementById(`retailTotal_${orderIndex}`).value = '';
        return;
    }
    
    const sellingProduct = sellingProductsData[productId];
    const priceInput = document.getElementById(`retailPrice_${orderIndex}`);
    const skuInput = document.getElementById(`retailSku_${orderIndex}`);
    const importPriceInput = document.getElementById(`retailImportPrice_${orderIndex}`);
    const quantityInput = document.getElementById(`retailQuantity_${orderIndex}`);
    const profitInput = document.getElementById(`retailProfit_${orderIndex}`);
    const totalInput = document.getElementById(`retailTotal_${orderIndex}`);
    
    // Set values
    priceInput.value = formatCurrency(sellingProduct.sellingPrice);
    skuInput.value = sellingProduct.sku || 'N/A';
    importPriceInput.value = formatCurrency(sellingProduct.importPrice || 0);
    
    // Calculate profit and total if quantity exists
    const quantity = parseFloat(quantityInput.value) || 0;
    if (quantity > 0) {
        const sellingPrice = sellingProduct.sellingPrice || 0;
        const importPrice = sellingProduct.importPrice || 0;
        const profitPerUnit = sellingPrice - importPrice;
        const totalProfit = profitPerUnit * quantity;
        const totalAmount = sellingPrice * quantity;
        
        profitInput.value = formatCurrency(totalProfit);
        totalInput.value = formatCurrency(totalAmount);
    } else {
        profitInput.value = '';
        totalInput.value = '';
    }
}

// Calculate retail order total when quantity changes
function calculateRetailOrderTotal(orderIndex) {
    const hiddenInput = document.getElementById(`retailProduct_${orderIndex}`);
    const productId = hiddenInput.value;
    
    if (productId && sellingProductsData[productId]) {
        updateRetailOrderPrice(orderIndex, productId);
    }
}

// Delete retail order form
function deleteRetailOrderForm(orderNumber) {
    const form = document.getElementById(`retailOrderForm_${orderNumber}`);
    if (form) {
        form.remove();
        showNotification(`Đã xóa đơn hàng ${orderNumber}`, 'success');
    }
}

// Create retail orders
async function createRetailOrders(event) {
    if (event) {
        event.preventDefault();
    }
    
    console.log('🚀 Starting createRetailOrders function');
    
    const orderDate = document.getElementById('orderDate').value;
    const orderTime = document.getElementById('orderTime').value;
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    
    console.log('📝 Form data:', { orderDate, orderTime, customerName, customerPhone });
    
    if (!orderDate) {
        showNotification('Vui lòng chọn ngày bán!', 'error');
        return;
    }
    
    if (!orderTime) {
        showNotification('Vui lòng chọn giờ bán!', 'error');
        return;
    }
    
    if (!customerName || !customerName.trim()) {
        showNotification('Vui lòng nhập tên khách hàng!', 'error');
        return;
    }
    
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    const storeInfo = getCurrentStoreData();
    if (!selectedStoreId || !storeInfo) {
        showNotification('Vui lòng chọn cửa hàng trước khi tạo đơn!', 'error');
        return;
    }
    
    const orderItems = [];
    let hasError = false;
    
    // Get all order forms and process them dynamically
    const orderForms = document.querySelectorAll('.order-form[id^="retailOrderForm_"]');
    console.log(`📊 Found ${orderForms.length} order forms to process`);
    
    if (orderForms.length === 0) {
        showNotification('Vui lòng tạo ít nhất một form sản phẩm!', 'error');
        return;
    }
    
    // Process each form dynamically
    orderForms.forEach((form, index) => {
        const formId = form.id.match(/retailOrderForm_(\d+)/);
        if (!formId) return;
        
        const formNumber = formId[1];
        console.log(`🔍 Processing form ${formNumber}:`);
        
        const productSelect = document.getElementById(`retailProduct_${formNumber}`);
        const quantityInput = document.getElementById(`retailQuantity_${formNumber}`);
        const sellingPriceInput = document.getElementById(`retailPrice_${formNumber}`);
        
        console.log('Form elements:', {
            productSelect: !!productSelect,
            quantityInput: !!quantityInput, 
            sellingPriceInput: !!sellingPriceInput
        });
        
        if (!productSelect || !quantityInput || !sellingPriceInput) {
            console.warn(`⚠️ Missing form elements for product ${formNumber}`);
            return;
        }
        
        const productId = productSelect.value;
        const quantity = parseFloat(quantityInput.value) || 0;
        const sellingPriceText = sellingPriceInput.value.replace(/[^\d]/g, '');
        const sellingPrice = parseFloat(sellingPriceText) || 0;
        
        console.log(`📝 Form ${formNumber} data:`, { 
            productId, 
            quantity, 
            sellingPrice,
            sellingPriceText: sellingPriceInput.value
        });
        
        if (!productId) {
            showNotification(`Vui lòng chọn sản phẩm ${formNumber}!`, 'error');
            hasError = true;
            return;
        }
    
        if (!quantity || quantity <= 0) {
            showNotification(`Vui lòng nhập số lượng hợp lệ cho sản phẩm ${formNumber}!`, 'error');
            hasError = true;
            return;
        }
        
        const sellingProduct = sellingProductsData[productId];
        if (!sellingProduct) {
            showNotification(`Sản phẩm không tồn tại cho sản phẩm ${formNumber}!`, 'error');
            hasError = true;
            return;
        }
        
        const importPrice = parseFloat(sellingProduct.importPrice) || 0;
        const profitPerUnit = sellingPrice - importPrice;
        const totalProfit = profitPerUnit * quantity;
        const totalAmount = sellingPrice * quantity;
        
        const orderItem = {
            productId: productId,
            productName: sellingProduct.productName,
            sku: sellingProduct.sku,
            quantity: quantity,
            sellingPrice: sellingPrice,
            importPrice: importPrice,
            profitPerUnit: profitPerUnit,
            totalProfit: totalProfit,
            totalAmount: totalAmount
        };
        
        orderItems.push(orderItem);
        console.log(`✅ Added order item for product ${formNumber}:`, orderItem);
    });
    
    if (hasError) {
        console.log('❌ Validation errors found, stopping order creation');
        return;
    }
    
    console.log(`📦 Total order items collected: ${orderItems.length}`);
    
    // Calculate order totals
    const orderSubtotal = orderItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalProfit = orderItems.reduce((sum, item) => sum + item.totalProfit, 0);
    
    // Get discount and shipping values
    const discountInput = document.getElementById('retailDiscount');
    const shippingInput = document.getElementById('retailShipping');
    
    const discount = discountInput ? parseInt(discountInput.value.replace(/[^\d]/g, '') || 0) : 0;
    const shipping = shippingInput ? parseInt(shippingInput.value.replace(/[^\d]/g, '') || 0) : 0;
    
    const finalAmount = orderSubtotal - discount + shipping;
    
    // Create single order with multiple items
    const orderId = `RETAIL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const retailOrder = {
        orderId: orderId,
        items: orderItems,
        orderDate: orderDate,
        orderTime: orderTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone ? customerPhone.trim() : '',
        subtotal: orderSubtotal,
        discount: discount,
        shipping: shipping,
        totalAmount: finalAmount,
        totalProfit: totalProfit,
        itemCount: orderItems.length,
        source: 'retail_sales',
        orderType: 'retail',
        createdAt: new Date().toISOString(),
        storeId: selectedStoreId,
        storeName: storeInfo.name,
        status: 'pending'
    };
    
    try {
        if (typeof showLoading === 'function') {
            showLoading(true);
        }
        console.log('=== Creating retail order ===');
        console.log('Order items count:', orderItems.length);
        console.log('Retail order:', retailOrder);
        
        if (typeof getStoreDataPath === 'function') {
            const retailOrdersPath = getStoreDataPath('retailOrders');
            console.log('Saving to store path:', retailOrdersPath);
            
            const orderRef = database.ref(retailOrdersPath).push();
            await orderRef.set(retailOrder);
            console.log('Retail order saved with ID:', orderRef.key, 'Order ID:', retailOrder.orderId);
        } else {
            // Save to global retailOrders collection
            const orderRef = database.ref('retailOrders').push();
            await orderRef.set(retailOrder);
        }
        
        showNotification(`Đã tạo thành công đơn hàng bán lẻ với ${orderItems.length} sản phẩm!`, 'success');
        
        // Reset form first
        const form = document.getElementById('addRetailOrderForm');
        const formsContainer = document.getElementById('retailOrderFormsContainer');
        
        form.classList.add('form-reset-animation');
        
        setTimeout(() => {
            form.reset();
            
            // Set default date and time
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const timeStr = today.toTimeString().slice(0, 5);
            
            const dateInput = document.getElementById('orderDate');
            const timeInput = document.getElementById('orderTime');
            
            if (dateInput) dateInput.value = dateStr;
            if (timeInput) timeInput.value = timeStr;
            
            formsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <p>Nhập số lượng đơn hàng bán và nhấn "Xác Nhận" để tạo các form đơn hàng.</p>
                </div>
            `;
            
            // Reset order count
            const orderCountInput = document.getElementById('orderCount');
            if (orderCountInput) orderCountInput.value = '1';
            
            // Reset summary
            if (typeof updateRetailSummary === 'function') {
                updateRetailSummary();
            }
            
            form.classList.remove('form-reset-animation');
        }, 250);
        
        // Load retail orders to update the display
        console.log('🔄 Loading retail orders after creation...');
        setTimeout(async () => {
            await loadRetailOrders();
            console.log('✅ Retail orders reloaded successfully');
            
            // Scroll to the orders table to show new order
            const ordersTable = document.querySelector('#salesOrdersContainer');
            if (ordersTable) {
                ordersTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
                console.log('📍 Scrolled to orders table');
            }
        }, 1000);
        
    } catch (error) {
        console.error('=== Error creating retail orders ===');
        console.error('Error details:', error);
        
        let errorMessage = 'Lỗi tạo đơn hàng bán lẻ!';
        if (error.message) {
            errorMessage += ` Chi tiết: ${error.message}`;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
    }
}

// Display retail orders
function displayRetailOrders() {
    const container = document.getElementById('retailOrdersContainer');
    console.log('🎯 displayRetailOrders called');
    console.log('Container found:', !!container);
    console.log('retailOrdersData:', retailOrdersData);
    console.log('Number of orders:', retailOrdersData ? Object.keys(retailOrdersData).length : 0);
    
    if (!container) {
        console.error('❌ retailOrdersContainer not found');
        return;
    }
    
    if (!retailOrdersData || Object.keys(retailOrdersData).length === 0) {
        container.innerHTML = '<tr><td colspan="14">Chưa có đơn hàng bán lẻ nào</td></tr>';
        console.log('📝 No orders to display');
        return;
    }
    
    let html = '';
    let stt = 1;
    
    Object.keys(retailOrdersData).forEach(key => {
        const order = retailOrdersData[key];
        const orderDate = new Date(order.orderDate).toLocaleDateString('vi-VN');
        const orderTime = order.orderTime || '';
        const createdAt = new Date(order.createdAt).toLocaleDateString('vi-VN');
        
        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount || 0);
        };
        
        // Handle both old format (single product) and new format (multiple items)
        if (order.items && Array.isArray(order.items)) {
            // New format: Multiple items in one order
            const itemsText = order.items.map(item => `${item.productName} (${item.quantity})`).join(', ');
            const skuText = order.items.map(item => item.sku).join(', ');
            
            html += `
                <tr>
                    <td>
                        <input type="checkbox" class="product-checkbox" value="${key}">
                    </td>
                    <td>${stt}</td>
                    <td>${order.orderId || 'N/A'}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.customerPhone || 'N/A'}</td>
                    <td title="${itemsText}">${order.items.map(item => item.productName).join(', ')}</td>
                    <td title="${skuText}">${order.items.map(item => item.sku).join(', ')}</td>
                    <td>${order.items.reduce((total, item) => total + (item.quantity || 0), 0)}</td>
                    <td>${formatCurrency(order.items[0]?.sellingPrice || 0)}</td>
                    <td>${formatCurrency(order.totalAmount)}</td>
                    <td>${order.storeName || 'N/A'}</td>
                    <td>${orderDate}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-info" onclick="viewRetailOrderDetails('${key}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-success" onclick="printRetailInvoice('${key}')" title="In hóa đơn">
                            <i class="fas fa-print"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="deleteRetailOrder('${key}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            // Old format: Single product per order
            html += `
                <tr>
                    <td>
                        <input type="checkbox" class="product-checkbox" value="${key}">
                    </td>
                    <td>${stt}</td>
                    <td>${order.orderId || 'N/A'}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.customerPhone || 'N/A'}</td>
                    <td>${order.productName || 'N/A'}</td>
                    <td>${order.sku || 'N/A'}</td>
                    <td>${order.quantity || 0}</td>
                    <td>${formatCurrency(order.sellingPrice)}</td>
                    <td>${formatCurrency(order.totalAmount)}</td>
                    <td>${order.storeName || 'N/A'}</td>
                    <td>${orderDate}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-success" onclick="printRetailInvoice('${key}')" title="In hóa đơn">
                            <i class="fas fa-print"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="deleteRetailOrder('${key}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
        stt++;
    });
    
    console.log(`📋 Generated HTML for ${stt-1} orders`);
    console.log('HTML length:', html.length);
    container.innerHTML = html;
    console.log('✅ Orders displayed in container');
}

// Print retail invoice
function printRetailInvoice(orderKey) {
    const order = retailOrdersData[orderKey];
    if (!order) {
        showNotification('Không tìm thấy đơn hàng!', 'error');
        return;
    }
    
    console.log('🖨️ Printing invoice for order:', order.orderId);
    
    // Get store info
    const storeInfo = getCurrentStoreData();
    
    // Create invoice HTML
    let invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Hóa Đơn Bán Lẻ - ${order.orderId}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    padding: 30px;
                    border: 1px solid #ddd;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #4CAF50;
                    padding-bottom: 20px;
                }
                .store-name {
                    font-size: 24px;
                    font-weight: bold;
                    color: #4CAF50;
                    margin-bottom: 10px;
                }
                .store-info {
                    color: #666;
                    font-size: 14px;
                }
                .invoice-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-align: center;
                }
                .info-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                }
                .customer-info, .order-info {
                    width: 48%;
                }
                .info-title {
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                }
                .info-item {
                    margin-bottom: 8px;
                    display: flex;
                }
                .info-label {
                    font-weight: bold;
                    width: 120px;
                    color: #555;
                }
                .products-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .products-table th,
                .products-table td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }
                .products-table th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                    text-align: center;
                }
                .products-table td:last-child,
                .products-table th:last-child {
                    text-align: right;
                }
                .total-section {
                    margin-top: 20px;
                    text-align: right;
                }
                .total-row {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 8px;
                }
                .total-label {
                    width: 150px;
                    font-weight: bold;
                    text-align: right;
                    margin-right: 20px;
                }
                .total-value {
                    width: 150px;
                    text-align: right;
                }
                .grand-total {
                    border-top: 2px solid #4CAF50;
                    padding-top: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #4CAF50;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                @media print {
                    body { margin: 0; }
                    .invoice-container { border: none; box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <div class="store-name">${storeInfo?.name || 'CỬA HÀNG'}</div>
                    <div class="store-info">
                        Địa chỉ: ${storeInfo?.address || 'Phú yên'}<br>
                        Điện thoại: ${storeInfo?.phone || '123'} | Email: ${storeInfo?.email || 'info@cuahang.com'}
                    </div>
                </div>
                
                <div class="invoice-title">HÓA ĐƠN BÁN LẺ</div>
                
                <div class="info-section">
                    <div class="customer-info">
                        <div class="info-title">THÔNG TIN KHÁCH HÀNG</div>
                        <div class="info-item">
                            <span class="info-label">Tên khách hàng:</span>
                            <span>${order.customerName || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Số điện thoại:</span>
                            <span>${order.customerPhone || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="order-info">
                        <div class="info-title">THÔNG TIN ĐƠN HÀNG</div>
                        <div class="info-item">
                            <span class="info-label">Mã đơn hàng:</span>
                            <span>${order.orderId || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Ngày bán:</span>
                            <span>${order.orderDate || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Giờ bán:</span>
                            <span>${order.orderTime || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên Sản Phẩm</th>
                            <th>Mã SKU</th>
                            <th>Số Lượng</th>
                            <th>Đơn Giá</th>
                            <th>Thành Tiền</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    // Add products to invoice
    if (order.items && Array.isArray(order.items)) {
        // New format: Multiple items
        order.items.forEach((item, index) => {
            invoiceHTML += `
                <tr>
                    <td style="text-align: center;">${index + 1}</td>
                    <td>${item.productName || 'N/A'}</td>
                    <td style="text-align: center;">${item.sku || 'N/A'}</td>
                    <td style="text-align: center;">${item.quantity || 0}</td>
                    <td style="text-align: right;">${formatCurrency(item.sellingPrice || 0)}</td>
                    <td style="text-align: right;">${formatCurrency(item.totalAmount || 0)}</td>
                </tr>`;
        });
    } else {
        // Old format: Single product
        invoiceHTML += `
            <tr>
                <td style="text-align: center;">1</td>
                <td>${order.productName || 'N/A'}</td>
                <td style="text-align: center;">${order.sku || 'N/A'}</td>
                <td style="text-align: center;">${order.quantity || 0}</td>
                <td style="text-align: right;">${formatCurrency(order.sellingPrice || 0)}</td>
                <td style="text-align: right;">${formatCurrency(order.totalAmount || 0)}</td>
            </tr>`;
    }
    
    // Format currency function for invoice
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    }
    
    invoiceHTML += `
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div class="total-row">
                        <span class="total-label">Tạm tính:</span>
                        <span class="total-value">${formatCurrency(order.subtotal || order.totalAmount || 0)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Giảm giá:</span>
                        <span class="total-value">${formatCurrency(order.discount || 0)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Phí vận chuyển:</span>
                        <span class="total-value">${formatCurrency(order.shipping || 0)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span class="total-label">TỔNG CỘNG:</span>
                        <span class="total-value">${formatCurrency(order.totalAmount || 0)}</span>
                    </div>
                </div>
                
                <div class="footer">
                    Cảm ơn quý khách đã mua hàng!<br>
                    Ngày in: ${new Date().toLocaleString('vi-VN')}
                </div>
            </div>
        </body>
        </html>`;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    
    // Auto print after content loads
    printWindow.onload = function() {
        printWindow.print();
        printWindow.onafterprint = function() {
            printWindow.close();
        };
    };
    
    showNotification('Đang mở cửa sổ in hóa đơn...', 'success');
}

// View retail order details
function viewRetailOrderDetails(orderKey) {
    const order = retailOrdersData[orderKey];
    if (!order) {
        showNotification('Không tìm thấy đơn hàng!', 'error');
        return;
    }
    
    // Get store info
    const storeInfo = getCurrentStoreData();
    
    let detailsHTML = `
        <div class="order-details-modal" style="max-width: 800px; margin: 0 auto;">
            <div class="invoice-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4CAF50; padding-bottom: 20px;">
                <div class="store-name" style="font-size: 20px; font-weight: bold; color: #4CAF50; margin-bottom: 10px;">
                    ${storeInfo?.name || 'CỬA HÀNG'}
                </div>
                <div class="store-info" style="color: #666; font-size: 14px;">
                    Địa chỉ: ${storeInfo?.address || 'Phú yên'}<br>
                    Điện thoại: ${storeInfo?.phone || '123'} | Email: ${storeInfo?.email || 'info@cuahang.com'}
                </div>
            </div>
            
            <div class="invoice-title" style="font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center;">
                CHI TIẾT ĐƠN HÀNG BÁN LẺ
            </div>
            
            <div class="info-section" style="display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px;">
                <div class="customer-info" style="flex: 1;">
                    <div class="info-title" style="font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        THÔNG TIN KHÁCH HÀNG
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Tên khách hàng:</strong> ${order.customerName || 'N/A'}
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Số điện thoại:</strong> ${order.customerPhone || 'N/A'}
                    </div>
                </div>
                
                <div class="order-info" style="flex: 1;">
                    <div class="info-title" style="font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        THÔNG TIN ĐƠN HÀNG
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Mã đơn hàng:</strong> ${order.orderId || 'N/A'}
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Ngày bán:</strong> ${order.orderDate || 'N/A'}
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Giờ bán:</strong> ${order.orderTime || 'N/A'}
                    </div>
                </div>
            </div>
            
            <div class="products-section">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">STT</th>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">Tên Sản Phẩm</th>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">Mã SKU</th>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">Số Lượng</th>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">Đơn Giá</th>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">Thành Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    // Add products to modal
    if (order.items && Array.isArray(order.items)) {
        // New format: Multiple items
        order.items.forEach((item, index) => {
            detailsHTML += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 12px;">${item.productName || 'N/A'}</td>
                    <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.sku || 'N/A'}</td>
                    <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.quantity || 0}</td>
                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${formatCurrency(item.sellingPrice || 0)}</td>
                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${formatCurrency(item.totalAmount || 0)}</td>
                </tr>`;
        });
    } else {
        // Old format: Single product
        detailsHTML += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">1</td>
                <td style="border: 1px solid #ddd; padding: 12px;">${order.productName || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${order.sku || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${order.quantity || 0}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${formatCurrency(order.sellingPrice || 0)}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${formatCurrency(order.totalAmount || 0)}</td>
            </tr>`;
    }
    
    detailsHTML += `
                    </tbody>
                </table>
            </div>
            
            <div class="total-section" style="margin-top: 20px; text-align: right;">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                    <span style="width: 150px; font-weight: bold; text-align: right; margin-right: 20px;">Tạm tính:</span>
                    <span style="width: 150px; text-align: right;">${formatCurrency(order.subtotal || order.totalAmount || 0)}</span>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                    <span style="width: 150px; font-weight: bold; text-align: right; margin-right: 20px;">Giảm giá:</span>
                    <span style="width: 150px; text-align: right;">${formatCurrency(order.discount || 0)}</span>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                    <span style="width: 150px; font-weight: bold; text-align: right; margin-right: 20px;">Phí vận chuyển:</span>
                    <span style="width: 150px; text-align: right;">${formatCurrency(order.shipping || 0)}</span>
                </div>
                <div style="display: flex; justify-content: flex-end; border-top: 2px solid #4CAF50; padding-top: 10px; font-size: 16px; font-weight: bold; color: #4CAF50;">
                    <span style="width: 150px; text-align: right; margin-right: 20px;">TỔNG CỘNG:</span>
                    <span style="width: 150px; text-align: right;">${formatCurrency(order.totalAmount || 0)}</span>
                </div>
            </div>
            
            <div style="margin-top: 30px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                Cảm ơn quý khách đã mua hàng!<br>
                Ngày xem: ${new Date().toLocaleString('vi-VN')}
            </div>
        </div>
    `;
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('role', 'dialog');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1050;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    `;
    modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 80%; width: 90%; height: 70vh; margin: 0 !important; position: relative; transform: translateX(25%);">
            <div class="modal-content" style="height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div class="modal-header" style="border-bottom: 1px solid #dee2e6; padding: 15px 20px;">
                    <h5 class="modal-title" style="margin: 0; font-weight: 600;">Chi Tiết Đơn Hàng</h5>
                    <button type="button" class="close" data-dismiss="modal" style="background: none; border: none; font-size: 24px; line-height: 1; color: #000; opacity: 0.5;">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body" style="overflow-y: auto; max-height: calc(70vh - 120px); padding: 20px;">
                    ${detailsHTML}
                </div>
                <div class="modal-footer" style="border-top: 1px solid #dee2e6; padding: 15px 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn btn-success" onclick="printRetailInvoice('${orderKey}')" style="padding: 8px 16px;">
                        <i class="fas fa-print"></i> In Hóa Đơn
                    </button>
                    <button type="button" class="btn btn-secondary" data-dismiss="modal" style="padding: 8px 16px;">Đóng</button>
                </div>
            </div>
        </div>
        <div class="modal-backdrop fade show" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: -1;"></div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Handle close events
    const closeButtons = modal.querySelectorAll('[data-dismiss="modal"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    });
    
    const closeButton = modal.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    }
    
    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close on ESC key
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', escHandler);
    
    function closeModal() {
        modal.classList.remove('show');
        document.removeEventListener('keydown', escHandler);
        setTimeout(() => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
        }, 150);
    }
}

// Delete retail order
async function deleteRetailOrder(orderKey) {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
        return;
    }
    
    try {
        if (typeof showLoading === 'function') {
            showLoading(true);
        }
        
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        
        if (typeof getStoreDataPath === 'function' && selectedStoreId) {
            const retailOrdersPath = getStoreDataPath('retailOrders');
            await database.ref(`${retailOrdersPath}/${orderKey}`).remove();
        } else {
            await database.ref(`retailOrders/${orderKey}`).remove();
        }
        
        showNotification('Đã xóa đơn hàng bán lẻ!', 'success');
        await loadRetailOrders();
        
    } catch (error) {
        console.error('Error deleting retail order:', error);
        showNotification('Lỗi xóa đơn hàng!', 'error');
    } finally {
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
    }
}

// Delete retail order form
function deleteRetailOrderForm(orderIndex) {
    const orderForm = document.getElementById(`retailOrderForm_${orderIndex}`);
    if (orderForm) {
        orderForm.remove();
        showNotification(`Đã xóa form đơn hàng ${orderIndex}!`, 'success');
        
        // Update order count input
        const orderCountInput = document.getElementById('orderCount');
        const currentCount = parseInt(orderCountInput.value) || 0;
        if (currentCount > 1) {
            orderCountInput.value = currentCount - 1;
        }
    }
}

// Add new retail order form
function addNewRetailOrderForm() {
    const container = document.getElementById('retailOrderFormsContainer');
    if (!container) return;
    
    // Find the highest order number
    const existingForms = container.querySelectorAll('.order-form[id^="retailOrderForm_"]');
    let maxOrderNumber = 0;
    
    existingForms.forEach(form => {
        const match = form.id.match(/retailOrderForm_(\d+)/);
        if (match) {
            const orderNumber = parseInt(match[1]);
            if (orderNumber > maxOrderNumber) {
                maxOrderNumber = orderNumber;
            }
        }
    });
    
    const newOrderNumber = maxOrderNumber + 1;
    
    // Create new order form HTML
    const newFormHTML = `
        <div class="order-form" id="retailOrderForm_${newOrderNumber}">
            <div class="order-header">
                <div class="order-title">
                    <i class="fas fa-shopping-cart"></i>
                    Sản Phẩm  ${newOrderNumber}
                </div>
                <button type="button" class="delete-order-btn" onclick="deleteRetailOrderForm(${newOrderNumber})">
                    <i class="fas fa-trash"></i>
                    Xóa
                </button>
            </div>
            <div class="form-row four-fields-row">
                <div class="form-group">
                    <label for="retailProduct_${newOrderNumber}">Sản Phẩm:</label>
                    <select id="retailProduct_${newOrderNumber}" name="retailProduct_${newOrderNumber}" required>
                        <option value="">Chọn sản phẩm bán...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="retailSKU_${newOrderNumber}">SKU:</label>
                    <input type="text" id="retailSKU_${newOrderNumber}" name="retailSKU_${newOrderNumber}" readonly 
                           placeholder="SKU sẽ tự động cập nhật">
                </div>
                <div class="form-group">
                    <label for="retailQuantity_${newOrderNumber}">Số Lượng:</label>
                    <input type="number" id="retailQuantity_${newOrderNumber}" name="retailQuantity_${newOrderNumber}" 
                           min="1" step="1" required placeholder="Nhập số lượng" value="1"
                           oninput="calculateRetailOrderTotal(${newOrderNumber})">
                </div>
                <div class="form-group">
                    <label for="retailPrice_${newOrderNumber}">Giá Nhập:</label>
                    <input type="text" id="retailPrice_${newOrderNumber}" name="retailPrice_${newOrderNumber}" readonly 
                           placeholder="Giá nhập sẽ tự động cập nhật">
                </div>
            </div>
            <div class="form-row four-fields-row">
                <div class="form-group">
                    <label for="retailSellingPrice_${newOrderNumber}">Giá Bán:</label>
                    <input type="text" id="retailSellingPrice_${newOrderNumber}" name="retailSellingPrice_${newOrderNumber}" 
                           placeholder="Giá bán sẽ tự động cập nhật" 
                           oninput="calculateRetailOrderTotal(${newOrderNumber})">
                </div>
                <div class="form-group">
                    <label for="retailProfit_${newOrderNumber}">Lợi Nhuận:</label>
                    <input type="text" id="retailProfit_${newOrderNumber}" name="retailProfit_${newOrderNumber}" readonly 
                           placeholder="Lợi nhuận sẽ tự động tính">
                </div>
                <div class="form-group">
                    <label for="retailTotal_${newOrderNumber}">Tổng Tiền:</label>
                    <input type="text" id="retailTotal_${newOrderNumber}" name="retailTotal_${newOrderNumber}" readonly 
                           placeholder="Tổng tiền sẽ tự động tính" class="total-input">
                </div>
            </div>
        </div>
    `;
    
    // Find the add-order-section and insert before it
    const addOrderSection = container.querySelector('.add-order-section');
    if (addOrderSection) {
        addOrderSection.insertAdjacentHTML('beforebegin', newFormHTML);
    } else {
        container.insertAdjacentHTML('beforeend', newFormHTML);
    }
    
    // Initialize the new form's dropdown immediately
    setTimeout(() => {
        console.log('🔄 Initializing dropdown for new form:', newOrderNumber);
        
        // Check if sellingProductsData is available
        if (!sellingProductsData || Object.keys(sellingProductsData).length === 0) {
            console.error('❌ No selling products data available');
            return;
        }
        
        // Get the select element
        const selectElement = document.getElementById(`retailProduct_${newOrderNumber}`);
        if (!selectElement) {
            console.error('❌ Select element not found:', `retailProduct_${newOrderNumber}`);
            return;
        }
        
        // Prepare product data
        const productData = Object.keys(sellingProductsData).map(id => ({
            id: id,
            name: sellingProductsData[id].productName,
            sellingPrice: sellingProductsData[id].sellingPrice,
            importPrice: sellingProductsData[id].importPrice
        }));
        
        console.log(`📦 Found ${productData.length} products for new form`);
        
        // Clear and populate options
        selectElement.innerHTML = '<option value="">Chọn sản phẩm bán...</option>';
        productData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            selectElement.appendChild(option);
        });
        
        // Try SearchableSelect or fallback to regular select
        if (typeof SearchableSelect !== 'undefined') {
            try {
                new SearchableSelect(selectElement, {
                    data: productData,
                    searchPlaceholder: 'Tìm kiếm sản phẩm...',
                    noResultsText: 'Không tìm thấy sản phẩm nào',
                    onSelect: function(selectedData) {
                        handleRetailProductSelection(newOrderNumber, selectedData);
                    }
                });
                console.log(`✅ SearchableSelect initialized for form ${newOrderNumber}`);
            } catch (error) {
                console.error('❌ SearchableSelect error, using regular select:', error);
                selectElement.addEventListener('change', function() {
                    if (this.value) {
                        const selectedProduct = productData.find(p => p.id === this.value);
                        if (selectedProduct) {
                            handleRetailProductSelection(newOrderNumber, selectedProduct);
                        }
                    }
                });
            }
        } else {
            console.warn('⚠️ SearchableSelect not available, using regular select');
            selectElement.addEventListener('change', function() {
                if (this.value) {
                    const selectedProduct = productData.find(p => p.id === this.value);
                    if (selectedProduct) {
                        handleRetailProductSelection(newOrderNumber, selectedProduct);
                    }
                }
            });
        }
    }, 100);
    
    // Update order count input
    const orderCountInput = document.getElementById('orderCount');
    const currentCount = parseInt(orderCountInput.value) || 0;
    orderCountInput.value = currentCount + 1;
    
    showNotification(`Đã thêm đơn hàng ${newOrderNumber}!`, 'success');
}

// Create module namespace to avoid naming conflicts
window.salesOrdersRetailModule = {
    generateRetailOrderForms,
    createRetailOrders,
    deleteRetailOrderForm,
    addNewRetailOrderForm,
    deleteSelectedRetailOrders,
    viewRetailOrderDetails,
    deleteRetailOrder,
    toggleSelectAll
};

// Expose individual functions to window object for backward compatibility
window.generateRetailOrderForms = generateRetailOrderForms;
window.createRetailOrders = createRetailOrders;
window.deleteRetailOrderForm = deleteRetailOrderForm;
window.addNewRetailOrderForm = addNewRetailOrderForm;
window.deleteSelectedRetailOrders = deleteSelectedRetailOrders;
window.viewRetailOrderDetails = viewRetailOrderDetails;
window.deleteRetailOrder = deleteRetailOrder;
window.toggleSelectAll = toggleSelectAll;
window.updateRetailOrderPrice = updateRetailOrderPrice;
window.deleteRetailOrder = deleteRetailOrder;

console.log('✅ Retail orders system loaded successfully');