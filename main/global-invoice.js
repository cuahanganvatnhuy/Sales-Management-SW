// Global Invoice JavaScript

let invoiceData = {
    stores: {},
    orders: {}
};
let dateRange = {
    start: null,
    end: null
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌍 Global Invoice page loaded');
    
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
    // Invoice actions
    document.getElementById('generateInvoiceBtn').addEventListener('click', function() {
        generateGlobalInvoice();
    });
    
    document.getElementById('printInvoiceBtn').addEventListener('click', function() {
        printInvoice();
    });
    
    console.log('✅ Global Invoice event listeners initialized');
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
    
    console.log('📅 Date filter applied for global invoice:', dateRange);
    
    // Load orders with the applied date filter
    await loadAllOrders();
    
    // Show invoice actions section
    document.getElementById('invoiceActionsSection').classList.remove('hidden');
    
    showNotification('Khoảng thời gian đã được áp dụng! Có thể tạo hóa đơn.', 'success');
}

// Load invoice data
async function loadInvoiceData() {
    try {
        showLoading(true);
        
        console.log('📈 Loading global invoice data...');
        
        // Load stores
        const storesSnapshot = await firebase.database().ref('stores').once('value');
        invoiceData.stores = storesSnapshot.val() || {};
        
        console.log('🏪 Loaded stores:', Object.keys(invoiceData.stores).length);
        
        // Don't load orders initially, only after date filter is applied
        console.log('🕒 Date range not set yet, skipping order loading');
        
        console.log('✅ Global invoice data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading global invoice data:', error);
        showNotification('Lỗi tải dữ liệu hóa đơn!', 'error');
    } finally {
        showLoading(false);
    }
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

// Generate Global Invoice (All Stores)
async function generateGlobalInvoice() {
    try {
        showLoading(true);
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            showNotification('Vui lòng chọn khoảng thời gian!', 'error');
            showLoading(false);
            return;
        }
        
        // Update date range
        dateRange.start = new Date(startDate + 'T00:00:00');
        dateRange.end = new Date(endDate + 'T23:59:59');
        
        console.log('📅 Date range updated:', dateRange);
        
        // Load orders with date filter applied
        await loadAllOrders();
        
        console.log('🌍 Generating global invoice...');
        console.log('📅 Date range:', startDate, 'to', endDate);
        
        // Create store summaries
        const storeSummaries = {};
        let totalRevenue = 0;
        let totalOrders = 0;
        
        // Process all stores
        Object.keys(invoiceData.stores).forEach(storeId => {
            const storeInfo = invoiceData.stores[storeId];
            const storeName = storeInfo ? storeInfo.name : `Cửa hàng ${storeId}`;
            const storeOrders = invoiceData.orders[storeId] || {};
            
            // Initialize store summary
            storeSummaries[storeId] = {
                name: storeName,
                productSummary: {},
                totalRevenue: 0,
                totalOrders: 0
            };
            
            console.log(`🏪 Processing store ${storeId}:`, Object.keys(storeOrders).length, 'orders');
        
            Object.keys(storeOrders).forEach(orderId => {
                const order = storeOrders[orderId];
                
                // Try different date field names
                const orderDate = order.date || order.orderDate || order.createdAt || order.timestamp;
                console.log('  - Found date field:', orderDate, '(type:', typeof orderDate, ')');
                console.log('  - order.date:', order.date);
                console.log('  - order.orderDate:', order.orderDate);
                console.log('  - order.createdAt:', order.createdAt);
                console.log('  - order.timestamp:', order.timestamp);
                
                // Convert dates for proper comparison
                let orderDateObj, startDateObj, endDateObj;
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
                    
                    startDateObj = new Date(startDate);
                    endDateObj = new Date(endDate);
                    endDateObj.setHours(23, 59, 59, 999); // Include end of day
                } catch (e) {
                    console.warn('⚠️ Invalid date format for order:', orderId, orderDate);
                    return;
                }
                
                // Check if order is in date range
                if (orderDateObj >= startDateObj && orderDateObj <= endDateObj) {
                    storeSummaries[storeId].totalOrders++;
                    totalOrders++;
                    
                    let orderTotal = parseFloat(order.total || 0);
                    storeSummaries[storeId].totalRevenue += orderTotal;
                    totalRevenue += orderTotal;
                    
                    // Process single order (not array of items)
                    const productName = order.productName || 'Sản phẩm không xác định';
                    const quantity = parseFloat(order.quantity || 0);
                    const price = parseFloat(order.price || 0);
                    const itemTotal = quantity * price;
                    
                    if (!storeSummaries[storeId].productSummary[productName]) {
                        storeSummaries[storeId].productSummary[productName] = {
                            quantity: 0,
                            price: price,
                            total: 0
                        };
                    }
                    
                    storeSummaries[storeId].productSummary[productName].quantity += quantity;
                    storeSummaries[storeId].productSummary[productName].total += itemTotal;
                }
            });
        });
        
        console.log('📊 Global invoice summary:');
        console.log('- Total Orders:', totalOrders);
        console.log('- Total Revenue:', totalRevenue);
        
        // Generate invoice HTML
        const invoiceHTML = generateInvoiceHTML({
            type: 'global',
            storeName: 'TẤT CẢ CỬA HÀNG',
            startDate,
            endDate,
            totalRevenue,
            totalOrders,
            storeSummaries
        });
        
        displayInvoice(invoiceHTML);
        
    } catch (error) {
        console.error('Error generating global invoice:', error);
        showNotification('Lỗi tạo hóa đơn toàn bộ!', 'error');
    } finally {
        showLoading(false);
    }
}

