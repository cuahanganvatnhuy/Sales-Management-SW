// Reports Management System
let reportsData = {
    orders: {},
    products: {},
    stores: {}
};

let currentReportType = 'global'; // 'global' or 'store'
let selectedStoreId = null;
let dateRange = {
    start: null,
    end: null
};

// Initialize reports page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing reports page...');
    
    // Wait for Firebase and components to load
    setTimeout(() => {
        try {
            // Check if Firebase is initialized
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase not loaded');
                return;
            }
            
            // Check if Firebase app is initialized
            try {
                firebase.app();
                console.log('✅ Firebase app initialized');
            } catch (error) {
                console.log('⚠️ Firebase app not initialized, initializing now...');
                // Initialize Firebase if not already done
                const firebaseConfig = {
                    apiKey: "AIzaSyDVMShVqAkxJsaFbhApFTcmvktynFzwcDA",
                    authDomain: "quan-ly-don-hang-a8b07.firebaseapp.com",
                    databaseURL: "https://quan-ly-don-hang-a8b07-default-rtdb.asia-southeast1.firebasedatabase.app/",
                    projectId: "quan-ly-don-hang-a8b07",
                    storageBucket: "quan-ly-don-hang-a8b07.firebasestorage.app",
                    messagingSenderId: "677915196614",
                    appId: "1:677915196614:web:32c0c33da92ac6a6572bc7"
                };
                firebase.initializeApp(firebaseConfig);
                console.log('✅ Firebase initialized in reports.js');
                
                // Create sample data if needed
                setTimeout(() => {
                    createSampleDataIfNeeded();
                }, 1000);
            }
            
            console.log('✅ Firebase available, initializing reports page...');
            
            // Set default date range (last 30 days)
            setDefaultDateRange();
            
            // Initialize event listeners
            initializeEventListeners();
            
            // Initialize export functions
            initializeExportFunctions();
            
            // Load initial data
            loadReportsData();
        } catch (error) {
            console.error('❌ Error initializing reports page:', error);
        }
    }, 2000);
});

// Set default date range (last 30 days)
function setDefaultDateRange() {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        // Set the input values
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            startDateInput.value = startDate.toISOString().split('T')[0];
            endDateInput.value = endDate.toISOString().split('T')[0];
        } else {
            console.warn('⚠️ Date input elements not found');
        }
        
        // Set the global date range with proper time
        dateRange.start = new Date(startDate.toISOString().split('T')[0] + 'T00:00:00');
        dateRange.end = new Date(endDate.toISOString().split('T')[0] + 'T23:59:59');
        
        console.log('📅 Default date range set:', dateRange);
    } catch (error) {
        console.error('❌ Error setting default date range:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    try {
        // Report type selection
        const globalReportCard = document.getElementById('globalReportCard');
        const storeReportCard = document.getElementById('storeReportCard');
        
        if (globalReportCard) {
            globalReportCard.addEventListener('click', function() {
                selectReportType('global');
            });
        }
        
        if (storeReportCard) {
            storeReportCard.addEventListener('click', function() {
                selectReportType('store');
            });
        }
        
        // Generate Report button (handles both global and store reports)
        const generateStoreReport = document.getElementById('generateStoreReport');
        if (generateStoreReport) {
            generateStoreReport.addEventListener('click', async function() {
                // Update date range from inputs
                const startDateValue = document.getElementById('startDate').value;
                const endDateValue = document.getElementById('endDate').value;
                
                if (!startDateValue || !endDateValue) {
                    showNotification('Vui lòng chọn đầy đủ khoảng thời gian!', 'warning');
                    return;
                }
                
                // Update date range
                dateRange.start = new Date(startDateValue + 'T00:00:00');
                dateRange.end = new Date(endDateValue + 'T23:59:59');
                
                console.log('📅 Date range updated:', dateRange);
                
                // Check if this is a store report and store selection is required
                if (currentReportType === 'store') {
                    const storeId = document.getElementById('reportStoreSelect').value;
                    if (!storeId) {
                        showNotification('Vui lòng chọn cửa hàng!', 'warning');
                        return;
                    }
                    selectedStoreId = storeId;
                    selectedReportType = 'store';
                } else {
                    // Global report - no store selection needed
                    selectedStoreId = null;
                    selectedReportType = 'global';
                }
                
                // Reload data with new date range (without auto-generating report)
                await loadReportsDataOnly();
                
                // Generate report based on current type
                generateReport();
            });
        }
        
        // Store selection for store report
        const reportStoreSelect = document.getElementById('reportStoreSelect');
        if (reportStoreSelect) {
            reportStoreSelect.addEventListener('change', function() {
                selectedStoreId = this.value;
                console.log('🏪 Store selected:', selectedStoreId);
            });
        }
        
        console.log('✅ Event listeners initialized');
    } catch (error) {
        console.error('❌ Error initializing event listeners:', error);
    }
}

