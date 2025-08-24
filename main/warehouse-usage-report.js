// Enhanced Warehouse Usage Report Functions - Inventory Tracking
console.log('=== Enhanced Warehouse Usage Report Loading ===');

// Global variables for usage report
let usageReportData = {};
let transactionHistory = [];
let usageCharts = {
    timeChart: null,
    topUsageChart: null
};
let currentFilters = {
    period: 'week',
    store: 'all',
    category: 'all'
};

// Initialize the enhanced warehouse usage report
function initWarehouseUsageReport() {
    console.log('Initializing enhanced warehouse usage report...');
    
    try {
        // Set default date range
        updateUsageReportDateRange();
        
        // Populate filter options
        populateUsageReportFilters();
        
        // Generate usage report data
        generateUsageReport();
        
        // Initialize charts
        initializeUsageCharts();
        
        console.log('Enhanced warehouse usage report initialized successfully');
    } catch (error) {
        console.error('Error initializing usage report:', error);
        showUsageReportError('Không thể khởi tạo báo cáo sử dụng kho');
    }
}

// Update the date range display based on selected period
function updateUsageReportDateRange() {
    const periodSelect = document.getElementById('reportPeriodSelect');
    const dateRangeSpan = document.getElementById('reportDateRange');
    
    if (periodSelect && dateRangeSpan) {
        const selectedPeriod = periodSelect.value;
        currentFilters.period = selectedPeriod;
        const now = new Date();
        
        switch (selectedPeriod) {
            case 'today':
                dateRangeSpan.textContent = formatUsageDate(now);
                break;
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                dateRangeSpan.textContent = `${formatUsageDate(weekStart)} - ${formatUsageDate(weekEnd)}`;
                break;
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                dateRangeSpan.textContent = `${formatUsageDate(monthStart)} - ${formatUsageDate(monthEnd)}`;
                break;
            case 'quarter':
                const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
                dateRangeSpan.textContent = `${formatUsageDate(quarterStart)} - ${formatUsageDate(quarterEnd)}`;
                break;
            case 'year':
                dateRangeSpan.textContent = now.getFullYear().toString();
                break;
            case 'custom':
                // For custom range, we would need from/to date inputs
                dateRangeSpan.textContent = 'Tùy chỉnh';
                break;
            default:
                dateRangeSpan.textContent = formatDate(now);
        }
    }
}

// Format date as DD/MM/YYYY
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Populate store options in the report filter from Firebase
function populateStoreOptions() {
    const storeSelect = document.getElementById('report-store-select');
    
    if (storeSelect) {
        console.log('🏪 Populating store options...');
        
        // Clear existing options except the first one
        while (storeSelect.options.length > 1) {
            storeSelect.remove(1);
        }
        
        // Check if Firebase and getAllStores function are available
        console.log('🔥 Checking Firebase availability...');
        console.log('getAllStores function available:', typeof getAllStores === 'function');
        console.log('database available:', typeof database !== 'undefined');
        
        // Try direct database access first
        if (typeof database !== 'undefined' && database) {
            console.log('🔥 Using direct database access...');
            database.ref('stores').once('value')
                .then(snapshot => {
                    const stores = snapshot.val();
                    console.log('🏪 Stores data from Firebase:', stores);
                    
                    if (stores && Object.keys(stores).length > 0) {
                        Object.keys(stores).forEach(storeId => {
                            const store = stores[storeId];
                            const option = document.createElement('option');
                            option.value = storeId;
                            option.textContent = store.name || store.storeName || `Cửa hàng ${storeId}`;
                            storeSelect.appendChild(option);
                            console.log(`✅ Added store: ${option.textContent}`);
                        });
                        console.log('🎉 Successfully loaded stores from Firebase!');
                    } else {
                        console.log('⚠️ No stores found in Firebase database');
                    }
                })
                .catch(error => {
                    console.error('❌ Error fetching stores from Firebase:', error);
                });
        }
        // Fallback to getAllStores function
        else if (typeof getAllStores === 'function') {
            console.log('🔥 Using getAllStores function...');
            getAllStores().then(stores => {
                console.log('🏪 Stores data from getAllStores:', stores);
                
                if (stores && Object.keys(stores).length > 0) {
                    Object.keys(stores).forEach(storeId => {
                        const store = stores[storeId];
                        const option = document.createElement('option');
                        option.value = storeId;
                        option.textContent = store.name || store.storeName || `Cửa hàng ${storeId}`;
                        storeSelect.appendChild(option);
                        console.log(`✅ Added store: ${option.textContent}`);
                    });
                    console.log('🎉 Successfully loaded stores using getAllStores!');
                } else {
                    console.log('⚠️ No stores found in database');
                }
            }).catch(error => {
                console.error('❌ Error with getAllStores:', error);
            });
        } else {
            console.log('⚠️ Firebase not available');
        }
    }
}

// REMOVED: Sample store creation - using only real Firebase data

