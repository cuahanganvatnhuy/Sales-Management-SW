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
        
        // Populate dropdowns after data is loaded
        setTimeout(() => {
            populateFilterDropdowns();
        }, 500);
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
    
    // Check platform field for TMĐT identification
    if (order.platform) {
        return 'tmdt';
    }
    
    // Check source field - orders from order management with platform info are TMĐT
    if (order.source === 'order_management' && (order.type === 'ecommerce' || !order.type)) {
        return 'tmdt';
    }
    
    // Fallback to transaction-style determination
    return determineOrderType(order);
}

// Get product names from order
function getOrderProductNames(order) {
    if (order.items && Array.isArray(order.items)) {
        return order.items.map(item => item.productName || item.name).join(', ');
    }
    return order.productName || 'Sản phẩm không xác định';
}

// Get total quantity from order
function getOrderTotalQuantity(order) {
    if (order.items && Array.isArray(order.items)) {
        return order.items.reduce((total, item) => total + (item.quantity || 0), 0);
    }
    return order.quantity || 0;
}

// Determine order type based on transaction data
function determineOrderType(transaction) {
    // Logic to determine if order is TMDT, retail, or wholesale
    // This can be based on various factors like:
    // - Order source
    // - Quantity thresholds
    // - Customer type
    // - Transaction notes
    
    const quantity = Math.abs(transaction.quantity || 0);
    const notes = (transaction.notes || '').toLowerCase();
    const productName = (transaction.productName || '').toLowerCase();
    const supplier = (transaction.supplier || '').toLowerCase();
    
    // TMDT indicators
    if (notes.includes('tmdt') || notes.includes('online') || notes.includes('shopee') || 
        notes.includes('lazada') || notes.includes('tiki') || notes.includes('sendo') ||
        supplier.includes('online') || supplier.includes('ecommerce')) {
        return 'tmdt';
    }
    
    // Wholesale indicators (higher priority than quantity threshold)
    if (notes.includes('sỉ') || notes.includes('wholesale') || notes.includes('buôn') ||
        supplier.includes('sỉ') || supplier.includes('wholesale') || quantity >= 100) {
        return 'wholesale';
    }
    
    // Medium wholesale (quantity-based)
    if (quantity >= 20) {
        return 'wholesale';
    }
    
    // Default to retail for smaller quantities
    return 'retail';
}

// Generate order ID based on type
function generateOrderId(transaction, orderType) {
    const prefix = {
        'tmdt': 'TMDT',
        'retail': 'RETAIL',
        'wholesale': 'WHOLESALE'
    };
    
    const date = new Date(transaction.timestamp);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    return `${prefix[orderType]}_${dateStr}_${randomSuffix}`;
}

// Setup event listeners
function setupOrderReportEventListeners() {
    // TMDT filters
    const tmdtFilters = ['statsTmdtDateRange', 'statsTmdtStoreFilter', 'statsTmdtProductFilter', 'statsTmdtPlatformFilter'];
    tmdtFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => generateTmdtReport());
        }
    });

    // Retail filters
    const retailFilters = ['statsRetailDateRange', 'statsRetailStoreFilter', 'statsRetailProductFilter'];
    retailFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => generateRetailReport());
        }
    });

    // Wholesale filters
    const wholesaleFilters = ['statsWholesaleDateRange', 'statsWholesaleStoreFilter', 'statsWholesaleProductFilter'];
    wholesaleFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => generateWholesaleReport());
        }
    });

    // Filter buttons
    const applyButtons = ['applyTmdtFiltersBtn', 'applyRetailFiltersBtn', 'applyWholesaleFiltersBtn'];
    applyButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                if (buttonId.includes('Tmdt')) generateTmdtReport();
                else if (buttonId.includes('Retail')) generateRetailReport();
                else if (buttonId.includes('Wholesale')) generateWholesaleReport();
            });
        }
    });
}