// Select report type
function selectReportType(type) {
    currentReportType = type;
    
    // Update UI
    document.querySelectorAll('.report-type-card').forEach(card => {
        card.classList.remove('active');
    });
    
    if (type === 'global') {
        document.getElementById('globalReportCard').classList.add('active');
        document.getElementById('storeSelectionSection').classList.add('hidden');
        document.getElementById('storePerformanceSection').classList.remove('hidden');
        selectedStoreId = null;
    } else {
        document.getElementById('storeReportCard').classList.add('active');
        document.getElementById('storeSelectionSection').classList.remove('hidden');
        document.getElementById('storePerformanceSection').classList.add('hidden');
    }
    
    console.log(' Report type selected:', type);
    
    // Keep bill section visible if it was already shown
    const billSection = document.getElementById('billSummarySection');
    if (billSection && !billSection.classList.contains('hidden')) {
        console.log(' Keeping bill section visible');
        // Bill section stays visible
    }
    
    // Auto-generate global report
    if (type === 'global') {
        generateReport();
    }
}

// Load all reports data
async function loadReportsData() {
    try {
        showLoading(true);
        console.log('📊 Loading reports data...');
        
        // Load stores
        await loadStores();
        
        // Load orders from all stores
        await loadAllOrders();
        
        // Load products
        await loadProducts();
        
        // Generate initial global report
        generateReport();
        
        console.log('✅ Reports data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading reports data:', error);
        showNotification('Lỗi tải dữ liệu báo cáo!', 'error');
    } finally {
        showLoading(false);
    }
}

// Load reports data without auto-generating report
async function loadReportsDataOnly() {
    try {
        showLoading(true);
        console.log('📊 Loading reports data only...');
        
        // Load stores
        await loadStores();
        
        // Load orders from all stores
        await loadAllOrders();
        
        // Load products
        await loadProducts();
        
        console.log('✅ Reports data loaded successfully (no auto-report)');
        
    } catch (error) {
        console.error('❌ Error loading reports data:', error);
        showNotification('Lỗi tải dữ liệu báo cáo!', 'error');
    } finally {
        showLoading(false);
    }
}

// Load stores
async function loadStores() {
    try {
        const snapshot = await firebase.database().ref('stores').once('value');
        reportsData.stores = snapshot.val() || {};
        
        // Populate store select dropdown
        const storeSelect = document.getElementById('reportStoreSelect');
        storeSelect.innerHTML = '<option value="">-- Chọn cửa hàng --</option>';
        
        Object.entries(reportsData.stores).forEach(([storeId, store]) => {
            const option = document.createElement('option');
            option.value = storeId;
            option.textContent = store.name;
            storeSelect.appendChild(option);
        });
        
        console.log('🏪 Stores loaded:', Object.keys(reportsData.stores).length);
        
    } catch (error) {
        console.error('Error loading stores:', error);
        reportsData.stores = {};
    }
}

// Load orders from all stores
async function loadAllOrders() {
    try {
        reportsData.orders = {};
        
        // Load from both old and new paths for backward compatibility
        for (const storeId of Object.keys(reportsData.stores)) {
            try {
                // Try new path first
                let snapshot = await firebase.database().ref(`stores/${storeId}/orders`).once('value');
                let storeOrders = snapshot.val() || {};
                
                // If no data in new path, try old path
                if (Object.keys(storeOrders).length === 0) {
                    snapshot = await firebase.database().ref(`store_orders/${storeId}`).once('value');
                    storeOrders = snapshot.val() || {};
                }
                
                // Add store info to each order and filter by date range
                Object.entries(storeOrders).forEach(([orderId, order]) => {
                    // Check if order is within date range
                    const orderDate = order.date || order.orderDate || order.createdAt || order.timestamp;
                    
                    let shouldIncludeOrder = true;
                    
                    // If date range is set, check if order is within range
                    if (dateRange.start && dateRange.end && orderDate) {
                        let orderDateObj;
                        
                        // Handle different date formats
                        if (orderDate.includes('/')) {
                            // Format: "2/8/2025" -> convert to "2025-08-02"
                            const parts = orderDate.split('/');
                            const day = parts[0].padStart(2, '0');
                            const month = parts[1].padStart(2, '0');
                            const year = parts[2];
                            orderDateObj = new Date(`${year}-${month}-${day}`);
                        } else {
                            orderDateObj = new Date(orderDate);
                            // If it's still invalid, try to parse as YYYY-MM-DD format
                            if (isNaN(orderDateObj.getTime())) {
                                if (orderDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                                    orderDateObj = new Date(orderDate + 'T00:00:00');
                                }
                            }
                        }
                        
                        // Check if order is within the date range
                        if (isNaN(orderDateObj.getTime()) || orderDateObj < dateRange.start || orderDateObj > dateRange.end) {
                            shouldIncludeOrder = false;
                        }
                    }
                    
                    // Add order if it should be included
                    if (shouldIncludeOrder) {
                        reportsData.orders[`${storeId}_${orderId}`] = {
                            ...order,
                            storeId: storeId,
                            storeName: reportsData.stores[storeId]?.name || 'Unknown'
                        };
                    }
                });
                
                console.log(`📦 Orders loaded for store ${storeId}:`, Object.keys(storeOrders).length);
                
            } catch (error) {
                console.error(`Error loading orders for store ${storeId}:`, error);
            }
        }
        
        console.log('📦 Total orders loaded:', Object.keys(reportsData.orders).length);
        
    } catch (error) {
        console.error('Error loading all orders:', error);
        reportsData.orders = {};
    }
}