// Generate Invoice HTML
function generateInvoiceHTML(data) {
    let { type, storeName, startDate, endDate, productSummary, totalRevenue, totalOrders, storeSummaries } = data;
    
    // If we don't have productSummary but have storeSummaries, create a combined product summary
    if (!productSummary && storeSummaries) {
        productSummary = {};
        Object.keys(storeSummaries).forEach(storeId => {
            const store = storeSummaries[storeId];
            if (store.productSummary) {
                Object.keys(store.productSummary).forEach(productName => {
                    if (!productSummary[productName]) {
                        // Calculate average price from all stores selling this product
                        let totalPrice = 0;
                        let storeCount = 0;
                        Object.keys(storeSummaries).forEach(otherStoreId => {
                            const otherStore = storeSummaries[otherStoreId];
                            if (otherStore.productSummary && otherStore.productSummary[productName]) {
                                totalPrice += otherStore.productSummary[productName].price;
                                storeCount++;
                            }
                        });
                        
                        productSummary[productName] = {
                            quantity: 0,
                            price: storeCount > 0 ? totalPrice / storeCount : store.productSummary[productName].price,
                            total: 0
                        };
                    }
                    productSummary[productName].quantity += store.productSummary[productName].quantity;
                    productSummary[productName].total += store.productSummary[productName].total;
                });
            }
        });
    }
    
    // Format dates
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    // Generate product rows
    let productRows = '';
    
    // Only generate product rows if we have productSummary
    if (productSummary) {
        let stt = 1;
        Object.keys(productSummary).forEach(productName => {
            const product = productSummary[productName];
            productRows += `
                <tr>
                    <td>${stt}</td>
                    <td>${productName}</td>
                    <td class="text-right">${product.quantity.toLocaleString()} kg</td>
                    <td class="text-right">${formatCurrency(product.price)}</td>
                    <td class="text-right">${formatCurrency(product.total)}</td>
                </tr>
            `;
            stt++;
        });
    }
    
    // If no product rows were generated, show message
    if (productRows === '') {
        productRows = `
            <tr>
                <td colspan="5" class="text-center">Không có sản phẩm nào trong khoảng thời gian này</td>
            </tr>
        `;
    }
    
    // Function to generate store details HTML
    function generateStoreDetailsHTML(storeSummaries) {
        let storeDetailsHTML = '';
        
        Object.keys(storeSummaries).forEach(storeId => {
            const store = storeSummaries[storeId];
            
            // Only display stores with orders
            if (store.totalOrders > 0) {
                // Generate store product rows
                let storeProductRows = '';
                let stt = 1;
                
                Object.keys(store.productSummary).forEach(productName => {
                    const product = store.productSummary[productName];
                    storeProductRows += `
                        <tr>
                            <td>${stt}</td>
                            <td>${productName}</td>
                            <td class="text-right">${product.quantity.toLocaleString()} kg</td>
                            <td class="text-right">${formatCurrency(product.price)}</td>
                            <td class="text-right">${formatCurrency(product.total)}</td>
                        </tr>
                    `;
                    stt++;
                });
                
                if (storeProductRows === '') {
                    storeProductRows = `
                        <tr>
                            <td colspan="5" class="text-center">Cửa hàng không có sản phẩm nào trong khoảng thời gian này</td>
                        </tr>
                    `;
                }
                
                storeDetailsHTML += `
                    <div class="store-details">
                        <h4>🏪 ${store.name} (${store.totalOrders} đơn hàng)</h4>
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
                                ${storeProductRows}
                            </tbody>
                        </table>
                        <div class="store-total">
                            Tổng ${store.name}: ${store.totalRevenue.toLocaleString()}đ
                        </div>
                    </div>
                `;
            }
        });
        
        if (storeDetailsHTML === '') {
            storeDetailsHTML = '<p class="text-center">Không có đơn hàng nào trong khoảng thời gian này</p>';
        }
        
        return storeDetailsHTML;
    }
    
    let storeDetailsHTML = '';
    // If we have store summaries (global invoice), display by store
    if (storeSummaries) {
        // Use the dedicated function for store details
        storeDetailsHTML = generateStoreDetailsHTML(storeSummaries);
        // We'll insert this in the appropriate place in the template
    } else {
        // Regular store invoice (existing logic)
        let stt = 1;
        Object.keys(productSummary).forEach(productName => {
            const product = productSummary[productName];
            productRows += `
                <tr>
                    <td>${stt}</td>
                    <td>${productName}</td>
                    <td class="text-right">${product.quantity.toLocaleString()} kg</td>
                    <td class="text-right">${formatCurrency(product.price)}</td>
                    <td class="text-right">${formatCurrency(product.total)}</td>
                </tr>
            `;
            stt++;
        });
        
        if (Object.keys(productSummary).length === 0) {
            productRows = `
                <tr>
                    <td colspan="5" class="text-center">Không có sản phẩm nào trong khoảng thời gian này</td>
                </tr>
            `;
        }
    }
    
    return `
        <div class="invoice">
            <style>
                .invoice-section {
                    margin-bottom: 30px;
                }
                .store-details {
                    margin-top: 20px;
                    padding: 15px;
                    border: 1px solid #eee;
                    border-radius: 5px;
                }
                .store-details h4 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #2c3e50;
                }
                .store-total {
                    text-align: right;
                    font-weight: bold;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid #ddd;
                }
            </style>
            <div class="invoice-header">
                <h1 class="invoice-title">📝 HÓA ĐƠN TỔNG HỢP</h1>
                <h2 class="invoice-subtitle">${storeName}</h2>
            </div>
            
            <div class="invoice-info">
                <div>
                    <div class="invoice-info-item">
                        <span class="invoice-info-label">Loại báo cáo:</span>
                        <span class="invoice-info-value">Toàn bộ cửa hàng</span>
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
            
            <div class="invoice-section">
                <h3>📈 Tổng hợp chung</h3>
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
            </div>
            
            <!-- Store details section -->
            <div class="invoice-section">
                <h3>🏪 Chi tiết theo cửa hàng</h3>
                ${storeDetailsHTML}
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
    document.getElementById('invoiceContent').innerHTML = invoiceHTML;
    document.getElementById('invoicePreviewSection').classList.remove('hidden');
    document.getElementById('printInvoiceBtn').classList.remove('hidden');
    
    showNotification('Hóa đơn toàn bộ đã được tạo thành công!', 'success');
}

// Print invoice
function printInvoice() {
    const printWindow = window.open('', '_blank');
    const invoiceContent = document.getElementById('invoiceContent').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hóa Đơn Tổng Hợp</title>
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