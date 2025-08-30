// Order Report Management - TMDT, Retail, Wholesale
let orderReportData = {
    tmdt: [],
    retail: [],
    wholesale: []
};

// Initialize Order Report functionality
function initializeOrderReport() {
    console.log('Initializing Order Report Module...');
    
    // Set default month and year for retail monthly report
    setDefaultRetailMonthYear();
    
    // Add a delay to ensure Firebase is ready
    setTimeout(() => {
        loadOrderReportData();
        setupOrderReportEventListeners();
    }, 1000);
}

// Set default month and year for retail monthly report
function setDefaultRetailMonthYear() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const currentYear = now.getFullYear();
    
    // Set default month
    const monthSelect = document.getElementById('retailMonthSelect');
    if (monthSelect) {
        // Remove any existing selected attribute
        Array.from(monthSelect.options).forEach(option => {
            option.removeAttribute('selected');
        });
        // Set current month as selected
        const currentMonthOption = monthSelect.querySelector(`option[value="${currentMonth}"]`);
        if (currentMonthOption) {
            currentMonthOption.setAttribute('selected', 'selected');
            monthSelect.value = currentMonth.toString();
        }
    }
    
    // Set default year
    const yearSelect = document.getElementById('retailYearSelect');
    if (yearSelect) {
        // Remove any existing selected attribute
        Array.from(yearSelect.options).forEach(option => {
            option.removeAttribute('selected');
        });
        // Set current year as selected
        const currentYearOption = yearSelect.querySelector(`option[value="${currentYear}"]`);
        if (currentYearOption) {
            currentYearOption.setAttribute('selected', 'selected');
            yearSelect.value = currentYear.toString();
        }
    }
    
    console.log(`Set default retail month/year to: ${currentMonth}/${currentYear}`);
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
            // Load all data from Firebase for complete filter options
            setTimeout(() => {
                loadStoresForFilter();
                loadProductsForFilter();
                // Load retail-specific filters
                loadRetailStoresForFilter();
                loadRetailProductsForFilter();
                // Setup retail filter event listeners
                setupRetailFilterEventListeners();
            }, 1500);
            // Try multiple times to ensure loading
            setTimeout(() => {
                loadStoresForFilter();
                loadProductsForFilter();
                loadRetailStoresForFilter();
                loadRetailProductsForFilter();
                setupRetailFilterEventListeners();
            }, 3000);
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
            
                    // Handle retail orders with items array
                    let productName = 'N/A';
                    let totalQuantity = 0;
                    let unit = 'lỗi';
                    
                    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                        // Multiple items - show first product name + count
                        productName = order.items.length > 1 
                            ? `${order.items[0].productName} (+${order.items.length - 1} khác)`
                            : order.items[0].productName;
                        totalQuantity = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                        unit = order.items[0].unit || 'lỗi';
                    } else {
                        // Single product order
                        productName = order.productName || 'N/A';
                        totalQuantity = order.quantity || 0;
                        unit = order.unit || 'cái';
                    }

                    const orderData = {
                        id: orderId,
                        orderId: order.id || orderId,
                        date: order.createdAt || order.orderDate || order.timestamp,
                        productName: productName,
                        quantity: totalQuantity,
                        total: order.total || 0,
                        totalPrice: order.total || order.totalAmount || order.totalPrice || 0,
                        value: order.total || order.totalAmount || 0,
                        unit: unit,
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
    
    // Retail order ID search filter
    const retailOrderIdFilter = document.getElementById('statsRetailOrderIdFilter');
    if (retailOrderIdFilter) {
        retailOrderIdFilter.addEventListener('input', () => {
            clearTimeout(retailOrderIdFilter.searchTimeout);
            retailOrderIdFilter.searchTimeout = setTimeout(() => {
                generateRetailReport();
            }, 300); // Debounce 300ms
        });
    }

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
let tmdtItemsPerPage = 10; // Default to 10 items per page
let filteredTmdtData = [];

// Function to change items per page
function changeTmdtItemsPerPage(newItemsPerPage) {
    tmdtItemsPerPage = parseInt(newItemsPerPage);
    currentTmdtPage = 1; // Reset to first page
    
    // Re-generate the current view
    const searchInput = document.getElementById('tmdtOrderSearch');
    if (searchInput && searchInput.value.trim() !== '') {
        searchTmdtOrders(searchInput.value);
    } else {
        generateTmdtReport();
    }
}

// Search TMDT orders by order ID
function searchTmdtOrders(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        // If search is empty, show all filtered data
        generateTmdtReport();
        return;
    }
    
    const searchValue = searchTerm.toLowerCase().trim();
    
    // Filter current filtered data by order ID
    const searchResults = filteredTmdtData.filter(order => {
        const orderId = (order.orderId || '').toLowerCase();
        return orderId.includes(searchValue);
    });
    
    // Reset to first page for search results
    currentTmdtPage = 1;
    
    // Update table with search results
    updateTmdtTableWithData(searchResults);
    
    console.log(`Search for "${searchTerm}" found ${searchResults.length} results`);
}

// Update TMDT table with specific data (for search results)
function updateTmdtTableWithData(data) {
    const container = document.getElementById('tmdtReportTableBody');
    if (!container) {
        console.error('TMDT table container not found');
        return;
    }
    
    if (data.length === 0) {
        container.innerHTML = '<tr><td colspan="13" class="text-center">Không tìm thấy đơn hàng nào</td></tr>';
        updateTmdtPaginationWithData(data);
        return;
    }
    
    // Calculate pagination for search results
    const startIndex = (currentTmdtPage - 1) * tmdtItemsPerPage;
    const endIndex = startIndex + tmdtItemsPerPage;
    const pageData = data.slice(startIndex, endIndex);
    
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
                <td><strong>${order.orderId || 'N/A'}</strong></td>
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
    updateTmdtPaginationWithData(data);
}