// Load products
async function loadProducts() {
    try {
        const snapshot = await firebase.database().ref('products').once('value');
        reportsData.products = snapshot.val() || {};
        
        console.log('📦 Products loaded:', Object.keys(reportsData.products).length);
        
    } catch (error) {
        console.error('Error loading products:', error);
        reportsData.products = {};
    }
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
    
    console.log('📅 Date filter applied:', dateRange);
    
    showNotification('Khoảng thời gian đã được áp dụng!', 'success');
}

// Generate report based on current settings
function generateReport() {
    console.log('📊 Generating report...', {
        type: currentReportType,
        storeId: selectedStoreId,
        dateRange: dateRange
    });
    
    try {
        showLoading(true);
        
        // Filter orders by date range and store (if applicable)
        const filteredOrders = filterOrders();
        
        // Generate summary statistics
        generateSummaryStats(filteredOrders);
        
        // Generate top products
        generateTopProducts(filteredOrders);
        
        // Generate store performance (for global report)
        if (currentReportType === 'global') {
            generateStorePerformance(filteredOrders);
        }
        
        // Generate daily sales chart
        generateDailySalesChart(filteredOrders);
        
        // Generate time period analysis
        generateTimePeriodAnalysis(filteredOrders);
        
        // Generate customer analysis
        generateCustomerAnalysis(filteredOrders);
        
        // Generate inventory analysis
        generateInventoryAnalysis(filteredOrders);
        
        console.log('✅ Report generated successfully');
        showNotification('Báo cáo đã được tạo thành công!', 'success');
        
    } catch (error) {
        console.error('❌ Error generating report:', error);
        showNotification('Lỗi tạo báo cáo!', 'error');
    } finally {
        showLoading(false);
    }
}

// Filter orders by date range and store
function filterOrders() {
    const filtered = {};
    
    Object.entries(reportsData.orders).forEach(([orderId, order]) => {
        // Check date range
        const orderDate = new Date(order.createdAt || order.orderDate);
        if (orderDate < dateRange.start || orderDate > dateRange.end) {
            return;
        }
        
        // Check store filter (for store-specific report)
        if (currentReportType === 'store' && selectedStoreId && order.storeId !== selectedStoreId) {
            return;
        }
        
        filtered[orderId] = order;
    });
    
    console.log('🔍 Filtered orders:', Object.keys(filtered).length);
    return filtered;
}

// Generate summary statistics
function generateSummaryStats(orders) {
    const stats = {
        totalOrders: Object.keys(orders).length,
        totalRevenue: 0,
        averageOrder: 0,
        totalStores: currentReportType === 'global' ? Object.keys(reportsData.stores).length : 1
    };
    
    // Calculate total revenue
    Object.values(orders).forEach(order => {
        stats.totalRevenue += parseFloat(order.total || 0);
    });
    
    // Calculate average order value
    if (stats.totalOrders > 0) {
        stats.averageOrder = stats.totalRevenue / stats.totalOrders;
    }
    
    // Update UI
    document.getElementById('totalOrders').textContent = stats.totalOrders.toLocaleString();
    document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('averageOrder').textContent = formatCurrency(stats.averageOrder);
    document.getElementById('totalStores').textContent = stats.totalStores.toLocaleString();
    
    console.log('📈 Summary stats:', stats);
}

