// Order Report Management - TMDT, Retail, Wholesale
let orderReportData = {
    tmdt: [],
    retail: [],
    wholesale: []
};

// Initialize Order Report functionality
function initializeOrderReport() {
    console.log('Initializing Order Report Module...');
    
    // Add a delay to ensure Firebase is ready
    setTimeout(() => {
        loadOrderReportData();
        setupOrderReportEventListeners();
    }, 1000);
}

// Load order data from Firebase
function loadOrderReportData() {
    if (!database) {
        console.error('Firebase database not initialized');
        return;
    }

    // Load both store orders and warehouse transactions
    const storesRef = database.ref('stores');
    const transactionsRef = database.ref('warehouseTransactions');
    
    Promise.all([
        storesRef.once('value'),
        transactionsRef.once('value')
    ]).then(([storesSnapshot, transactionsSnapshot]) => {
        const stores = storesSnapshot.val() || {};
        const transactions = transactionsSnapshot.val() || {};
        
        console.log('=== DEBUG ORDER LOADING ===');
        console.log('Loaded stores:', Object.keys(stores));
        console.log('Loaded transactions:', Object.keys(transactions));
        
        // Create nested structure for processOrderData
        let ordersData = {};
        Object.entries(stores).forEach(([storeId, storeData]) => {
            if (storeData.orders) {
                console.log(`Store ${storeId} has ${Object.keys(storeData.orders).length} orders`);
                ordersData[storeId] = storeData.orders;
                
                // Add store info to each order
                Object.entries(storeData.orders).forEach(([orderId, order]) => {
                    ordersData[storeId][orderId] = {
                        ...order,
                        storeId: storeId,
                        storeName: storeData.name || 'Không xác định'
                    };
                });
            }
        });
        
        console.log('Orders data structure:', ordersData);
        
        processOrderData(transactions, ordersData);
    });
}

// Process order data from Firebase
function processOrderData(transactions, orders) {
    orderReportData = {
        tmdt: [],
        retail: [],
        wholesale: []
    };

    // Process orders from order management system
    if (orders) {
        console.log('=== PROCESSING ORDERS ===');
        Object.entries(orders).forEach(([storeId, storeOrders]) => {
            console.log('Processing store:', storeId, 'with orders:', storeOrders);
            
            if (storeOrders && typeof storeOrders === 'object') {
                Object.entries(storeOrders).forEach(([orderId, order]) => {
                    console.log('Processing order:', orderId, order);
                    console.log('Order fields:', {
                        orderType: order.orderType,
                        platform: order.platform,
                        source: order.source,
                        type: order.type
                    });
                    const orderType = determineOrderTypeFromOrder(order);
                    console.log('Determined order type:', orderType, 'for order:', orderId);
            
                    const orderData = {
                        id: orderId,
                        orderId: order.id || orderId,
                        date: order.createdAt || order.orderDate || order.timestamp,
                        productName: order.productName || 'N/A',
                        quantity: order.quantity || 0,
                        total: order.total || 0,
                        value: order.total || order.totalAmount || 0,
                        storeName: order.storeName || 'Không xác định',
                        status: order.status || 'completed',
                        platform: order.platform || 'N/A',
                        platformName: order.platformName || order.platform || 'N/A',
                        source: order.source || 'order_management',
                        ...order
                    };

                    orderReportData[orderType].push(orderData);
                    console.log('Added order to', orderType, 'category:', orderData);
                });
            }
        });
        
        console.log('Final orderReportData:', {
            tmdt: orderReportData.tmdt.length,
            retail: orderReportData.retail.length,
            wholesale: orderReportData.wholesale.length
        });
    }

    // Process warehouse transactions (existing logic)
    if (transactions) {
        Object.entries(transactions).forEach(([id, transaction]) => {
            if (transaction.type === 'export' || transaction.transactionType === 'export') {
                const orderType = determineOrderType(transaction);
                
                const orderData = {
                    id: id,
                    orderId: transaction.orderId || generateOrderId(transaction, orderType),
                    date: transaction.timestamp,
                    productName: transaction.productName,
                    quantity: Math.abs(transaction.quantity || 0),
                    value: transaction.totalValue || 0,
                    storeName: transaction.storeName || 'Không xác định',
                    status: transaction.status || 'completed',
                    platform: 'N/A',
                    source: 'warehouse_transaction',
                    ...transaction
                };

                orderReportData[orderType].push(orderData);
            }
        });
    }

    console.log('=== PROCESSED ORDER DATA ===');
    console.log('TMDT orders:', orderReportData.tmdt.length);
    console.log('Retail orders:', orderReportData.retail.length);
    console.log('Wholesale orders:', orderReportData.wholesale.length);
    console.log('Full data:', orderReportData);
    
    // Auto-refresh current active tab after data is loaded
    refreshCurrentOrderReportTab();
}

// Determine order type from order management data
function determineOrderTypeFromOrder(order) {
    // Check explicit order type first
    if (order.orderType) {
        if (order.orderType === 'ecommerce' || order.orderType === 'tmdt') {
            return 'tmdt';
        }
        if (order.orderType === 'retail') {
            return 'retail';
        }
        if (order.orderType === 'wholesale') {
            return 'wholesale';
        }
    }
    
    // Check platform field
    if (order.platform) {
        return 'tmdt';
    }
    
    // Check source and type combination
    if (order.source === 'order_management' && (order.type === 'ecommerce' || !order.type)) {
        return 'tmdt';
    }
    
    // Fallback to existing logic
    return determineOrderType(order);
}

