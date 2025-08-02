// Invoice Management JavaScript

let currentInvoiceType = 'global';
let selectedStoreId = null;
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
    console.log('🧧 Invoice Management page loaded');
    
    // Load components
    loadComponents();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load data
    loadInvoiceData();
    
    // Set default dates (last 30 days)
    setDefaultDates();
});

// Load navbar and header components
function loadComponents() {
    // Load header
    fetch('../components/header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('headerContainer').innerHTML = html;
            if (typeof initializeHeader === 'function') {
                initializeHeader();
            }
        })
        .catch(error => console.error('Error loading header:', error));

    // Load navbar
    fetch('../components/navbar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('navbarContainer').innerHTML = html;
            if (typeof initializeNavbar === 'function') {
                initializeNavbar();
            }
        })
        .catch(error => console.error('Error loading navbar:', error));
}

// Initialize event listeners
function initializeEventListeners() {
    // Invoice type selection
    document.getElementById('globalInvoiceCard').addEventListener('click', () => selectInvoiceType('global'));
    document.getElementById('storeInvoiceCard').addEventListener('click', () => selectInvoiceType('store'));
    
    // Store selection for store invoice
    document.getElementById('invoiceStoreSelect').addEventListener('change', function() {
        selectedStoreId = this.value;
        console.log('🏪 Store selected for invoice:', selectedStoreId);
        
        // Auto show invoice actions if store and dates are selected
        if (selectedStoreId && dateRange.start && dateRange.end) {
            document.getElementById('invoiceActionsSection').classList.remove('hidden');
        }
    });
    
    // Date range filter
    document.getElementById('applyDateFilter').addEventListener('click', function() {
        applyDateFilter();
    });
    
    // Invoice actions
    document.getElementById('generateInvoiceBtn').addEventListener('click', function() {
        generateInvoice();
    });
    
    document.getElementById('printInvoiceBtn').addEventListener('click', function() {
        printInvoice();
    });
    
    console.log('✅ Invoice Management event listeners initialized');
}

// Select invoice type
function selectInvoiceType(type) {
    currentInvoiceType = type;
    
    // Update UI
    document.querySelectorAll('.invoice-type-card').forEach(card => {
        card.classList.remove('active');
    });
    
    if (type === 'global') {
        document.getElementById('globalInvoiceCard').classList.add('active');
        document.getElementById('storeSelectionSection').classList.add('hidden');
        selectedStoreId = null;
    } else {
        document.getElementById('storeInvoiceCard').classList.add('active');
        document.getElementById('storeSelectionSection').classList.remove('hidden');
    }
    
    console.log('🧧 Invoice type selected:', type);
    
    // Hide invoice actions and preview when changing type
    document.getElementById('invoiceActionsSection').classList.add('hidden');
    document.getElementById('invoicePreviewSection').classList.add('hidden');
    document.getElementById('printInvoiceBtn').classList.add('hidden');
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
}

// Apply date filter
function applyDateFilter() {
    const startDateValue = document.getElementById('startDate').value;
    const endDateValue = document.getElementById('endDate').value;
    
    if (!startDateValue || !endDateValue) {
        showNotification('Vui lòng chọn đầy đủ khoảng thời gian!', 'warning');
        return;
    }
    
    dateRange.start = new Date(startDateValue);
    dateRange.end = new Date(endDateValue);
    dateRange.end.setHours(23, 59, 59, 999); // Include end of day
    
    console.log('📅 Date filter applied for invoice:', dateRange);
    
    // Show invoice actions section
    document.getElementById('invoiceActionsSection').classList.remove('hidden');
    
    showNotification('Khoảng thời gian đã được áp dụng! Có thể tạo hóa đơn.', 'success');
}

