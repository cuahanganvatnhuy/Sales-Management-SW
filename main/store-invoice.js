// Store Invoice JavaScript

let invoiceData = {
    stores: {},
    orders: {}
};
let dateRange = {
    start: null,
    end: null
};
let selectedStoreId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏪 Store Invoice page loaded');
    
    // Components will be loaded by HTML script
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load data
    loadInvoiceData();
    
    // Set default dates (last 30 days)
    setDefaultDates();
});

// Load navbar and header components (already available)
function loadComponents() {
    // Components are already loaded by the HTML pages
    console.log('📱 Using existing navbar and header components');
}

// Initialize event listeners
function initializeEventListeners() {
    // Store selection
    document.getElementById('storeSelect').addEventListener('change', function() {
        selectStore();
    });
    
    // Invoice actions
    document.getElementById('generateInvoiceBtn').addEventListener('click', function() {
        generateStoreInvoice();
    });
    
    document.getElementById('printInvoiceBtn').addEventListener('click', function() {
        printInvoice();
    });
    
    console.log('✅ Store Invoice event listeners initialized');
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
}

// Apply date filter
async function applyDateFilter() {
    const startDateValue = document.getElementById('startDate').value;
    const endDateValue = document.getElementById('endDate').value;
    
    if (!startDateValue || !endDateValue) {
        showNotification('Vui lòng chọn đầy đủ khoảng thời gian!', 'warning');
        return;
    }
    
    // Handle date input format (YYYY-MM-DD) correctly
    dateRange.start = new Date(startDateValue + 'T00:00:00');
    dateRange.end = new Date(endDateValue + 'T23:59:59');
    
    // Alternative method if the above doesn't work
    if (isNaN(dateRange.start.getTime()) || isNaN(dateRange.end.getTime())) {
        dateRange.start = new Date(startDateValue);
        dateRange.end = new Date(endDateValue);
        dateRange.end.setHours(23, 59, 59, 999); // Include end of day
    }
    
    console.log('📅 Date filter applied for store invoice:', dateRange);
    
    // Load orders with the applied date filter
    await loadAllOrders();
    
    // Show store selection section
    const storeSection = document.getElementById('storeSelectionSection');
    if (storeSection) {
        storeSection.classList.remove('hidden');
    } else {
        console.warn('⚠️ storeSelectionSection element not found');
    }
    
    showNotification('Khoảng thời gian đã được áp dụng! Vui lòng chọn cửa hàng.', 'success');
}

// Select store
function selectStore() {
    selectedStoreId = document.getElementById('storeSelect').value;
    
    if (!selectedStoreId) {
        const actionsSection = document.getElementById('invoiceActionsSection');
        if (actionsSection) {
            actionsSection.classList.add('hidden');
        }
        return;
    }
    
    console.log('🏪 Store selected:', selectedStoreId);
    
    // Show invoice actions section
    const actionsSection = document.getElementById('invoiceActionsSection');
    if (actionsSection) {
        actionsSection.classList.remove('hidden');
    } else {
        console.warn('⚠️ invoiceActionsSection element not found');
    }
    
    showNotification(`Đã chọn cửa hàng. Có thể tạo hóa đơn!`, 'success');
}

// Load invoice data
async function loadInvoiceData() {
    try {
        showLoading(true);
        
        console.log('📈 Loading store invoice data...');
        
        // Load stores
        const storesSnapshot = await firebase.database().ref('stores').once('value');
        invoiceData.stores = storesSnapshot.val() || {};
        
        console.log('🏪 Loaded stores:', Object.keys(invoiceData.stores).length);
        
        // Load products to get correct units
        const productsSnapshot = await firebase.database().ref('products').once('value');
        invoiceData.products = productsSnapshot.val() || {};
        
        console.log('📦 Loaded products:', Object.keys(invoiceData.products).length);
        
        // Populate store dropdown
        populateStoreDropdown();
        
        // Don't load orders initially, only after date filter is applied
        console.log('🕒 Date range not set yet, skipping order loading');
        
        console.log('✅ Store invoice data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading store invoice data:', error);
        showNotification('Lỗi tải dữ liệu hóa đơn!', 'error');
    } finally {
        showLoading(false);
    }
}