// Determine order type from warehouse transaction
function determineOrderType(transaction) {
    // Check if it's a wholesale transaction (large quantity or specific customer type)
    if (transaction.quantity >= 50 || transaction.customerType === 'wholesale') {
        return 'wholesale';
    }
    
    // Check if it's an e-commerce transaction
    if (transaction.platform || transaction.source === 'ecommerce' || transaction.orderSource === 'online') {
        return 'tmdt';
    }
    
    // Default to retail
    return 'retail';
}

// Generate order ID for warehouse transactions
function generateOrderId(transaction, orderType) {
    const date = new Date(transaction.timestamp);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = orderType === 'tmdt' ? 'TMDT' : orderType === 'wholesale' ? 'WS' : 'RT';
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${dateStr}${randomSuffix}`;
}

// Setup event listeners for order report
function setupOrderReportEventListeners() {
    // Tab switching
    document.querySelectorAll('.order-report-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.dataset.tab;
            switchOrderReportTab(tabType);
        });
    });
    
    // Filter buttons
    const applyFiltersBtn = document.getElementById('applyOrderFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyOrderFilters);
    }
    
    const resetFiltersBtn = document.getElementById('resetOrderFiltersBtn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetOrderFilters);
    }
}

// Switch order report tab
function switchOrderReportTab(tabType) {
    // Update active tab
    document.querySelectorAll('.order-report-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');
    
    // Show/hide tab content
    document.querySelectorAll('.order-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`${tabType}ReportTab`).style.display = 'block';
    
    // Generate report for the selected tab
    if (tabType === 'tmdt') {
        generateTmdtReport();
    } else if (tabType === 'retail') {
        generateRetailReport();
    } else if (tabType === 'wholesale') {
        generateWholesaleReport();
    }
}

// Initialize TMDT Report
function initTmdtReport() {
    console.log('Initializing TMDT Report...');
    generateTmdtReport();
}

// Generate TMDT Report
function generateTmdtReport() {
    const filteredData = applyFilters(orderReportData.tmdt, 'tmdt');
    
    // Update statistics
    updateTmdtStatistics(filteredData);

    // Update table
    updateTmdtTable(filteredData);

    console.log('TMDT Report generated with', filteredData.length, 'orders');
}

// Update TMDT statistics
function updateTmdtStatistics(data) {
    const totalOrders = data.length;
    const totalQuantity = data.reduce((sum, order) => sum + order.quantity, 0);
    const totalValue = data.reduce((sum, order) => sum + (order.total || order.value || 0), 0);
    
    // Calculate percentage of total warehouse usage
    const allOrdersQuantity = orderReportData.tmdt.length + orderReportData.retail.length + orderReportData.wholesale.length;
    const usagePercentage = allOrdersQuantity > 0 ? Math.round((totalOrders / allOrdersQuantity) * 100) : 0;

    document.getElementById('totalTmdtOrdersCount').textContent = totalOrders;
    document.getElementById('totalTmdtQuantity').textContent = totalQuantity;
    document.getElementById('totalTmdtValue').textContent = formatCurrency(totalValue);
    document.getElementById('tmdtUsagePercentage').textContent = usagePercentage + '%';
}

// Update TMDT table
function updateTmdtTable(data) {
    const container = document.getElementById('tmdtReportTableBody');
    if (!container) {
        console.error('TMDT table container not found');
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<tr><td colspan="10" class="text-center">Không có dữ liệu đơn hàng TMĐT</td></tr>';
        return;
    }
    
    let tableHTML = '';
    data.forEach((order, index) => {
        const platformBadge = order.platform && order.platform !== 'N/A' 
            ? `<span class="platform-badge platform-${order.platform}">${order.platformName || order.platform}</span>`
            : 'N/A';
            
        tableHTML += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${order.orderId || 'N/A'}</td>
                <td>${formatDate(order.date)}</td>
                <td>${order.productName || 'N/A'}</td>
                <td class="text-right">${order.quantity || 0}</td>
                <td class="text-right">${formatCurrency(order.total || order.value || 0)}</td>
                <td class="text-center">${platformBadge}</td>
                <td>${order.storeName || 'Không xác định'}</td>
                <td class="text-center">
                    <span class="status-badge status-${order.status || 'pending'}">
                        ${getStatusText(order.status || 'pending')}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = tableHTML;
}

// Apply filters to data
function applyFilters(data, reportType) {
    // For now, return all data - filters can be implemented later
    return data;
}

// Refresh current active tab
function refreshCurrentOrderReportTab() {
    const activeTab = document.querySelector('.order-report-tab.active');
    if (activeTab) {
        const tabType = activeTab.dataset.tab;
        switchOrderReportTab(tabType);
    }
}

// Generate Retail Report
function generateRetailReport() {
    const filteredData = applyFilters(orderReportData.retail, 'retail');
    updateRetailStatistics(filteredData);
    updateRetailTable(filteredData);
}

// Generate Wholesale Report
function generateWholesaleReport() {
    const filteredData = applyFilters(orderReportData.wholesale, 'wholesale');
    updateWholesaleStatistics(filteredData);
    updateWholesaleTable(filteredData);
}

// Utility functions
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN');
}

function formatCurrency(amount) {
    if (!amount) return '0₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

// Placeholder functions for retail and wholesale
function updateRetailStatistics(data) {
    // Implementation for retail statistics
}

function updateRetailTable(data) {
    // Implementation for retail table
}

function updateWholesaleStatistics(data) {
    // Implementation for wholesale statistics
}

function updateWholesaleTable(data) {
    // Implementation for wholesale table
}

function applyOrderFilters() {
    // Implementation for applying filters
}

function resetOrderFilters() {
    // Implementation for resetting filters
}

function viewOrderDetails(orderId) {
    // Implementation for viewing order details
}