// Initialize TMDT Report
function initTmdtReport() {
    console.log('Initializing TMDT Report...');
    populateFilterDropdowns();
    generateTmdtReport();
}

// Populate filter dropdowns with data
function populateFilterDropdowns() {
    // Also populate from all available data sources, not just TMDT orders
    populateStoreFilterFromAllSources();
    populateProductFilterFromAllSources();
}

// Populate store filter from all available sources
function populateStoreFilterFromAllSources() {
    const storeFilter = document.getElementById('statsTmdtStoreFilter');
    if (!storeFilter) return;
    
    // Load stores directly from Firebase
    if (database) {
        const storesRef = database.ref('stores');
        storesRef.once('value').then(snapshot => {
            const storesData = snapshot.val() || {};
            console.log('DEBUG: Loading stores directly from Firebase:', storesData);
            
            const storeMap = new Map();
            Object.entries(storesData).forEach(([storeId, storeData]) => {
                storeMap.set(storeId, {
                    id: storeId,
                    name: storeData.name || storeId || 'Không xác định'
                });
            });
            
            const uniqueStores = Array.from(storeMap.values());
            
            // Clear existing options except "Tất cả"
            storeFilter.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
            
            // Add store options
            uniqueStores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                storeFilter.appendChild(option);
            });
            
            console.log('Populated store filter directly from Firebase with', uniqueStores.length, 'stores:', uniqueStores);
        });
        return;
    }
    
    // Fallback to window.storesData if available
    if (window.storesData) {
        console.log('DEBUG: Using window.storesData:', window.storesData);
        
        const storeMap = new Map();
        Object.entries(window.storesData).forEach(([storeId, storeData]) => {
            storeMap.set(storeId, {
                id: storeId,
                name: storeData.name || storeId || 'Không xác định'
            });
        });
        
        const uniqueStores = Array.from(storeMap.values());
        
        // Clear existing options except "Tất cả"
        storeFilter.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
        
        // Add store options
        uniqueStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            storeFilter.appendChild(option);
        });
        
        console.log('Populated store filter from window.storesData with', uniqueStores.length, 'stores:', uniqueStores);
        return;
    }
    
    // Fallback to TMDT orders data
    populateStoreFilter();
}

// Populate product filter from all available sources  
function populateProductFilterFromAllSources() {
    const productFilter = document.getElementById('statsTmdtProductFilter');
    if (!productFilter) return;
    
    // Load products directly from Firebase
    if (database) {
        const productsRef = database.ref('products');
        productsRef.once('value').then(snapshot => {
            const productsData = snapshot.val() || {};
            console.log('DEBUG: Loading products directly from Firebase:', productsData);
            
            const productMap = new Map();
            Object.entries(productsData).forEach(([productId, productData]) => {
                productMap.set(productId, {
                    id: productId,
                    name: productData.name || productId || 'Không xác định'
                });
            });
            
            const uniqueProducts = Array.from(productMap.values());
            
            // Clear existing options except "Tất cả"
            productFilter.innerHTML = '<option value="all">Tất cả sản phẩm</option>';
            
            // Add product options
            uniqueProducts.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                productFilter.appendChild(option);
            });
            
            console.log('Populated product filter directly from Firebase with', uniqueProducts.length, 'products:', uniqueProducts);
        });
        return;
    }
    
    // Fallback to window.productsData if available
    if (window.productsData) {
        console.log('DEBUG: Using window.productsData:', window.productsData);
        
        const productMap = new Map();
        Object.entries(window.productsData).forEach(([productId, productData]) => {
            productMap.set(productId, {
                id: productId,
                name: productData.name || productId || 'Không xác định'
            });
        });
        
        const uniqueProducts = Array.from(productMap.values());
        
        // Clear existing options except "Tất cả"
        productFilter.innerHTML = '<option value="all">Tất cả sản phẩm</option>';
        
        // Add product options
        uniqueProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            productFilter.appendChild(option);
        });
        
        console.log('Populated product filter from window.productsData with', uniqueProducts.length, 'products:', uniqueProducts);
        return;
    }
    
    // Fallback to TMDT orders data
    populateProductFilter();
}

