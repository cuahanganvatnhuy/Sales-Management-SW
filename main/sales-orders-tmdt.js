// Sales Orders Management - TMĐT
// Manages sales orders using selling products with profit calculation
let salesOrdersData = {};
let sellingProductsData = {};

// Calculate order profit with platform fees integration
function calculateOrderProfitWithPlatformFees(order) {
    const sellingPrice = parseFloat(order.sellingPrice || 0);
    const importPrice = parseFloat(order.importPrice || 0);
    const quantity = parseInt(order.quantity || 1);
    
    // Base profit before fees
    const baseProfit = (sellingPrice - importPrice) * quantity;
    
    // Get platform fees from settings
    const platformFees = getPlatformFeesFromStorage(order.platform);
    
    if (!platformFees || Object.keys(platformFees).length === 0) {
        // No fees configured, return base profit
        return baseProfit;
    }
    
    // Calculate total fees
    let totalFees = 0;
    const totalRevenue = sellingPrice * quantity;
    
    // Transaction fee
    if (platformFees.transactionFee) {
        if (platformFees.transactionFee.type === 'percent') {
            totalFees += totalRevenue * (platformFees.transactionFee.value / 100);
        } else {
            totalFees += platformFees.transactionFee.value;
        }
    }
    
    // Commission fee
    if (platformFees.commissionFee) {
        if (platformFees.commissionFee.type === 'percent') {
            totalFees += totalRevenue * (platformFees.commissionFee.value / 100);
        } else {
            totalFees += platformFees.commissionFee.value;
        }
    }
    
    // Add other fees if configured
    ['shippingFee', 'voucherFee', 'affiliateCommission'].forEach(feeType => {
        if (platformFees[feeType]) {
            if (platformFees[feeType].type === 'percent') {
                totalFees += totalRevenue * (platformFees[feeType].value / 100);
            } else {
                totalFees += platformFees[feeType].value;
            }
        }
    });
    
    // Calculate packaging costs based on product type and weight
    let packagingCosts = 0;
    if (order.productType && order.weight && typeof calculatePackagingCost === 'function') {
        console.log('=== CALCULATING PACKAGING COST IN TMDT ===');
        console.log('Product Type:', order.productType);
        console.log('Weight:', order.weight);
        
        const cost = calculatePackagingCost(order.productType, order.weight);
        packagingCosts = cost || 0;
        console.log('Packaging cost calculated:', packagingCosts);
    }
    
    const finalProfit = baseProfit - totalFees - packagingCosts;
    console.log(`TMDT Profit calculation: Base: ${baseProfit}, Fees: ${totalFees}, Packaging: ${packagingCosts}, Final: ${finalProfit}`);
    
    return finalProfit;
}

// Get platform fees from localStorage/Firebase
function getPlatformFeesFromStorage(platform) {
    try {
        const currentStore = getCurrentStore();
        const savedFees = localStorage.getItem(`platformFees_${currentStore}_${platform}`);
        return savedFees ? JSON.parse(savedFees) : {};
    } catch (error) {
        console.error('Error loading platform fees:', error);
        return {};
    }
}

// Get current store helper function
function getCurrentStore() {
    return localStorage.getItem('selectedStoreId') || 'default';
}

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

// Load selling products and sales orders when page loads
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeSalesOrdersPage();
    }, 200);
    
    setDefaultDate();
    generateSalesOrderForms();
    setupPlatformSelection();
});