// Generate report data from Firebase
function generateReportData() {
    const selectedStore = document.getElementById('report-store-select')?.value;
    const selectedPeriod = document.getElementById('report-period-select')?.value;
    
    console.log('Generating report for store:', selectedStore, 'period:', selectedPeriod);
    
    // Show loading state
    showLoadingState();
    
    // Fetch real data from Firebase
    Promise.all([
        fetchOrdersData(selectedStore, selectedPeriod),
        fetchProductsData(selectedStore)
    ]).then(([ordersData, productsData]) => {
        // Process and display the data
        processReportData(ordersData, productsData);
        hideLoadingState();
    }).catch(error => {
        console.error('Error generating report:', error);
        // No fallback data - using real Firebase data only
        console.log('No data available from Firebase');
        hideLoadingState();
    });
}

// Fetch orders data from Firebase
function fetchOrdersData(storeId, period) {
    return new Promise((resolve, reject) => {
        if (typeof getAllOrders === 'function') {
            getAllOrders().then(orders => {
                if (orders) {
                    // Filter orders by store and period
                    const filteredOrders = filterOrdersByStoreAndPeriod(orders, storeId, period);
                    resolve(filteredOrders);
                } else {
                    resolve({});
                }
            }).catch(reject);
        } else {
            reject(new Error('getAllOrders function not available'));
        }
    });
}

// Fetch products data from Firebase
function fetchProductsData(storeId) {
    return new Promise((resolve, reject) => {
        if (typeof getAllProducts === 'function') {
            getAllProducts().then(products => {
                if (products) {
                    // Filter products by store if needed
                    const filteredProducts = storeId === 'all' ? products : 
                        Object.keys(products).reduce((acc, productId) => {
                            const product = products[productId];
                            if (!product.storeId || product.storeId === storeId) {
                                acc[productId] = product;
                            }
                            return acc;
                        }, {});
                    resolve(filteredProducts);
                } else {
                    resolve({});
                }
            }).catch(reject);
        } else {
            reject(new Error('getAllProducts function not available'));
        }
    });
}

// Filter orders by store and time period
function filterOrdersByStoreAndPeriod(orders, storeId, period) {
    const now = new Date();
    let startDate, endDate;
    
    // Calculate date range based on period
    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
        case 'quarter':
            const quarterStart = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStart, 1);
            endDate = new Date(now.getFullYear(), quarterStart + 3, 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
            break;
        default:
            // Default to current month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    
    return Object.keys(orders).reduce((acc, orderId) => {
        const order = orders[orderId];
        const orderDate = new Date(order.createdAt || order.date);
        
        // Filter by date range
        if (orderDate >= startDate && orderDate < endDate) {
            // Filter by store if not 'all'
            if (storeId === 'all' || order.storeId === storeId) {
                acc[orderId] = order;
            }
        }
        
        return acc;
    }, {});
}

// Process and display report data
function processReportData(ordersData, productsData) {
    // Categorize orders by type
    const ecommerceOrders = [];
    const wholesaleOrders = [];
    const retailOrders = [];
    
    let totalOrders = 0;
    let totalProductsSold = 0;
    let totalRevenue = 0;
    
    Object.keys(ordersData).forEach(orderId => {
        const order = ordersData[orderId];
        totalOrders++;
        
        // Calculate order totals
        const orderTotal = parseFloat(order.total || 0);
        totalRevenue += orderTotal;
        
        // Count products sold
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                totalProductsSold += parseInt(item.quantity || 0);
            });
        }
        
        // Categorize by order type
        switch (order.type) {
            case 'ecommerce':
            case 'tmdt':
                ecommerceOrders.push({ ...order, id: orderId });
                break;
            case 'wholesale':
            case 'sỉ':
                wholesaleOrders.push({ ...order, id: orderId });
                break;
            case 'retail':
            case 'lẻ':
            default:
                retailOrders.push({ ...order, id: orderId });
                break;
        }
    });
    
    // Update summary cards with real data
    updateSummaryCardsWithRealData(totalOrders, totalProductsSold, totalRevenue);
    
    // Populate tables with real data
    populateEcommerceTableWithRealData(ecommerceOrders);
    populateWholesaleTableWithRealData(wholesaleOrders);
    populateRetailTableWithRealData(retailOrders);
}

// Update summary cards with real data
function updateSummaryCardsWithRealData(totalOrders, totalProductsSold, totalRevenue) {
    const totalOrdersElement = document.getElementById('total-orders');
    const totalProductsElement = document.getElementById('total-products-sold');
    const totalRevenueElement = document.getElementById('total-revenue');
    
    if (totalOrdersElement) totalOrdersElement.textContent = totalOrders.toString();
    if (totalProductsElement) totalProductsElement.textContent = totalProductsSold.toString();
    if (totalRevenueElement) totalRevenueElement.textContent = formatCurrency(totalRevenue);
}