// Populate store filter dropdown
function populateStoreFilter() {
    const storeFilter = document.getElementById('statsTmdtStoreFilter');
    if (!storeFilter || !orderReportData.tmdt.length) return;
    
    console.log('DEBUG: TMDT orders for store filter:', orderReportData.tmdt);
    
    // Get unique stores from TMDT orders
    const storeMap = new Map();
    orderReportData.tmdt.forEach(order => {
        if (order.storeId) {
            storeMap.set(order.storeId, {
                id: order.storeId,
                name: order.storeName || order.storeId || 'Không xác định'
            });
        }
    });
    
    const uniqueStores = Array.from(storeMap.values());
    
    // Clear existing options except "Tất cả"
    storeFilter.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
    
    // Add store options
    uniqueStores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name;
        storeFilter.appendChild(option);
    });
    
    console.log('Populated store filter with', uniqueStores.length, 'stores:', uniqueStores);
}

// Populate product filter dropdown
function populateProductFilter() {
    const productFilter = document.getElementById('statsTmdtProductFilter');
    if (!productFilter || !orderReportData.tmdt.length) return;
    
    console.log('DEBUG: TMDT orders for product filter:', orderReportData.tmdt);
    
    // Get unique products from TMDT orders using Map to avoid duplicates
    const productMap = new Map();
    orderReportData.tmdt.forEach(order => {
        if (order.productId) {
            productMap.set(order.productId, {
                id: order.productId,
                name: order.productName || order.productId || 'Không xác định'
            });
        }
    });
    
    const uniqueProducts = Array.from(productMap.values());
    
    // Clear existing options except "Tất cả"
    productFilter.innerHTML = '<option value="all">Tất cả sản phẩm</option>';
    
    // Add product options
    uniqueProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        productFilter.appendChild(option);
    });
    
    console.log('Populated product filter with', uniqueProducts.length, 'products:', uniqueProducts);
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

// Pagination variables for TMDT
let currentTmdtPage = 1;
let tmdtItemsPerPage = 10;
let filteredTmdtData = [];