// Generate top products
function generateTopProducts(orders) {
    const productStats = {};
    
    // Aggregate product sales
    Object.values(orders).forEach(order => {
        // Handle both old and new order structures
        if (order.items && typeof order.items === 'object') {
            // New structure: order has items object
            Object.entries(order.items).forEach(([productId, item]) => {
                const productName = item.name || reportsData.products[productId]?.name || 'Sản phẩm không xác định';
                const sku = item.sku || reportsData.products[productId]?.sku || 'N/A';
                const quantity = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.price || 0);
                const revenue = quantity * unitPrice;
                
                if (!productStats[productId]) {
                    productStats[productId] = {
                        name: productName,
                        sku: sku,
                        totalQuantity: 0,
                        totalRevenue: 0
                    };
                }
                
                productStats[productId].totalQuantity += quantity;
                productStats[productId].totalRevenue += revenue;
            });
        } else {
            // Old structure: order has direct product fields
            const productId = order.productId;
            const productName = order.productName || reportsData.products[productId]?.name || 'Sản phẩm không xác định';
            const sku = order.sku || reportsData.products[productId]?.sku || 'N/A';
            const quantity = parseFloat(order.quantity || 0);
            const revenue = parseFloat(order.total || 0);
            
            if (productId && !productStats[productId]) {
                productStats[productId] = {
                    name: productName,
                    sku: sku,
                    totalQuantity: 0,
                    totalRevenue: 0
                };
            }
            
            if (productId) {
                productStats[productId].totalQuantity += quantity;
                productStats[productId].totalRevenue += revenue;
            }
        }
    });
    
    // Sort by revenue and get top 10
    const topProducts = Object.entries(productStats)
        .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
        .slice(0, 10);
    
    // Update UI
    const tbody = document.getElementById('topProductsTable');
    if (topProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-chart-bar"></i>
                        <p>Chưa có dữ liệu sản phẩm</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = topProducts.map(([productId, stats], index) => `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${stats.name}</td>
                <td>${stats.sku}</td>
                <td class="text-center">${stats.totalQuantity.toLocaleString()} kg</td>
                <td class="text-right">${formatCurrency(stats.totalRevenue)}</td>
            </tr>
        `).join('');
    }
    
    console.log('🏆 Top products generated:', topProducts.length);
}

// Generate store performance (for global report)
function generateStorePerformance(orders) {
    if (currentReportType !== 'global') return;
    
    const storeStats = {};
    
    // Initialize all stores
    Object.entries(reportsData.stores).forEach(([storeId, store]) => {
        storeStats[storeId] = {
            name: store.name,
            totalOrders: 0,
            totalRevenue: 0,
            averageOrder: 0
        };
    });
    
    // Aggregate store performance
    Object.values(orders).forEach(order => {
        const storeId = order.storeId;
        if (storeStats[storeId]) {
            storeStats[storeId].totalOrders++;
            storeStats[storeId].totalRevenue += parseFloat(order.total || 0);
        }
    });
    
    // Calculate average order values
    Object.values(storeStats).forEach(stats => {
        if (stats.totalOrders > 0) {
            stats.averageOrder = stats.totalRevenue / stats.totalOrders;
        }
    });
    
    // Sort by revenue
    const sortedStores = Object.entries(storeStats)
        .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue);
    
    // Update UI
    const tbody = document.getElementById('storePerformanceTable');
    if (sortedStores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-store"></i>
                        <p>Chưa có dữ liệu cửa hàng</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = sortedStores.map(([storeId, stats], index) => `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${stats.name}</td>
                <td class="text-center">${stats.totalOrders.toLocaleString()}</td>
                <td class="text-right">${formatCurrency(stats.totalRevenue)}</td>
                <td class="text-right">${formatCurrency(stats.averageOrder)}</td>
            </tr>
        `).join('');
    }
    
    console.log('🏪 Store performance generated:', sortedStores.length);
}

// Generate daily sales chart (simplified text version)
function generateDailySalesChart(orders) {
    const dailyStats = {};
    
    // Aggregate daily sales
    Object.values(orders).forEach(order => {
        // Try multiple date field names
        const dateValue = order.date || order.createdAt || order.orderDate || order.timestamp;
        if (!dateValue) return;
        
        // Parse date with multiple formats
        let orderDate;
        if (typeof dateValue === 'string' && dateValue.includes('/')) {
            // Handle DD/MM/YYYY format
            const [day, month, year] = dateValue.split('/');
            orderDate = new Date(year, month - 1, day);
        } else {
            orderDate = new Date(dateValue);
        }
        
        if (isNaN(orderDate.getTime())) return;
        
        const dateKey = orderDate.toISOString().split('T')[0];
        
        if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = {
                orders: 0,
                revenue: 0
            };
        }
        
        dailyStats[dateKey].orders++;
        dailyStats[dateKey].revenue += parseFloat(order.total || 0);
    });
    
    // Sort by date
    const sortedDays = Object.entries(dailyStats)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]));
    
    // Update chart (simplified version)
    const chartContainer = document.getElementById('dailySalesChart');
    if (sortedDays.length === 0) {
        chartContainer.innerHTML = `
            <div class="chart-empty">
                <i class="fas fa-chart-line"></i>
                <p>Chưa có dữ liệu để hiển thị biểu đồ</p>
                <small>Chọn khoảng thời gian có đơn hàng</small>
            </div>
        `;
    } else {
        // Create simple text-based chart
        const maxRevenue = Math.max(...sortedDays.map(([_, stats]) => stats.revenue));
        
        chartContainer.innerHTML = `
            <div class="chart-data">
                <h4>Doanh thu theo ngày (${sortedDays.length} ngày)</h4>
                <div class="chart-bars">
                    ${sortedDays.slice(-7).map(([date, stats]) => {
                        const percentage = maxRevenue > 0 ? (stats.revenue / maxRevenue) * 100 : 0;
                        return `
                            <div class="chart-bar-item">
                                <div class="chart-bar" style="height: ${Math.max(percentage, 5)}%"></div>
                                <div class="chart-label">
                                    <small>${new Date(date).toLocaleDateString('vi-VN')}</small>
                                    <strong>${formatCurrency(stats.revenue)}</strong>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    console.log('📊 Daily sales chart generated:', sortedDays.length, 'days');
}