// Show loading state
function showLoadingState() {
    const summaryCards = document.querySelectorAll('.summary-card h3');
    summaryCards.forEach(card => {
        card.textContent = '...';
    });
    
    const tables = document.querySelectorAll('.report-table tbody');
    tables.forEach(tbody => {
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 20px;">Đang tải dữ liệu...</td></tr>';
    });
}

// Hide loading state
function hideLoadingState() {
    // Loading state will be replaced by actual data
    console.log('Data loaded successfully');
}

// Populate e-commerce orders table with real data
function populateEcommerceTableWithRealData(ecommerceOrders) {
    const tableBody = document.querySelector('#ecommerce-orders-table tbody');
    
    if (tableBody) {
        // Clear existing rows
        tableBody.innerHTML = '';
        
        if (ecommerceOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Không có đơn hàng TMĐT trong khoảng thời gian này</td></tr>';
            return;
        }
        
        ecommerceOrders.forEach((order, index) => {
            const orderDate = new Date(order.createdAt || order.date);
            const formattedDate = formatDate(orderDate);
            
            // Get first product from order items for display
            let productName = 'N/A';
            let sku = 'N/A';
            let quantity = 0;
            
            if (order.items && order.items.length > 0) {
                const firstItem = order.items[0];
                productName = firstItem.name || firstItem.productName || 'N/A';
                sku = firstItem.sku || firstItem.productSku || 'N/A';
                quantity = order.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formattedDate}</td>
                <td>${order.orderCode || order.id}</td>
                <td>${productName}</td>
                <td>${sku}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(parseFloat(order.total || 0))}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// Populate wholesale orders table with real data
function populateWholesaleTableWithRealData(wholesaleOrders) {
    const tableBody = document.querySelector('#wholesale-orders-table tbody');
    
    if (tableBody) {
        // Clear existing rows
        tableBody.innerHTML = '';
        
        if (wholesaleOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Không có đơn hàng sỉ trong khoảng thời gian này</td></tr>';
            return;
        }
        
        wholesaleOrders.forEach((order, index) => {
            const orderDate = new Date(order.createdAt || order.date);
            const formattedDate = formatDate(orderDate);
            
            // Get customer info and first product
            const customerName = order.customerName || order.customer?.name || 'N/A';
            let productName = 'N/A';
            let sku = 'N/A';
            let quantity = 0;
            
            if (order.items && order.items.length > 0) {
                const firstItem = order.items[0];
                productName = firstItem.name || firstItem.productName || 'N/A';
                sku = firstItem.sku || firstItem.productSku || 'N/A';
                quantity = order.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formattedDate}</td>
                <td>${order.orderCode || order.id}</td>
                <td>${customerName}</td>
                <td>${productName}</td>
                <td>${sku}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(parseFloat(order.total || 0))}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// REMOVED: Sample wholesale table population - using only real Firebase data

// Populate retail orders table with real data
function populateRetailTableWithRealData(retailOrders) {
    const tableBody = document.querySelector('#retail-orders-table tbody');
    
    if (tableBody) {
        // Clear existing rows
        tableBody.innerHTML = '';
        
        if (retailOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Không có đơn hàng lẻ trong khoảng thời gian này</td></tr>';
            return;
        }
        
        retailOrders.forEach((order, index) => {
            const orderDate = new Date(order.createdAt || order.date);
            const formattedDate = formatDate(orderDate);
            
            // Get first product from order items for display
            let productName = 'N/A';
            let sku = 'N/A';
            let quantity = 0;
            
            if (order.items && order.items.length > 0) {
                const firstItem = order.items[0];
                productName = firstItem.name || firstItem.productName || 'N/A';
                sku = firstItem.sku || firstItem.productSku || 'N/A';
                quantity = order.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formattedDate}</td>
                <td>${order.orderCode || order.id}</td>
                <td>${productName}</td>
                <td>${sku}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(parseFloat(order.total || 0))}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// REMOVED: Sample retail table population - using only real Firebase data

// REMOVED: Sample summary cards update - using only real Firebase data

// Format number as currency (VND)
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Add event listeners for report filters and buttons
function addEventListeners() {
    const periodSelect = document.getElementById('report-period-select');
    const storeSelect = document.getElementById('report-store-select');
    const printBtn = document.getElementById('print-report-btn');
    const exportBtn = document.getElementById('export-report-btn');
    
    if (periodSelect) {
        periodSelect.addEventListener('change', updateDateRangeDisplay);
    }
    
    if (storeSelect) {
        storeSelect.addEventListener('change', generateReportData);
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', printReport);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportReport);
    }
}

// Print report functionality
function printReport() {
    window.print();
}

// Export report functionality (placeholder)
function exportReport() {
    alert('Chức năng xuất báo cáo sẽ được triển khai sau');
}

// Make functions globally accessible
window.initWarehouseUsageReport = initWarehouseUsageReport;
window.switchToCurrentListView = switchToCurrentListView;
window.switchToUsageReportView = switchToUsageReportView;