// Initialize sales orders page with store context
function initializeSalesOrdersPage() {
    if (typeof isStoreSelected === 'function' && isStoreSelected()) {
        loadSellingProducts();
        loadSalesOrders();
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
        loadSalesOrders();
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
            console.log('Loading sales orders for store:', storeData.name);
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
                <p>Bạn cần chọn cửa hàng trước khi tạo đơn hàng bán.</p>
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

// Get selected store ID
function getSelectedStoreId() {
    const storeId = localStorage.getItem('selectedStoreId');
    console.log('Getting selected store ID:', storeId);
    return storeId;
}


async function loadSellingProducts() {
    try {
        console.log('🔥 Starting loadSellingProducts function...');
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
        
        console.log('🔥 === LOADED SELLING PRODUCTS (TMDT) ===');
        console.log('🔥 Product count:', Object.keys(sellingProductsData).length);
        console.log('🔥 Filtered sellingProductsData:', sellingProductsData);
        Object.entries(sellingProductsData).forEach(([id, p], i) => {
            console.log(`🔥 Selling Product ${i + 1}:`, {
                id: id,
                productId: p.productId,
                productName: p.productName,
                sku: p.sku,
                sellingPrice: p.sellingPrice,
                importPrice: p.importPrice,
                status: p.status
            });
        });
        console.log('🔥 === END SELLING PRODUCTS (TMDT) ===');
        
        // Force regenerate forms if they exist
        const container = document.getElementById('salesOrderFormsContainer');
        if (container && container.innerHTML.trim() !== '' && !container.innerHTML.includes('alert-info')) {
            const orderCountInput = document.getElementById('orderCount');
            if (orderCountInput && orderCountInput.value) {
                generateSalesOrderForms();
            }
        }
        
    } catch (error) {
        console.error('🔥 Error loading selling products:', error);
        console.error('🔥 Error details:', error.message);
        console.error('🔥 Error stack:', error.stack);
        showNotification('Lỗi tải danh sách sản phẩm bán!', 'error');
    }
}

// Load sales orders from Firebase
async function loadSalesOrders() {
    try {
        let allSalesOrdersData = {};
        
        if (typeof getStoreDataPath === 'function') {
            const salesOrdersPath = getStoreDataPath('salesOrders');
            const snapshot = await database.ref(salesOrdersPath).once('value');
            allSalesOrdersData = snapshot.val() || {};
        } else {
            const snapshot = await database.ref('salesOrders').once('value');
            allSalesOrdersData = snapshot.val() || {};
        }
        
        // Filter TMĐT sales orders
        salesOrdersData = {};
        for (const [orderId, order] of Object.entries(allSalesOrdersData)) {
            const orderType = order.orderType || order.type;
            
            if (!orderType || orderType === 'tmdt' || orderType === 'ecommerce') {
                salesOrdersData[orderId] = order;
            }
        }
        
        console.log('Filtered TMĐT sales orders:', Object.keys(salesOrdersData).length);
        displaySalesOrders();
    } catch (error) {
        console.error('Error loading sales orders:', error);
        showNotification('Lỗi tải danh sách đơn hàng bán!', 'error');
    }
}

// Generate sales order forms based on count
function generateSalesOrderForms() {
    const orderCountInput = document.getElementById('orderCount');
    const orderCount = parseInt(orderCountInput.value);
    const container = document.getElementById('salesOrderFormsContainer');
    
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
        generateSalesOrderFormsContent(orderCount, container);
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        showNotification(`Đã tạo ${orderCount} form đơn hàng bán!`, 'success');
    }, 300);
}