// Populate store dropdown
function populateStoreDropdown() {
    const storeSelect = document.getElementById('storeSelect');
    storeSelect.innerHTML = '<option value="">-- Chọn cửa hàng --</option>';
    
    Object.keys(invoiceData.stores).forEach(storeId => {
        const store = invoiceData.stores[storeId];
        const option = document.createElement('option');
        option.value = storeId;
        option.textContent = store.name || `Cửa hàng ${storeId}`;
        storeSelect.appendChild(option);
    });
    
    console.log('📋 Store dropdown populated with', Object.keys(invoiceData.stores).length, 'stores');
}

// Load all orders from all stores
async function loadAllOrders() {
    try {
        invoiceData.orders = {};
        
        // Try new structure first: stores/{storeId}/orders
        for (const storeId of Object.keys(invoiceData.stores)) {
            try {
                const ordersSnapshot = await firebase.database().ref(`stores/${storeId}/orders`).once('value');
                const storeOrders = ordersSnapshot.val() || {};
                
                // Filter orders by date range
                const filteredOrders = {};
                Object.keys(storeOrders).forEach(orderId => {
                    const order = storeOrders[orderId];
                    
                    // Try different date field names
                    const orderDate = order.date || order.orderDate || order.createdAt || order.timestamp;
                    
                    if (orderDate) {
                        // Convert order date to Date object
                        let orderDateObj;
                        if (orderDate && orderDate.includes('/')) {
                            // Format: "2/8/2025" -> convert to "2025-08-02"
                            const parts = orderDate.split('/');
                            const day = parts[0].padStart(2, '0');
                            const month = parts[1].padStart(2, '0');
                            const year = parts[2];
                            orderDateObj = new Date(`${year}-${month}-${day}`);
                        } else if (orderDate) {
                            // Handle ISO date format or other formats
                            orderDateObj = new Date(orderDate);
                            // If it's still invalid, try to parse it differently
                            if (isNaN(orderDateObj.getTime())) {
                                // Try to parse as YYYY-MM-DD format
                                if (orderDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                                    orderDateObj = new Date(orderDate + 'T00:00:00');
                                }
                            }
                        }
                        
                        // Check if order date is within selected range
                        if (dateRange.start && dateRange.end && orderDateObj >= dateRange.start && orderDateObj <= dateRange.end) {
                            filteredOrders[orderId] = order;
                        }
                    }
                });
                
                if (Object.keys(filteredOrders).length > 0) {
                    invoiceData.orders[storeId] = filteredOrders;
                    console.log(`📦 Loaded ${Object.keys(filteredOrders).length} orders for store ${storeId}`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not load orders for store ${storeId}:`, error);
            }
        }
        
        // If no orders found, try legacy structure: store_orders/{storeId}
        if (Object.keys(invoiceData.orders).length === 0) {
            console.log('🔄 Trying legacy order structure...');
            
            for (const storeId of Object.keys(invoiceData.stores)) {
                try {
                    const ordersSnapshot = await firebase.database().ref(`store_orders/${storeId}`).once('value');
                    const storeOrders = ordersSnapshot.val() || {};
                    
                    // Filter orders by date range
                    const filteredOrders = {};
                    Object.keys(storeOrders).forEach(orderId => {
                        const order = storeOrders[orderId];
                        
                        // Try different date field names
                        const orderDate = order.date || order.orderDate || order.createdAt || order.timestamp;
                        
                        if (orderDate) {
                            // Convert order date to Date object
                            let orderDateObj;
                            if (orderDate && orderDate.includes('/')) {
                                // Format: "2/8/2025" -> convert to "2025-08-02"
                                const parts = orderDate.split('/');
                                const month = parts[0].padStart(2, '0');
                                const day = parts[1].padStart(2, '0');
                                const year = parts[2];
                                orderDateObj = new Date(`${year}-${month}-${day}`);
                            } else if (orderDate) {
                                orderDateObj = new Date(orderDate);
                            }
                            
                            // Check if order date is within selected range
                            if (dateRange.start && dateRange.end && orderDateObj >= dateRange.start && orderDateObj <= dateRange.end) {
                                filteredOrders[orderId] = order;
                            }
                        }
                    });
                    
                    if (Object.keys(filteredOrders).length > 0) {
                        invoiceData.orders[storeId] = filteredOrders;
                        console.log(`📦 Loaded ${Object.keys(filteredOrders).length} legacy orders for store ${storeId}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not load legacy orders for store ${storeId}:`, error);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        throw error;
    }
}

// Generate Store Invoice
async function generateStoreInvoice() {
    try {
        showLoading(true);
        
        console.log('📊 === GENERATING STORE INVOICE ===');
        console.log('📦 Current invoiceData.orders:', invoiceData.orders);
        console.log('🏪 Current selectedStoreId:', selectedStoreId);
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            showNotification('Vui lòng chọn khoảng thời gian!', 'error');
            showLoading(false);
            return;
        }
        
        if (!selectedStoreId) {
            showNotification('Vui lòng chọn cửa hàng!', 'error');
            showLoading(false);
            return;
        }
        
        // Update date range
        dateRange.start = new Date(startDate + 'T00:00:00');
        dateRange.end = new Date(endDate + 'T23:59:59');
        
        console.log('📅 Date range updated:', dateRange);
        
        // Load orders with date filter applied
        await loadAllOrders();
        
        console.log('🏪 Generating store invoice for:', selectedStoreId);
        console.log('📅 Date range:', startDate, 'to', endDate);
        
        const productSummary = {};
        let totalRevenue = 0;
        let totalOrders = 0;
        
        console.log('💰 === INITIALIZING TOTALS ===');
        console.log('Initial totalRevenue:', totalRevenue);
        console.log('Initial totalOrders:', totalOrders);
        
        // Get store info
        const storeInfo = invoiceData.stores[selectedStoreId];
        const storeName = storeInfo ? storeInfo.name : `Cửa hàng ${selectedStoreId}`;
        
        // Process selected store orders
        const storeOrders = invoiceData.orders[selectedStoreId] || {};
        console.log(`🏪 Processing store ${selectedStoreId}:`, Object.keys(storeOrders).length, 'orders');
        console.log('📦 All loaded orders data:', invoiceData.orders);
        console.log('📦 Store orders for', selectedStoreId, ':', storeOrders);
        
        if (Object.keys(storeOrders).length === 0) {
            console.warn('⚠️ No orders found for store:', selectedStoreId);
            console.log('🔍 Available stores with orders:', Object.keys(invoiceData.orders));
        }
        
        Object.keys(storeOrders).forEach(orderId => {
            const order = storeOrders[orderId];
            
            console.log('🔍 === CHECKING ORDER:', orderId, '===');
            console.log('  - Complete order object:', order);
            console.log('  - Order keys:', Object.keys(order));
            
            // Try different date field names
            const orderDate = order.date || order.orderDate || order.createdAt || order.timestamp;
            console.log('  - Found date field:', orderDate, '(type:', typeof orderDate, ')');
            console.log('  - order.date:', order.date);
            console.log('  - order.orderDate:', order.orderDate);
            console.log('  - order.createdAt:', order.createdAt);
            console.log('  - order.timestamp:', order.timestamp);
            
            console.log('  - Order total:', order.total, '(type:', typeof order.total, ')');
            console.log('  - Order items:', order.items);
            console.log('  - Date range:', startDate, 'to', endDate);
            
            // Validate order date
            if (orderDate && orderDate.length > 0) {
                // Convert dates for proper comparison
                let orderDateObj;
                try {
                    // Handle different date formats
                    if (orderDate && orderDate.includes('/')) {
                        // Format: "2/8/2025" -> convert to "2025-08-02"
                        const parts = orderDate.split('/');
                        const month = parts[0].padStart(2, '0');
                        const day = parts[1].padStart(2, '0');
                        const year = parts[2];
                        orderDateObj = new Date(`${year}-${month}-${day}`);
                    } else if (orderDate) {
                        orderDateObj = new Date(orderDate);
                    }
                } catch (e) {
                    console.warn('⚠️ Invalid order date:', orderDate);
                    return;
                }
                
                console.log('📅 Converted dates - Order:', orderDateObj, 'Start:', dateRange.start, 'End:', dateRange.end);
            
            // Process order only if it's within the selected date range
            if (dateRange.start && dateRange.end && orderDateObj >= dateRange.start && orderDateObj <= dateRange.end) {
                console.log('✅ Order in range:', orderId);
                totalOrders++;
                
                // Calculate order total from items if order.total is not available
                let orderTotal = 0;
                console.log('🔍 Order total check:', order.total, 'Type:', typeof order.total);
                
                if (order.total && !isNaN(parseFloat(order.total))) {
                    orderTotal = parseFloat(order.total);
                    console.log('💰 Using order.total:', orderTotal);
                } else if (order.items && Array.isArray(order.items)) {
                    // Calculate from items
                    console.log('💰 Calculating from items:', order.items.length, 'items');
                    order.items.forEach((item, index) => {
                        const quantity = parseFloat(item.quantity || 0);
                        const price = parseFloat(item.price || 0);
                        const itemTotal = quantity * price;
                        orderTotal += itemTotal;
                        console.log(`  Item ${index + 1}: ${quantity} x ${price} = ${itemTotal}`);
                    });
                    console.log('💰 Calculated total from items:', orderTotal);
                } else {
                    console.warn('⚠️ No total or items found for order:', orderId);
                }
                
                // FALLBACK: If no items but we have orderTotal, create a product entry from order data
                if (orderTotal > 0 && (!order.items || !Array.isArray(order.items) || order.items.length === 0)) {
                    console.log('🔄 FALLBACK: Creating product from order data');
                    
                    // Try to extract product info from order
                    let productName = order.productName || order.product || order.name || order.itemName;
                    let quantity = parseFloat(order.quantity || order.qty || 1);
                    let unitPrice = parseFloat(order.price || order.unitPrice || (orderTotal / quantity));
                    
                    // Find product unit from products data
                    let productUnit = 'kg'; // default
                    const productId = order.productId || order.sku;
                    if (productId && invoiceData.products) {
                        const productData = Object.values(invoiceData.products).find(p => 
                            p.id === productId || p.sku === productId || p.productName === productName
                        );
                        if (productData && productData.unit) {
                            productUnit = productData.unit;
                        }
                    }
                    
                    // If no product name found, try to find it in order keys
                    if (!productName) {
                        const orderKeys = Object.keys(order);
                        console.log('🔍 Order keys for product name search:', orderKeys);
                        
                        // Look for keys that might contain product name
                        const productKey = orderKeys.find(key => 
                            key.toLowerCase().includes('product') || 
                            key.toLowerCase().includes('item') ||
                            key.toLowerCase().includes('name')
                        );
                        
                        if (productKey) {
                            productName = order[productKey];
                            console.log('🔍 Found product name in key:', productKey, '=', productName);
                        }
                    }
                    
                    // Fallback to generic name if still not found
                    if (!productName || typeof productName !== 'string') {
                        productName = `Sản phẩm từ đơn ${orderId.substring(0, 8)}`;
                    }
                    
                    console.log('🔄 Extracted product info:', {
                        productName,
                        quantity,
                        unitPrice,
                        total: orderTotal
                    });
                    
                    if (!productSummary[productName]) {
                        productSummary[productName] = {
                            quantity: 0,
                            unitPrice: unitPrice,
                            total: 0,
                            unit: productUnit  // Use found product unit
                        };
                    }
                    
                    productSummary[productName].quantity += quantity;
                    productSummary[productName].total += orderTotal;
                    
                    console.log('🔄 Added product from order:', productName, productSummary[productName]);
                }
                
                console.log('💰 Before adding - totalRevenue:', totalRevenue, 'orderTotal:', orderTotal);
                totalRevenue += orderTotal;
                console.log('💰 After adding - totalRevenue:', totalRevenue);
                
                // Process order items for product summary
                console.log('📋 === PROCESSING ORDER ITEMS FOR PRODUCT SUMMARY ===');
                console.log('order.items exists:', !!order.items);
                console.log('order.items is array:', Array.isArray(order.items));
                console.log('order.items:', order.items);
                
                if (order.items && Array.isArray(order.items)) {
                    console.log('📋 Processing', order.items.length, 'items');
                    order.items.forEach((item, index) => {
                        console.log(`📋 Item ${index + 1}:`, item);
                        
                        const productName = item.product || item.name || item.productName || 'Sản phẩm không xác định';
                        const quantity = parseFloat(item.quantity || item.qty || 0);
                        const price = parseFloat(item.price || item.unitPrice || 0);
                        const itemTotal = quantity * price;
                        
                        // Find product unit from products data
                        let productUnit = 'kg'; // default
                        const productId = item.productId || item.sku;
                        if (productId && invoiceData.products) {
                            const productData = Object.values(invoiceData.products).find(p => 
                                p.id === productId || p.sku === productId || p.productName === productName
                            );
                            if (productData && productData.unit) {
                                productUnit = productData.unit;
                            }
                        }
                        
                        console.log('📋 Processing item:', productName, 'Qty:', quantity, 'Price:', price, 'Total:', itemTotal);
                        
                        // Check if we have valid product data
                        if (!productName || productName === 'Sản phẩm không xác định') {
                            console.warn('⚠️ Invalid product name:', productName);
                        }
                        if (quantity <= 0) {
                            console.warn('⚠️ Invalid quantity:', quantity);
                        }
                        if (price <= 0) {
                            console.warn('⚠️ Invalid price:', price);
                        }
                        
                        // Initialize product if not exists
                        if (!productSummary[productName]) {
                            productSummary[productName] = {
                                quantity: 0,
                                unitPrice: price, // Store unit price
                                total: 0,
                                unit: productUnit  // Use found product unit
                            };
                            console.log('🆕 New product added to summary:', productName);
                            console.log('🆕 Current productSummary keys:', Object.keys(productSummary));
                        }
                        
                        // Accumulate quantity and total
                        productSummary[productName].quantity += quantity;
                        productSummary[productName].total += itemTotal;
                        
                        console.log('📈 Updated product:', productName, {
                            quantity: productSummary[productName].quantity,
                            total: productSummary[productName].total
                        });
                        console.log('📈 Current productSummary:', productSummary);
                    });
                    console.log('📋 FINISHED processing items. Final productSummary:', productSummary);
                } else {
                    console.log('📋 NO ITEMS to process for this order');
                    console.log('  - order.items exists:', !!order.items);
                    console.log('  - order.items is array:', Array.isArray(order.items));
                    console.log('  - order.items value:', order.items);
                }
            }
        }
        });
        
        console.log('📊 === FINAL STORE INVOICE SUMMARY ===');
        console.log('- Store:', storeName);
        console.log('- Total Orders:', totalOrders, '(type:', typeof totalOrders, ')');
        console.log('- Total Revenue:', totalRevenue, '(type:', typeof totalRevenue, ')');
        console.log('- Products:', Object.keys(productSummary).length);
        console.log('📋 Product Summary Detail:', productSummary);
        
        // Check if totalRevenue is valid
        if (totalRevenue === 0 && totalOrders > 0) {
            console.error('❌ PROBLEM: totalRevenue is 0 but we have orders!');
            console.log('🔍 Debugging info:');
            console.log('- totalOrders:', totalOrders);
            console.log('- productSummary keys:', Object.keys(productSummary));
            
            // Try to recalculate from productSummary
            let recalculatedTotal = 0;
            Object.keys(productSummary).forEach(productName => {
                recalculatedTotal += productSummary[productName].total;
            });
            console.log('🔄 Recalculated total from products:', recalculatedTotal);
            
            if (recalculatedTotal > 0) {
                console.log('🔧 Using recalculated total!');
                totalRevenue = recalculatedTotal;
            }
        }
        
        // Debug: Check if we have valid data
        if (totalOrders === 0) {
            console.warn('⚠️ No orders found in date range!');
            console.log('🔍 Debug info:');
            console.log('- Selected store:', selectedStoreId);
            console.log('- Date range:', startDate, 'to', endDate);
            console.log('- Available orders:', Object.keys(storeOrders));
        }
        
        // Generate invoice HTML
        const invoiceHTML = generateInvoiceHTML({
            type: 'store',
            storeId: selectedStoreId,
            storeName,
            startDate,
            endDate,
            productSummary,
            totalRevenue,
            totalOrders
        });
        
        displayInvoice(invoiceHTML);
        
    } catch (error) {
        console.error('Error generating store invoice:', error);
        showNotification('Lỗi tạo hóa đơn cửa hàng!', 'error');
    } finally {
        showLoading(false);
    }
}

// Generate Invoice HTML
function generateInvoiceHTML(data) {
    console.log('🎨 === GENERATING INVOICE HTML ===');
    console.log('📦 Data received:', data);
    
    const { type, storeId, storeName, startDate, endDate, productSummary, totalRevenue, totalOrders } = data;
    
    console.log('💰 Total Revenue for HTML:', totalRevenue);
    console.log('📋 Product Summary for HTML:', productSummary);
    console.log('📅 Total Orders for HTML:', totalOrders);
    
    // Format dates
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    // Generate product rows
    let productRows = '';
    let stt = 1;
    
    console.log('🎨 === GENERATING PRODUCT ROWS ===');
    console.log('productSummary keys:', Object.keys(productSummary));
    console.log('productSummary length:', Object.keys(productSummary).length);
    console.log('productSummary data:', productSummary);
    
    if (Object.keys(productSummary).length === 0) {
        console.warn('⚠️ productSummary is empty! This is why no products are shown.');
    }
    
    Object.keys(productSummary).forEach(productName => {
        const product = productSummary[productName];
        console.log('🎨 Rendering product:', productName, product);
        productRows += `
            <tr>
                <td>${stt}</td>
                <td>${productName}</td>
                <td class="text-right">${product.quantity.toLocaleString()} ${product.unit || 'kg'}</td>
                <td class="text-right">${product.unitPrice.toLocaleString()}đ</td>
                <td class="text-right">${product.total.toLocaleString()}đ</td>
            </tr>
        `;
        stt++;
    });
    
    if (productRows === '') {
        productRows = `
            <tr>
                <td colspan="5" class="text-center">Không có sản phẩm nào trong khoảng thời gian này</td>
            </tr>
        `;
    }
    
    return `
        <div class="invoice">
            <div class="invoice-header">
                <h1 class="invoice-title">📝 HÓA ĐƠN CỬA HÀNG</h1>
                <h2 class="invoice-subtitle">${storeName}</h2>
            </div>
            
            <div class="invoice-info">
                <div>
                    <div class="invoice-info-item">
                        <span class="invoice-info-label">Mã cửa hàng:</span>
                        <span class="invoice-info-value">${storeId}</span>
                    </div>
                    <div class="invoice-info-item">
                        <span class="invoice-info-label">Tổng đơn hàng:</span>
                        <span class="invoice-info-value">${totalOrders} đơn</span>
                    </div>
                </div>
                <div>
                    <div class="invoice-info-item">
                        <span class="invoice-info-label">Ngày tạo:</span>
                        <span class="invoice-info-value">${formatDate(new Date().toISOString().split('T')[0])}</span>
                    </div>
                    <div class="invoice-info-item">
                        <span class="invoice-info-label">Tổng sản phẩm:</span>
                        <span class="invoice-info-value">${Object.keys(productSummary).length} loại</span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px; font-weight: bold;">
                Từ ${formattedStartDate} đến ${formattedEndDate}
            </div>
            
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>TÊN SẢN PHẨM</th>
                        <th>SỐ LƯỢNG</th>
                        <th>ĐƠN GIÁ</th>
                        <th>THÀNH TIỀN</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows}
                </tbody>
            </table>
            
            <div class="invoice-total">
                TỔNG CỘNG: ${totalRevenue.toLocaleString()}đ
            </div>
            
            <div class="invoice-footer">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
                    <div>
                        <p><strong>📍 Địa chỉ công ty:</strong></p>
                        <p>123 Đường ABC, Quận XYZ, TP.HCM</p>
                        <p>📞 Hotline: 0123-456-789</p>
                        <p>📧 Email: info@company.com</p>
                    </div>
                    <div style="text-align: right;">
                        <p><strong>👤 Người lập:</strong> ________________</p>
                        <p><strong>📅 Ngày lập:</strong> ${formatDate(new Date().toISOString().split('T')[0])}</p>
                        <p><strong>✍️ Chữ ký:</strong></p>
                        <div style="height: 50px;"></div>
                    </div>
                </div>
                <div style="text-align: center; border-top: 1px solid #ddd; padding-top: 15px;">
                    <p><strong>⚠️ Cảm ơn quý khách đã sử dụng dịch vụ!</strong></p>
                    <p>📝 Hệ thống quản lý đơn hàng đa cửa hàng - Phiên bản 2.0</p>
                </div>
            </div>
        </div>
    `;
}

// Display invoice
function displayInvoice(invoiceHTML) {
    const invoiceContent = document.getElementById('invoiceContent');
    if (invoiceContent) {
        invoiceContent.innerHTML = invoiceHTML;
    }
    
    const previewSection = document.getElementById('invoicePreviewSection');
    if (previewSection) {
        previewSection.classList.remove('hidden');
    }
    
    const printBtn = document.getElementById('printInvoiceBtn');
    if (printBtn) {
        printBtn.classList.remove('hidden');
    }
    
    showNotification('Hóa đơn cửa hàng đã được tạo thành công!', 'success');
}

// Print invoice - Show payment confirmation modal first
function printInvoice() {
    // Show payment confirmation modal
    showPaymentConfirmationModal();
}

// Actual print function (called after payment confirmation)
function doPrintInvoice() {
    const printWindow = window.open('', '_blank');
    const invoiceContent = document.getElementById('invoiceContent').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hóa Đơn Cửa Hàng</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .invoice { max-width: 800px; margin: 0 auto; }
                .invoice-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333; }
                .invoice-title { font-size: 2rem; font-weight: bold; color: #333; margin: 0 0 10px 0; }
                .invoice-subtitle { font-size: 1.2rem; color: #666; margin: 0; }
                .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding: 20px; background: #f8f9fa; }
                .invoice-info-item { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .invoice-info-label { font-weight: 600; }
                .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .invoice-table th { background: #333; color: white; padding: 12px; text-align: left; }
                .invoice-table td { padding: 12px; border-bottom: 1px solid #ddd; }
                .invoice-table tr:nth-child(even) { background: #f8f9fa; }
                .invoice-total { text-align: right; font-size: 1.2rem; font-weight: bold; margin-bottom: 30px; padding: 15px; background: #e9ecef; }
                .invoice-footer { padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9rem; }
                .invoice-footer div:first-child { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px; }
                .invoice-footer div:last-child { text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            ${invoiceContent}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    toastIcon.className = `toast-icon ${iconClass}`;
    toastMessage.textContent = message;
    
    // Show toast
    toast.className = `toast show ${type}`;
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ============= PAYMENT CONFIRMATION MODAL FUNCTIONS =============

let currentInvoiceData = null;
let currentTotalAmount = 0;

// Show payment confirmation modal
function showPaymentConfirmationModal() {
    // Get total amount from invoice
    const invoiceContent = document.getElementById('invoiceContent');
    if (!invoiceContent) {
        showNotification('Vui lòng tạo hóa đơn trước!', 'warning');
        return;
    }
    
    // Calculate total from current invoice data
    currentTotalAmount = calculateInvoiceTotalAmount();
    
    // Reset form
    document.getElementById('paymentStatus').value = 'unpaid';
    document.getElementById('amountPaid').value = '';
    document.getElementById('paymentNote').value = '';
    document.getElementById('partialPaymentContainer').style.display = 'none';
    
    // Update total amount display
    document.getElementById('totalAmountDisplay').textContent = formatCurrency(currentTotalAmount);
    document.getElementById('remainingAmountDisplay').textContent = formatCurrency(currentTotalAmount);
    
    // Show modal
    const modal = document.getElementById('paymentConfirmationModal');
    modal.style.display = 'flex';
    
    // Setup event listeners for modal
    setupPaymentModalListeners();
}

// Close payment modal
function closePaymentModal() {
    const modal = document.getElementById('paymentConfirmationModal');
    modal.style.display = 'none';
}

// Setup payment modal event listeners
function setupPaymentModalListeners() {
    // Payment status change
    const paymentStatus = document.getElementById('paymentStatus');
    paymentStatus.removeEventListener('change', handlePaymentStatusChange);
    paymentStatus.addEventListener('change', handlePaymentStatusChange);
    
    // Amount paid input with formatting
    const amountPaid = document.getElementById('amountPaid');
    amountPaid.removeEventListener('input', handleAmountPaidInput);
    amountPaid.addEventListener('input', handleAmountPaidInput);
    
    // Confirm and print button
    const confirmBtn = document.getElementById('confirmAndPrintBtn');
    confirmBtn.removeEventListener('click', confirmAndPrint);
    confirmBtn.addEventListener('click', confirmAndPrint);
}

// Handle payment status change
function handlePaymentStatusChange() {
    const status = document.getElementById('paymentStatus').value;
    const partialContainer = document.getElementById('partialPaymentContainer');
    const amountPaid = document.getElementById('amountPaid');
    
    if (status === 'paid') {
        partialContainer.style.display = 'none';
        amountPaid.value = currentTotalAmount;
    } else if (status === 'partial') {
        partialContainer.style.display = 'block';
        amountPaid.value = '';
        updateRemainingAmount();
    } else {
        partialContainer.style.display = 'none';
        amountPaid.value = 0;
    }
}

// Handle amount paid input with formatting
function handleAmountPaidInput(e) {
    let value = e.target.value;
    
    // Remove all non-digit characters except for the first character if it's a digit
    value = value.replace(/[^0-9]/g, '');
    
    // Format the number with dots
    if (value) {
        // Convert to number and format with dots
        const num = parseInt(value);
        e.target.value = num.toLocaleString('vi-VN');
    }
    
    // Update remaining amount
    updateRemainingAmount();
}

// Update remaining amount
function updateRemainingAmount() {
    const amountPaidInput = document.getElementById('amountPaid').value;
    // Remove dots to parse the number
    const amountPaid = parseFloat(amountPaidInput.replace(/\./g, '')) || 0;
    const remaining = Math.max(0, currentTotalAmount - amountPaid);
    document.getElementById('remainingAmountDisplay').textContent = formatCurrency(remaining);
}

// Confirm and print
async function confirmAndPrint() {
    const paymentStatus = document.getElementById('paymentStatus').value;
    const amountPaidInput = document.getElementById('amountPaid').value;
    // Remove dots to parse the number
    const amountPaid = parseFloat(amountPaidInput.replace(/\./g, '')) || 0;
    const paymentNote = document.getElementById('paymentNote').value;
    
    // Validate partial payment
    if (paymentStatus === 'partial') {
        if (amountPaid <= 0) {
            showNotification('Vui lòng nhập số tiền đã thanh toán!', 'warning');
            return;
        }
        if (amountPaid >= currentTotalAmount) {
            showNotification('Số tiền đã thanh toán phải nhỏ hơn tổng tiền!', 'warning');
            return;
        }
    }
    
    // Prepare invoice data to save
    const invoiceDataToSave = {
        storeId: selectedStoreId,
        storeName: invoiceData.stores[selectedStoreId]?.name || 'N/A',
        dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
        },
        totalAmount: currentTotalAmount,
        paymentStatus: paymentStatus,
        paidAmount: paymentStatus === 'paid' ? currentTotalAmount : amountPaid,
        paymentNote: paymentNote,
        createdAt: new Date().toISOString(),
        invoiceContent: document.getElementById('invoiceContent').innerHTML
    };
    
    try {
        showLoading(true);
        
        // Save to Firebase
        const invoiceRef = database.ref('invoices').push();
        await invoiceRef.set(invoiceDataToSave);
        
        // Save payment history
        if (paymentStatus !== 'unpaid') {
            const paymentHistoryRef = database.ref(`paymentHistory/${invoiceRef.key}`).push();
            await paymentHistoryRef.set({
                amount: invoiceDataToSave.paidAmount,
                status: paymentStatus,
                note: paymentNote,
                createdAt: new Date().toISOString()
            });
        }
        
        showLoading(false);
        closePaymentModal();
        
        showNotification('Đã lưu thông tin thanh toán thành công!', 'success');
        
        // Print invoice
        setTimeout(() => {
            doPrintInvoice();
        }, 500);
        
    } catch (error) {
        console.error('Error saving invoice:', error);
        showLoading(false);
        showNotification('Có lỗi xảy ra khi lưu hóa đơn!', 'error');
    }
}

// Calculate invoice total amount
function calculateInvoiceTotalAmount() {
    // Try to get from invoice content
    const invoiceContent = document.getElementById('invoiceContent');
    if (!invoiceContent) return 0;
    
    // Look for total amount in the invoice HTML
    const totalElements = invoiceContent.querySelectorAll('.invoice-total');
    if (totalElements.length > 0) {
        const totalText = totalElements[0].textContent;
        // Match numbers with dots (Vietnamese format: 12.000.000) or commas
        const match = totalText.match(/[\d,.]+/);
        if (match) {
            // Remove both dots and commas, then parse
            return parseFloat(match[0].replace(/[.,]/g, ''));
        }
    }
    
    // Fallback: calculate from orders
    let total = 0;
    if (selectedStoreId && invoiceData.orders[selectedStoreId]) {
        const storeOrders = invoiceData.orders[selectedStoreId];
        storeOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    total += (item.price || 0) * (item.quantity || 0);
                });
            }
        });
    }
    
    return total;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