// Update TMDT table with pagination
function updateTmdtTable(data) {
    const container = document.getElementById('tmdtReportTableBody');
    if (!container) {
        console.error('TMDT table container not found');
        return;
    }
    
    // Store filtered data for pagination
    filteredTmdtData = data || [];
    
    if (filteredTmdtData.length === 0) {
        container.innerHTML = '<tr><td colspan="13" class="text-center">Không có dữ liệu đơn hàng TMĐT</td></tr>';
        updateTmdtPagination();
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentTmdtPage - 1) * tmdtItemsPerPage;
    const endIndex = startIndex + tmdtItemsPerPage;
    const pageData = filteredTmdtData.slice(startIndex, endIndex);
    
    let tableHTML = '';
    pageData.forEach((order, index) => {
        const actualIndex = startIndex + index + 1;
        const platformBadge = order.platform && order.platform !== 'N/A' 
            ? `<span class="platform-badge platform-${order.platform}">${order.platformName || order.platform}</span>`
            : 'N/A';
            
        tableHTML += `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="tmdt-checkbox" value="${order.id}" onchange="updateTmdtSelection()">
                </td>
                <td class="text-center">${actualIndex}</td>
                <td>${order.orderId || 'N/A'}</td>
                <td>${formatDate(order.date)}</td>
                <td>${order.productName || 'N/A'}</td>
                <td class="text-center">${order.sku || 'N/A'}</td>
                <td class="text-right">${order.quantity || 0}</td>
                <td class="text-center">${order.unit || 'cái'}</td>
                <td class="text-right">${formatCurrency(order.total || order.value || 0)}</td>
                <td class="text-center">${platformBadge}</td>
                <td>${order.storeName || 'Không xác định'}</td>
                <td class="text-center">
                    <span class="status-badge status-${order.status || 'pending'}">
                        ${getStatusText(order.status || 'pending')}
                    </span>
                </td>
                <td class="text-center">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order.id}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSingleTmdtOrder('${order.id}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = tableHTML;
    updateTmdtPagination();
}

// Update TMDT pagination
function updateTmdtPagination() {
    const totalPages = Math.ceil(filteredTmdtData.length / tmdtItemsPerPage);
    const paginationContainer = document.getElementById('tmdtReportPagination');
    
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = currentTmdtPage === 1 ? 'disabled' : '';
    prevLi.innerHTML = `<a href="#" onclick="changeTmdtPage(${currentTmdtPage - 1})">‹</a>`;
    paginationContainer.appendChild(prevLi);
    
    // Page numbers
    const startPage = Math.max(1, currentTmdtPage - 2);
    const endPage = Math.min(totalPages, currentTmdtPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = i === currentTmdtPage ? 'active' : '';
        li.innerHTML = `<a href="#" onclick="changeTmdtPage(${i})">${i}</a>`;
        paginationContainer.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = currentTmdtPage === totalPages ? 'disabled' : '';
    nextLi.innerHTML = `<a href="#" onclick="changeTmdtPage(${currentTmdtPage + 1})">›</a>`;
    paginationContainer.appendChild(nextLi);
}

// Change TMDT page
function changeTmdtPage(page) {
    const totalPages = Math.ceil(filteredTmdtData.length / tmdtItemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentTmdtPage = page;
    updateTmdtTable(filteredTmdtData);
}

// Toggle select all TMDT orders
function toggleSelectAllTmdt(checkbox) {
    const checkboxes = document.querySelectorAll('.tmdt-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateTmdtSelection();
}

// Update TMDT selection count
function updateTmdtSelection() {
    const checkboxes = document.querySelectorAll('.tmdt-checkbox:checked');
    const count = checkboxes.length;
    const deleteBtn = document.getElementById('deleteSelectedTmdtBtn');
    const countSpan = document.getElementById('selectedTmdtCount');
    
    if (countSpan) countSpan.textContent = count;
    
    if (deleteBtn) {
        deleteBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }
    
    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllTmdt');
    const allCheckboxes = document.querySelectorAll('.tmdt-checkbox');
    if (selectAllCheckbox && allCheckboxes.length > 0) {
        selectAllCheckbox.checked = checkboxes.length === allCheckboxes.length;
        selectAllCheckbox.indeterminate = checkboxes.length > 0 && checkboxes.length < allCheckboxes.length;
    }
}

// Delete single TMDT order
function deleteSingleTmdtOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;
    
    // Remove from orderReportData
    const index = orderReportData.tmdt.findIndex(order => order.id === orderId);
    if (index !== -1) {
        orderReportData.tmdt.splice(index, 1);
    }
    
    // Remove from Firebase
    if (typeof database !== 'undefined') {
        database.ref(`orders/${orderId}`).remove()
            .then(() => {
                console.log('Order deleted from Firebase:', orderId);
                // Refresh the report
                generateTmdtReport();
            })
            .catch(error => {
                console.error('Error deleting order from Firebase:', error);
                alert('Có lỗi xảy ra khi xóa đơn hàng!');
            });
    } else {
        // Refresh the report
        generateTmdtReport();
    }
}

// Delete selected TMDT orders
function deleteSelectedTmdtOrders() {
    const checkboxes = document.querySelectorAll('.tmdt-checkbox:checked');
    const orderIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (orderIds.length === 0) return;
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${orderIds.length} đơn hàng đã chọn?`)) return;
    
    // Remove from orderReportData
    orderIds.forEach(orderId => {
        const index = orderReportData.tmdt.findIndex(order => order.id === orderId);
        if (index !== -1) {
            orderReportData.tmdt.splice(index, 1);
        }
    });
    
    // Remove from Firebase
    if (typeof database !== 'undefined') {
        const deletePromises = orderIds.map(orderId => 
            database.ref(`orders/${orderId}`).remove()
        );
        
        Promise.all(deletePromises)
            .then(() => {
                console.log('Orders deleted from Firebase:', orderIds);
                // Refresh the report
                generateTmdtReport();
            })
            .catch(error => {
                console.error('Error deleting orders from Firebase:', error);
                alert('Có lỗi xảy ra khi xóa đơn hàng!');
            });
    } else {
        // Refresh the report
        generateTmdtReport();
    }
}