// Generate sales order forms content
function generateSalesOrderFormsContent(orderCount, container) {
    let formsHTML = '';
    
    for (let i = 1; i <= orderCount; i++) {
        formsHTML += `
            <div class="form-section order-form-item" id="salesOrderForm_${i}">
                <div class="order-form-header">
                    <div class="order-form-title">
                        <i class="fas fa-shopping-bag"></i> 
                        Đơn Hàng Bán ${i}
                    </div>
                    ${orderCount > 1 ? `
                        <button type="button" class="delete-order-btn" onclick="deleteSalesOrderForm(${i})">
                            <i class="fas fa-trash"></i>
                            Xóa
                        </button>
                    ` : ''}
                </div>
                <div class="form-row four-fields-row">
                    <div class="form-group">
                        <label for="salesProduct_${i}">Sản Phẩm:</label>
                        <div id="salesProductSelect_${i}" class="product-select-container"></div>
                        <input type="hidden" id="salesProduct_${i}" name="salesProduct_${i}" required>
                    </div>
                    <div class="form-group">
                        <label for="salesSku_${i}">SKU:</label>
                        <input type="text" id="salesSku_${i}" name="salesSku_${i}" readonly 
                               placeholder="SKU sẽ tự động cập nhật">
                    </div>
                    <div class="form-group">
                        <label for="salesQuantity_${i}" id="salesQuantityLabel_${i}">Số Lượng:</label>
                        <input type="number" id="salesQuantity_${i}" name="salesQuantity_${i}" 
                               min="0.1" step="0.1" required 
                               oninput="calculateSalesOrderTotal(${i})" 
                               placeholder="Nhập số lượng">
                    </div>
                    <div class="form-group">
                        <label for="importPrice_${i}">Giá Nhập:</label>
                        <input type="text" id="importPrice_${i}" name="importPrice_${i}" readonly 
                               placeholder="Giá nhập">
                    </div>
                </div>
                <div class="form-row profit-row">
                    <div class="form-group">
                        <label for="salesPrice_${i}" id="salesPriceLabel_${i}">Giá Bán:</label>
                        <input type="text" id="salesPrice_${i}" name="salesPrice_${i}" readonly 
                               placeholder="Giá bán sẽ tự động cập nhật">
                    </div>
                    <div class="form-group">
                        <label for="profit_${i}">Lợi Nhuận:</label>
                        <input type="text" id="profit_${i}" name="profit_${i}" readonly 
                               placeholder="Lợi nhuận sẽ tự động tính" class="profit-input">
                    </div>
                    <div class="form-group">
                        <label for="salesTotal_${i}">Tổng Tiền:</label>
                        <input type="text" id="salesTotal_${i}" name="salesTotal_${i}" readonly 
                               placeholder="Tổng tiền sẽ tự động tính" class="total-input">
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = formsHTML;
    initializeSalesProductSelects(orderCount);
}

// Initialize SearchableSelect for selling product dropdowns
function initializeSalesProductSelects(orderCount) {
    console.log('=== INITIALIZING PRODUCT SELECTS ===');
    console.log('Order count:', orderCount);
    console.log('Selling products data:', sellingProductsData);
    console.log('Number of selling products:', Object.keys(sellingProductsData).length);
    
    const productData = Object.keys(sellingProductsData).map(id => ({
        id: id,
        name: sellingProductsData[id].productName,
        sellingPrice: sellingProductsData[id].sellingPrice,
        importPrice: sellingProductsData[id].importPrice
    }));
    
    console.log('Product data for dropdown:', productData);
    
    for (let i = 1; i <= orderCount; i++) {
        const container = document.getElementById(`salesProductSelect_${i}`);
        console.log(`Container for product ${i}:`, container);
        
        if (container) {
            // Check if SearchableSelect is available
            if (typeof SearchableSelect === 'undefined') {
                console.error('SearchableSelect is not defined! Creating simple select instead.');
                // Create simple select as fallback
                let selectHTML = '<select class="form-control" onchange="handleProductSelection(' + i + ', this.value)">';
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
                    const hiddenInput = document.getElementById(`salesProduct_${i}`);
                    hiddenInput.value = selectedProduct.id;
                    updateSalesOrderPrice(i, selectedProduct.id);
                };
            }
        }
    }
}

// Fallback function for simple select
function handleProductSelection(orderIndex, productId) {
    const hiddenInput = document.getElementById(`salesProduct_${orderIndex}`);
    hiddenInput.value = productId;
    updateSalesOrderPrice(orderIndex, productId);
}

// Update sales order price when product is selected
function updateSalesOrderPrice(orderIndex, productId = null) {
    if (!productId) {
        const hiddenInput = document.getElementById(`salesProduct_${orderIndex}`);
        productId = hiddenInput.value;
    }
    
    if (!productId || !sellingProductsData[productId]) {
        document.getElementById(`salesPrice_${orderIndex}`).value = '';
        document.getElementById(`salesSku_${orderIndex}`).value = '';
        document.getElementById(`importPrice_${orderIndex}`).value = '';
        document.getElementById(`profit_${orderIndex}`).value = '';
        document.getElementById(`salesTotal_${orderIndex}`).value = '';
        return;
    }
    
    const sellingProduct = sellingProductsData[productId];
    const priceInput = document.getElementById(`salesPrice_${orderIndex}`);
    const skuInput = document.getElementById(`salesSku_${orderIndex}`);
    const importPriceInput = document.getElementById(`importPrice_${orderIndex}`);
    const quantityInput = document.getElementById(`salesQuantity_${orderIndex}`);
    const profitInput = document.getElementById(`profit_${orderIndex}`);
    const totalInput = document.getElementById(`salesTotal_${orderIndex}`);
    
    // Set values
    priceInput.value = formatCurrency(sellingProduct.sellingPrice);
    skuInput.value = sellingProduct.sku || 'N/A';
    importPriceInput.value = formatCurrency(sellingProduct.importPrice || 0);
    
    // Calculate profit and total if quantity exists
    const quantity = parseFloat(quantityInput.value) || 0;
    if (quantity > 0) {
        const sellingPrice = sellingProduct.sellingPrice || 0;
        const importPrice = sellingProduct.importPrice || 0;
        const totalAmount = sellingPrice * quantity;
        
        // Calculate profit with platform fees
        const platform = document.getElementById('platform')?.value || 'other';
        const profitWithFees = calculateOrderProfitWithPlatformFees({
            sellingPrice: sellingPrice,
            importPrice: importPrice,
            quantity: quantity,
            platform: platform
        });
        
        profitInput.value = formatCurrency(profitWithFees);
        totalInput.value = formatCurrency(totalAmount);
    } else {
        profitInput.value = '';
        totalInput.value = '';
    }
}

// Calculate sales order total when quantity changes
function calculateSalesOrderTotal(orderIndex) {
    const hiddenInput = document.getElementById(`salesProduct_${orderIndex}`);
    const productId = hiddenInput.value;
    
    if (productId && sellingProductsData[productId]) {
        updateSalesOrderPrice(orderIndex, productId);
    }
}

// Create sales orders
async function createSalesOrders(event) {
    event.preventDefault();
    
    const orderDate = document.getElementById('orderDate').value;
    
    if (!orderDate) {
        showNotification('Vui lòng chọn ngày tạo đơn!', 'error');
        return;
    }
    
    const platformInfo = getSelectedPlatform();
    if (!platformInfo) {
        showNotification('Vui lòng chọn sàn TMĐT!', 'error');
        return;
    }
    
    if (platformInfo.platform === 'other' && !platformInfo.platformName.trim()) {
        showNotification('Vui lòng nhập tên sàn TMĐT khác!', 'error');
        return;
    }
    
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    const storeInfo = getCurrentStoreData();
    if (!selectedStoreId || !storeInfo) {
        showNotification('Vui lòng chọn cửa hàng trước khi tạo đơn!', 'error');
        return;
    }
    
    const salesOrders = [];
    let hasError = false;
    
    const orderCount = parseInt(document.getElementById('orderCount').value);
        
    for (let i = 1; i <= orderCount; i++) {
        const productId = document.getElementById(`salesProduct_${i}`).value;
        const quantity = parseFloat(document.getElementById(`salesQuantity_${i}`).value);
        const sellingPriceText = document.getElementById(`salesPrice_${i}`).value.replace(/[^\d]/g, '');
        const sellingPrice = parseFloat(sellingPriceText) || 0;
        
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
        
        const sellingProduct = sellingProductsData[productId];
        if (!sellingProduct) {
            showNotification(`Sản phẩm không tồn tại cho đơn hàng ${i}!`, 'error');
            hasError = true;
            break;
        }
        
        // Check stock availability - get from original products table
        console.log('🔥 Checking stock for product:', sellingProduct.productName);
        console.log('🔥 Selling product data:', sellingProduct);
        
        // Get stock from selling products table (independent inventory management)
        const currentStock = sellingProduct.currentStock || sellingProduct.inventory || 0;
        
        console.log('🔥 Final current stock:', currentStock, 'Required quantity:', quantity);
        
        if (currentStock < quantity) {
            showNotification(`Không đủ tồn kho cho sản phẩm ${sellingProduct.productName}! Tồn kho: ${currentStock}, Yêu cầu: ${quantity}`, 'error');
            hasError = true;
            break;
        }
        
        const importPrice = sellingProduct.importPrice || 0;
        const totalAmount = sellingPrice * quantity;
        
        // Calculate profit with platform fees
        console.log('=== PACKAGING COST DEBUG ===');
        console.log('Product Type:', sellingProduct.productType);
        console.log('Product Weight:', sellingProduct.weight);
        console.log('Total Weight:', parseFloat(sellingProduct.weight || 0) * quantity);
        console.log('calculatePackagingCost function exists:', typeof calculatePackagingCost === 'function');
        console.log('calculateOrderProfitWithPlatformFees function exists:', typeof calculateOrderProfitWithPlatformFees === 'function');
        
        console.log('=== CALLING calculateOrderProfitWithPlatformFees ===');
        let profitWithFees;
        try {
            profitWithFees = await calculateOrderProfitWithPlatformFees({
                sellingPrice: sellingPrice,
                importPrice: importPrice,
                quantity: quantity,
                platform: platformInfo.platform,
                productType: sellingProduct.productType || 'dry',
                weight: parseFloat(sellingProduct.weight || 0) * quantity
            });
            
            console.log('✅ calculateOrderProfitWithPlatformFees completed successfully');
            console.log('Final profit after all calculations:', profitWithFees);
        } catch (error) {
            console.error('❌ Error in calculateOrderProfitWithPlatformFees:', error);
            profitWithFees = (sellingPrice - importPrice) * quantity; // Fallback to basic calculation
            console.log('Using fallback profit calculation:', profitWithFees);
        }
        
        const totalProfitWithFees = profitWithFees;
        const profitPerUnit = profitWithFees / quantity;
        
        const productName = sellingProduct.productName;
        const productSKU = sellingProduct.sku || 'N/A';
        const platform = platformInfo.platform;
        const platformName = platformInfo.platformName;
        
        // Generate unique order ID
        const orderId = `TMDT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        const salesOrderData = {
            orderId: orderId,
            productId: productId,
            productName: productName,
            sku: productSKU,
            quantity: quantity,
            sellingPrice: sellingPrice,
            importPrice: importPrice,
            profitPerUnit: profitPerUnit,
            totalProfit: totalProfitWithFees,
            totalAmount: totalAmount,
            orderDate: orderDate,
            platform: platform,
            platformName: platformName,
            source: 'sales_order_management',
            orderType: 'tmdt',
            createdAt: new Date().toISOString(),
            storeId: selectedStoreId,
            // Add product type and weight for packaging cost calculation
            productType: sellingProduct.productType || 'dry',
            weight: parseFloat(sellingProduct.weight || 0) * quantity,
            storeName: storeInfo.name,
            status: 'pending'
        };
        
        salesOrders.push(salesOrderData);
    }
    
    if (hasError) return;
    
    try {
        if (typeof showLoading === 'function') {
            showLoading(true);
        }
        console.log('=== Creating TMĐT sales orders ===');
        console.log('Sales orders to create:', salesOrders.length);
        
        if (typeof getStoreDataPath === 'function') {
            const salesOrdersPath = getStoreDataPath('salesOrders');
            console.log('Saving to store path:', salesOrdersPath);
            
            for (const salesOrderData of salesOrders) {
                const orderRef = database.ref(salesOrdersPath).push();
                await orderRef.set(salesOrderData);
                console.log('Sales order saved with ID:', orderRef.key, 'Order ID:', salesOrderData.orderId);
                
                // Stock management will be handled separately by selling products module
                console.log('✅ Order saved successfully - stock management delegated to selling products module');
            }
        } else {
            // Save to global salesOrders collection
            for (const salesOrderData of salesOrders) {
                const orderRef = database.ref('salesOrders').push();
                await orderRef.set(salesOrderData);
                
                // Stock management will be handled separately by selling products module
                console.log('✅ Order saved successfully - stock management delegated to selling products module');
            }
        }
        
        showNotification(`Đã tạo thành công ${salesOrders.length} đơn hàng bán TMĐT từ sàn ${platformInfo.platformName}!`, 'success');
        
        // Reset form
        const form = document.getElementById('addSalesOrderForm');
        const formsContainer = document.getElementById('salesOrderFormsContainer');
        
        form.classList.add('form-reset-animation');
        
        setTimeout(() => {
            form.reset();
            setDefaultDate();
            
            formsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <p>Nhập số lượng đơn hàng bán và nhấn "Xác Nhận" để tạo các form đơn hàng.</p>
                </div>
            `;
            
            form.classList.remove('form-reset-animation');
        }, 250);
        
        await loadSalesOrders();
        
    } catch (error) {
        console.error('=== Error creating sales orders ===');
        console.error('Error details:', error);
        
        let errorMessage = 'Lỗi tạo đơn hàng bán!';
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

// Update selling product stock
async function updateSellingProductStock(productId, quantityChange) {
    try {
        let productPath;
        if (typeof getStoreDataPath === 'function') {
            productPath = `${getStoreDataPath('sellingProducts')}/${productId}`;
        } else {
            productPath = `sellingProducts/${productId}`;
        }
        
        const productRef = database.ref(productPath);
        const snapshot = await productRef.once('value');
        const product = snapshot.val();
        
        if (product) {
            const currentStock = product.currentStock || 0;
            const newStock = Math.max(0, currentStock + quantityChange);
            
            await productRef.update({
                currentStock: newStock,
                lastUpdated: new Date().toISOString()
            });
            
            console.log(`Updated stock for ${product.productName}: ${currentStock} -> ${newStock}`);
        }
    } catch (error) {
        console.error('Error updating product stock:', error);
        // Don't throw error to avoid breaking order creation
    }
}

// Update original product stock (where inventory is actually managed)
async function updateOriginalProductStock(productId, quantityChange) {
    try {
        console.log('🔥 Updating original product stock for:', productId, 'Change:', quantityChange);
        
        const productRef = database.ref(`products/${productId}`);
        const snapshot = await productRef.once('value');
        const product = snapshot.val();
        
        console.log('🔥 Product data from Firebase:', product);
        
        if (product) {
            const currentStock = product.currentStock || product.inventory || product.stock || 0;
            const newStock = Math.max(0, currentStock + quantityChange);
            
            console.log('🔥 Stock calculation:', {
                currentStock: currentStock,
                quantityChange: quantityChange,
                newStock: newStock
            });
            
            // Update multiple stock fields to ensure consistency
            const updateData = {
                currentStock: newStock,
                inventory: newStock,
                stock: newStock,
                lastUpdated: new Date().toISOString()
            };
            
            console.log('🔥 Update data to send:', updateData);
            
            await productRef.update(updateData);
            
            console.log(`✅ Updated original product stock for ${product.name || product.productName}: ${currentStock} -> ${newStock}`);
            
            // Verify the update worked
            const verifySnapshot = await productRef.once('value');
            const updatedProduct = verifySnapshot.val();
            console.log('🔥 Verified updated product:', updatedProduct);
        } else {
            console.log('❌ Original product not found:', productId);
        }
    } catch (error) {
        console.error('❌ Error updating original product stock:', error);
        // Don't throw error to avoid breaking order creation
    }
}

// Select creation method for TMDT orders
function selectCreationMethod(method) {
    console.log('Selected creation method:', method);
    
    // Update button states
    const buttons = document.querySelectorAll('.btn-method');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.getElementById(`${method}MethodBtn`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Show/hide relevant sections based on method
    const excelUploadGroup = document.getElementById('excelUploadGroup');
    const pdfUploadContainer = document.getElementById('pdfUploadContainer');
    const salesOrderFormsContainer = document.getElementById('salesOrderFormsContainer');
    const orderCountGroup = document.getElementById('orderCount')?.closest('.form-group');
    
    if (method === 'manual') {
        // Show manual order creation
        if (excelUploadGroup) excelUploadGroup.style.display = 'none';
        if (pdfUploadContainer) pdfUploadContainer.style.display = 'none';
        if (salesOrderFormsContainer) salesOrderFormsContainer.style.display = 'block';
        if (orderCountGroup) orderCountGroup.style.display = 'block';
    } else if (method === 'excel') {
        // Show Excel upload
        if (excelUploadGroup) excelUploadGroup.style.display = 'block';
        if (pdfUploadContainer) pdfUploadContainer.style.display = 'none';
        if (salesOrderFormsContainer) salesOrderFormsContainer.style.display = 'none';
        if (orderCountGroup) orderCountGroup.style.display = 'none'; // Hide order count for Excel
        
        // Initialize TMDT Excel upload if not already done
        if (typeof initializeTmdtExcelUpload === 'function') {
            initializeTmdtExcelUpload();
        }
    } else if (method === 'pdf') {
        // Show PDF upload
        if (excelUploadGroup) excelUploadGroup.style.display = 'none';
        if (pdfUploadContainer) pdfUploadContainer.style.display = 'block';
        if (salesOrderFormsContainer) salesOrderFormsContainer.style.display = 'none';
        if (orderCountGroup) orderCountGroup.style.display = 'none'; // Hide order count for PDF
    }
}

// Display sales orders in table
function displaySalesOrders() {
    const container = document.getElementById('salesOrdersContainer');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('salesOrdersTable');
    
    if (!salesOrdersData || Object.keys(salesOrdersData).length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        table.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    table.classList.remove('hidden');
    
    let ordersHTML = '';
    let index = 1;
    
    const sortedOrders = Object.entries(salesOrdersData).sort((a, b) => 
        new Date(b[1].createdAt) - new Date(a[1].createdAt)
    );
    
    for (const [orderId, order] of sortedOrders) {
        const platformDisplay = order.platformName || order.platform || 'N/A';
        let storeDisplay = order.storeName || 'N/A';
        
        // Always try to resolve store name if we have storeId
        if (order.storeId) {
            // If we already have storeName, use it
            if (order.storeName && order.storeName !== order.storeId) {
                storeDisplay = order.storeName;
            } else {
                // Simple hardcoded mapping for known stores
                const storeNameMap = {
                    '-OZmkMFuAV9q3zuSICEQ': 'cường dung',
                    '-OZmkOYjLV5QP-_a5_LM': 'Tạp Hóa Bánh Beo'
                };
                
                // Try to resolve from various sources
                let resolvedName = storeNameMap[order.storeId];
                
                if (!resolvedName && typeof getStoreName === 'function') {
                    resolvedName = getStoreName(order.storeId);
                }
                
                if (!resolvedName && window.storesData && window.storesData[order.storeId]) {
                    resolvedName = window.storesData[order.storeId].name;
                }
                
                if (!resolvedName) {
                    try {
                        const currentStore = JSON.parse(localStorage.getItem('currentStore') || '{}');
                        if (currentStore.id === order.storeId && currentStore.name) {
                            resolvedName = currentStore.name;
                        }
                    } catch (e) {
                        // Ignore localStorage errors
                    }
                }
                
                // Use resolved name or fallback to ID
                storeDisplay = resolvedName || order.storeId;
                
                console.log('🏪 DEBUG: Store name resolution:', {
                    orderId: order.orderId,
                    storeId: order.storeId,
                    originalStoreName: order.storeName,
                    resolvedName: resolvedName,
                    finalDisplay: storeDisplay
                });
            }
        }
        
        ordersHTML += `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="product-checkbox" value="${orderId}" onchange="updateBulkActions()">
                </td>
                <td class="text-center">${index}</td>
                <td class="text-center order-id-cell">
                    ${order.orderId ? `<span class="order-id-badge">${order.orderId}</span>` : 'N/A'}
                </td>
                <td>${order.productName}</td>
                <td class="text-center sku-cell">${order.sku}</td>
                <td class="text-right quantity-cell">${order.quantity}</td>
                <td class="text-right import-price-cell">${formatCurrency(order.importPrice)}</td>
                <td class="text-right price-cell">${formatCurrency(order.sellingPrice)}</td>
                <td class="text-right profit-cell">${formatCurrency(order.totalProfit)}</td>
                <td class="text-right total-cell">${formatCurrency(order.totalAmount)}</td>
                <td class="text-center">
                    ${order.platform ? `<span class="platform-badge platform-${order.platform}">${platformDisplay}</span>` : 'N/A'}
                </td>
                <td class="text-center">
                    <span class="store-name" title="Store ID: ${order.storeId}, Store Name: ${order.storeName}">${storeDisplay}</span>
                </td>
                <td class="text-center date-cell">${formatDate(order.orderDate)}</td>
                <td class="text-center">
                    <button class="btn btn-danger btn-small" onclick="deleteSalesOrder('${orderId}')">
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

// Delete single sales order
async function deleteSalesOrder(orderId) {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng bán này?')) {
        return;
    }
    
    try {
        await deleteSalesOrderById(orderId);
        showNotification('Xóa đơn hàng bán thành công!', 'success');
        await loadSalesOrders();
    } catch (error) {
        console.error('Error deleting sales order:', error);
        showNotification('Lỗi xóa đơn hàng bán!', 'error');
    }
}

// Helper function to delete sales order by ID
function deleteSalesOrderById(orderId) {
    if (typeof getStoreDataPath === 'function') {
        const salesOrdersPath = getStoreDataPath('salesOrders');
        return database.ref(`${salesOrdersPath}/${orderId}`).remove();
    } else {
        return database.ref(`salesOrders/${orderId}`).remove();
    }
}

// Clear sales order forms when input changes
function clearSalesOrderForms() {
    const container = document.getElementById('salesOrderFormsContainer');
    if (container && container.innerHTML.trim() !== '') {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <p>Nhập số lượng đơn hàng bán và nhấn "Xác Nhận" để tạo các form đơn hàng.</p>
            </div>
        `;
    }
}

// Add event listener for order count input
document.addEventListener('DOMContentLoaded', function() {
    const orderCountInput = document.getElementById('orderCount');
    if (orderCountInput) {
        orderCountInput.addEventListener('input', clearSalesOrderForms);
    }
});

// Delete sales order form
function deleteSalesOrderForm(orderIndex) {
    const orderForm = document.getElementById(`salesOrderForm_${orderIndex}`);
    if (orderForm) {
        orderForm.remove();
        showNotification(`Đã xóa form đơn hàng ${orderIndex}!`, 'success');
    }
}

// Update bulk actions
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
}

// Toggle select all
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkActions();
}

// Delete selected sales orders
async function deleteSelectedSalesOrders() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const orderIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (orderIds.length === 0) {
        showNotification('Vui lòng chọn đơn hàng cần xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${orderIds.length} đơn hàng bán đã chọn?`)) {
        return;
    }
    
    try {
        if (typeof showLoading === 'function') {
            showLoading(true);
        }
        
        for (const orderId of orderIds) {
            await deleteSalesOrderById(orderId);
        }
        
        showNotification(`Đã xóa ${orderIds.length} đơn hàng bán thành công!`, 'success');
        await loadSalesOrders();
        
    } catch (error) {
        console.error('Error deleting selected sales orders:', error);
        showNotification('Lỗi xóa đơn hàng bán đã chọn!', 'error');
    } finally {
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
    }
}