// Update pagination for search results
function updateTmdtPaginationWithData(data) {
    const totalPages = Math.ceil(data.length / tmdtItemsPerPage);
    const paginationContainer = document.getElementById('tmdtReportPagination');
    const paginationInfo = document.getElementById('tmdtPaginationInfo');
    
    if (!paginationContainer) return;
    
    // Update pagination info for search results
    if (paginationInfo) {
        const startItem = (currentTmdtPage - 1) * tmdtItemsPerPage + 1;
        const endItem = Math.min(currentTmdtPage * tmdtItemsPerPage, data.length);
        paginationInfo.textContent = `Hiển thị ${startItem}-${endItem} trong tổng ${data.length} đơn hàng (kết quả tìm kiếm)`;
    }
    
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentTmdtPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changeTmdtPage(${currentTmdtPage - 1})">‹</a>`;
    paginationContainer.appendChild(prevLi);
    
    // Page numbers
    const startPage = Math.max(1, currentTmdtPage - 2);
    const endPage = Math.min(totalPages, currentTmdtPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentTmdtPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changeTmdtPage(${i})">${i}</a>`;
        paginationContainer.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentTmdtPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changeTmdtPage(${currentTmdtPage + 1})">›</a>`;
    paginationContainer.appendChild(nextLi);
}

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
    const paginationInfo = document.getElementById('tmdtPaginationInfo');
    
    if (!paginationContainer) return;
    
    // Update pagination info
    if (paginationInfo) {
        const startItem = (currentTmdtPage - 1) * tmdtItemsPerPage + 1;
        const endItem = Math.min(currentTmdtPage * tmdtItemsPerPage, filteredTmdtData.length);
        paginationInfo.textContent = `Hiển thị ${startItem}-${endItem} trong tổng ${filteredTmdtData.length} đơn hàng`;
    }
    
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentTmdtPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changeTmdtPage(${currentTmdtPage - 1})">‹</a>`;
    paginationContainer.appendChild(prevLi);
    
    // Page numbers
    const startPage = Math.max(1, currentTmdtPage - 2);
    const endPage = Math.min(totalPages, currentTmdtPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentTmdtPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changeTmdtPage(${i})">${i}</a>`;
        paginationContainer.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentTmdtPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changeTmdtPage(${currentTmdtPage + 1})">›</a>`;
    paginationContainer.appendChild(nextLi);
}

// Change TMDT page
function changeTmdtPage(page) {
    const totalPages = Math.ceil(filteredTmdtData.length / tmdtItemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentTmdtPage = page;
    updateTmdtTable(filteredTmdtData);
}

// Monthly Statistics Report Functions
function generateMonthlyReport() {
    // Get all filter values
    const dateType = document.getElementById('dateTypeSelect').value;
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    const fromDate = document.getElementById('fromDateSelect').value;
    const toDate = document.getElementById('toDateSelect').value;
    const platform = document.getElementById('platformFilter').value;
    const product = document.getElementById('productFilter').value;
    const store = document.getElementById('tmdtStoreFilter').value;
    
    console.log('=== FILTER DEBUG ===');
    console.log('Platform filter value:', platform);
    console.log('Available orders:', orderReportData?.tmdt?.length || 0);
    console.log('Sample order platforms:', orderReportData?.tmdt?.slice(0, 3).map(o => o.platform));
    
    // Filter orders by all criteria
    const filteredOrders = filterOrdersByAllCriteria(dateType, month, year, fromDate, toDate, platform, product, store);
    
    console.log('Filtered orders count:', filteredOrders.length);
    console.log('Filtered orders sample:', filteredOrders.slice(0, 2));
    
    // Calculate statistics
    const stats = calculateMonthlyStats(filteredOrders);
    
    // Update summary cards
    updateMonthlySummary(stats);
    
    // Generate product details table
    generateProductDetailsTable(filteredOrders);
}

function toggleDateFilter() {
    const dateType = document.getElementById('dateTypeSelect').value;
    const monthYearFilters = document.getElementById('monthYearFilters');
    const customDateFilters = document.getElementById('customDateFilters');
    
    if (dateType === 'month') {
        monthYearFilters.style.display = 'flex';
        customDateFilters.style.display = 'none';
    } else {
        monthYearFilters.style.display = 'none';
        customDateFilters.style.display = 'flex';
    }
    
    // Auto-generate report when switching
    generateMonthlyReport();
}

function filterOrdersByAllCriteria(dateType, month, year, fromDate, toDate, platform, product, store) {
    if (!orderReportData || !orderReportData.tmdt) return [];
    
    return orderReportData.tmdt.filter(order => {
        const orderDate = new Date(order.date);
        
        // Date filtering
        let dateMatch = true;
        if (dateType === 'month') {
            const orderMonth = orderDate.getMonth() + 1;
            const orderYear = orderDate.getFullYear();
            dateMatch = orderMonth === parseInt(month) && orderYear === parseInt(year);
        } else if (dateType === 'custom' && fromDate && toDate) {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999); // Include the entire end date
            dateMatch = orderDate >= from && orderDate <= to;
        }
        
        // Platform filtering - handle platform name variations
        let platformMatch = !platform || platform === '';
        if (platform && !platformMatch) {
            const orderPlatform = order.platform?.toLowerCase() || '';
            const filterPlatform = platform.toLowerCase();
            
            // Direct match
            if (orderPlatform === filterPlatform) {
                platformMatch = true;
            }
            // Handle platform name variations
            else if ((orderPlatform === 'tiktok' || orderPlatform === 'tiktok shop') && 
                     (filterPlatform === 'tiktok' || filterPlatform === 'tiktok shop')) {
                platformMatch = true;
            }
            else if ((orderPlatform === 'facebook' || orderPlatform === 'facebook shop') && 
                     (filterPlatform === 'facebook' || filterPlatform === 'facebook shop')) {
                platformMatch = true;
            }
            else if ((orderPlatform === 'zalo' || orderPlatform === 'zalo shop') && 
                     (filterPlatform === 'zalo' || filterPlatform === 'zalo shop')) {
                platformMatch = true;
            }
            // Handle other platform variations if needed
            else if (orderPlatform.includes(filterPlatform) || filterPlatform.includes(orderPlatform)) {
                platformMatch = true;
            }
        }
        
        // Product filtering
        const productMatch = !product || order.productName === product || order.sku === product;
        
        // Store filtering
        const storeMatch = !store || order.storeName === store;
        
        return dateMatch && platformMatch && productMatch && storeMatch;
    });
}

function filterOrdersByMonth(month, year, platform) {
    return filterOrdersByAllCriteria('month', month, year, '', '', platform, '', '');
}

function calculateMonthlyStats(orders) {
    const stats = {
        totalOrders: orders.length,
        totalProducts: 0,
        totalQuantity: 0,
        totalRevenue: 0,
        productSummary: {}
    };
    
    orders.forEach(order => {
        stats.totalQuantity += parseFloat(order.quantity) || 0;
        const revenue = parseFloat(order.totalPrice) || parseFloat(order.total) || parseFloat(order.value) || 0;
        stats.totalRevenue += revenue;
        
        // Group by product
        const productKey = `${order.productName}-${order.sku}`;
        if (!stats.productSummary[productKey]) {
            stats.productSummary[productKey] = {
                name: order.productName,
                sku: order.sku,
                quantity: 0,
                totalValue: 0,
                unit: order.unit || 'kg',
                platforms: new Set(),
                stores: new Set()
            };
        }
        
        stats.productSummary[productKey].quantity += parseFloat(order.quantity) || 0;
        const productRevenue = parseFloat(order.totalPrice) || parseFloat(order.total) || parseFloat(order.value) || 0;
        stats.productSummary[productKey].totalValue += productRevenue;
        stats.productSummary[productKey].platforms.add(order.platform);
        stats.productSummary[productKey].stores.add(order.storeName);
    });
    
    stats.totalProducts = Object.keys(stats.productSummary).length;
    
    return stats;
}

function updateMonthlySummary(stats) {
    document.getElementById('totalMonthlyOrders').textContent = stats.totalOrders;
    document.getElementById('totalMonthlyProducts').textContent = stats.totalProducts;
    document.getElementById('totalMonthlyQuantity').textContent = stats.totalQuantity.toFixed(1) + ' kg';
    document.getElementById('totalMonthlyRevenue').textContent = formatCurrency(stats.totalRevenue);
}

// Pagination variables
let monthlyCurrentPage = 1;
let monthlyItemsPerPage = 10;
let monthlyAllData = [];

function generateProductDetailsTable(orders) {
    const tableBody = document.getElementById('monthlyProductTableBody');
    
    if (!tableBody) return;
    
    // Group orders by product-platform-store combination for separate rows
    const productPlatformMap = {};
    
    orders.forEach(order => {
        const key = `${order.productName}-${order.sku}-${order.platform}-${order.storeName}-${order.orderId || order.id}`;
        
        if (!productPlatformMap[key]) {
            productPlatformMap[key] = {
                orderId: order.orderId || order.id || 'N/A',
                name: order.productName,
                sku: order.sku,
                platform: order.platform,
                storeName: order.storeName,
                quantity: 0,
                totalValue: 0,
                unit: order.unit || 'kg'
            };
        }
        
        productPlatformMap[key].quantity += parseFloat(order.quantity) || 0;
        const revenue = parseFloat(order.totalPrice) || parseFloat(order.total) || parseFloat(order.value) || 0;
        productPlatformMap[key].totalValue += revenue;
    });
    
    // Store all data for pagination
    monthlyAllData = Object.values(productPlatformMap);
    monthlyCurrentPage = 1; // Reset to first page
    
    // Render current page
    renderMonthlyPage();
    
    // Update pagination controls
    updateMonthlyPagination();
}

function renderMonthlyPage() {
    const tableBody = document.getElementById('monthlyProductTableBody');
    if (!tableBody) return;
    
    const startIndex = (monthlyCurrentPage - 1) * monthlyItemsPerPage;
    const endIndex = startIndex + monthlyItemsPerPage;
    const pageData = monthlyAllData.slice(startIndex, endIndex);
    
    let html = '';
    
    pageData.forEach((item, index) => {
        const globalIndex = startIndex + index + 1;
        html += `
            <tr>
                <td>${globalIndex}</td>
                <td class="order-id">${item.orderId}</td>
                <td class="product-name">${item.name}</td>
                <td class="sku">${item.sku}</td>
                <td class="quantity">${item.quantity.toFixed(1)}</td>
                <td class="unit">${item.unit}</td>
                <td class="total-value">${formatCurrency(item.totalValue)}</td>
                <td class="platform">${item.platform}</td>
                <td class="store">${item.storeName}</td>
            </tr>
        `;
    });
    
    if (html === '') {
        html = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Không có dữ liệu cho tháng đã chọn</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    tableBody.innerHTML = html;
}

function updateMonthlyPagination() {
    const paginationContainer = document.getElementById('monthlyPaginationContainer');
    const paginationInfo = document.getElementById('monthlyPaginationInfo');
    const paginationNumbers = document.getElementById('monthlyPaginationNumbers');
    const prevBtn = document.getElementById('monthlyPrevBtn');
    const nextBtn = document.getElementById('monthlyNextBtn');
    
    if (!paginationContainer || monthlyAllData.length === 0) {
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(monthlyAllData.length / monthlyItemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Update info
    const startItem = (monthlyCurrentPage - 1) * monthlyItemsPerPage + 1;
    const endItem = Math.min(monthlyCurrentPage * monthlyItemsPerPage, monthlyAllData.length);
    paginationInfo.textContent = `Hiển thị ${startItem}-${endItem} của ${monthlyAllData.length} kết quả`;
    
    // Update buttons
    prevBtn.disabled = monthlyCurrentPage === 1;
    nextBtn.disabled = monthlyCurrentPage === totalPages;
    
    // Generate page numbers
    let numbersHtml = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, monthlyCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        numbersHtml += `<span class="page-number" onclick="goToMonthlyPage(1)">1</span>`;
        if (startPage > 2) {
            numbersHtml += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === monthlyCurrentPage ? 'active' : '';
        numbersHtml += `<span class="page-number ${activeClass}" onclick="goToMonthlyPage(${i})">${i}</span>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            numbersHtml += `<span class="page-ellipsis">...</span>`;
        }
        numbersHtml += `<span class="page-number" onclick="goToMonthlyPage(${totalPages})">${totalPages}</span>`;
    }
    
    paginationNumbers.innerHTML = numbersHtml;
}

function changeMonthlyPage(direction) {
    const totalPages = Math.ceil(monthlyAllData.length / monthlyItemsPerPage);
    const newPage = monthlyCurrentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        monthlyCurrentPage = newPage;
        renderMonthlyPage();
        updateMonthlyPagination();
    }
}

function goToMonthlyPage(page) {
    const totalPages = Math.ceil(monthlyAllData.length / monthlyItemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
        monthlyCurrentPage = page;
        renderMonthlyPage();
        updateMonthlyPagination();
    }
}

function printMonthlyReport() {
    // Get current filtered data
    const dateType = document.getElementById('dateTypeSelect').value;
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    const fromDate = document.getElementById('fromDateSelect').value;
    const toDate = document.getElementById('toDateSelect').value;
    const platform = document.getElementById('platformFilter').value;
    const product = document.getElementById('productFilter').value;
    const store = document.getElementById('tmdtStoreFilter').value;
    
    // Filter orders by current criteria
    const filteredOrders = filterOrdersByAllCriteria(dateType, month, year, fromDate, toDate, platform, product, store);
    const stats = calculateMonthlyStats(filteredOrders);
    
    // Generate print content
    const printContent = generatePrintContent(filteredOrders, stats, {
        dateType, month, year, fromDate, toDate, platform, product, store
    });
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function generatePrintContent(orders, stats, filters) {
    const monthNames = [
        '', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    
    // Determine date range text
    let dateRangeText = '';
    if (filters.dateType === 'month') {
        dateRangeText = `${monthNames[parseInt(filters.month)]} ${filters.year}`;
    } else if (filters.dateType === 'custom') {
        const fromDateFormatted = new Date(filters.fromDate).toLocaleDateString('vi-VN');
        const toDateFormatted = new Date(filters.toDate).toLocaleDateString('vi-VN');
        dateRangeText = `Từ ${fromDateFormatted} đến ${toDateFormatted}`;
    }
    
    // Generate filter info
    let filterInfo = [];
    if (filters.platform) filterInfo.push(`Sàn: ${filters.platform}`);
    if (filters.product) filterInfo.push(`Sản phẩm: ${filters.product}`);
    if (filters.store) filterInfo.push(`Cửa hàng: ${filters.store}`);
    
    // Group orders by product only (combine same products across different orders/platforms/stores)
    const productSummaryMap = {};
    orders.forEach(order => {
        const key = `${order.productName}-${order.sku}`;
        
        if (!productSummaryMap[key]) {
            productSummaryMap[key] = {
                name: order.productName,
                sku: order.sku,
                quantity: 0,
                totalValue: 0,
                unit: order.unit || 'kg',
                platforms: new Set(),
                stores: new Set(),
                orderCount: 0
            };
        }
        
        productSummaryMap[key].quantity += parseFloat(order.quantity) || 0;
        const revenue = parseFloat(order.totalPrice) || parseFloat(order.total) || parseFloat(order.value) || 0;
        productSummaryMap[key].totalValue += revenue;
        productSummaryMap[key].platforms.add(order.platform);
        productSummaryMap[key].stores.add(order.storeName);
        productSummaryMap[key].orderCount += 1;
    });
    
    const displayData = Object.values(productSummaryMap).map(item => ({
        ...item,
        platformsText: Array.from(item.platforms).join(', '),
        storesText: Array.from(item.stores).join(', ')
    }));
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Báo Cáo Thống Kê TMĐT</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 20px;
            }
            
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .invoice-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .invoice-header h1 {
                font-size: 28px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .invoice-header .subtitle {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .invoice-info {
                padding: 30px;
                border-bottom: 2px solid #eee;
            }
            
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                align-items: center;
            }
            
            .info-row:last-child {
                margin-bottom: 0;
            }
            
            .info-label {
                font-weight: 600;
                color: #555;
            }
            
            .info-value {
                color: #333;
                font-weight: 500;
            }
            
            .date-range {
                text-align: center;
                padding: 20px;
                background: #f8f9fa;
                font-size: 18px;
                font-weight: 600;
                color: #495057;
                border-bottom: 2px solid #eee;
            }
            
            .filter-info {
                padding: 15px 30px;
                background: #e3f2fd;
                font-size: 14px;
                color: #1565c0;
                border-bottom: 1px solid #ddd;
            }
            
            .products-table {
                width: 100%;
                border-collapse: collapse;
                margin: 0;
            }
            
            .products-table th {
                background: #f8f9fa;
                padding: 15px 10px;
                text-align: left;
                font-weight: 600;
                color: #495057;
                border-bottom: 2px solid #dee2e6;
                font-size: 12px;
                text-transform: uppercase;
            }
            
            .products-table td {
                padding: 12px 10px;
                border-bottom: 1px solid #eee;
                font-size: 14px;
            }
            
            .products-table tbody tr:hover {
                background: #f8f9fa;
            }
            
            .text-right {
                text-align: right;
            }
            
            .text-center {
                text-align: center;
            }
            
            .total-section {
                padding: 30px;
                background: #f8f9fa;
                border-top: 2px solid #dee2e6;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                font-size: 16px;
            }
            
            .total-row.grand-total {
                font-size: 20px;
                font-weight: 700;
                color: #28a745;
                border-top: 2px solid #28a745;
                padding-top: 15px;
                margin-top: 15px;
            }
            
            .company-info {
                padding: 30px;
                background: #f8f9fa;
                border-top: 1px solid #ddd;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            
            .company-details {
                flex: 1;
            }
            
            .signature-section {
                text-align: right;
                flex: 1;
            }
            
            .company-details h4 {
                color: #e91e63;
                margin-bottom: 10px;
                font-size: 16px;
            }
            
            .company-details p {
                margin-bottom: 5px;
                font-size: 14px;
                color: #666;
            }
            
            .signature-section p {
                margin-bottom: 10px;
                font-size: 14px;
                color: #666;
            }
            
            .signature-section .signature-date {
                color: #007bff;
                font-weight: 600;
            }
            
            @media print {
                body {
                    padding: 0;
                }
                
                .invoice-container {
                    border: none;
                    border-radius: 0;
                    box-shadow: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="invoice-header">
                <h1>📊 BÁO CÁO THỐNG KÊ TMĐT</h1>
                <div class="subtitle">Hệ thống quản lý bán hàng</div>
            </div>
            
            <div class="invoice-info">
                <div class="info-row">
                    <span class="info-label">Mã báo cáo:</span>
                    <span class="info-value">RPT${Date.now().toString().slice(-8)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Ngày tạo:</span>
                    <span class="info-value">${new Date().toLocaleDateString('vi-VN')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Tổng đơn hàng:</span>
                    <span class="info-value">${stats.totalOrders} đơn</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Tổng sản phẩm:</span>
                    <span class="info-value">${stats.totalProducts} loại</span>
                </div>
            </div>
            
            <div class="date-range">
                ${dateRangeText}
            </div>
            
            ${filterInfo.length > 0 ? `<div class="filter-info">
                <strong>Bộ lọc áp dụng:</strong> ${filterInfo.join(' • ')}
            </div>` : ''}
            
            <table class="products-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Tên Sản Phẩm</th>
                        <th>SKU</th>
                        <th class="text-center">Số Lượng</th>
                        <th class="text-center">Đơn Vị</th>
                        <th class="text-right">Thành Tiền</th>
                        <th class="text-center">Số Đơn</th>
                        <th class="text-center">Sàn TMĐT</th>
                        <th>Cửa Hàng</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayData.map((item, index) => `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td>${item.name}</td>
                            <td>${item.sku}</td>
                            <td class="text-center">${item.quantity.toFixed(1)}</td>
                            <td class="text-center">${item.unit}</td>
                            <td class="text-right">${formatCurrency(item.totalValue)}</td>
                            <td class="text-center">${item.orderCount}</td>
                            <td class="text-center">${item.platformsText}</td>
                            <td>${item.storesText}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="total-section">
                <div class="total-row">
                    <span>Tổng khối lượng:</span>
                    <span>${stats.totalQuantity.toFixed(1)} kg</span>
                </div>
                <div class="total-row grand-total">
                    <span>TỔNG CỘNG:</span>
                    <span>${formatCurrency(stats.totalRevenue)}</span>
                </div>
            </div>
            
            <div class="company-info">
                <div class="company-details">
                    <h4>📍 Địa chỉ công ty:</h4>
                    <p>123 Đường ABC, Quận XYZ, TP.HCM</p>
                    <p>📞 Hotline: 0123-456-789</p>
                    <p>📧 Email: info@company.com</p>
                </div>
                <div class="signature-section">
                    <p>👤 Người lập: ________________</p>
                    <p class="signature-date">📅 Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</p>
                    <p>✍️ Chữ ký:</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    const originalTitle = document.querySelector('.stats-title').innerHTML;
    const printTitle = `
        <i class="fas fa-chart-line"></i> 
        PHIẾU XUẤT KHO - BÁO CÁO THỐNG KÊ<br>
        <small style="font-size: 1rem; font-weight: 400;">
            ${monthNames[month]} ${year}${platform ? ` - ${platform}` : ''}
        </small>
    `;
    
    document.querySelector('.stats-title').innerHTML = printTitle;
    
    // Add current date to print
    const currentDate = new Date().toLocaleDateString('vi-VN');
    const dateInfo = document.createElement('div');
    dateInfo.style.textAlign = 'center';
    dateInfo.style.marginTop = '10px';
    dateInfo.style.fontSize = '0.9rem';
    dateInfo.innerHTML = `<strong>Ngày in: ${currentDate}</strong>`;
    document.querySelector('.stats-header').appendChild(dateInfo);
    
    // Print
    window.print();
    
    // Restore original title
    setTimeout(() => {
        document.querySelector('.stats-title').innerHTML = originalTitle;
        if (dateInfo.parentNode) {
            dateInfo.parentNode.removeChild(dateInfo);
        }
    }, 1000);
}

// Populate filter dropdowns with data
function populateFilterDropdowns() {
    if (!orderReportData || !orderReportData.tmdt) return;
    
    const products = new Set();
    const stores = new Set();
    const platforms = new Set();
    
    orderReportData.tmdt.forEach(order => {
        if (order.productName) products.add(order.productName);
        if (order.storeName) stores.add(order.storeName);
        if (order.platform) platforms.add(order.platform);
    });
    
    // Populate product filter
    const productFilter = document.getElementById('productFilter');
    if (productFilter) {
        productFilter.innerHTML = '<option value="">Tất cả sản phẩm</option>';
        
        // Load all products from Firebase
        if (database) {
            database.ref('products').once('value').then(snapshot => {
                const productsData = snapshot.val() || {};
                
                Object.entries(productsData).forEach(([productId, productData]) => {
                    const productName = productData.name || productData.productName || productId;
                    productFilter.innerHTML += `<option value="${productName}">${productName}</option>`;
                });
            }).catch(error => {
                console.error('Error loading products:', error);
            });
        }
        
        // Also add products from current TMDT orders if any
        Array.from(products).sort().forEach(product => {
            const existingOptions = Array.from(productFilter.options).map(opt => opt.value);
            if (!existingOptions.includes(product)) {
                productFilter.innerHTML += `<option value="${product}">${product}</option>`;
            }
        });
    }
    
    // Populate platform filter with predefined platforms
    const platformFilter = document.getElementById('platformFilter');
    if (platformFilter) {
        const predefinedPlatforms = [
            'Shopee',
            'Lazada',
            'TikTok Shop',
            'Sendo',
            'Tiki',
            'Facebook Shop',
            'Zalo Shop',
            'Khác'
        ];
        
        platformFilter.innerHTML = '<option value="">Tất cả sàn</option>';
        predefinedPlatforms.forEach(platform => {
            platformFilter.innerHTML += `<option value="${platform}">${platform}</option>`;
        });
    }
    
    // Populate store filter - Load directly from Firebase
    loadStoresForFilter();
    
    // Populate retail filters
    populateRetailFilters();
}

// Load stores from Firebase for filter dropdown
function loadStoresForFilter() {
    console.log('=== LOADING STORES DEBUG ===');
    
    const storeFilter = document.getElementById('tmdtStoreFilter');
    if (!storeFilter) {
        console.log('❌ TMDT Store filter element not found');
        return;
    }
    console.log('✅ TMDT Store filter element found');
    
    // Check if we're in the right view
    const monthlyFilters = document.querySelector('.monthly-filters');
    if (!monthlyFilters || monthlyFilters.style.display === 'none') {
        console.log('❌ Monthly filters not visible, skipping store load');
        return;
    }
    console.log('✅ Monthly filters visible');
    
    // Wait for Firebase to be ready
    if (typeof firebase === 'undefined') {
        console.log('❌ Firebase undefined, retrying in 1s...');
        setTimeout(loadStoresForFilter, 1000);
        return;
    }
    
    if (!firebase.apps || firebase.apps.length === 0) {
        console.log('❌ Firebase not initialized, retrying in 1s...');
        setTimeout(loadStoresForFilter, 1000);
        return;
    }
    console.log('✅ Firebase ready');
    
    console.log('🔄 Loading stores from Firebase...');
    
    firebase.database().ref('stores').once('value').then(snapshot => {
        const storesData = snapshot.val() || {};
        console.log('📦 Stores data loaded:', Object.keys(storesData));
        console.log('📦 Full stores data:', storesData);
        
        // Clear dropdown first
        storeFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
        console.log('🧹 Cleared dropdown');
        
        let addedCount = 0;
        Object.entries(storesData).forEach(([storeId, storeData]) => {
            const storeName = storeData.name || storeData.storeName || storeId;
            console.log(`➕ Adding store: ${storeName} (ID: ${storeId})`);
            
            const option = document.createElement('option');
            option.value = storeName;
            option.textContent = storeName;
            storeFilter.appendChild(option);
            addedCount++;
        });
        
        console.log(`✅ Store dropdown populated with ${addedCount} stores`);
        console.log('📋 Final dropdown options:', Array.from(storeFilter.options).map(opt => opt.textContent));
        
    }).catch(error => {
        console.error('❌ Error loading stores:', error);
    });
}

// Populate retail filters (stores and products)
function populateRetailFilters() {
    console.log('=== POPULATING RETAIL FILTERS ===');
    
    // Populate retail store filter
    const retailStoreFilter = document.getElementById('statsRetailStoreFilter');
    if (retailStoreFilter && database) {
        const storesRef = database.ref('stores');
        storesRef.once('value').then(snapshot => {
            const storesData = snapshot.val() || {};
            console.log('📦 Retail stores data:', storesData);
            
            // Clear dropdown first
            retailStoreFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
            
            let addedCount = 0;
            Object.entries(storesData).forEach(([storeId, storeData]) => {
                const option = document.createElement('option');
                option.value = storeData.name || storeId;
                option.textContent = storeData.name || storeId;
                retailStoreFilter.appendChild(option);
                addedCount++;
            });
            
            console.log(`✅ Retail store dropdown populated with ${addedCount} stores`);
        }).catch(error => {
            console.error('❌ Error loading retail stores:', error);
        });
    }
    
    // Populate retail product filter
    const retailProductFilter = document.getElementById('statsRetailProductFilter');
    if (retailProductFilter && database) {
        const productsRef = database.ref('products');
        productsRef.once('value').then(snapshot => {
            const productsData = snapshot.val() || {};
            console.log('📦 Retail products data:', productsData);
            
            // Clear dropdown first
            retailProductFilter.innerHTML = '<option value="">Tất cả sản phẩm</option>';
            
            let addedCount = 0;
            Object.entries(productsData).forEach(([productId, productData]) => {
                const option = document.createElement('option');
                option.value = productData.name || productId;
                option.textContent = productData.name || productId;
                retailProductFilter.appendChild(option);
                addedCount++;
            });
            
            console.log(`✅ Retail product dropdown populated with ${addedCount} products`);
        }).catch(error => {
            console.error('❌ Error loading retail products:', error);
        });
    }
}

// Load products from Firebase for filter dropdown
function loadProductsForFilter() {
    // Wait for Firebase to be ready
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.log('Firebase not ready for products, retrying...');
        setTimeout(loadProductsForFilter, 1000);
        return;
    }
    
    const productFilter = document.getElementById('productFilter');
    if (!productFilter) return;
    
    firebase.database().ref('products').once('value').then(snapshot => {
        const productsData = snapshot.val() || {};
        
        // Clear and rebuild dropdown to ensure all products are loaded
        productFilter.innerHTML = '<option value="">Tất cả sản phẩm</option>';
        
        Object.entries(productsData).forEach(([productId, productData]) => {
            const productName = productData.name || productData.productName || productId;
            const option = document.createElement('option');
            option.value = productName;
            option.textContent = productName;
            productFilter.appendChild(option);
        });
    }).catch(error => {
        console.error('Error loading products for filter:', error);
    });
}

// Auto-generate report when filters change
document.addEventListener('DOMContentLoaded', function() {
    // Load stores and products immediately when DOM is ready
    setTimeout(() => {
        loadStoresForFilter();
        loadProductsForFilter();
    }, 1000);
    
    // Try again after longer delay
    setTimeout(() => {
        loadStoresForFilter();
        loadProductsForFilter();
    }, 3000);
    
    // Final attempt
    setTimeout(() => {
        loadStoresForFilter();
        loadProductsForFilter();
    }, 5000);
    
    // Set current month/year as default
    const now = new Date();
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const fromDateSelect = document.getElementById('fromDateSelect');
    const toDateSelect = document.getElementById('toDateSelect');
    
    if (monthSelect) {
        monthSelect.value = now.getMonth() + 1;
    }
    
    if (yearSelect) {
        yearSelect.value = now.getFullYear();
    }
    
    // Set default date range (current month)
    if (fromDateSelect && toDateSelect) {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        fromDateSelect.value = firstDay.toISOString().split('T')[0];
        toDateSelect.value = lastDay.toISOString().split('T')[0];
    }
    
    // Populate filter dropdowns
    populateFilterDropdowns();
    
    // Add event listeners for auto-update
    ['monthSelect', 'yearSelect', 'platformFilter', 'productFilter', 'tmdtStoreFilter', 'fromDateSelect', 'toDateSelect'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', generateMonthlyReport);
        }
    });
});

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
            <td>${order.unit || 'cái'}</td>
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
    
    // Order ID filter (only for retail orders)
    if (orderType === 'retail') {
        const orderIdFilter = document.getElementById('statsRetailOrderIdFilter')?.value;
        if (orderIdFilter && orderIdFilter.trim() !== '') {
            filteredData = filteredData.filter(order => 
                order.orderId && order.orderId.toLowerCase().includes(orderIdFilter.toLowerCase().trim())
            );
        }
    }
    
    // Platform filter (only for TMDT orders)
    if (orderType === 'tmdt') {
        const platformFilter = document.getElementById('statsTmdtPlatformFilter')?.value;
        if (platformFilter && platformFilter !== 'all') {
            console.log('DEBUG: Platform filter applied:', platformFilter);
            console.log('DEBUG: Before filter - orders count:', filteredData.length);
            console.log('DEBUG: Sample order data:', filteredData[0]);
            
            filteredData = filteredData.filter(order => {
                // Map platform codes to filter values
                const platformMap = {
                    'tiktok': 'TikTok Shop',
                    'shopee': 'Shopee', 
                    'lazada': 'Lazada',
                    'sendo': 'Sendo',
                    'tiki': 'Tiki',
                    'facebook': 'Facebook Shop',
                    'zalo': 'Zalo Shop'
                };
                
                // Get the display name for the order's platform
                const orderPlatformDisplay = order.platformName || platformMap[order.platform] || order.platform;
                
                const matches = (orderPlatformDisplay && orderPlatformDisplay.toLowerCase() === platformFilter.toLowerCase()) || 
                               (order.platform && order.platform.toLowerCase() === platformFilter.toLowerCase()) ||
                               (order.marketplace && order.marketplace.toLowerCase() === platformFilter.toLowerCase()) ||
                               (order.source && order.source.toLowerCase() === platformFilter.toLowerCase()) ||
                               (order.ecommercePlatform && order.ecommercePlatform.toLowerCase() === platformFilter.toLowerCase()) ||
                               (order.channel && order.channel.toLowerCase() === platformFilter.toLowerCase());
                
                if (order.platform || order.marketplace || order.source) {
                    console.log('DEBUG: Order platform data:', {
                        platform: order.platform,
                        platformName: order.platformName,
                        orderPlatformDisplay: orderPlatformDisplay,
                        platformFilter: platformFilter,
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

// Toggle retail date filter
function toggleRetailDateFilter() {
    const dateType = document.getElementById('retailDateTypeSelect').value;
    const monthYearFilters = document.getElementById('retailMonthYearFilters');
    const customDateFilters = document.getElementById('retailCustomDateFilters');
    
    if (dateType === 'month') {
        monthYearFilters.style.display = 'flex';
        customDateFilters.style.display = 'none';
    } else {
        monthYearFilters.style.display = 'none';
        customDateFilters.style.display = 'flex';
    }
}

// Generate retail monthly report
function generateRetailMonthlyReport() {
    const dateType = document.getElementById('retailDateTypeSelect').value;
    const month = document.getElementById('retailMonthSelect').value;
    const year = document.getElementById('retailYearSelect').value;
    const fromDate = document.getElementById('retailFromDateSelect').value;
    const toDate = document.getElementById('retailToDateSelect').value;
    const product = document.getElementById('retailProductFilter').value;
    const store = document.getElementById('retailStoreFilter').value;
    
    console.log('=== RETAIL MONTHLY REPORT FILTER DEBUG ===');
    console.log('Date type:', dateType);
    console.log('Product filter value:', product);
    console.log('Store filter value:', store);
    console.log('Available retail orders:', orderReportData?.retail?.length || 0);
    
    // Debug first few retail orders
    if (orderReportData?.retail?.length > 0) {
        console.log('Sample retail orders:', orderReportData.retail.slice(0, 3));
    }
    
    // Filter retail orders by all criteria
    const filteredOrders = filterRetailOrdersByAllCriteria(dateType, month, year, fromDate, toDate, product, store);
    
    console.log('Filtered retail orders:', filteredOrders.length);
    
    // Generate statistics
    const stats = generateRetailStatistics(filteredOrders);
    
    // Update summary cards
    updateRetailMonthlySummary(stats);
    
    // Generate detailed tables
    generateRetailProductSummary(filteredOrders, stats.totalRevenue);
    generateRetailStoreSummary(filteredOrders, stats.totalRevenue);
    generateRetailDailySummary(filteredOrders);
}

// Filter retail orders by all criteria
function filterRetailOrdersByAllCriteria(dateType, month, year, fromDate, toDate, product, store) {
    if (!orderReportData || !orderReportData.retail) return [];
    
    return orderReportData.retail.filter(order => {
        const orderDate = new Date(order.date);
        
        // Date filtering
        let dateMatch = true;
        if (dateType === 'month') {
            dateMatch = orderDate.getMonth() + 1 == month && orderDate.getFullYear() == year;
        } else if (dateType === 'custom' && fromDate && toDate) {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            dateMatch = orderDate >= from && orderDate <= to;
        }
        
        // Product filtering - check both productName and items array
        let productMatch = !product;
        if (product && !productMatch) {
            // Check main product name
            productMatch = order.productName === product;
            
            // Check items array if exists
            if (!productMatch && order.items && Array.isArray(order.items)) {
                productMatch = order.items.some(item => item.productName === product);
            }
        }
        
        // Store filtering
        const storeMatch = !store || order.storeName === store;
        
        return dateMatch && productMatch && storeMatch;
    });
}

// Generate retail statistics
function generateRetailStatistics(orders) {
    const stats = {
        totalOrders: orders.length,
        totalQuantity: 0,
        totalWeight: 0, // Add separate weight calculation
        totalRevenue: 0,
        avgOrderValue: 0,
        productSummary: {}
    };
    
    orders.forEach(order => {
        const quantity = order.quantity || 0;
        const revenue = order.value || order.total || 0;
        
        stats.totalQuantity += quantity;
        stats.totalRevenue += revenue;
        
        // Calculate actual weight based on product information
        const weight = calculateProductWeight(order.productName, quantity);
        stats.totalWeight += weight;
        
        // Debug logging
        console.log('Order data:', {
            id: order.id,
            productName: order.productName,
            quantity: quantity,
            unit: order.unit,
            value: revenue
        });
        
        // Group by product
        const productKey = `${order.productName}`;
        if (!stats.productSummary[productKey]) {
            stats.productSummary[productKey] = {
                name: order.productName,
                quantity: 0,
                totalValue: 0,
                unit: order.unit || 'cái'
            };
        }
        
        stats.productSummary[productKey].quantity += quantity;
        stats.productSummary[productKey].totalValue += revenue;
    });
    
    stats.avgOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
    
    console.log('=== RETAIL STATISTICS CALCULATED ===');
    console.log('Total Orders:', stats.totalOrders);
    console.log('Total Quantity:', stats.totalQuantity);
    console.log('Total Weight:', stats.totalWeight.toFixed(1), 'kg');
    console.log('Total Revenue:', stats.totalRevenue);
    console.log('Avg Order Value:', stats.avgOrderValue);
    
    return stats;
}

// Load stores for retail filter dropdown
function loadRetailStoresForFilter() {
    const storeFilter = document.getElementById('retailStoreFilter');
    if (!storeFilter || !database) return;
    
    const storesRef = database.ref('stores');
    storesRef.once('value').then(snapshot => {
        const storesData = snapshot.val() || {};
        console.log('Loading retail stores for filter:', storesData);
        
        // Clear existing options except "Tất cả"
        storeFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
        
        // Add store options
        Object.entries(storesData).forEach(([storeId, storeData]) => {
            const option = document.createElement('option');
            option.value = storeData.name || storeId; // Use store name as value for filtering
            option.textContent = storeData.name || storeId;
            storeFilter.appendChild(option);
        });
        
        console.log('Populated retail store filter with', Object.keys(storesData).length, 'stores');
    }).catch(error => {
        console.error('Error loading retail stores for filter:', error);
    });
}

// Load products for retail filter dropdown
function loadRetailProductsForFilter() {
    const productFilter = document.getElementById('retailProductFilter');
    if (!productFilter || !database) return;
    
    const productsRef = database.ref('products');
    productsRef.once('value').then(snapshot => {
        const productsData = snapshot.val() || {};
        console.log('Loading retail products for filter:', productsData);
        
        // Clear existing options except "Tất cả"
        productFilter.innerHTML = '<option value="">Tất cả sản phẩm</option>';
        
        // Add product options
        Object.entries(productsData).forEach(([productId, productData]) => {
            const option = document.createElement('option');
            option.value = productData.name || productId; // Use product name as value for filtering
            option.textContent = productData.name || productId;
            productFilter.appendChild(option);
        });
        
        console.log('Populated retail product filter with', Object.keys(productsData).length, 'products');
    }).catch(error => {
        console.error('Error loading retail products for filter:', error);
    });
}

// Setup event listeners for retail monthly report filters
function setupRetailFilterEventListeners() {
    console.log('Setting up retail filter event listeners...');
    
    // Date type filter (month/custom)
    const dateTypeSelect = document.getElementById('retailDateTypeSelect');
    if (dateTypeSelect) {
        dateTypeSelect.addEventListener('change', () => {
            console.log('Date type changed, regenerating retail report');
            generateRetailMonthlyReport();
        });
    }
    
    // Month and year filters
    const monthSelect = document.getElementById('retailMonthSelect');
    const yearSelect = document.getElementById('retailYearSelect');
    
    if (monthSelect) {
        monthSelect.addEventListener('change', () => {
            console.log('Month changed, regenerating retail report');
            generateRetailMonthlyReport();
        });
    }
    
    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            console.log('Year changed, regenerating retail report');
            generateRetailMonthlyReport();
        });
    }
    
    // Product filter
    const productFilter = document.getElementById('retailProductFilter');
    if (productFilter) {
        productFilter.addEventListener('change', () => {
            console.log('Product filter changed:', productFilter.value);
            generateRetailMonthlyReport();
        });
    }
    
    // Store filter
    const storeFilter = document.getElementById('retailStoreFilter');
    if (storeFilter) {
        storeFilter.addEventListener('change', () => {
            console.log('Store filter changed:', storeFilter.value);
            generateRetailMonthlyReport();
        });
    }
    
    // Custom date range filters
    const fromDateSelect = document.getElementById('retailFromDateSelect');
    const toDateSelect = document.getElementById('retailToDateSelect');
    
    if (fromDateSelect) {
        fromDateSelect.addEventListener('change', () => {
            console.log('From date changed, regenerating retail report');
            generateRetailMonthlyReport();
        });
    }
    
    if (toDateSelect) {
        toDateSelect.addEventListener('change', () => {
            console.log('To date changed, regenerating retail report');
            generateRetailMonthlyReport();
        });
    }
    
    console.log('Retail filter event listeners setup complete');
}

// Helper function to get days in current period for forecasting
function getDaysInCurrentPeriod() {
    const dateType = document.getElementById('retailDateTypeSelect')?.value || 'month';
    
    if (dateType === 'month') {
        const month = parseInt(document.getElementById('retailMonthSelect')?.value || new Date().getMonth() + 1);
        const year = parseInt(document.getElementById('retailYearSelect')?.value || new Date().getFullYear());
        return new Date(year, month, 0).getDate(); // Days in selected month
    } else {
        const fromDate = document.getElementById('retailFromDateSelect')?.value;
        const toDate = document.getElementById('retailToDateSelect')?.value;
        if (fromDate && toDate) {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            return Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
        }
    }
    return 30; // Default fallback
}

// Calculate product weight based on product name and quantity
function calculateProductWeight(productName, quantity) {
    if (!productName || !quantity) return 0;
    
    // Extract weight from product name (e.g., "phở mai kéo sợi 1kg" -> 1kg)
    const weightMatch = productName.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (weightMatch) {
        const unitWeight = parseFloat(weightMatch[1]);
        return unitWeight * quantity;
    }
    
    // Extract weight in grams and convert to kg
    const gramMatch = productName.match(/(\d+(?:\.\d+)?)\s*g(?:ram)?/i);
    if (gramMatch) {
        const unitWeightGrams = parseFloat(gramMatch[1]);
        return (unitWeightGrams / 1000) * quantity; // Convert grams to kg
    }
    
    // Default weight assumptions for common products (in kg per unit)
    const defaultWeights = {
        'phở': 1.0,
        'bún': 0.5,
        'mì': 0.5,
        'bánh': 0.3,
        'kẹo': 0.1,
        'snack': 0.1
    };
    
    // Check if product name contains any of the default weight keywords
    const productLower = productName.toLowerCase();
    for (const [keyword, weight] of Object.entries(defaultWeights)) {
        if (productLower.includes(keyword)) {
            return weight * quantity;
        }
    }
    
    // If no weight information found, assume 0.5kg per unit as default
    return 0.5 * quantity;
}

// Update retail monthly summary cards
function updateRetailMonthlySummary(stats) {
    document.getElementById('totalRetailMonthlyOrders').textContent = stats.totalOrders;
    document.getElementById('totalRetailMonthlyQuantity').textContent = `${stats.totalWeight.toFixed(1)} kg`;
    document.getElementById('totalRetailMonthlyRevenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('avgRetailMonthlyOrderValue').textContent = formatCurrency(stats.avgOrderValue);
}

// Generate retail product summary table
function generateRetailProductSummary(orders, totalRevenue) {
    const productSummaryMap = {};
    orders.forEach(order => {
        // Handle both single product and items array
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const key = `${item.productName}-${item.sku}`;
                if (!productSummaryMap[key]) {
                    productSummaryMap[key] = {
                        name: item.productName,
                        sku: item.sku,
                        quantity: 0,
                        totalValue: 0,
                        unit: item.unit || 'cái',
                        totalWeight: 0
                    };
                }
                const itemQuantity = item.quantity || 0;
                productSummaryMap[key].quantity += itemQuantity;
                productSummaryMap[key].totalValue += item.totalPrice || 0;
                productSummaryMap[key].totalWeight += calculateProductWeight(item.productName, itemQuantity);
            });
        } else {
            // Single product order
            const key = `${order.productName}-${order.sku || 'N/A'}`;
            if (!productSummaryMap[key]) {
                productSummaryMap[key] = {
                    name: order.productName,
                    sku: order.sku || 'N/A',
                    quantity: 0,
                    totalValue: 0,
                    unit: order.unit || 'cái',
                    totalWeight: 0
                };
            }
            const orderQuantity = order.quantity || 0;
            productSummaryMap[key].quantity += orderQuantity;
            productSummaryMap[key].totalValue += order.value || order.total || 0;
            productSummaryMap[key].totalWeight += calculateProductWeight(order.productName, orderQuantity);
        }
    });
    
    const productSummary = Object.values(productSummaryMap);
    const tableBody = document.getElementById('retailProductSummaryTable');
    
    if (productSummary.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-inbox"></i><br>
                    Không có dữ liệu sản phẩm
                </td>
            </tr>
        `;
        return;
    }
    
    let tableHTML = '';
    productSummary.forEach((product, index) => {
        const percentage = totalRevenue > 0 ? ((product.totalValue / totalRevenue) * 100).toFixed(1) : '0.0';
        // Calculate forecast based on monthly usage (assuming 30 days per month)
        const monthlyForecast = (product.totalWeight * 30 / getDaysInCurrentPeriod()).toFixed(1);
        
        tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${product.name}</strong></td>
                <td>${product.sku}</td>
                <td class="text-right">${product.quantity}</td>
                <td class="text-right"><strong>${product.totalWeight.toFixed(1)} kg</strong></td>
                <td class="text-center">${product.unit}</td>
                <td class="text-right">${formatCurrency(product.totalValue)}</td>
                <td class="text-right">${percentage}%</td>
                <td class="text-right" style="color: #007bff;"><strong>${monthlyForecast} kg/tháng</strong></td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Generate retail store summary table
function generateRetailStoreSummary(orders, totalRevenue) {
    const storeSummaryMap = {};
    let totalWeight = 0;
    
    orders.forEach(order => {
        const storeKey = order.storeName || 'Không xác định';
        if (!storeSummaryMap[storeKey]) {
            storeSummaryMap[storeKey] = {
                name: storeKey,
                orderCount: 0,
                quantity: 0,
                totalValue: 0,
                totalWeight: 0
            };
        }
        
        const orderQuantity = order.quantity || 0;
        const orderWeight = calculateProductWeight(order.productName, orderQuantity);
        
        storeSummaryMap[storeKey].orderCount += 1;
        storeSummaryMap[storeKey].quantity += orderQuantity;
        storeSummaryMap[storeKey].totalValue += order.value || 0;
        storeSummaryMap[storeKey].totalWeight += orderWeight;
        totalWeight += orderWeight;
    });
    
    // Convert to array and sort by weight consumption
    const storeSummary = Object.values(storeSummaryMap)
        .sort((a, b) => b.totalWeight - a.totalWeight);
    
    const tableBody = document.getElementById('retailStoreSummaryTable');
    if (storeSummary.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-inbox"></i><br>
                    Không có dữ liệu cửa hàng
                </td>
            </tr>
        `;
        return;
    }
    
    const tableRows = storeSummary.map((store, index) => {
        const percentage = totalRevenue > 0 ? ((store.totalValue / totalRevenue) * 100).toFixed(1) : 0;
        const warehouseEfficiency = totalWeight > 0 ? ((store.totalWeight / totalWeight) * 100).toFixed(1) : 0;
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${store.name}</strong></td>
                <td class="text-right">${store.orderCount}</td>
                <td class="text-right"><strong>${store.totalWeight.toFixed(1)} kg</strong></td>
                <td class="text-right">${formatCurrency(store.totalValue)}</td>
                <td class="text-right">${percentage}%</td>
                <td class="text-right" style="color: #28a745;"><strong>${warehouseEfficiency}%</strong></td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = tableRows;
}

// Generate retail daily summary table
function generateRetailDailySummary(orders) {
    const dailySummaryMap = {};
    orders.forEach(order => {
        const orderDate = new Date(order.date);
        const dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!dailySummaryMap[dateKey]) {
            dailySummaryMap[dateKey] = {
                date: dateKey,
                orderCount: 0,
                quantity: 0,
                totalValue: 0,
                totalWeight: 0
            };
        }
        
        const orderQuantity = order.quantity || 0;
        const orderWeight = calculateProductWeight(order.productName, orderQuantity);
        
        dailySummaryMap[dateKey].orderCount += 1;
        dailySummaryMap[dateKey].quantity += orderQuantity;
        dailySummaryMap[dateKey].totalValue += order.value || 0;
        dailySummaryMap[dateKey].totalWeight += orderWeight;
    });
    
    // Convert to array and sort by date
    const dailySummary = Object.values(dailySummaryMap)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const tableBody = document.getElementById('retailDailySummaryTable');
    if (dailySummary.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-inbox"></i><br>
                    Không có dữ liệu theo ngày
                </td>
            </tr>
        `;
        return;
    }
    
    const tableRows = dailySummary.map((day, index) => {
        const avgOrderValue = day.orderCount > 0 ? day.totalValue / day.orderCount : 0;
        
        // Calculate trend compared to previous day
        let trend = '';
        let trendColor = '#6c757d';
        if (index < dailySummary.length - 1) {
            const prevDay = dailySummary[index + 1];
            const weightDiff = day.totalWeight - prevDay.totalWeight;
            if (weightDiff > 0) {
                trend = `↗ +${weightDiff.toFixed(1)} kg`;
                trendColor = '#28a745';
            } else if (weightDiff < 0) {
                trend = `↘ ${weightDiff.toFixed(1)} kg`;
                trendColor = '#dc3545';
            } else {
                trend = '→ Không đổi';
            }
        } else {
            trend = '— Ngày đầu';
        }
        
        return `
            <tr>
                <td>${formatDate(day.date)}</td>
                <td class="text-right">${day.orderCount}</td>
                <td class="text-right"><strong>${day.totalWeight.toFixed(1)} kg</strong></td>
                <td class="text-right">${formatCurrency(day.totalValue)}</td>
                <td class="text-right">${formatCurrency(avgOrderValue)}</td>
                <td class="text-center" style="color: ${trendColor}; font-weight: bold;">${trend}</td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = tableRows;
}

// Print retail monthly report
async function printRetailMonthlyReport() {
    // Get current filter values
    const dateType = document.getElementById('retailDateTypeSelect')?.value || 'month';
    const month = parseInt(document.getElementById('retailMonthSelect')?.value || new Date().getMonth() + 1);
    const year = parseInt(document.getElementById('retailYearSelect')?.value || new Date().getFullYear());
    const fromDate = document.getElementById('retailFromDateSelect')?.value;
    const toDate = document.getElementById('retailToDateSelect')?.value;
    const product = document.getElementById('retailProductFilter')?.value;
    const store = document.getElementById('retailStoreFilter')?.value;
    
    // Get filtered data
    const filteredOrders = filterRetailOrdersByAllCriteria(dateType, month, year, fromDate, toDate, product, store);
    
    if (filteredOrders.length === 0) {
        alert('Không có dữ liệu để in báo cáo. Vui lòng kiểm tra lại bộ lọc.');
        return;
    }
    
    // Get store information for selected store
    let storeInfo = null;
    if (store) {
        // Try multiple ways to get store data
        if (window.storesData) {
            storeInfo = Object.values(window.storesData).find(s => s.name === store);
        }
        // Try from Firebase directly
        if (!storeInfo && window.database) {
            try {
                const snapshot = await window.database.ref('stores').once('value');
                const stores = snapshot.val() || {};
                storeInfo = Object.values(stores).find(s => s.name === store);
            } catch (error) {
                console.log('Error loading store from Firebase:', error);
            }
        }
        // If still not found, create mock data based on store name
        if (!storeInfo) {
            storeInfo = {
                name: store,
                address: `Địa chỉ ${store}`,
                phone: '0123-456-789',
                email: `${store.toLowerCase().replace(/\s+/g, '')}@company.com`
            };
        }
        console.log('Selected store:', store);
        console.log('Found store info:', storeInfo);
    }
    
    // Generate print content
    const printContent = generateDetailedPrintReport(filteredOrders, {
        dateType, month, year, fromDate, toDate, product, store, storeInfo
    });
    
    // Create print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Generate detailed print report
function generateDetailedPrintReport(orders, filters) {
    const { dateType, month, year, fromDate, toDate, product, store, storeInfo } = filters;
    
    // Get period title
    let periodTitle = '';
    if (dateType === 'month') {
        periodTitle = `Tháng ${month} ${year}`;
    } else if (fromDate && toDate) {
        periodTitle = `${formatDate(fromDate)} - ${formatDate(toDate)}`;
    } else {
        periodTitle = 'Tất cả thời gian';
    }
    
    // Group orders by product for detailed summary
    const productSummary = {};
    let totalWeight = 0;
    let totalRevenue = 0;
    let totalOrders = orders.length;
    
    orders.forEach(order => {
        const productKey = `${order.productName}-${order.sku || 'N/A'}`;
        if (!productSummary[productKey]) {
            productSummary[productKey] = {
                name: order.productName,
                sku: order.sku || 'N/A',
                quantity: 0,
                weight: 0,
                revenue: 0,
                orderCount: 0,
                unit: order.unit || 'cái',
                stores: new Set(),
                platforms: new Set()
            };
        }
        
        const orderQuantity = order.quantity || 0;
        const orderWeight = calculateProductWeight(order.productName, orderQuantity);
        const orderRevenue = order.value || order.total || 0;
        
        productSummary[productKey].quantity += orderQuantity;
        productSummary[productKey].weight += orderWeight;
        productSummary[productKey].revenue += orderRevenue;
        productSummary[productKey].orderCount += 1;
        productSummary[productKey].stores.add(order.storeName || 'Không xác định');
        productSummary[productKey].platforms.add(order.platformName || 'Không xác định');
        
        totalWeight += orderWeight;
        totalRevenue += orderRevenue;
    });
    
    const products = Object.values(productSummary);
    
    // Generate report ID
    const reportId = 'RPT' + Date.now().toString().slice(-8);
    const currentDate = new Date().toLocaleDateString('vi-VN');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Báo Cáo Thống Kê TMĐT - ${periodTitle}</title>
    <style>
        @page {
            margin: 15mm;
            size: A4;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
            background: #fff;
        }
        
        .report-header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
        }
        
        .company-logo {
            display: inline-block;
            width: 20px;
            height: 20px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
            margin-right: 8px;
            vertical-align: middle;
        }
        
        .report-title {
            font-size: 18px;
            font-weight: bold;
            color: #666;
            margin: 0 0 5px 0;
        }
        
        .report-subtitle {
            font-size: 12px;
            color: #888;
            margin: 0 0 20px 0;
        }
        
        .report-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 11px;
        }
        
        .meta-left {
            text-align: left;
        }
        
        .meta-right {
            text-align: right;
        }
        
        .meta-item {
            margin: 3px 0;
        }
        
        .period-title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 20px 0;
            padding: 10px;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 10px;
        }
        
        .data-table th {
            background: #f8f9fa;
            padding: 8px 4px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #ddd;
            font-size: 9px;
        }
        
        .data-table td {
            padding: 6px 4px;
            border: 1px solid #ddd;
            text-align: center;
        }
        
        .text-left { text-align: left !important; }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        
        .total-summary {
            margin: 20px 0;
            padding: 10px;
            border-top: 2px solid #28a745;
            text-align: right;
        }
        
        .total-amount {
            font-size: 16px;
            font-weight: bold;
            color: #28a745;
            margin-top: 10px;
        }
        
        .report-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
        }
        
        .footer-left {
            color: #e74c3c;
        }
        
        .footer-right {
            text-align: right;
            color: #666;
        }
        
        .contact-info {
            margin: 2px 0;
        }
        
        .signature-section {
            text-align: center;
            margin-top: 20px;
            color: #f39c12;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
            .data-table { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="report-header">
        <div class="report-title">
            <span class="company-logo"></span>
            BÁO CÁO THỐNG KÊ ĐƠN HÀNG LẺ
        </div>
        <div class="report-subtitle">Hệ thống quản lý bán hàng</div>
    </div>
    
    <div class="report-meta">
        <div class="meta-left">
            <div class="meta-item"><strong>Mã báo cáo:</strong></div>
            <div class="meta-item"><strong>Ngày tạo:</strong></div>
            <div class="meta-item"><strong>Tổng đơn hàng:</strong></div>
            <div class="meta-item"><strong>Tổng sản phẩm:</strong></div>
            <div class="meta-item"><strong>Cửa hàng:</strong></div>
            <div class="meta-item"><strong>Sản phẩm:</strong></div>
        </div>
        <div class="meta-right">
            <div class="meta-item">${reportId}</div>
            <div class="meta-item">${currentDate}</div>
            <div class="meta-item">${totalOrders} đơn</div>
            <div class="meta-item">${products.length} loại</div>
            <div class="meta-item">${store || 'Tất cả cửa hàng'}</div>
            <div class="meta-item">${product || 'Tất cả sản phẩm'}</div>
        </div>
    </div>
    
    <div class="period-title">${periodTitle}</div>
    
    <table class="data-table">
        <thead>
            <tr>
                <th width="5%">STT</th>
                <th width="25%">TÊN SẢN PHẨM</th>
                <th width="15%">SKU</th>
                <th width="8%">SỐ LƯỢNG</th>
                <th width="5%">ĐƠN VỊ</th>
                <th width="12%">THÀNH TIỀN</th>
                <th width="6%">SỐ ĐƠN</th>
                <th width="12%">SÀN TMĐT</th>
                <th width="12%">CỬA HÀNG</th>
            </tr>
        </thead>
        <tbody>
            ${products.map((product, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td class="text-left">${product.name}</td>
                    <td>${product.sku}</td>
                    <td class="text-right">${product.weight.toFixed(1)}</td>
                    <td>kg</td>
                    <td class="text-right">${formatCurrency(product.revenue)}</td>
                    <td class="text-right">${product.orderCount}</td>
                    <td class="text-left">${Array.from(product.platforms).join(', ')}</td>
                    <td class="text-left">${Array.from(product.stores).join(', ')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total-summary">
        <div><strong>Tổng khối lượng: ${totalWeight.toFixed(1)} kg</strong></div>
        <div class="total-amount">TỔNG CỘNG: ${formatCurrency(totalRevenue)}</div>
    </div>
    
    <div class="report-footer">
        <div class="footer-left">
            <div style="font-weight: bold; margin-bottom: 5px;">📍 Địa chỉ công ty:</div>
            <div class="contact-info">${storeInfo?.address || '123 Đường ABC, Quận XYZ, TP.HCM'}</div>
            <div class="contact-info">📞 Hotline: ${storeInfo?.phone || '0123-456-789'}</div>
            <div class="contact-info">📧 Email: ${storeInfo?.email || 'info@company.com'}</div>
        </div>
        <div class="footer-right">
            <div style="margin-bottom: 10px;">👤 <strong>Người tạo:</strong></div>
            <div style="margin-bottom: 5px;">📅 <strong>Ngày tạo:</strong> ${currentDate}</div>
            <div class="signature-section">
                <div>✍️ <strong>Chữ ký:</strong></div>
            </div>
        </div>
    </div>
    
</body>
</html>`;
}

// Export functions to global scope
window.toggleRetailDateFilter = toggleRetailDateFilter;
window.generateRetailMonthlyReport = generateRetailMonthlyReport;
window.printRetailMonthlyReport = printRetailMonthlyReport;
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