function displayOrderReportTable(orders, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Determine if this is TMĐT tab to show platform column
    const isTmdtTab = containerId.includes('tmdt');
    const colspan = isTmdtTab ? "8" : "7";
    
    if (orders.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Không có dữ liệu</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const tableRows = orders.map((order, index) => {
        // Get platform information for TMĐT orders
        const platformDisplay = isTmdtTab ? 
            `<td><span class="platform-badge" data-platform="${order.platform || 'other'}">${order.platformName || order.platform || 'N/A'}</span></td>` : '';
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${order.orderId || order.id}</strong></td>
                <td>${formatDate(order.date)}</td>
                <td>${order.productName}</td>
                <td>${order.quantity}</td>
                <td>${formatCurrency(order.value)}</td>
                ${platformDisplay}
                <td>${order.storeName}</td>
                <td><span class="status-badge ${order.status}">${getStatusText(order.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order.id}', '${isTmdtTab ? 'tmdt' : 'other'}')">
                        <i class="fas fa-eye"></i> Chi tiết
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = tableRows;
}

// Initialize Retail Report
function initRetailReport() {
    console.log('Initializing Retail Report...');
    generateRetailReport();
}

// Generate Retail Report
function generateRetailReport() {
    const filteredData = applyFilters(orderReportData.retail, 'retail');
    
    updateRetailStatistics(filteredData);
    updateRetailTable(filteredData);
    
    console.log('Retail Report generated with', filteredData.length, 'orders');
}

// Update Retail statistics
function updateRetailStatistics(data) {
    const totalOrders = data.length;
    const totalQuantity = data.reduce((sum, order) => sum + order.quantity, 0);
    const totalValue = data.reduce((sum, order) => sum + order.value, 0);
    
    const allOrdersQuantity = orderReportData.tmdt.length + orderReportData.retail.length + orderReportData.wholesale.length;
    const usagePercentage = allOrdersQuantity > 0 ? Math.round((totalOrders / allOrdersQuantity) * 100) : 0;

    document.getElementById('totalRetailOrdersCount').textContent = totalOrders;
    document.getElementById('totalRetailQuantity').textContent = totalQuantity;
    document.getElementById('totalRetailValue').textContent = formatCurrency(totalValue);
    document.getElementById('retailUsagePercentage').textContent = usagePercentage + '%';
}

// Update Retail table
function updateRetailTable(data) {
    const tableBody = document.getElementById('retailReportTableBody');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-inbox"></i><br>
                    Không có dữ liệu đơn hàng Lẻ
                </td>
            </tr>
        `;
        return;
    }

    const tableRows = data.map((order, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${order.orderId}</strong></td>
            <td>${formatDate(order.date)}</td>
            <td>${order.productName}</td>
            <td>${order.quantity}</td>
            <td>${formatCurrency(order.value)}</td>
            <td>${order.storeName}</td>
            <td><span class="status-badge ${order.status}">${getStatusText(order.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order.id}', 'retail')">
                    <i class="fas fa-eye"></i> Chi tiết
                </button>
            </td>
        </tr>
    `).join('');

    tableBody.innerHTML = tableRows;
}

// Initialize Wholesale Report
function initWholesaleReport() {
    console.log('Initializing Wholesale Report...');
    generateWholesaleReport();
}

// Generate Wholesale Report
function generateWholesaleReport() {
    const filteredData = applyFilters(orderReportData.wholesale, 'wholesale');
    
    updateWholesaleStatistics(filteredData);
    updateWholesaleTable(filteredData);
    
    console.log('Wholesale Report generated with', filteredData.length, 'orders');
}

// Update Wholesale statistics
function updateWholesaleStatistics(data) {
    const totalOrders = data.length;
    const totalQuantity = data.reduce((sum, order) => sum + order.quantity, 0);
    const totalValue = data.reduce((sum, order) => sum + order.value, 0);
    
    const allOrdersQuantity = orderReportData.tmdt.length + orderReportData.retail.length + orderReportData.wholesale.length;
    const usagePercentage = allOrdersQuantity > 0 ? Math.round((totalOrders / allOrdersQuantity) * 100) : 0;

    document.getElementById('totalWholesaleOrdersCount').textContent = totalOrders;
    document.getElementById('totalWholesaleQuantity').textContent = totalQuantity;
    document.getElementById('totalWholesaleValue').textContent = formatCurrency(totalValue);
    document.getElementById('wholesaleUsagePercentage').textContent = usagePercentage + '%';
}

// Update Wholesale table
function updateWholesaleTable(data) {
    const tableBody = document.getElementById('wholesaleReportTableBody');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-inbox"></i><br>
                    Không có dữ liệu đơn hàng Sỉ
                </td>
            </tr>
        `;
        return;
    }

    const tableRows = data.map((order, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${order.orderId}</strong></td>
            <td>${formatDate(order.date)}</td>
            <td>${order.productName}</td>
            <td>${order.quantity}</td>
            <td>${formatCurrency(order.value)}</td>
            <td>${order.storeName}</td>
            <td><span class="status-badge ${order.status}">${getStatusText(order.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order.id}', 'wholesale')">
                    <i class="fas fa-eye"></i> Chi tiết
                </button>
            </td>
        </tr>
    `).join('');

    tableBody.innerHTML = tableRows;
}

// Apply filters to data
function applyFilters(data, orderType) {
    let filteredData = [...data];
    
    // Date filter
    const dateRange = document.getElementById(`stats${orderType.charAt(0).toUpperCase() + orderType.slice(1)}DateRange`)?.value;
    if (dateRange && dateRange !== 'all') {
        filteredData = filterByDateRange(filteredData, dateRange, orderType);
    }
    
    // Store filter
    const storeFilter = document.getElementById(`stats${orderType.charAt(0).toUpperCase() + orderType.slice(1)}StoreFilter`)?.value;
    if (storeFilter && storeFilter !== 'all') {
        filteredData = filteredData.filter(order => order.storeId === storeFilter);
    }
    
    // Product filter
    const productFilter = document.getElementById(`stats${orderType.charAt(0).toUpperCase() + orderType.slice(1)}ProductFilter`)?.value;
    if (productFilter && productFilter !== 'all') {
        filteredData = filteredData.filter(order => order.productId === productFilter);
    }
    
    // Platform filter (only for TMDT orders)
    if (orderType === 'tmdt') {
        const platformFilter = document.getElementById('statsTmdtPlatformFilter')?.value;
        if (platformFilter && platformFilter !== 'all') {
            console.log('DEBUG: Platform filter applied:', platformFilter);
            console.log('DEBUG: Before filter - orders count:', filteredData.length);
            console.log('DEBUG: Sample order data:', filteredData[0]);
            
            filteredData = filteredData.filter(order => {
                const matches = (order.platform && order.platform.toLowerCase() === platformFilter.toLowerCase()) || 
                               (order.marketplace && order.marketplace.toLowerCase() === platformFilter.toLowerCase()) ||
                               (order.source && order.source.toLowerCase() === platformFilter.toLowerCase()) ||
                               (order.ecommercePlatform && order.ecommercePlatform.toLowerCase() === platformFilter.toLowerCase()) ||
                               (order.channel && order.channel.toLowerCase() === platformFilter.toLowerCase());
                
                if (order.platform || order.marketplace || order.source) {
                    console.log('DEBUG: Order platform data:', {
                        platform: order.platform,
                        marketplace: order.marketplace,
                        source: order.source,
                        ecommercePlatform: order.ecommercePlatform,
                        channel: order.channel,
                        matches: matches
                    });
                }
                
                return matches;
            });
            
            console.log('DEBUG: After filter - orders count:', filteredData.length);
        }
    }
    
    return filteredData;
}

// Filter by date range
function filterByDateRange(data, range, orderType) {
    const now = new Date();
    let startDate, endDate;
    
    switch(range) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case 'custom':
            // Handle custom date range
            const orderTypeCapitalized = orderType.charAt(0).toUpperCase() + orderType.slice(1);
            const startDateInput = document.getElementById(`stats${orderTypeCapitalized}StartDate`);
            const endDateInput = document.getElementById(`stats${orderTypeCapitalized}EndDate`);
            
            if (startDateInput && startDateInput.value) {
                startDate = new Date(startDateInput.value);
                startDate.setHours(0, 0, 0, 0); // Start of day
            }
            
            if (endDateInput && endDateInput.value) {
                endDate = new Date(endDateInput.value);
                endDate.setHours(23, 59, 59, 999); // End of day
            }
            
            console.log('DEBUG: Custom date filter applied:', {
                orderType,
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
                startInput: startDateInput?.value,
                endInput: endDateInput?.value
            });
            
            if (!startDate && !endDate) {
                return data; // No custom dates selected
            }
            
            return data.filter(order => {
                const orderDate = new Date(order.date);
                let matches = true;
                
                if (startDate && orderDate < startDate) {
                    matches = false;
                }
                
                if (endDate && orderDate > endDate) {
                    matches = false;
                }
                
                return matches;
            });
        default:
            return data;
    }
    
    return data.filter(order => new Date(order.date) >= startDate);
}

// View order details
function viewOrderDetails(orderId, orderType) {
    const order = orderReportData[orderType].find(o => o.id === orderId);
    if (!order) return;
    
    const modalContent = `
        <div class="order-detail-modal">
            <h4><i class="fas fa-file-invoice"></i> Chi tiết đơn hàng ${order.orderId}</h4>
            <div class="order-info-grid">
                <div class="info-item">
                    <label>Loại đơn hàng:</label>
                    <span class="order-type-badge ${orderType}">${getOrderTypeText(orderType)}</span>
                </div>
                <div class="info-item">
                    <label>Ngày tạo:</label>
                    <span>${formatDate(order.date)}</span>
                </div>
                <div class="info-item">
                    <label>Sản phẩm:</label>
                    <span>${order.productName}</span>
                </div>
                <div class="info-item">
                    <label>Số lượng xuất:</label>
                    <span>${order.quantity}</span>
                </div>
                <div class="info-item">
                    <label>Giá trị:</label>
                    <span>${formatCurrency(order.value)}</span>
                </div>
                <div class="info-item">
                    <label>Cửa hàng:</label>
                    <span>${order.storeName}</span>
                </div>
                <div class="info-item">
                    <label>Trạng thái:</label>
                    <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
                </div>
                ${order.notes ? `
                <div class="info-item full-width">
                    <label>Ghi chú:</label>
                    <span>${order.notes}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

// Export functions
function exportTmdtReport() {
    exportOrderReport(orderReportData.tmdt, 'Báo cáo đơn hàng TMĐT');
}

function exportRetailReport() {
    exportOrderReport(orderReportData.retail, 'Báo cáo đơn hàng Lẻ');
}

function exportWholesaleReport() {
    exportOrderReport(orderReportData.wholesale, 'Báo cáo đơn hàng Sỉ');
}

function exportOrderReport(data, reportName) {
    if (!data || data.length === 0) {
        showNotification('Không có dữ liệu để xuất', 'warning');
        return;
    }
    
    const exportData = data.map((order, index) => ({
        'STT': index + 1,
        'Mã đơn hàng': order.orderId,
        'Ngày tạo': formatDate(order.date),
        'Sản phẩm': order.productName,
        'Số lượng xuất': order.quantity,
        'Giá trị': order.value,
        'Cửa hàng': order.storeName,
        'Trạng thái': getStatusText(order.status),
        'Ghi chú': order.notes || ''
    }));
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, reportName);
    
    // Generate filename
    const now = new Date();
    const filename = `${reportName}_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    showNotification(`Đã xuất báo cáo: ${filename}`, 'success');
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
        'completed': 'Hoàn thành',
        'pending': 'Đang xử lý',
        'cancelled': 'Đã hủy',
        'processing': 'Đang xử lý'
    };
    return statusMap[status] || status;
}

function getOrderTypeText(orderType) {
    const typeMap = {
        'tmdt': 'TMĐT',
        'retail': 'Lẻ',
        'wholesale': 'Sỉ'
    };
    return typeMap[orderType] || orderType;
}

// Refresh current active tab
function refreshCurrentOrderReportTab() {
    // Check if order report view is currently visible
    const orderReportView = document.getElementById('orderReportView');
    if (!orderReportView || orderReportView.style.display === 'none') {
        return;
    }
    
    // Find active tab
    const activeTab = document.querySelector('#orderReportView .tab-button.active');
    if (activeTab) {
        const tabText = activeTab.textContent.trim();
        if (tabText.includes('TMĐT')) {
            generateTmdtReport();
        } else if (tabText.includes('Lẻ')) {
            generateRetailReport();
        } else if (tabText.includes('Sỉ')) {
            generateWholesaleReport();
        }
    }
}

// Toggle custom date range visibility for TMDT statistics filters
function toggleTmdtCustomDateRange() {
    const statsTmdtDateRange = document.getElementById('statsTmdtDateRange');
    const statsTmdtCustomDateRange = document.getElementById('statsTmdtCustomDateRange');
    
    console.log('🔄 Toggling TMDT custom date range. Current value:', statsTmdtDateRange?.value);
    
    if (statsTmdtDateRange && statsTmdtCustomDateRange) {
        // Force hide first
        statsTmdtCustomDateRange.classList.add('hidden');
        statsTmdtCustomDateRange.classList.remove('visible');
        
        if (statsTmdtDateRange.value === 'custom') {
            console.log('✅ Showing TMDT custom date range');
            statsTmdtCustomDateRange.classList.remove('hidden');
            statsTmdtCustomDateRange.classList.add('visible');
        } else {
            console.log('❌ Hiding TMDT custom date range');
            // Clear custom date inputs when switching away from custom
            const statsTmdtStartDate = document.getElementById('statsTmdtStartDate');
            const statsTmdtEndDate = document.getElementById('statsTmdtEndDate');
            if (statsTmdtStartDate) statsTmdtStartDate.value = '';
            if (statsTmdtEndDate) statsTmdtEndDate.value = '';
        }
    }
}

// Export functions to global scope
window.initTmdtReport = initTmdtReport;
window.initRetailReport = initRetailReport;
window.initWholesaleReport = initWholesaleReport;
window.exportTmdtReport = exportTmdtReport;
window.exportRetailReport = exportRetailReport;
window.exportWholesaleReport = exportWholesaleReport;
window.viewOrderDetails = viewOrderDetails;
window.initializeOrderReport = initializeOrderReport;
window.refreshCurrentOrderReportTab = refreshCurrentOrderReportTab;
window.toggleTmdtCustomDateRange = toggleTmdtCustomDateRange;
window.changeTmdtPage = changeTmdtPage;
window.toggleSelectAllTmdt = toggleSelectAllTmdt;
window.updateTmdtSelection = updateTmdtSelection;
window.deleteSingleTmdtOrder = deleteSingleTmdtOrder;
window.deleteSelectedTmdtOrders = deleteSelectedTmdtOrders;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof database !== 'undefined') {
        initializeOrderReport();
    }
});