// Format currency
function formatCurrency(amount) {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(numAmount) + 'đ';
}

// Show loading state
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles if not exists
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }
            .toast-success { background: #4caf50; }
            .toast-error { background: #f44336; }
            .toast-warning { background: #ff9800; }
            .toast-info { background: #2196f3; }
            .toast-content { display: flex; align-items: center; gap: 8px; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}



// Generate Store Bill (Single Store)
function generateStoreBill(startDate, endDate, storeId) {
    console.log('🏪 Generating store bill for:', storeId);
    console.log('📋 Available stores:', Object.keys(reportsData.stores));
    console.log('📋 Available orders:', Object.keys(reportsData.orders));
    
    const store = reportsData.stores[storeId];
    let storeOrders = {};
    const productSummary = {};
    let totalRevenue = 0;
    let totalOrders = 0;
    
    console.log('🏪 Store data:', store);
    
    // Check if orders are structured by store or flat
    const isStoreStructured = Object.keys(reportsData.orders).some(key => 
        typeof reportsData.orders[key] === 'object' && 
        !reportsData.orders[key].hasOwnProperty('date')
    );
    
    console.log('📋 Is store structured:', isStoreStructured);
    
    if (isStoreStructured) {
        // New structure: orders[storeId][orderId]
        storeOrders = reportsData.orders[storeId] || {};
    } else {
        // Old structure: orders[orderId] - filter by storeId
        Object.keys(reportsData.orders).forEach(orderId => {
            const order = reportsData.orders[orderId];
            if (order.storeId === storeId) {
                storeOrders[orderId] = order;
            }
        });
    }
    
    console.log('📋 Store orders found:', Object.keys(storeOrders).length);
    console.log('📋 Store orders data:', storeOrders);
    
    if (!store) {
        showNotification('Không tìm thấy thông tin cửa hàng!', 'error');
        return;
    }
    
    // Process store orders
    Object.keys(storeOrders).forEach(orderId => {
        const order = storeOrders[orderId];
        const orderDate = order.date;
        
        console.log(`📋 Processing order ${orderId}:`, {
            date: orderDate,
            total: order.total,
            itemsCount: order.items ? order.items.length : 0
        });
        
        // Check if order is in date range
        if (orderDate >= startDate && orderDate <= endDate) {
            totalOrders++;
            totalRevenue += parseFloat(order.total || 0);
            
            console.log(`✅ Order ${orderId} in date range - Total: ${order.total}`);
            
            // Process order items
            if (order.items && Array.isArray(order.items)) {
                console.log(`📦 Processing ${order.items.length} items for order ${orderId}:`, order.items);
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
    
    console.log('📊 Final bill summary:');
    console.log('- Total Orders:', totalOrders);
    console.log('- Total Revenue:', totalRevenue);
    console.log('- Products:', Object.keys(productSummary).length);
    console.log('- Product Summary:', productSummary);
    
    // Generate bill HTML
    const billHTML = generateBillHTML({
        type: 'store',
        storeName: store.name || `Cửa hàng ${storeId}`,
        startDate,
        endDate,
        productSummary,
        totalRevenue,
        totalOrders
    });
    
    displayBill(billHTML);
}

// Generate Bill HTML
function generateBillHTML(data) {
    const { type, storeName, startDate, endDate, productSummary, totalRevenue, totalOrders } = data;
    
    // Format dates
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    // Generate product rows
    let productRows = '';
    let itemCount = 0;
    
    Object.keys(productSummary).forEach(productName => {
        const item = productSummary[productName];
        itemCount++;
        
        productRows += `
            <tr>
                <td class="text-center">${itemCount}</td>
                <td class="product-name">${productName}</td>
                <td class="text-center quantity">${formatNumber(item.quantity)} kg</td>
                <td class="text-right price">${formatCurrency(item.price)}</td>
                <td class="text-right total-price">${formatCurrency(item.total)}</td>
            </tr>
        `;
    });
    
    // Generate bill HTML
    const billHTML = `
        <div class="bill-header">
            <h2>🧾 Bill Tổng Hợp</h2>
            <div class="store-name">${storeName}</div>
            <div class="date-range">Từ ${formattedStartDate} đến ${formattedEndDate}</div>
        </div>
        
        <div class="bill-info">
            <div class="bill-info-left">
                <div><strong>Loại báo cáo:</strong> ${type === 'global' ? 'Toàn cục' : 'Theo cửa hàng'}</div>
                <div><strong>Tổng đơn hàng:</strong> ${totalOrders} đơn</div>
            </div>
            <div class="bill-info-right">
                <div><strong>Ngày tạo:</strong> ${formatDate(new Date().toISOString().split('T')[0])}</div>
                <div><strong>Tổng sản phẩm:</strong> ${Object.keys(productSummary).length} loại</div>
            </div>
        </div>
        
        <table class="bill-table">
            <thead>
                <tr>
                    <th class="text-center">STT</th>
                    <th>Tên Sản Phẩm</th>
                    <th class="text-center">Số Lượng</th>
                    <th class="text-right">Đơn Giá</th>
                    <th class="text-right">Thành Tiền</th>
                </tr>
            </thead>
            <tbody>
                ${productRows}
                <tr class="summary-row">
                    <td colspan="4" class="text-right"><strong>TỔNG CỘNG:</strong></td>
                    <td class="text-right grand-total">${formatCurrency(totalRevenue)}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="bill-footer">
            <div class="thank-you">🙏 Cảm ơn quý khách!</div>
            <div class="contact-info">
                📞 Hotline: 0123-456-789 | 📧 Email: info@store.com<br>
                🏪 Hệ thống quản lý đơn hàng đa cửa hàng
            </div>
        </div>
    `;
    
    return billHTML;
}

// Display Bill
function displayBill(billHTML) {
    const billContent = document.getElementById('billContent');
    const printBtn = document.getElementById('printBillBtn');
    const billSection = document.getElementById('billSummarySection');
    
    if (billContent && printBtn && billSection) {
        billContent.innerHTML = billHTML;
        billContent.style.display = 'block';
        printBtn.style.display = 'inline-flex';
        billSection.classList.remove('hidden');
        
        console.log('✅ Bill displayed successfully');
        showNotification('Bill tổng hợp đã được tạo thành công!', 'success');
    }
}

// Print Bill
function printBill() {
    const billContent = document.getElementById('billContent');
    
    if (!billContent || billContent.style.display === 'none') {
        showNotification('Vui lòng tạo bill trước khi in!', 'error');
        return;
    }
    
    // Create print window
    const printWindow = window.open('', '_blank');
    const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bill Tổng Hợp</title>
            <link rel="stylesheet" href="../style/man.css">
            <link rel="stylesheet" href="../style/reports.css">
            <style>
                body { margin: 0; padding: 20px; }
                .bill-content { border: none; box-shadow: none; padding: 0; }
            </style>
        </head>
        <body>
            <div class="bill-content">
                ${billContent.innerHTML}
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for styles to load then print
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
    
    console.log('🖨️ Bill sent to printer');
    showNotification('Đã gửi bill đến máy in!', 'success');
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Helper function to format number
function formatNumber(number) {
    return parseFloat(number).toLocaleString('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// Create sample data if needed
async function createSampleDataIfNeeded() {
    try {
        console.log('🔍 Checking for existing data...');
        const snapshot = await firebase.database().ref().once('value');
        const data = snapshot.val();
        
        if (!data || Object.keys(data).length === 0) {
            console.log('📄 Database empty, creating sample data...');
            await createSampleData();
        } else {
            console.log('✅ Database already has data! Keeping existing data.');
        }
    } catch (error) {
        console.error('❌ Error checking database:', error);
    }
}

// ===== ENHANCED REPORT FUNCTIONS =====

// Generate Time Period Analysis
function generateTimePeriodAnalysis(orders) {
    console.log('📅 Generating time period analysis...');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const timeStats = {
        today: { orders: 0, revenue: 0 },
        week: { orders: 0, revenue: 0 },
        month: { orders: 0, revenue: 0 }
    };
    
    Object.values(orders).forEach(order => {
        const orderDate = parseOrderDate(order.date || order.createdAt || order.orderDate || order.timestamp);
        if (!orderDate) return;
        
        const revenue = parseFloat(order.total || 0);
        
        // Today
        if (orderDate >= today) {
            timeStats.today.orders++;
            timeStats.today.revenue += revenue;
        }
        
        // This week
        if (orderDate >= weekStart) {
            timeStats.week.orders++;
            timeStats.week.revenue += revenue;
        }
        
        // This month
        if (orderDate >= monthStart) {
            timeStats.month.orders++;
            timeStats.month.revenue += revenue;
        }
    });
    
    // Update UI
    document.getElementById('todayOrders').textContent = timeStats.today.orders.toLocaleString();
    document.getElementById('todayRevenue').textContent = formatCurrency(timeStats.today.revenue);
    document.getElementById('weekOrders').textContent = timeStats.week.orders.toLocaleString();
    document.getElementById('weekRevenue').textContent = formatCurrency(timeStats.week.revenue);
    document.getElementById('monthOrders').textContent = timeStats.month.orders.toLocaleString();
    document.getElementById('monthRevenue').textContent = formatCurrency(timeStats.month.revenue);
    
    console.log('📅 Time period analysis generated:', timeStats);
}

// Generate Customer Analysis
function generateCustomerAnalysis(orders) {
    console.log('👥 Generating customer analysis...');
    
    const customerData = {};
    let totalCustomers = 0;
    let newCustomers = 0;
    let returningCustomers = 0;
    let totalRevenue = 0;
    
    Object.values(orders).forEach(order => {
        const customerId = order.customerId || order.customerName || 'guest';
        const revenue = parseFloat(order.total || 0);
        totalRevenue += revenue;
        
        if (!customerData[customerId]) {
            customerData[customerId] = {
                orders: 0,
                revenue: 0,
                firstOrder: order.date || order.createdAt || order.orderDate
            };
            totalCustomers++;
        }
        
        customerData[customerId].orders++;
        customerData[customerId].revenue += revenue;
    });
    
    // Analyze new vs returning customers (simplified)
    Object.values(customerData).forEach(customer => {
        if (customer.orders === 1) {
            newCustomers++;
        } else {
            returningCustomers++;
        }
    });
    
    const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    
    // Update UI
    document.getElementById('newCustomers').textContent = newCustomers.toLocaleString();
    document.getElementById('returningCustomers').textContent = returningCustomers.toLocaleString();
    document.getElementById('avgCustomerValue').textContent = formatCurrency(avgCustomerValue);
    
    console.log('👥 Customer analysis generated:', {
        total: totalCustomers,
        new: newCustomers,
        returning: returningCustomers,
        avgValue: avgCustomerValue
    });
}

// Generate Inventory Analysis
function generateInventoryAnalysis(orders) {
    console.log('📦 Generating inventory analysis...');
    
    const productStats = {};
    
    // Aggregate product sales
    Object.values(orders).forEach(order => {
        // Handle both old and new order structures
        if (order.items && typeof order.items === 'object') {
            // New structure: order has items object
            Object.entries(order.items).forEach(([productId, item]) => {
                const productName = item.name || reportsData.products[productId]?.name || 'Sản phẩm không xác định';
                const sku = item.sku || reportsData.products[productId]?.sku || 'N/A';
                const quantity = parseFloat(item.quantity || 0);
                
                if (!productStats[productId]) {
                    productStats[productId] = {
                        name: productName,
                        sku: sku,
                        sold: 0,
                        stock: Math.floor(Math.random() * 1000) + 100, // Mock stock data
                        turnoverRate: 0,
                        status: 'normal',
                        statusText: 'Bình thường'
                    };
                }
                
                productStats[productId].sold += quantity;
            });
        } else {
            // Old structure: order has direct product fields
            const productId = order.productId;
            const productName = order.productName || reportsData.products[productId]?.name || 'Sản phẩm không xác định';
            const sku = order.sku || reportsData.products[productId]?.sku || 'N/A';
            const quantity = parseFloat(order.quantity || 0);
            
            if (productId && !productStats[productId]) {
                productStats[productId] = {
                    name: productName,
                    sku: sku,
                    sold: 0,
                    stock: Math.floor(Math.random() * 1000) + 100, // Mock stock data
                    turnoverRate: 0,
                    status: 'normal',
                    statusText: 'Bình thường'
                };
            }
            
            if (productId) {
                productStats[productId].sold += quantity;
            }
        }
    });
    
    // Calculate turnover rates and status
    Object.keys(productStats).forEach(productId => {
        const product = productStats[productId];
        const totalInventory = product.stock + product.sold;
        product.turnoverRate = totalInventory > 0 ? (product.sold / totalInventory * 100) : 0;
        
        // Determine status
        if (product.stock < 10) {
            product.status = 'low';
            product.statusText = 'Sắp Hết';
        } else if (product.stock < 50) {
            product.status = 'medium';
            product.statusText = 'Trung Bình';
        } else {
            product.status = 'high';
            product.statusText = 'Tốt';
        }
    });
    
    // Sort by turnover rate
    const sortedProducts = Object.entries(productStats)
        .sort(([,a], [,b]) => b.turnoverRate - a.turnoverRate);
    
    // Update UI
    const tbody = document.getElementById('inventoryTable');
    if (sortedProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-boxes"></i>
                        <p>Chưa có dữ liệu tồn kho</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = sortedProducts.slice(0, 10).map(([productId, stats], index) => `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${stats.name}</td>
                <td>${stats.sku}</td>
                <td class="text-center">${stats.stock.toLocaleString()} kg</td>
                <td class="text-center">${stats.sold.toLocaleString()} kg</td>
                <td class="text-center">${stats.turnoverRate.toFixed(1)}%</td>
                <td class="text-center">
                    <span class="inventory-status ${stats.status}">${stats.statusText}</span>
                </td>
            </tr>
        `).join('');
    }
    
    console.log('📦 Inventory analysis generated:', sortedProducts.length, 'products');
}

// Initialize Export Functions
function initializeExportFunctions() {
    // Export PDF
    document.getElementById('exportPdfBtn')?.addEventListener('click', function() {
        exportToPDF();
    });
    
    // Export Excel
    document.getElementById('exportExcelBtn')?.addEventListener('click', function() {
        exportToExcel();
    });
    
    // Email Report
    document.getElementById('emailReportBtn')?.addEventListener('click', function() {
        emailReport();
    });
    
    // Print Report
    document.getElementById('printReportBtn')?.addEventListener('click', function() {
        printReport();
    });
    
    console.log('📤 Export functions initialized');
}

// Export to PDF (simplified)
function exportToPDF() {
    showNotification('Tính năng xuất PDF đang được phát triển...', 'info');
    console.log('📄 PDF export requested');
}

// Export to Excel (simplified)
function exportToExcel() {
    showNotification('Tính năng xuất Excel đang được phát triển...', 'info');
    console.log('📈 Excel export requested');
}

// Email Report (simplified)
function emailReport() {
    showNotification('Tính năng gửi email đang được phát triển...', 'info');
    console.log('📧 Email report requested');
}

// Print Report
function printReport() {
    window.print();
    console.log('🖨️ Print report requested');
}

// Helper function to parse order date
function parseOrderDate(dateValue) {
    if (!dateValue) return null;
    
    let orderDate;
    if (typeof dateValue === 'string' && dateValue.includes('/')) {
        // Handle DD/MM/YYYY format
        const [day, month, year] = dateValue.split('/');
        orderDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    } else {
        orderDate = new Date(dateValue);
    }
    
    return isNaN(orderDate.getTime()) ? null : orderDate;
}

// Create sample data
async function createSampleData() {
    try {
        const database = firebase.database();
        
        // Sample stores
        const stores = {
            'store1': {
                name: 'Cửa Hàng Trung Tâm',
                address: '123 Đường ABC, Quận 1, TP.HCM',
                phone: '0901234567'
            },
            'store2': {
                name: 'Cửa Hàng Chi Nhánh',
                address: '456 Đường XYZ, Quận 2, TP.HCM', 
                phone: '0907654321'
            }
        };
        
        // Sample products
        const products = {
            'prod1': {
                name: 'Sản phẩm A',
                price: 100000,
                category: 'Electronics'
            },
            'prod2': {
                name: 'Sản phẩm B',
                price: 200000,
                category: 'Fashion'
            },
            'prod3': {
                name: 'Sản phẩm C',
                price: 150000,
                category: 'Home'
            }
        };
        
        // Sample orders for the last 30 days (including today: 02/08/2025)
        const orders = {};
        const today = new Date(2025, 7, 2); // August 2, 2025 (month is 0-indexed)
        
        for (let i = 0; i < 30; i++) {
            const orderDate = new Date(today);
            orderDate.setDate(today.getDate() - i);
            const dateStr = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;
            
            // Create 2-5 orders per day
            const ordersPerDay = Math.floor(Math.random() * 4) + 2;
            
            for (let j = 0; j < ordersPerDay; j++) {
                const orderId = `order_${i}_${j}`;
                const storeId = Math.random() > 0.5 ? 'store1' : 'store2';
                const productId = ['prod1', 'prod2', 'prod3'][Math.floor(Math.random() * 3)];
                const quantity = Math.floor(Math.random() * 5) + 1;
                const price = products[productId].price;
                
                orders[`${storeId}_${orderId}`] = {
                    id: orderId,
                    date: dateStr,
                    storeId: storeId,
                    items: {
                        [productId]: {
                            name: products[productId].name,
                            price: price,
                            quantity: quantity
                        }
                    },
                    total: price * quantity,
                    status: 'completed'
                };
                
                // Also add to store-specific orders
                await database.ref(`stores/${storeId}/orders/${orderId}`).set({
                    id: orderId,
                    date: dateStr,
                    items: {
                        [productId]: {
                            name: products[productId].name,
                            price: price,
                            quantity: quantity
                        }
                    },
                    total: price * quantity,
                    status: 'completed'
                });
            }
        }
        
        // Save to Firebase
        await database.ref('stores').set(stores);
        await database.ref('products').set(products);
        
        console.log('✅ Sample data created successfully!');
        console.log(`📊 Created ${Object.keys(stores).length} stores`);
        console.log(`📦 Created ${Object.keys(products).length} products`);
        console.log(`🛒 Created ${Object.keys(orders).length} orders`);
        
    } catch (error) {
        console.error('❌ Error creating sample data:', error);
    }
}