// Load invoice data
async function loadInvoiceData() {
    try {
        showLoading(true);
        
        console.log('📈 Loading invoice data...');
        
        // Load stores
        const storesSnapshot = await firebase.database().ref('stores').once('value');
        invoiceData.stores = storesSnapshot.val() || {};
        
        // Populate store dropdown
        const storeSelect = document.getElementById('invoiceStoreSelect');
        storeSelect.innerHTML = '<option value="">-- Chọn cửa hàng --</option>';
        
        Object.keys(invoiceData.stores).forEach(storeId => {
            const store = invoiceData.stores[storeId];
            const option = document.createElement('option');
            option.value = storeId;
            option.textContent = store.name || `Cửa hàng ${storeId}`;
            storeSelect.appendChild(option);
        });
        
        // Load all orders
        await loadAllOrders();
        
        console.log('✅ Invoice data loaded successfully');
        console.log('📈 Stores:', Object.keys(invoiceData.stores).length);
        console.log('📈 Orders:', Object.keys(invoiceData.orders).length);
        
    } catch (error) {
        console.error('❌ Error loading invoice data:', error);
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
                
                if (Object.keys(storeOrders).length > 0) {
                    invoiceData.orders[storeId] = storeOrders;
                    console.log(`📦 Loaded ${Object.keys(storeOrders).length} orders for store ${storeId}`);
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
                    
                    if (Object.keys(storeOrders).length > 0) {
                        invoiceData.orders[storeId] = storeOrders;
                        console.log(`📦 Loaded ${Object.keys(storeOrders).length} legacy orders for store ${storeId}`);
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

// Generate invoice
function generateInvoice() {
    try {
        showLoading(true);
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        // Get store ID for store invoice
        let storeIdForInvoice = null;
        if (currentInvoiceType === 'store') {
            storeIdForInvoice = document.getElementById('invoiceStoreSelect')?.value || selectedStoreId;
        }
        
        if (!startDate || !endDate) {
            showNotification('Vui lòng chọn khoảng thời gian!', 'error');
            showLoading(false);
            return;
        }
        
        if (currentInvoiceType === 'store' && !storeIdForInvoice) {
            showNotification('Vui lòng chọn cửa hàng!', 'error');
            showLoading(false);
            return;
        }
        
        console.log('🧧 Generating invoice...');
        console.log('📅 Date range:', startDate, 'to', endDate);
        console.log('🏪 Invoice type:', currentInvoiceType);
        console.log('🏪 Store ID:', storeIdForInvoice);
        
        // Generate invoice based on type
        if (currentInvoiceType === 'global') {
            generateGlobalInvoice(startDate, endDate);
        } else {
            generateStoreInvoice(startDate, endDate, storeIdForInvoice);
        }
        
    } catch (error) {
        console.error('Error generating invoice:', error);
        showNotification('Lỗi tạo hóa đơn!', 'error');
    } finally {
        showLoading(false);
    }
}

// Generate Global Invoice (All Stores)
function generateGlobalInvoice(startDate, endDate) {
    console.log('🌍 Generating global invoice...');
    
    const productSummary = {};
    let totalRevenue = 0;
    let totalOrders = 0;
    
    // Process all stores
    Object.keys(invoiceData.stores).forEach(storeId => {
        const storeOrders = invoiceData.orders[storeId] || {};
        console.log(`🏪 Processing store ${storeId}:`, Object.keys(storeOrders).length, 'orders');
    
        Object.keys(storeOrders).forEach(orderId => {
            const order = storeOrders[orderId];
            const orderDate = order.date;
            
            // Check if order is in date range
            if (orderDate >= startDate && orderDate <= endDate) {
                totalOrders++;
                totalRevenue += parseFloat(order.total || 0);
                
                // Process order items
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const productName = item.product || 'Sản phẩm không xác định';
                        const quantity = parseFloat(item.quantity || 0);
                        const price = parseFloat(item.price || 0);
                        const itemTotal = quantity * price;
                        
                        if (!productSummary[productName]) {
                            productSummary[productName] = {
                                quantity: 0,
                                price: price,
                                total: 0
                            };
                        }
                        
                        productSummary[productName].quantity += quantity;
                        productSummary[productName].total += itemTotal;
                    });
                }
            }
        });
    });
    
    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML({
        type: 'global',
        storeName: 'TẤT CẢ CỬA HÀNG',
        startDate,
        endDate,
        productSummary,
        totalRevenue,
        totalOrders
    });
    
    displayInvoice(invoiceHTML);
}

// Generate Store Invoice (Single Store)
function generateStoreInvoice(startDate, endDate, storeId) {
    console.log('🏪 Generating store invoice for:', storeId);
    
    const store = invoiceData.stores[storeId];
    const storeOrders = invoiceData.orders[storeId] || {};
    const productSummary = {};
    let totalRevenue = 0;
    let totalOrders = 0;
    
    if (!store) {
        showNotification('Không tìm thấy thông tin cửa hàng!', 'error');
        return;
    }
    
    // Process store orders
    Object.keys(storeOrders).forEach(orderId => {
        const order = storeOrders[orderId];
        const orderDate = order.date;
        
        // Check if order is in date range
        if (orderDate >= startDate && orderDate <= endDate) {
            totalOrders++;
            totalRevenue += parseFloat(order.total || 0);
            
            // Process order items
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const productName = item.product || 'Sản phẩm không xác định';
                    const quantity = parseFloat(item.quantity || 0);
                    const price = parseFloat(item.price || 0);
                    const itemTotal = quantity * price;
                    
                    if (!productSummary[productName]) {
                        productSummary[productName] = {
                            quantity: 0,
                            price: price,
                            total: 0
                        };
                    }
                    
                    productSummary[productName].quantity += quantity;
                    productSummary[productName].total += itemTotal;
                });
            }
        }
    });
    
    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML({
        type: 'store',
        storeName: store.name || `Cửa hàng ${storeId}`,
        startDate,
        endDate,
        productSummary,
        totalRevenue,
        totalOrders
    });
    
    displayInvoice(invoiceHTML);
}

// Generate Invoice HTML
function generateInvoiceHTML(data) {
    const { type, storeName, startDate, endDate, productSummary, totalRevenue, totalOrders } = data;
    
    // Format dates
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    // Generate product rows
    let productRows = '';
    let stt = 1;
    
    Object.keys(productSummary).forEach(productName => {
        const product = productSummary[productName];
        productRows += `
            <tr>
                <td>${stt}</td>
                <td>${productName}</td>
                <td class="text-right">${product.quantity.toLocaleString()} kg</td>
                <td class="text-right">${product.price.toLocaleString()}đ</td>
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
                <h1 class="invoice-title">📝 HÓA ĐƠN TỔNG HỢP</h1>
                <h2 class="invoice-subtitle">${storeName}</h2>
            </div>
            
            <div class="invoice-info">
                <div>
                    <div class="invoice-info-item">
                        <span class="invoice-info-label">Loại báo cáo:</span>
                        <span class="invoice-info-value">${type === 'global' ? 'Toàn bộ cửa hàng' : 'Từng cửa hàng'}</span>
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
                <p>⚠️ Cảm ơn quý khách!</p>
                <p>📞 Hotline: 0123-456-789 | 📧 Email: info@store.com</p>
                <p>📝 Hệ thống quản lý đơn hàng đa cửa hàng</p>
            </div>
        </div>
    `;
}

// Display invoice
function displayInvoice(invoiceHTML) {
    document.getElementById('invoiceContent').innerHTML = invoiceHTML;
    document.getElementById('invoicePreviewSection').classList.remove('hidden');
    document.getElementById('printInvoiceBtn').classList.remove('hidden');
    
    showNotification('Hóa đơn đã được tạo thành công!', 'success');
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
                .invoice-footer { text-align: center; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9rem; }
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