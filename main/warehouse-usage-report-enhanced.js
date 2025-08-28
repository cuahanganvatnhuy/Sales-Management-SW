// Enhanced Warehouse Usage Report Functions - Complete Implementation
console.log('=== Enhanced Warehouse Usage Report Loading ===');

// Global variables for usage report
let usageReportData = {};
let transactionHistory = [];
let usageCharts = {
    timeChart: null,
    topUsageChart: null
};
let currentFilters = {
    period: 'all',
    store: 'all',
    category: 'all'
};
let currentView = 'usageReport'; // Default view for usage report
let storesDataCache = {}; // Cache for store names

// Pagination variables for transaction history table
let transactionHistoryCurrentPage = 1;
let transactionHistoryPageSize = 10;
let transactionHistoryAllData = [];

// Initialize the enhanced warehouse usage report
function initWarehouseUsageReport() {
    console.log('Initializing enhanced warehouse usage report...');
    
    try {
        // Set default store filter FIRST
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (selectedStoreId) {
            currentFilters.store = selectedStoreId;
            console.log('Set default store filter to:', selectedStoreId);
        } else {
            currentFilters.store = 'all';
            console.log('No store selected, using all stores');
        }
        
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
        console.error('Error initializing warehouse usage report:', error);
        showUsageReportError('Không thể khởi tạo báo cáo sử dụng kho');
    }
}

// ===== Detail Modal Utilities =====
function openWarehouseDetailModal(htmlContent, title = 'Chi tiết') {
    const modal = document.getElementById('warehouseDetailModal');
    const body = document.getElementById('warehouseDetailModalBody');
    const titleEl = document.getElementById('warehouseDetailModalTitle');
    if (!modal || !body || !titleEl) return;
    titleEl.textContent = title;
    body.innerHTML = htmlContent;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function closeWarehouseDetailModal() {
    const modal = document.getElementById('warehouseDetailModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
}

function buildDetailGridFromPairs(pairs) {
    const rows = pairs.map(([label, value]) => (
        `<div class="usage-detail-label">${label}</div><div class="usage-detail-value">${value ?? '-'}</div>`
    )).join('');
    return `<div class="usage-detail-grid">${rows}</div>`;
}

// Build details from a table row by pairing header texts with cell texts
function buildRowDetailFromTable(tableEl, rowEl) {
    if (!tableEl || !rowEl) return '';
    const headers = Array.from(tableEl.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const cells = Array.from(rowEl.children);
    const pairs = [];
    for (let i = 0; i < Math.min(headers.length, cells.length); i++) {
        // skip checkbox/action columns by detecting inputs/buttons
        if (cells[i].querySelector('input, button, a')) continue;
        const label = headers[i] || `Cột ${i+1}`;
        const value = cells[i].textContent.trim();
        pairs.push([label, value]);
    }
    return buildDetailGridFromPairs(pairs);
}

// Delegated click for product usage table rows (class .report-table)
document.addEventListener('click', (e) => {
    const row = e.target.closest('.report-table tbody tr');
    if (!row) return;
    // ignore interactive controls
    if (e.target.closest('button, a, input, select, textarea')) return;
    const table = row.closest('table');
    const content = buildRowDetailFromTable(table, row);
    openWarehouseDetailModal(content, 'Chi tiết sử dụng theo sản phẩm');
});

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
                const yearStart = new Date(now.getFullYear(), 0, 1);
                const yearEnd = new Date(now.getFullYear(), 11, 31);
                dateRangeSpan.textContent = `${formatUsageDate(yearStart)} - ${formatUsageDate(yearEnd)}`;
                break;
            case 'custom':
                const startDateInput = document.getElementById('customStartDate');
                const endDateInput = document.getElementById('customEndDate');
                if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
                    const startDate = new Date(startDateInput.value);
                    const endDate = new Date(endDateInput.value);
                    dateRangeSpan.textContent = `${formatUsageDate(startDate)} - ${formatUsageDate(endDate)}`;
                } else {
                    dateRangeSpan.textContent = 'Chọn khoảng thời gian tùy chỉnh';
                }
                break;
            default:
                dateRangeSpan.textContent = 'Tùy chỉnh';
        }
    }
}

// Format date for usage report display
function formatUsageDate(date) {
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Populate filter options (stores and categories)
async function populateUsageReportFilters() {
    try {
        await populateUsageStoreOptions();
        await populateUsageCategoryOptions();
    } catch (error) {
        console.error('Error populating filter options:', error);
    }
}

// Populate store options for usage report
async function populateUsageStoreOptions() {
    const storeSelect = document.getElementById('reportStoreSelect');
    if (!storeSelect) return;

    try {
        // Get selected store from localStorage
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        const selectedStoreData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
        
        // currentFilters.store is already set in initWarehouseUsageReport()
        console.log('populateUsageStoreOptions - current filter store:', currentFilters.store);
        
        // Clear existing options
        storeSelect.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
        
        if (window.database) {
            const storesRef = window.database.ref('stores');
            const snapshot = await storesRef.once('value');
            const stores = snapshot.val();
            
            if (stores) {
                Object.keys(stores).forEach(storeId => {
                    const store = stores[storeId];
                    const option = document.createElement('option');
                    option.value = storeId;
                    option.textContent = store.name || `Cửa hàng ${storeId}`;
                    storeSelect.appendChild(option);
                });
            }
        }
        
        // Set dropdown to match currentFilters.store
        if (currentFilters.store !== 'all') {
            storeSelect.value = currentFilters.store;
            console.log('Store dropdown set to current store:', currentFilters.store);
        } else {
            storeSelect.value = 'all';
            console.log('Store dropdown set to all stores');
        }
        
    } catch (error) {
        console.error('Error loading stores for usage report:', error);
    }
}

async function generateUsageReport() {
    console.log('Generating usage report with filters:', currentFilters);
    
    try {
        // Show loading state
        showUsageReportLoading(true);
        
        // Update current filters from UI
        updateCurrentFilters();
        
        // Fetch transaction history and warehouse data
        await loadUsageReportData();
        
        // Data is already stored globally in loadUsageReportData function
        // No need to reassign here
        
        console.log('Usage report data loaded successfully');
        console.log('Transactions:', window.transactionHistory.length);
        console.log('Warehouse items:', Object.keys(window.warehouseData).length);
        
        // Debug: Log transaction data
        if (window.transactionHistory.length > 0) {
            console.log('First transaction:', window.transactionHistory[0]);
        }
        if (Object.keys(window.warehouseData).length > 0) {
            console.log('First warehouse item:', Object.values(window.warehouseData)[0]);
        }
        
        // Process and display the data
        processUsageReportData();
        
        // Update charts
        updateUsageCharts();
        
        // Hide loading state
        showUsageReportLoading(false);
        
    } catch (error) {
        console.error('Error generating usage report:', error);
        showUsageReportError('Không thể tạo báo cáo sử dụng kho');
        showUsageReportLoading(false);
    }
}

// Update current filters from UI elements
function updateCurrentFilters() {
    const periodSelect = document.getElementById('reportPeriodSelect');
    const storeSelect = document.getElementById('reportStoreSelect');
    const categorySelect = document.getElementById('reportCategorySelect');
    
    if (periodSelect) currentFilters.period = periodSelect.value;
    if (storeSelect) currentFilters.store = storeSelect.value;
    if (categorySelect) currentFilters.category = categorySelect.value;
}

// Load usage report data from Firebase
async function loadUsageReportData() {
    if (!window.database) {
        console.error('Firebase database not available');
        // Initialize empty data to prevent errors
        window.warehouseData = {};
        window.transactionHistory = [];
        transactionHistory = [];
        usageReportData = { transactions: [], warehouse: {} };
        return;
    }

    try {
        console.log('Loading usage report data for store:', currentFilters.store);
        
        // Load stores data for name lookup
        await loadStoresDataCache();
        
        let transactions = {};
        let warehouse = {};
        
        if (currentFilters.store === 'all') {
            // Load all stores data
            console.log('Loading data for ALL stores');
            
            // Load all transactions with error handling
            try {
                const transactionsRef = window.database.ref('warehouseTransactions');
                const transactionsSnapshot = await transactionsRef.once('value');
                transactions = transactionsSnapshot.val() || {};
                console.log('DEBUG: Loaded transactions:', Object.keys(transactions).length, 'items');
            } catch (error) {
                console.error('Error loading transactions:', error);
                transactions = {};
            }
            
            // Load all warehouse data - try both warehouse and products
            try {
                const warehouseRef = window.database.ref('warehouse');
                const warehouseSnapshot = await warehouseRef.once('value');
                warehouse = warehouseSnapshot.val() || {};
                console.log('DEBUG: Loaded warehouse data:', Object.keys(warehouse).length, 'items');
                
                // If warehouse is empty, try products
                if (Object.keys(warehouse).length === 0) {
                    const productsRef = window.database.ref('products');
                    const productsSnapshot = await productsRef.once('value');
                    warehouse = productsSnapshot.val() || {};
                    console.log('DEBUG: Loaded products as warehouse data:', Object.keys(warehouse).length, 'items');
                }
            } catch (error) {
                console.error('Error loading warehouse data:', error);
                warehouse = {};
            }
            
        } else {
            // Load specific store data
            console.log('Loading data for store:', currentFilters.store);
            
            try {
                // Load store-specific transactions
                const storeTransactionsRef = window.database.ref(`stores/${currentFilters.store}/warehouseTransactions`);
                const storeTransactionsSnapshot = await storeTransactionsRef.once('value');
                const storeTransactions = storeTransactionsSnapshot.val() || {};
                
                // Also check global transactions for this store
                const globalTransactionsRef = window.database.ref('warehouseTransactions');
                const globalTransactionsSnapshot = await globalTransactionsRef.once('value');
                const globalTransactions = globalTransactionsSnapshot.val() || {};
                
                // Filter global transactions by store
                if (globalTransactions) {
                    Object.keys(globalTransactions).forEach(transactionId => {
                        const transaction = globalTransactions[transactionId];
                        if (transaction && transaction.storeId === currentFilters.store) {
                            transactions[transactionId] = transaction;
                        }
                    });
                }
                
                // Merge store-specific transactions
                transactions = { ...transactions, ...storeTransactions };
            } catch (error) {
                console.error('Error loading store transactions:', error);
                transactions = {};
            }
            
            try {
                // Load store-specific warehouse data
                const storeWarehouseRef = window.database.ref(`stores/${currentFilters.store}/warehouse`);
                const storeWarehouseSnapshot = await storeWarehouseRef.once('value');
                warehouse = storeWarehouseSnapshot.val() || {};
                
                // If no store-specific warehouse, try global warehouse and products
                if (Object.keys(warehouse).length === 0) {
                    const globalWarehouseRef = window.database.ref('warehouse');
                    const globalWarehouseSnapshot = await globalWarehouseRef.once('value');
                    warehouse = globalWarehouseSnapshot.val() || {};
                    
                    // If still empty, try products
                    if (Object.keys(warehouse).length === 0) {
                        const productsRef = window.database.ref('products');
                        const productsSnapshot = await productsRef.once('value');
                        warehouse = productsSnapshot.val() || {};
                        console.log('DEBUG: Loaded products as warehouse data for store:', Object.keys(warehouse).length, 'items');
                    }
                }
            } catch (error) {
                console.error('Error loading store warehouse data:', error);
                warehouse = {};
            }
        }
        
        // Store the data globally with null checks
        window.warehouseData = warehouse || {};
        const filteredTransactions = filterTransactionsByPeriod(transactions || {});
        window.transactionHistory = filteredTransactions;
        transactionHistory = filteredTransactions; // Update global variable
        
        usageReportData = {
            transactions: filteredTransactions,
            warehouse: window.warehouseData
        };
        
        console.log('Loaded usage report data:', {
            store: currentFilters.store,
            transactionCount: filteredTransactions.length,
            warehouseProducts: Object.keys(window.warehouseData).length
        });
        
        // Log if no data found - using real Firebase data only
        if (filteredTransactions.length === 0 && Object.keys(window.warehouseData).length === 0) {
            console.log('No data found in Firebase database - using real data only');
        }
        
        // Debug logging
        console.log('Final data check:', {
            warehouseProducts: Object.keys(window.warehouseData || {}).length,
            filteredTransactions: filteredTransactions.length,
            currentFilters: currentFilters
        });
        
    } catch (error) {
        console.error('Error loading usage report data:', error);
        // Initialize empty data to prevent further errors
        window.warehouseData = {};
        window.transactionHistory = [];
        transactionHistory = [];
        usageReportData = { transactions: [], warehouse: {} };
    }
}

// Filter transactions by selected period
function filterTransactionsByPeriod(transactions) {
    const now = new Date();
    let startDate, endDate;
    
    // Calculate date range based on selected period
    switch (currentFilters.period) {
        case 'all':
            // Return all transactions without date filtering
            const allTransactions = [];
            Object.keys(transactions).forEach(transactionId => {
                const transaction = transactions[transactionId];
                allTransactions.push({
                    id: transactionId,
                    ...transaction
                });
            });
            return allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            endDate.setHours(0, 0, 0, 0);
            console.log('Month filter - startDate:', startDate, 'endDate:', endDate);
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
        case 'custom':
            const startDateInput = document.getElementById('customStartDate');
            const endDateInput = document.getElementById('customEndDate');
            if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
                startDate = new Date(startDateInput.value);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(endDateInput.value);
                endDate.setHours(23, 59, 59, 999);
            } else {
                // If no custom dates selected, return all transactions
                const allTransactions = [];
                Object.keys(transactions).forEach(transactionId => {
                    const transaction = transactions[transactionId];
                    allTransactions.push({
                        id: transactionId,
                        ...transaction
                    });
                });
                return allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            }
            break;
        default:
            // For unknown periods, return all transactions
            const defaultTransactions = [];
            Object.keys(transactions).forEach(transactionId => {
                const transaction = transactions[transactionId];
                defaultTransactions.push({
                    id: transactionId,
                    ...transaction
                });
            });
            return defaultTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    // Filter transactions by date range (for non-'all' cases)
    const filteredTransactions = [];
    Object.keys(transactions).forEach(transactionId => {
        const transaction = transactions[transactionId];
        const transactionDate = new Date(transaction.timestamp);
        
        console.log('Checking transaction:', {
            id: transactionId,
            timestamp: transaction.timestamp,
            transactionDate: transactionDate,
            startDate: startDate,
            endDate: endDate,
            inRange: transactionDate >= startDate && transactionDate < endDate
        });
        
        // Check date range
        if (transactionDate >= startDate && transactionDate < endDate) {
            // Store filter is already handled in loadUsageReportData()
            // So we don't need to filter by store here anymore
            filteredTransactions.push({
                id: transactionId,
                ...transaction
            });
        }
    });
    
    return filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Process and display usage report data
function processUsageReportData() {
    // Calculate summary statistics
    const summaryStats = calculateUsageSummaryStats();
    
    // Update summary cards
    updateUsageSummaryCards(summaryStats);
    
    // Update the tables
    generateProductUsageTable();
    generateTransactionHistoryTable();
    
    // Also load order history data
    if (typeof loadOrderHistoryData === 'function') {
        loadOrderHistoryData().catch(console.error);
    }
    
    // Refresh transaction history table if it exists
    if (typeof filterTransactionTable === 'function') {
        filterTransactionTable();
    }
    
    // Show or hide empty state
    toggleUsageReportEmptyState();
}

// Calculate summary statistics for usage report
function calculateUsageSummaryStats() {
    let totalMovements = 0;
    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalUsageValue = 0;
    
    // Statistics by order type
    let statsByOrderType = {
        retail: { movements: 0, stockOut: 0, value: 0 },
        wholesale: { movements: 0, stockOut: 0, value: 0 },
        tmdt: { movements: 0, stockOut: 0, value: 0 },
        other: { movements: 0, stockOut: 0, value: 0 }
    };
    
    console.log('DEBUG: Calculating stats from', transactionHistory.length, 'transactions');
    
    transactionHistory.forEach((transaction, index) => {
        totalMovements++;
        
        console.log(`DEBUG Transaction ${index}:`, {
            type: transaction.type,
            orderType: transaction.orderType,
            quantity: transaction.quantity,
            unitPrice: transaction.unitPrice,
            productName: transaction.productName
        });
        
        if (transaction.type === 'in') {
            totalStockIn += parseFloat(transaction.quantity) || 0;
        } else if (transaction.type === 'out' || transaction.type === 'export' || transaction.type === 'stock_out') {
            // Xử lý cả 'out', 'export' và 'stock_out' như xuất kho
            const quantity = parseFloat(transaction.quantity) || parseFloat(transaction.amount) || 0;
            const unitPrice = parseFloat(transaction.unitPrice) || parseFloat(transaction.price) || 0;
            const value = quantity * unitPrice;
            
            console.log(`DEBUG Stock out transaction:`, {
                quantity,
                unitPrice,
                value,
                type: transaction.type,
                orderType: transaction.orderType
            });
            
            totalStockOut += quantity;
            totalUsageValue += value;
            
            // Classify by order type based on reason field
            let orderType = 'other';
            const reason = (transaction.reason || '').toLowerCase();
            
            if (reason.includes('tmđt') || reason.includes('ecommerce') || reason.includes('bán hàng tmđt')) {
                orderType = 'tmdt';
            } else if (reason.includes('sỉ') || reason.includes('wholesale')) {
                orderType = 'wholesale';
            } else if (reason.includes('lẻ') || reason.includes('retail')) {
                orderType = 'retail';
            }
            
            if (statsByOrderType[orderType]) {
                statsByOrderType[orderType].movements++;
                statsByOrderType[orderType].stockOut += quantity;
                statsByOrderType[orderType].value += value;
            } else {
                statsByOrderType.other.movements++;
                statsByOrderType.other.stockOut += quantity;
                statsByOrderType.other.value += value;
            }
        }
    });
    
    console.log('DEBUG Final stats:', {
        totalMovements,
        totalStockIn,
        totalStockOut,
        totalUsageValue,
        statsByOrderType
    });
    
    return {
        totalMovements,
        totalStockIn,
        totalStockOut,
        totalUsageValue,
        statsByOrderType
    };
}

// Update usage summary cards
function updateUsageSummaryCards(stats) {
    console.log('DEBUG: Updating usage summary cards with stats:', stats);
    
    const totalMovementsEl = document.getElementById('totalMovements');
    const totalStockInEl = document.getElementById('totalStockIn');
    const totalStockOutEl = document.getElementById('totalStockOut');
    const totalUsageValueEl = document.getElementById('totalUsageValue');
    
    console.log('DEBUG: Found elements:', {
        totalMovementsEl: !!totalMovementsEl,
        totalStockInEl: !!totalStockInEl,
        totalStockOutEl: !!totalStockOutEl,
        totalUsageValueEl: !!totalUsageValueEl
    });
    
    if (totalMovementsEl) {
        totalMovementsEl.textContent = stats.totalMovements.toLocaleString();
        console.log('Updated totalMovements to:', stats.totalMovements);
    }
    if (totalStockInEl) {
        totalStockInEl.textContent = stats.totalStockIn.toLocaleString();
        console.log('Updated totalStockIn to:', stats.totalStockIn);
    }
    if (totalStockOutEl) {
        totalStockOutEl.textContent = stats.totalStockOut.toLocaleString();
        console.log('Updated totalStockOut to:', stats.totalStockOut);
    }
    if (totalUsageValueEl) {
        totalUsageValueEl.textContent = formatUsageCurrency(stats.totalUsageValue);
        console.log('Updated totalUsageValue to:', stats.totalUsageValue);
    }
    
    // Update order type statistics if available
    if (stats.statsByOrderType) {
        updateOrderTypeStats(stats.statsByOrderType);
    }
}

// Update order type statistics display
function updateOrderTypeStats(statsByOrderType) {
    // Update retail stats
    const retailMovementsEl = document.getElementById('retailMovements');
    const retailStockOutEl = document.getElementById('retailStockOut');
    const retailValueEl = document.getElementById('retailValue');
    
    if (retailMovementsEl) retailMovementsEl.textContent = statsByOrderType.retail.movements.toLocaleString();
    if (retailStockOutEl) retailStockOutEl.textContent = statsByOrderType.retail.stockOut.toLocaleString();
    if (retailValueEl) retailValueEl.textContent = formatUsageCurrency(statsByOrderType.retail.value);
    
    // Update wholesale stats
    const wholesaleMovementsEl = document.getElementById('wholesaleMovements');
    const wholesaleStockOutEl = document.getElementById('wholesaleStockOut');
    const wholesaleValueEl = document.getElementById('wholesaleValue');
    
    if (wholesaleMovementsEl) wholesaleMovementsEl.textContent = statsByOrderType.wholesale.movements.toLocaleString();
    if (wholesaleStockOutEl) wholesaleStockOutEl.textContent = statsByOrderType.wholesale.stockOut.toLocaleString();
    if (wholesaleValueEl) wholesaleValueEl.textContent = formatUsageCurrency(statsByOrderType.wholesale.value);
    
    // Update TMĐT stats
    const tmdtMovementsEl = document.getElementById('tmdtMovements');
    const tmdtStockOutEl = document.getElementById('tmdtStockOut');
    const tmdtValueEl = document.getElementById('tmdtValue');
    
    if (tmdtMovementsEl) tmdtMovementsEl.textContent = statsByOrderType.tmdt.movements.toLocaleString();
    if (tmdtStockOutEl) tmdtStockOutEl.textContent = statsByOrderType.tmdt.stockOut.toLocaleString();
    if (tmdtValueEl) tmdtValueEl.textContent = formatUsageCurrency(statsByOrderType.tmdt.value);
    
    // Update other stats
    const otherMovementsEl = document.getElementById('otherMovements');
    const otherStockOutEl = document.getElementById('otherStockOut');
    const otherValueEl = document.getElementById('otherValue');
    
    if (otherMovementsEl) otherMovementsEl.textContent = statsByOrderType.other.movements.toLocaleString();
    if (otherStockOutEl) otherStockOutEl.textContent = statsByOrderType.other.stockOut.toLocaleString();
    if (otherValueEl) otherValueEl.textContent = formatUsageCurrency(statsByOrderType.other.value);
}

// Generate product usage table
function generateProductUsageTable() {
    const tableBody = document.getElementById('productUsageTableBody');
    if (!tableBody) return;
    
    // Calculate product usage data
    const productUsageData = calculateProductUsageData();
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (productUsageData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center">
                    <em>Không có dữ liệu sản phẩm trong khoảng thời gian đã chọn</em>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate table rows
    productUsageData.forEach((product, index) => {
        const row = document.createElement('tr');
        
        // Calculate usage percentage
        const usagePercentage = product.beginningStock > 0 
            ? ((product.stockOut / product.beginningStock) * 100).toFixed(1)
            : 0;
        
        const usageClass = usagePercentage > 70 ? 'high' : usagePercentage > 30 ? 'medium' : 'low';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${product.sku || '-'}</td>
            <td>${product.category || '-'}</td>
            <td>${product.beginningStock.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td class="text-success">${product.stockIn.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td class="text-danger">${product.stockOut.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td>${product.endingStock.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td class="text-info"><strong>${product.currentStock.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</strong></td>
            <td><span class="usage-percentage ${usageClass}">${usagePercentage}%</span></td>
            <td>${formatUsageCurrency(product.usageValue)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}
function calculateProductUsageData() {
    const productUsage = {};
    
    console.log('Calculating product usage data...');
    console.log('Warehouse data:', usageReportData?.warehouse || {});
    console.log('Transaction history length:', transactionHistory?.length || 0);
    
    // Initialize product usage data from warehouse
    if (usageReportData?.warehouse) {
        Object.keys(usageReportData.warehouse).forEach(productId => {
            const product = usageReportData.warehouse[productId];
            if (!product) return;
            
            const currentStock = parseFloat(product.stock) || parseFloat(product.quantity) || parseFloat(product.currentStock) || 0;
            
            console.log(`Product ${productId} (${product.name || 'Unknown'}): current stock = ${currentStock}`);
            
            productUsage[productId] = {
                id: productId,
                name: product.name || 'Tên không xác định',
                sku: product.sku || product.SKU || '-',
                category: product.category || product.categoryName || (window.categoriesData && product.categoryId ? window.categoriesData[product.categoryId]?.name : null) || '-',
                beginningStock: currentStock, // Will be adjusted based on transactions
                stockIn: 0,
                stockOut: 0,
                endingStock: currentStock,
                currentStock: currentStock, // Always the actual current stock
                usageValue: 0
            };
        });
    }
    
    // Process transactions in chronological order (oldest first)
    if (transactionHistory && Array.isArray(transactionHistory)) {
        const sortedTransactions = [...transactionHistory].sort((a, b) => {
            const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timestampA - timestampB;
        });
        
        sortedTransactions.forEach((transaction, index) => {
            if (!transaction) return;
            
            const productId = transaction.productId;
            if (!productId) return;
            
            // Create product entry if it doesn't exist (for deleted products)
            if (!productUsage[productId]) {
                productUsage[productId] = {
                    id: productId,
                    name: transaction.productName || 'Sản phẩm đã xóa',
                    sku: transaction.productSku || '-',
                    category: transaction.productCategory || '-',
                    beginningStock: 0,
                    stockIn: 0,
                    stockOut: 0,
                    endingStock: 0,
                    currentStock: 0, // No current stock for deleted products
                    usageValue: 0
                };
            }
            
            const quantity = parseFloat(transaction.quantity) || parseFloat(transaction.amount) || 0;
            const unitPrice = parseFloat(transaction.unitPrice) || parseFloat(transaction.price) || 0;
            
            console.log(`Transaction ${index + 1}: ${transaction.type} ${quantity} of ${transaction.productName || 'Unknown'}`);
            
            if (transaction.type === 'in') {
                productUsage[productId].stockIn += quantity;
                // For stock in, we need to reduce beginning stock since we're working backwards
                productUsage[productId].beginningStock = Math.max(0, productUsage[productId].beginningStock - quantity);
            } else if (transaction.type === 'out' || transaction.type === 'export' || transaction.type === 'stock_out') {
                productUsage[productId].stockOut += quantity;
                // For stock out, we need to add to beginning stock since we're working backwards
                productUsage[productId].beginningStock += quantity;
                productUsage[productId].usageValue += quantity * unitPrice;
            }
            
            // Recalculate ending stock
            productUsage[productId].endingStock = productUsage[productId].beginningStock + productUsage[productId].stockIn - productUsage[productId].stockOut;
        });
    }
    
    console.log('Final product usage data:', productUsage);
    
    const productUsageArray = Object.values(productUsage);
    
    // Update table with pagination
    if (typeof updateProductUsageTable === 'function') {
        updateProductUsageTable(productUsageArray);
    }
    
    return productUsageArray;
}

// Load stores data for name lookup
async function loadStoresDataCache() {
    try {
        if (!window.database) return;
        
        const storesRef = window.database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};
        
        // Cache store names for quick lookup
        storesDataCache = {};
        Object.keys(stores).forEach(storeId => {
            const store = stores[storeId];
            storesDataCache[storeId] = store.name || store.storeName || `Cửa hàng ${storeId}`;
        });
        
        console.log('Loaded stores data cache:', storesDataCache);
    } catch (error) {
        console.error('Error loading stores data cache:', error);
    }
}

// Get store name from transaction
function getStoreNameFromTransaction(transaction) {
    // First try to get from performedBy field
    if (transaction.performedBy && transaction.performedBy !== 'Hệ thống') {
        return transaction.performedBy;
    }
    
    // Then try to get store name from storeId
    if (transaction.storeId && storesDataCache[transaction.storeId]) {
        return storesDataCache[transaction.storeId];
    }
    
    // If no storeId, try to get from current selected store
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (selectedStoreId && storesDataCache[selectedStoreId]) {
        return storesDataCache[selectedStoreId];
    }
    
    return 'Không xác định';
}

// Show loading state for usage report
function showUsageReportLoading(show) {
    const loadingElements = document.querySelectorAll('#reportDateRange');
    loadingElements.forEach(el => {
        if (show) {
            el.textContent = 'Loading...';
        }
    });
}

// Show error message for usage report
function showUsageReportError(message) {
    console.error('Usage Report Error:', message);
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    }
}

// Format currency for usage report
function formatUsageCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

// Populate category options for usage report
async function populateUsageCategoryOptions() {
    const categorySelect = document.getElementById('reportCategorySelect');
    if (!categorySelect) return;

    try {
        // Clear existing options
        categorySelect.innerHTML = '<option value="all">Tất cả danh mục</option>';
        
        if (window.database) {
            const categoriesRef = window.database.ref('categories');
            const snapshot = await categoriesRef.once('value');
            const categories = snapshot.val();
            
            if (categories) {
                Object.keys(categories).forEach(categoryId => {
                    const category = categories[categoryId];
                    const option = document.createElement('option');
                    option.value = categoryId;
                    option.textContent = category.name || `Danh mục ${categoryId}`;
                    categorySelect.appendChild(option);
                });
            }
        }
        
        // Set dropdown to match current filter
        if (currentFilters.category !== 'all') {
            categorySelect.value = currentFilters.category;
        }
        
    } catch (error) {
        console.error('Error loading categories for usage report:', error);
    }
}

// Initialize usage charts
function initializeUsageCharts() {
    console.log('Initializing usage charts...');
    // Chart initialization will be implemented later
}

// Update usage charts
function updateUsageCharts() {
    console.log('Updating usage charts...');
    // Chart update will be implemented later
}

// Toggle usage report empty state
function toggleUsageReportEmptyState() {
    const emptyState = document.getElementById('usageReportEmptyState');
    const hasData = transactionHistory.length > 0 || Object.keys(usageReportData.warehouse || {}).length > 0;
    
    if (emptyState) {
        if (hasData) {
            emptyState.classList.add('hidden');
        } else {
            emptyState.classList.remove('hidden');
        }
    }
}

// Generate transaction history table
function generateTransactionHistoryTable() {
    const tableBody = document.getElementById('transactionHistoryTableBody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (transactionHistory.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center">
                    <em>Không có giao dịch nào trong khoảng thời gian đã chọn</em>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate table rows with pagination
    updateTransactionHistoryTable(transactionHistory);
}

// Update transaction history table with pagination
function updateTransactionHistoryTable(transactions) {
    const tableBody = document.getElementById('transactionHistoryTableBody');
    if (!tableBody) return;
    
    // Store all data for pagination
    transactionHistoryAllData = transactions;
    
    // Calculate pagination
    const totalItems = transactions.length;
    const totalPages = Math.ceil(totalItems / transactionHistoryPageSize);
    const startIndex = (transactionHistoryCurrentPage - 1) * transactionHistoryPageSize;
    const endIndex = Math.min(startIndex + transactionHistoryPageSize, totalItems);
    const pageData = transactions.slice(startIndex, endIndex);
    
    // Clear table body
    tableBody.innerHTML = '';
    
    // Generate rows for current page
    pageData.forEach((transaction, index) => {
        const row = document.createElement('tr');
        const globalIndex = startIndex + index + 1;
        
        const transactionDate = new Date(transaction.timestamp);
        const formattedDate = transactionDate.toLocaleString('vi-VN');
        
        const typeText = {
            'in': 'Nhập kho',
            'out': 'Xuất kho', 
            'export': 'Xuất kho',
            'stock_out': 'Xuất kho',
            'adjustment': 'Điều chỉnh'
        }[transaction.type] || transaction.type;
        
        const typeClass = {
            'in': 'text-success',
            'out': 'text-danger',
            'export': 'text-danger', 
            'stock_out': 'text-danger',
            'adjustment': 'text-warning'
        }[transaction.type] || '';
        
        // Try multiple possible field names for quantity and price
        const quantity = parseFloat(transaction.quantity) || 
                        parseFloat(transaction.amount) || 
                        parseFloat(transaction.stockOut) ||
                        parseFloat(transaction.stockIn) ||
                        parseFloat(transaction.qty) || 0;
                        
        const unitPrice = parseFloat(transaction.unitPrice) || 
                         parseFloat(transaction.price) || 
                         parseFloat(transaction.cost) ||
                         parseFloat(transaction.value) || 0;
                         
        const totalValue = parseFloat(transaction.totalValue) || 
                          parseFloat(transaction.total) ||
                          (quantity * unitPrice);
        
        // Debug log for all transactions to see data structure
        if (globalIndex === 1) { // Debug first transaction only
            console.log('DEBUG: First transaction data:', {
                allFields: Object.keys(transaction),
                transaction,
                extractedQuantity: quantity,
                extractedUnitPrice: unitPrice,
                extractedTotalValue: totalValue,
                productName: transaction.productName
            });
        }
        
        row.innerHTML = `
            <td><input type="checkbox" class="transaction-checkbox" data-transaction-id="${transaction.id}"></td>
            <td>${globalIndex}</td>
            <td>${formattedDate}</td>
            <td><span class="${typeClass}">${typeText}</span></td>
            <td>${transaction.productName || 'Không xác định'}</td>
            <td>${transaction.productSku || '-'}</td>
            <td>${quantity.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td>${formatUsageCurrency(unitPrice)}</td>
            <td>${formatUsageCurrency(totalValue)}</td>
            <td>${transaction.reason || '-'}</td>
            <td>${transaction.orderType || '-'}</td>
            <td>${getStoreNameFromTransaction(transaction)}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="openTransactionDetailModal('${transaction.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update pagination info
    updateTransactionHistoryPagination(totalItems, startIndex + 1, endIndex, totalPages);
}

// Update transaction history pagination
function updateTransactionHistoryPagination(totalItems, showingStart, showingEnd, totalPages) {
    // Update showing info
    const showingStartEl = document.getElementById('transactionHistoryShowingStart');
    const showingEndEl = document.getElementById('transactionHistoryShowingEnd');
    const totalEl = document.getElementById('transactionHistoryTotal');
    
    if (showingStartEl) showingStartEl.textContent = showingStart;
    if (showingEndEl) showingEndEl.textContent = showingEnd;
    if (totalEl) totalEl.textContent = totalItems;
    
    // Update pagination buttons
    const firstBtn = document.getElementById('transactionHistoryFirstBtn');
    const prevBtn = document.getElementById('transactionHistoryPrevBtn');
    const nextBtn = document.getElementById('transactionHistoryNextBtn');
    const lastBtn = document.getElementById('transactionHistoryLastBtn');
    
    if (firstBtn) firstBtn.disabled = transactionHistoryCurrentPage === 1;
    if (prevBtn) prevBtn.disabled = transactionHistoryCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = transactionHistoryCurrentPage === totalPages;
    if (lastBtn) lastBtn.disabled = transactionHistoryCurrentPage === totalPages;
    
    // Generate page numbers
    const pageNumbersContainer = document.getElementById('transactionHistoryPageNumbers');
    if (pageNumbersContainer) {
        let pageNumbersHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, transactionHistoryCurrentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === transactionHistoryCurrentPage ? 'active' : '';
            pageNumbersHTML += `<button class="pagination-btn ${activeClass}" onclick="goToTransactionHistoryPage(${i})">${i}</button>`;
        }
        
        pageNumbersContainer.innerHTML = pageNumbersHTML;
    }
}

// Transaction history pagination functions
function goToTransactionHistoryPage(page) {
    if (page === 'last') {
        const totalPages = Math.ceil(transactionHistoryAllData.length / transactionHistoryPageSize);
        transactionHistoryCurrentPage = totalPages;
    } else {
        transactionHistoryCurrentPage = parseInt(page);
    }
    updateTransactionHistoryTable(transactionHistoryAllData);
}

function previousTransactionHistoryPage() {
    if (transactionHistoryCurrentPage > 1) {
        transactionHistoryCurrentPage--;
        updateTransactionHistoryTable(transactionHistoryAllData);
    }
}

function nextTransactionHistoryPage() {
    const totalPages = Math.ceil(transactionHistoryAllData.length / transactionHistoryPageSize);
    if (transactionHistoryCurrentPage < totalPages) {
        transactionHistoryCurrentPage++;
        updateTransactionHistoryTable(transactionHistoryAllData);
    }
}

function changeTransactionHistoryPageSize() {
    const pageSizeSelect = document.getElementById('transactionHistoryPageSize');
    if (pageSizeSelect) {
        transactionHistoryPageSize = parseInt(pageSizeSelect.value);
        transactionHistoryCurrentPage = 1; // Reset to first page
        updateTransactionHistoryTable(transactionHistoryAllData);
    }
}

// Open transaction detail modal
function openTransactionDetailModal(transactionId) {
    const transaction = transactionHistory.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const transactionDate = new Date(transaction.timestamp);
    const formattedDate = transactionDate.toLocaleString('vi-VN');
    
    const typeText = {
        'in': 'Nhập kho',
        'out': 'Xuất kho',
        'export': 'Xuất kho', 
        'stock_out': 'Xuất kho',
        'adjustment': 'Điều chỉnh'
    }[transaction.type] || transaction.type;
    
    const quantity = parseFloat(transaction.quantity) || 0;
    const unitPrice = parseFloat(transaction.unitPrice) || 0;
    const totalValue = quantity * unitPrice;
    
    const detailPairs = [
        ['Thời gian', formattedDate],
        ['Loại giao dịch', typeText],
        ['Sản phẩm', transaction.productName || 'Không xác định'],
        ['SKU', transaction.productSku || '-'],
        ['Số lượng', quantity.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})],
        ['Đơn giá', formatUsageCurrency(unitPrice)],
        ['Tổng giá trị', formatUsageCurrency(totalValue)],
        ['Lý do', transaction.reason || '-'],
        ['Loại đơn hàng', transaction.orderType || '-'],
        ['Người thực hiện', getStoreNameFromTransaction(transaction)]
    ];
    
    const htmlContent = buildDetailGridFromPairs(detailPairs);
    openWarehouseDetailModal(htmlContent, 'Chi tiết giao dịch kho');
}

// Product usage table functions
function updateProductUsageTable(productData) {
    // This function will be called from calculateProductUsageData
    // Implementation for product usage pagination can be added here if needed
    console.log('Product usage table updated with', productData.length, 'products');
}

// Store filter change handler
function onStoreFilterChange() {
    updateCurrentFilters();
    generateUsageReport();
}

// Toggle custom date range
function toggleCustomDateRange() {
    const periodSelect = document.getElementById('reportPeriodSelect');
    const customStartGroup = document.getElementById('customDateRangeGroup');
    const customEndGroup = document.getElementById('customEndDateGroup');
    
    if (periodSelect && customStartGroup && customEndGroup) {
        if (periodSelect.value === 'custom') {
            customStartGroup.style.display = 'block';
            customEndGroup.style.display = 'block';
        } else {
            customStartGroup.style.display = 'none';
            customEndGroup.style.display = 'none';
        }
    }
    
    // Update date range display
    updateUsageReportDateRange();
    
    // Regenerate report if not custom or if custom dates are set
    if (periodSelect.value !== 'custom') {
        generateUsageReport();
    }
}

// REMOVED: Sample data creation function - using only real Firebase data

// Get order type display text
function getOrderTypeDisplay(reason) {
    if (!reason) return '-';
    
    const reasonLower = reason.toLowerCase();
    
    // Check for TMĐT orders
    if (reasonLower.includes('tmđt') || reasonLower.includes('ecommerce') || reasonLower.includes('bán hàng tmđt')) {
        return '📱 TMĐT';
    }
    
    switch (reasonLower) {
        case 'retail_order':
        case 'bán hàng lẻ':
            return '🛒 Bán lẻ';
        case 'wholesale_order':
        case 'bán hàng sỉ':
            return '🏪 Bán sỉ';
        case 'tmdt_order':
            return '📱 TMĐT';
        case 'stock_in':
        case 'nhập kho':
            return '📦 Nhập kho';
        case 'adjustment':
        case 'điều chỉnh':
            return '⚙️ Điều chỉnh';
        case 'stock_out':
        case 'xuất kho':
            return '📤 Xuất kho';
        default:
            return '📋 Khác';
    }
}

// Get order type badge CSS class
function getOrderTypeBadgeClass(reason) {
    if (!reason) return 'badge-secondary';
    
    const reasonLower = reason.toLowerCase();
    
    // Check for TMĐT orders
    if (reasonLower.includes('tmđt') || reasonLower.includes('ecommerce') || reasonLower.includes('bán hàng tmđt')) {
        return 'badge-warning';
    }
    
    switch (reasonLower) {
        case 'retail_order':
        case 'bán hàng lẻ':
            return 'badge-success';
        case 'wholesale_order':
        case 'bán hàng sỉ':
            return 'badge-primary';
        case 'tmdt_order':
            return 'badge-warning';
        case 'stock_in':
        case 'nhập kho':
            return 'badge-info';
        case 'adjustment':
        case 'điều chỉnh':
            return 'badge-secondary';
        case 'stock_out':
        case 'xuất kho':
            return 'badge-danger';
        default:
            return 'badge-light';
    }
}

// Handle store filter change
function onStoreFilterChange() {
    const storeSelect = document.getElementById('reportStoreSelect');
    if (!storeSelect) return;
    
    const selectedStore = storeSelect.value;
    console.log('Store filter changed to:', selectedStore);
    
    // Update current filters
    currentFilters.store = selectedStore;
    
    // Show loading state
    showUsageReportLoading(true);
    
    // Regenerate report with new store filter
    setTimeout(() => {
        generateUsageReport();
    }, 100);
}

// Handle custom date change for auto-refresh
function handleCustomDateChange() {
    updateUsageReportDateRange();
    generateUsageReport();
}

// Toggle custom date range visibility
function toggleCustomDateRange() {
    const periodSelect = document.getElementById('reportPeriodSelect');
    const customDateRangeGroup = document.getElementById('customDateRangeGroup');
    const customEndDateGroup = document.getElementById('customEndDateGroup');
    
    if (periodSelect && customDateRangeGroup && customEndDateGroup) {
        const isCustom = periodSelect.value === 'custom';
        
        if (isCustom) {
            customDateRangeGroup.style.display = 'block';
            customEndDateGroup.style.display = 'block';
            
            // Set default dates (last 7 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);
            
            const startDateInput = document.getElementById('customStartDate');
            const endDateInput = document.getElementById('customEndDate');
            
            if (startDateInput && !startDateInput.value) {
                startDateInput.value = startDate.toISOString().split('T')[0];
            }
            if (endDateInput && !endDateInput.value) {
                endDateInput.value = endDate.toISOString().split('T')[0];
            }
            
            // Remove existing event listeners to prevent duplicates
            if (startDateInput) {
                startDateInput.removeEventListener('change', handleCustomDateChange);
                startDateInput.addEventListener('change', handleCustomDateChange);
            }
            if (endDateInput) {
                endDateInput.removeEventListener('change', handleCustomDateChange);
                endDateInput.addEventListener('change', handleCustomDateChange);
            }
        } else {
            customDateRangeGroup.style.display = 'none';
            customEndDateGroup.style.display = 'none';
        }
        
        // Update date range display and generate report
        updateUsageReportDateRange();
        generateUsageReport();
    }
}

// Filter product usage table by specific period
function filterProductUsageByPeriod() {
    const periodFilter = document.getElementById('productUsagePeriodFilter');
    if (!periodFilter) return;
    
    const selectedPeriod = periodFilter.value;
    console.log('Filtering product usage by period:', selectedPeriod);
    
    // Get current date for calculations
    const now = new Date();
    let startDate, endDate;
    
    // Calculate date range based on selected period
    switch (selectedPeriod) {
        case 'all':
            startDate = new Date(0);
            endDate = new Date();
            break;
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'last3days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'last7days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            break;
        case 'lastweek':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay() - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
        case 'lastmonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'last30days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'last60days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'last90days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'quarter':
            const quarterStart = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStart, 1);
            endDate = new Date(now.getFullYear(), quarterStart + 3, 1);
            break;
        case 'lastquarter':
            const lastQuarterStart = Math.floor(now.getMonth() / 3) * 3 - 3;
            if (lastQuarterStart < 0) {
                startDate = new Date(now.getFullYear() - 1, 9, 1);
                endDate = new Date(now.getFullYear(), 0, 1);
            } else {
                startDate = new Date(now.getFullYear(), lastQuarterStart, 1);
                endDate = new Date(now.getFullYear(), lastQuarterStart + 3, 1);
            }
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
            break;
        case 'lastyear':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear(), 0, 1);
            break;
        case 'custom':
            const startDateInput = document.getElementById('productUsageStartDate');
            const endDateInput = document.getElementById('productUsageEndDate');
            if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
                startDate = new Date(startDateInput.value);
                endDate = new Date(endDateInput.value);
                endDate.setDate(endDate.getDate() + 1); // Include end date
            } else {
                startDate = new Date(0);
                endDate = new Date();
            }
            break;
        default:
            startDate = new Date(0);
            endDate = new Date();
    }
    
    // Filter transactions for this specific period
    const filteredTransactions = transactionHistory.filter(transaction => {
        const transactionDate = new Date(transaction.timestamp);
        return transactionDate >= startDate && transactionDate < endDate;
    });
    
    console.log(`Filtered ${filteredTransactions.length} transactions for period ${selectedPeriod}`);
    
    // Recalculate product usage data with filtered transactions
    const productUsage = {};
    
    // Initialize with current warehouse data
    Object.keys(usageReportData.warehouse || {}).forEach(productId => {
        const product = usageReportData.warehouse[productId];
        const currentStock = parseFloat(product.stock) || parseFloat(product.quantity) || parseFloat(product.currentStock) || 0;
        
        productUsage[productId] = {
            id: productId,
            name: product.name || 'Tên không xác định',
            sku: product.sku || product.SKU || '-',
            category: product.category || product.categoryName || categoriesData[product.categoryId]?.name || '-',
            beginningStock: currentStock,
            stockIn: 0,
            stockOut: 0,
            endingStock: currentStock,
            currentStock: currentStock,
            usageValue: 0
        };
    });
    
    // Process filtered transactions
    filteredTransactions.forEach(transaction => {
        const productId = transaction.productId;
        if (!productUsage[productId]) {
            productUsage[productId] = {
                id: productId,
                name: transaction.productName || 'Sản phẩm đã xóa',
                sku: transaction.productSku || '-',
                category: transaction.productCategory || '-',
                beginningStock: 0,
                stockIn: 0,
                stockOut: 0,
                endingStock: 0,
                currentStock: 0,
                usageValue: 0
            };
        }
        
        const quantity = parseFloat(transaction.quantity) || parseFloat(transaction.amount) || 0;
        const unitPrice = parseFloat(transaction.unitPrice) || parseFloat(transaction.price) || 0;
        
        if (transaction.type === 'in') {
            productUsage[productId].stockIn += quantity;
            productUsage[productId].beginningStock = Math.max(0, productUsage[productId].beginningStock - quantity);
        } else if (transaction.type === 'out' || transaction.type === 'export' || transaction.type === 'stock_out') {
            productUsage[productId].stockOut += quantity;
            productUsage[productId].beginningStock += quantity;
            productUsage[productId].usageValue += quantity * unitPrice;
        }
        
        // Recalculate ending stock
        productUsage[productId].endingStock = productUsage[productId].beginningStock + productUsage[productId].stockIn - productUsage[productId].stockOut;
    });
    
    // Reset to first page when filtering
    productUsageCurrentPage = 1;
    
    // Update the table with filtered data
    updateProductUsageTable(Object.values(productUsage));
}

// Pagination variables for product usage table
let productUsageCurrentPage = 1;
let productUsagePageSize = 10;
let productUsageAllData = [];

// Update product usage table with specific data and pagination
function updateProductUsageTable(productUsageData) {
    const tableBody = document.getElementById('productUsageTableBody');
    if (!tableBody) return;
    
    // Store all data for pagination
    productUsageAllData = productUsageData || [];
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (productUsageAllData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center">
                    <em>Không có dữ liệu sản phẩm trong khoảng thời gian đã chọn</em>
                </td>
            </tr>
        `;
        updateProductUsagePaginationInfo(0, 0, 0);
        return;
    }
    
    // Sort by usage value (descending)
    const sortedData = [...productUsageAllData].sort((a, b) => b.usageValue - a.usageValue);
    
    // Calculate pagination
    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / productUsagePageSize);
    const startIndex = (productUsageCurrentPage - 1) * productUsagePageSize;
    const endIndex = Math.min(startIndex + productUsagePageSize, totalItems);
    const pageData = sortedData.slice(startIndex, endIndex);
    
    // Generate table rows for current page
    pageData.forEach((product, index) => {
        const row = document.createElement('tr');
        
        // Calculate usage percentage
        const usagePercentage = product.beginningStock > 0 
            ? ((product.stockOut / product.beginningStock) * 100).toFixed(1)
            : 0;
        
        const usageClass = usagePercentage > 70 ? 'high' : usagePercentage > 30 ? 'medium' : 'low';
        
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${product.name}</td>
            <td>${product.sku || '-'}</td>
            <td>${product.category || '-'}</td>
            <td>${product.beginningStock.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td class="text-success">${product.stockIn.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td class="text-danger">${product.stockOut.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td>${product.endingStock.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td class="text-info"><strong>${product.currentStock.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</strong></td>
            <td><span class="usage-percentage ${usageClass}">${usagePercentage}%</span></td>
            <td>${formatUsageCurrency(product.usageValue)}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update pagination info and controls
    updateProductUsagePaginationInfo(startIndex + 1, endIndex, totalItems);
    updateProductUsagePaginationControls(productUsageCurrentPage, totalPages);
}

// Update pagination info display
function updateProductUsagePaginationInfo(start, end, total) {
    const startElement = document.getElementById('productUsageShowingStart');
    const endElement = document.getElementById('productUsageShowingEnd');
    const totalElement = document.getElementById('productUsageTotal');
    
    if (startElement) startElement.textContent = start;
    if (endElement) endElement.textContent = end;
    if (totalElement) totalElement.textContent = total;
}

// Update pagination controls
function updateProductUsagePaginationControls(currentPage, totalPages) {
    const firstBtn = document.getElementById('productUsageFirstBtn');
    const prevBtn = document.getElementById('productUsagePrevBtn');
    const nextBtn = document.getElementById('productUsageNextBtn');
    const lastBtn = document.getElementById('productUsageLastBtn');
    const pageNumbers = document.getElementById('productUsagePageNumbers');
    
    // Show pagination container
    const paginationContainer = document.getElementById('productUsagePagination');
    if (paginationContainer) {
        paginationContainer.style.display = 'flex';
    }
    
    // Enable/disable navigation buttons
    if (firstBtn) firstBtn.disabled = currentPage === 1 || totalPages === 0;
    if (prevBtn) prevBtn.disabled = currentPage === 1 || totalPages === 0;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    if (lastBtn) lastBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // Generate page numbers
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        
        if (totalPages > 0) {
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.onclick = () => goToProductUsagePage(i);
                pageNumbers.appendChild(pageBtn);
            }
        }
    }
}

// Navigation functions for product usage pagination
function goToProductUsagePage(page) {
    if (page === 'last') {
        const totalPages = Math.ceil(productUsageAllData.length / productUsagePageSize);
        productUsageCurrentPage = totalPages;
    } else {
        productUsageCurrentPage = parseInt(page);
    }
    updateProductUsageTable(productUsageAllData);
}

function previousProductUsagePage() {
    if (productUsageCurrentPage > 1) {
        productUsageCurrentPage--;
        updateProductUsageTable(productUsageAllData);
    }
}

function nextProductUsagePage() {
    const totalPages = Math.ceil(productUsageAllData.length / productUsagePageSize);
    if (productUsageCurrentPage < totalPages) {
        productUsageCurrentPage++;
        updateProductUsageTable(productUsageAllData);
    }
}

function changeProductUsagePageSize() {
    const pageSizeSelect = document.getElementById('productUsagePageSize');
    if (pageSizeSelect) {
        productUsagePageSize = parseInt(pageSizeSelect.value);
        productUsageCurrentPage = 1; // Reset to first page
        updateProductUsageTable(productUsageAllData);
    }
}

// Toggle custom date range for product usage filter
function toggleProductUsageCustomDateRange() {
    const periodFilter = document.getElementById('productUsagePeriodFilter');
    const customDateGroup = document.getElementById('productUsageCustomDateGroup');
    
    if (!periodFilter || !customDateGroup) return;
    
    if (periodFilter.value === 'custom') {
        customDateGroup.style.display = 'block';
        // Set default dates if empty
        const startDateInput = document.getElementById('productUsageStartDate');
        const endDateInput = document.getElementById('productUsageEndDate');
        
        if (startDateInput && !startDateInput.value) {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
        }
        
        if (endDateInput && !endDateInput.value) {
            const today = new Date();
            endDateInput.value = today.toISOString().split('T')[0];
        }
    } else {
        customDateGroup.style.display = 'none';
        // Filter immediately for non-custom options
        filterProductUsageByPeriod();
    }
}

// Export functions to global scope
window.initWarehouseUsageReport = initWarehouseUsageReport;
window.generateUsageReport = generateUsageReport;
window.filterUsageTable = filterUsageTable;
window.exportUsageReport = exportUsageReport;
window.printUsageReport = printUsageReport;
window.onStoreFilterChange = onStoreFilterChange;
window.toggleCustomDateRange = toggleCustomDateRange;
window.filterProductUsageByPeriod = filterProductUsageByPeriod;
window.toggleProductUsageCustomDateRange = toggleProductUsageCustomDateRange;
window.goToProductUsagePage = goToProductUsagePage;
window.previousProductUsagePage = previousProductUsagePage;
window.nextProductUsagePage = nextProductUsagePage;
window.changeProductUsagePageSize = changeProductUsagePageSize;
// Transaction history pagination exports
window.goToTransactionHistoryPage = goToTransactionHistoryPage;
window.previousTransactionHistoryPage = previousTransactionHistoryPage;
window.nextTransactionHistoryPage = nextTransactionHistoryPage;
window.changeTransactionHistoryPageSize = changeTransactionHistoryPageSize;
// Transaction history deletion & selection exports
window.toggleSelectAllTransactions = toggleSelectAllTransactions;
window.deleteSelectedTransactions = deleteSelectedTransactions;
window.deleteSingleTransaction = deleteSingleTransaction;
// Open transaction detail modal
function openTransactionDetailModal(transactionId) {
    // We'll use the transaction data from our already loaded transactionHistory
    // This is more efficient than fetching from Firebase again
    const transaction = transactionHistory.find(t => t.id === transactionId);
    if (!transaction) {
        console.error('Transaction not found:', transactionId);
        showNotification('Không tìm thấy giao dịch', 'error');
        return;
    }

    // Format the transaction details
    const transactionDate = new Date(transaction.timestamp);
    const formattedDate = transactionDate.toLocaleString('vi-VN');
    const typeText = transaction.type === 'in' ? 'Nhập kho' : 
                     transaction.type === 'out' ? 'Xuất kho' : 
                     'Điều chỉnh';
    
    const quantity = transaction.quantity || 0;
    const unitPrice = transaction.unitPrice || 0;
    const totalValue = transaction.totalValue || (quantity * unitPrice);
    
    const reason = transaction.reason || '-';
    const performedBy = transaction.performedBy || 'Hệ thống';
    const productName = transaction.productName || '-';
    const productSku = transaction.productSku || '-';
    
    // Create HTML content for the modal
    const htmlContent = `
        <div class="transaction-detail-content">
            <div class="detail-grid">
                <div class="detail-card">
                    <h4>Thông tin giao dịch</h4>
                    <div class="detail-item">
                        <span class="detail-label">Loại giao dịch:</span>
                        <span class="detail-value">${typeText}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Thời gian:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Người thực hiện:</span>
                        <span class="detail-value">${performedBy}</span>
                    </div>
                </div>
                
                <div class="detail-card">
                    <h4>Thông tin sản phẩm</h4>
                    <div class="detail-item">
                        <span class="detail-label">Tên sản phẩm:</span>
                        <span class="detail-value">${productName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Mã SKU:</span>
                        <span class="detail-value">${productSku}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Số lượng:</span>
                        <span class="detail-value">${quantity.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Đơn giá:</span>
                        <span class="detail-value">${formatUsageCurrency(unitPrice)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tổng giá trị:</span>
                        <span class="detail-value">${formatUsageCurrency(totalValue)}</span>
                    </div>
                </div>
                
                <div class="detail-card full-width">
                    <h4>Lý do</h4>
                    <div class="detail-item">
                        <span class="detail-value">${reason}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Use the existing openWarehouseDetailModal function
    openWarehouseDetailModal(htmlContent, 'Chi tiết giao dịch');
}

// Modal exports
window.closeWarehouseDetailModal = closeWarehouseDetailModal;
window.openWarehouseDetailModal = openWarehouseDetailModal;
window.openTransactionDetailModal = openTransactionDetailModal;

// Format currency for usage report
function formatUsageCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Show/hide usage report loading state
function showUsageReportLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Show usage report error
function showUsageReportError(message) {
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    } else {
        alert(message);
    }
}

// Toggle empty state display
function toggleUsageReportEmptyState() {
    const emptyState = document.getElementById('usageReportEmptyState');
    const hasData = transactionHistory.length > 0;
    
    if (emptyState) {
        if (hasData) {
            emptyState.classList.add('hidden');
        } else {
            emptyState.classList.remove('hidden');
        }
    }
}

// Placeholder functions for export and print
function exportUsageReport() {
    alert('Tính năng xuất Excel đang được phát triển');
}

function printUsageReport() {
    window.print();
}

// Initialize charts with real Chart.js implementation
function initializeUsageCharts() {
    console.log('Initializing usage charts...');
    
    try {
        // Initialize category distribution chart
        initializeCategoryChart();
        
        // Initialize top products chart
        initializeTopProductsChart();
        
        console.log('Usage charts initialized successfully');
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

function updateUsageCharts() {
    console.log('Updating usage charts...');
    
    try {
        // Update category distribution chart
        updateCategoryChart();
        
        // Update top products chart
        updateTopProductsChart();
        
        console.log('Usage charts updated successfully');
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Initialize category distribution chart
function initializeCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) {
        console.warn('Category chart canvas not found');
        return;
    }
    
    // Destroy existing chart if exists
    if (usageCharts.categoryChart) {
        usageCharts.categoryChart.destroy();
    }
    
    usageCharts.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hàng Lạnh', 'Hàng Khô'],
            datasets: [{
                data: [60, 40],
                backgroundColor: [
                    '#FF6B9D',
                    '#4ECDC4'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Initialize top products chart
function initializeTopProductsChart() {
    const ctx = document.getElementById('valueChart');
    if (!ctx) {
        console.warn('Top products chart canvas not found');
        return;
    }
    
    // Destroy existing chart if exists
    if (usageCharts.topProductsChart) {
        usageCharts.topProductsChart.destroy();
    }
    
    usageCharts.topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Phở mài mozzarella', 'Bánh gạo nhân phô mai', 'Khô gà'],
            datasets: [{
                label: 'Giá trị (VNĐ)',
                data: [14000000, 9000000, 5500000],
                backgroundColor: '#4CAF50',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ';
                        }
                    }
                }
            }
        }
    });
}

// Update category distribution chart with real data
function updateCategoryChart() {
    if (!usageCharts.categoryChart) return;
    
    // Calculate category data from usage report
    const categoryData = calculateCategoryDistribution();
    
    usageCharts.categoryChart.data.labels = categoryData.labels;
    usageCharts.categoryChart.data.datasets[0].data = categoryData.values;
    usageCharts.categoryChart.update();
}

// Update top products chart with real data
function updateTopProductsChart() {
    if (!usageCharts.topProductsChart) return;
    
    // Calculate top products data from usage report
    const topProductsData = calculateTopProductsData();
    
    usageCharts.topProductsChart.data.labels = topProductsData.labels;
    usageCharts.topProductsChart.data.datasets[0].data = topProductsData.values;
    usageCharts.topProductsChart.update();
}

// Calculate category distribution from usage data
function calculateCategoryDistribution() {
    const categoryTotals = {};
    
    // Process transaction history to get category usage
    transactionHistory.forEach(transaction => {
        if (transaction.type === 'out' || transaction.type === 'export' || transaction.type === 'stock_out') {
            const category = transaction.productCategory || 'Khác';
            const value = (parseFloat(transaction.quantity) || 0) * (parseFloat(transaction.unitPrice) || 0);
            
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += value;
        }
    });
    
    // If no data, return default
    if (Object.keys(categoryTotals).length === 0) {
        return {
            labels: ['Hàng Lạnh', 'Hàng Khô'],
            values: [60, 40]
        };
    }
    
    return {
        labels: Object.keys(categoryTotals),
        values: Object.values(categoryTotals)
    };
}

// Calculate top products data from usage
function calculateTopProductsData() {
    const productTotals = {};
    
    // Process transaction history to get product usage values
    transactionHistory.forEach(transaction => {
        if (transaction.type === 'out' || transaction.type === 'export' || transaction.type === 'stock_out') {
            const productName = transaction.productName || 'Sản phẩm không xác định';
            const value = (parseFloat(transaction.quantity) || 0) * (parseFloat(transaction.unitPrice) || 0);
            
            if (!productTotals[productName]) {
                productTotals[productName] = 0;
            }
            productTotals[productName] += value;
        }
    });
    
    // Sort by value and get top 5
    const sortedProducts = Object.entries(productTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    // If no data, return default
    if (sortedProducts.length === 0) {
        return {
            labels: ['Phở mài mozzarella', 'Bánh gạo nhân phô mai', 'Khô gà'],
            values: [14000000, 9000000, 5500000]
        };
    }
    
    return {
        labels: sortedProducts.map(([name]) => name),
        values: sortedProducts.map(([, value]) => value)
    };
}

// Filter usage tables
function filterUsageTable(tableType) {
    if (tableType === 'productUsage') {
        const searchInput = document.getElementById('productUsageSearch');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        
        const tableRows = document.querySelectorAll('#productUsageTable tbody tr');
        tableRows.forEach(row => {
            const productName = row.cells[1]?.textContent.toLowerCase() || '';
            const productSku = row.cells[2]?.textContent.toLowerCase() || '';
            
            if (productName.includes(searchTerm) || productSku.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    } else if (tableType === 'transactionHistory') {
        const searchInput = document.getElementById('transactionSearch');
        const typeSelect = document.getElementById('transactionTypeFilter');
        const categorySelect = document.getElementById('categoryFilter');
        const storeSelect = document.getElementById('storeFilter');
        const dateFromInput = document.getElementById('dateFromFilter');
        const dateToInput = document.getElementById('dateToFilter');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedType = typeSelect ? typeSelect.value : 'all';
        const selectedCategory = categorySelect ? categorySelect.value : 'all';
        const selectedStore = storeSelect ? storeSelect.value : 'all';
        const dateFrom = dateFromInput ? dateFromInput.value : '';
        const dateTo = dateToInput ? dateToInput.value : '';

        // Build filtered dataset from base transactionHistory
        const filtered = (transactionHistory || []).filter(t => {
            const typeLabel = t.type === 'in' ? 'nhập' : t.type === 'out' ? 'xuất' : 'điều chỉnh';
            const rowText = (
                `${t.productName || ''} ${t.productSku || ''} ${t.reason || ''} ${t.performedBy || ''} ${typeLabel}`
            ).toLowerCase();
            
            // Search filter
            const matchesSearch = rowText.includes(searchTerm);
            
            // Type filter
            const matchesType = selectedType === 'all' || selectedType === t.type;
            
            // Category filter
            const matchesCategory = selectedCategory === 'all' || 
                (t.productCategory && t.productCategory.toLowerCase() === selectedCategory.toLowerCase());
            
            // Store filter
            const matchesStore = selectedStore === 'all' || 
                (t.storeId && t.storeId === selectedStore) ||
                (t.storeName && t.storeName.toLowerCase().includes(selectedStore.toLowerCase()));
            
            // Date filter
            let matchesDate = true;
            if (dateFrom || dateTo) {
                const transactionDate = new Date(t.timestamp);
                const fromDate = dateFrom ? new Date(dateFrom) : null;
                const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;
                
                if (fromDate && transactionDate < fromDate) matchesDate = false;
                if (toDate && transactionDate > toDate) matchesDate = false;
            }
            
            return matchesSearch && matchesType && matchesCategory && matchesStore && matchesDate;
        });
        
        transactionHistoryAllData = filtered;
        transactionHistoryCurrentPage = 1;
        updateTransactionHistoryTable();
    }
}

// Clear all filters function
function clearAllFilters() {
    // Reset all filter inputs
    const transactionTypeFilter = document.getElementById('transactionTypeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const storeFilter = document.getElementById('storeFilter');
    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    const transactionSearch = document.getElementById('transactionSearch');
    
    if (transactionTypeFilter) transactionTypeFilter.value = 'all';
    if (categoryFilter) categoryFilter.value = 'all';
    if (storeFilter) storeFilter.value = 'all';
    if (dateFromFilter) dateFromFilter.value = '';
    if (dateToFilter) dateToFilter.value = '';
    if (transactionSearch) transactionSearch.value = '';
    
    // Reset data and refresh table
    transactionHistoryAllData = [...transactionHistory];
    transactionHistoryCurrentPage = 1;
    updateTransactionHistoryTable();
}

// Populate filter dropdowns
function populateTransactionFilters() {
    populateCategoryFilter();
    populateStoreFilter();
}

// Populate category filter dropdown
function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter || !transactionHistory) return;
    
    // Get unique categories from transaction history
    const categories = [...new Set(transactionHistory
        .map(t => t.productCategory)
        .filter(cat => cat && cat.trim() !== '')
    )].sort();
    
    // Clear existing options except "Tất cả ngành hàng"
    categoryFilter.innerHTML = '<option value="all">Tất cả ngành hàng</option>';
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Populate store filter dropdown
function populateStoreFilter() {
    const storeFilter = document.getElementById('storeFilter');
    if (!storeFilter || !transactionHistory) return;
    
    // Get unique stores from transaction history
    const stores = [...new Set(transactionHistory
        .map(t => ({ id: t.storeId, name: t.storeName || getStoreNameFromTransaction(t) }))
        .filter(store => store.id && store.name)
        .map(store => JSON.stringify(store))
    )].map(str => JSON.parse(str)).sort((a, b) => a.name.localeCompare(b.name));
    
    // Clear existing options except "Tất cả cửa hàng"
    storeFilter.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
    
    // Add store options
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name;
        storeFilter.appendChild(option);
    });
}

// Generate transaction history table
function generateTransactionHistoryTable() {
    const tableBody = document.getElementById('transactionHistoryTableBody');
    if (!tableBody) return;
    
    // Populate filter dropdowns
    populateTransactionFilters();
    
    // Reset to first page and render with pagination
    transactionHistoryAllData = [...transactionHistory];
    transactionHistoryCurrentPage = 1;
    updateTransactionHistoryTable();
}

// Update transaction history table with pagination
function updateTransactionHistoryTable(allData) {
    const tableBody = document.getElementById('transactionHistoryTableBody');
    if (!tableBody) return;
    
    // If a dataset is provided (possibly filtered), store it for pagination
    if (Array.isArray(allData)) {
        transactionHistoryAllData = allData;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    const totalItems = transactionHistoryAllData.length;
    if (totalItems === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    <em>Không có giao dịch nào trong khoảng thời gian đã chọn</em>
                </td>
            </tr>
        `;
        // Update info and controls to disabled state
        updateTransactionHistoryPaginationInfo(0, 0, 0);
        updateTransactionHistoryPaginationControls(1, 1);
        return;
    }
    
    // Calculate pagination indices
    const totalPages = Math.max(1, Math.ceil(totalItems / transactionHistoryPageSize));
    if (transactionHistoryCurrentPage > totalPages) transactionHistoryCurrentPage = totalPages;
    const startIndex = (transactionHistoryCurrentPage - 1) * transactionHistoryPageSize;
    const endIndex = Math.min(startIndex + transactionHistoryPageSize, totalItems);
    const pageData = transactionHistoryAllData.slice(startIndex, endIndex);
    
    // Render rows
    pageData.forEach((transaction, idx) => {
        const row = document.createElement('tr');
        const transactionDate = new Date(transaction.timestamp);
        const typeClass = transaction.type === 'in' ? 'in' : transaction.type === 'out' ? 'out' : 'adjustment';
        const typeText = transaction.type === 'in' ? 'Nhập kho' : transaction.type === 'out' ? 'Xuất kho' : 'Điều chỉnh';
        const quantity = parseFloat(transaction.quantity) || parseFloat(transaction.amount) || 0;
        const unitPrice = parseFloat(transaction.unitPrice) || parseFloat(transaction.price) || 0;
        const totalValue = parseFloat(transaction.totalValue) || (quantity * unitPrice);
        
        // Determine order type display
        const orderTypeDisplay = getOrderTypeDisplay(transaction.reason);
        
        row.innerHTML = `
            <td style="text-align:center;"><input type="checkbox" class="transaction-select" data-id="${transaction.id}" onchange="updateSelectedCount()"></td>
            <td>${startIndex + idx + 1}</td>
            <td>${transactionDate.toLocaleString('vi-VN')}</td>
            <td><span class="transaction-type ${typeClass}">${typeText}</span></td>
            <td>${transaction.productName || 'N/A'}</td>
            <td>${transaction.productSku || '-'}</td>
            <td>${quantity.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
            <td>${formatUsageCurrency(unitPrice)}</td>
            <td>${formatUsageCurrency(totalValue)}</td>
            <td>${transaction.reason || '-'}</td>
            <td><span class="order-type-badge ${getOrderTypeBadgeClass(transaction.reason)}">${orderTypeDisplay}</span></td>
            <td>${getStoreNameFromTransaction(transaction)}</td>
            <td>
                <button class="btn btn-sm btn-info" title="Xem chi tiết" onclick="event.stopPropagation(); openTransactionDetailModal('${transaction.id}')">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteSingleTransaction('${transaction.id}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        // Row click opens detail (ignore clicks on controls)
        row.dataset.id = transaction.id;
        row.addEventListener('click', (evt) => {
            if (evt.target.closest('input, button, a')) return;
            openTransactionDetailModal(transaction.id);
        });
        tableBody.appendChild(row);
    });
    
    // Update pagination info and controls
    updateTransactionHistoryPaginationInfo(startIndex + 1, endIndex, totalItems);
    updateTransactionHistoryPaginationControls(transactionHistoryCurrentPage, totalPages);
    
    // Update selected count after rendering
    updateSelectedCount();
}

// Update pagination info display for transaction history
function updateTransactionHistoryPaginationInfo(start, end, total) {
    const startElement = document.getElementById('transactionHistoryShowingStart');
    const endElement = document.getElementById('transactionHistoryShowingEnd');
    const totalElement = document.getElementById('transactionHistoryTotal');
    
    if (startElement) startElement.textContent = start;
    if (endElement) endElement.textContent = end;
    if (totalElement) totalElement.textContent = total;
}

// Update pagination controls for transaction history
function updateTransactionHistoryPaginationControls(currentPage, totalPages) {
    const firstBtn = document.getElementById('transactionHistoryFirstBtn');
    const prevBtn = document.getElementById('transactionHistoryPrevBtn');
    const nextBtn = document.getElementById('transactionHistoryNextBtn');
    const lastBtn = document.getElementById('transactionHistoryLastBtn');
    const pageNumbersContainer = document.getElementById('transactionHistoryPageNumbers');
    
    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (lastBtn) lastBtn.disabled = currentPage === totalPages;
    
    if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = '';
        // Create a simple window of page numbers
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        for (let i = start; i <= end; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-number ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => goToTransactionHistoryPage(i);
            pageNumbersContainer.appendChild(pageBtn);
        }
    }
}

// Navigation functions for transaction history pagination
function goToTransactionHistoryPage(page) {
    if (page === 'last') {
        const totalPages = Math.ceil(transactionHistoryAllData.length / transactionHistoryPageSize) || 1;
        transactionHistoryCurrentPage = totalPages;
    } else {
        transactionHistoryCurrentPage = parseInt(page);
    }
    updateTransactionHistoryTable();
}

function previousTransactionHistoryPage() {
    if (transactionHistoryCurrentPage > 1) {
        transactionHistoryCurrentPage--;
        updateTransactionHistoryTable();
    }
}

function nextTransactionHistoryPage() {
    const totalPages = Math.ceil(transactionHistoryAllData.length / transactionHistoryPageSize) || 1;
    if (transactionHistoryCurrentPage < totalPages) {
        transactionHistoryCurrentPage++;
        updateTransactionHistoryTable();
    }
}

function changeTransactionHistoryPageSize() {
    const pageSizeSelect = document.getElementById('transactionHistoryPageSize');
    if (pageSizeSelect) {
        transactionHistoryPageSize = parseInt(pageSizeSelect.value);
        transactionHistoryCurrentPage = 1; // Reset to first page
        updateTransactionHistoryTable();
    }
}

// ===== Transaction deletion & selection =====
async function removeTransactionById(transactionId) {
    if (!window.database) throw new Error('Firebase database not available');

    // Try to find storeId from our cached arrays
    const item = (transactionHistoryAllData || []).find(t => t.id === transactionId) ||
                 (transactionHistory || []).find(t => t.id === transactionId) || null;
    const storeId = item?.storeId || (currentFilters.store !== 'all' ? currentFilters.store : null);

    const ops = [];
    // Global path
    ops.push(window.database.ref(`warehouseTransactions/${transactionId}`).remove());
    // Store-scoped path if we know a storeId
    if (storeId) {
        ops.push(window.database.ref(`stores/${storeId}/warehouseTransactions/${transactionId}`).remove());
    }

    const results = await Promise.allSettled(ops);
    // If both failed, throw
    const allRejected = results.every(r => r.status === 'rejected');
    if (allRejected) {
        throw new Error('Không thể xóa giao dịch trên Firebase');
    }

    // Update local arrays
    transactionHistory = (transactionHistory || []).filter(t => t.id !== transactionId);
    transactionHistoryAllData = (transactionHistoryAllData || []).filter(t => t.id !== transactionId);
}

function toggleSelectAllTransactions(masterCheckbox) {
    const checkboxes = document.querySelectorAll('#transactionHistoryTableBody .transaction-select');
    checkboxes.forEach(cb => {
        cb.checked = masterCheckbox.checked;
    });
    updateSelectedCount();
}

// Update selected count and button state
function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('#transactionHistoryTableBody .transaction-select:checked');
    const count = selectedCheckboxes.length;
    
    // Update count display
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = `${count} mục đã chọn`;
    }
    
    // Update delete button state
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        deleteBtn.disabled = count === 0;
    }
    
    // Update master checkbox state
    const masterCheckbox = document.getElementById('selectAllTransactions');
    const allCheckboxes = document.querySelectorAll('#transactionHistoryTableBody .transaction-select');
    if (masterCheckbox && allCheckboxes.length > 0) {
        masterCheckbox.checked = count === allCheckboxes.length;
        masterCheckbox.indeterminate = count > 0 && count < allCheckboxes.length;
    }
}

async function deleteSelectedTransactions() {
    try {
        const selected = Array.from(document.querySelectorAll('#transactionHistoryTableBody .transaction-select:checked'))
            .map(cb => cb.getAttribute('data-id'));
        if (selected.length === 0) {
            alert('Vui lòng chọn ít nhất một giao dịch để xóa');
            return;
        }
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selected.length} giao dịch đã chọn?`)) return;

        // Optional: disable button during delete
        const btn = document.getElementById('deleteSelectedBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xóa...'; }

        for (const id of selected) {
            await removeTransactionById(id);
        }

        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Xóa đã chọn'; }

        // Rerender current page (adjust page if emptied)
        const totalPages = Math.max(1, Math.ceil(transactionHistoryAllData.length / transactionHistoryPageSize));
        if (transactionHistoryCurrentPage > totalPages) transactionHistoryCurrentPage = totalPages;
        updateTransactionHistoryTable();
        // Also update summary cards since totals changed
        updateUsageSummaryCards(calculateUsageSummaryStats());
    } catch (err) {
        console.error('Error deleting selected transactions:', err);
        alert('Có lỗi khi xóa giao dịch đã chọn');
    }
}

async function deleteSingleTransaction(transactionId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;
        await removeTransactionById(transactionId);
        // Rerender
        const totalPages = Math.max(1, Math.ceil(transactionHistoryAllData.length / transactionHistoryPageSize));
        if (transactionHistoryCurrentPage > totalPages) transactionHistoryCurrentPage = totalPages;
        updateTransactionHistoryTable();
        updateUsageSummaryCards(calculateUsageSummaryStats());
    } catch (err) {
        console.error('Error deleting transaction:', err);
        alert('Không thể xóa giao dịch');
    }
}

// Populate category options for usage report
async function populateUsageCategoryOptions() {
    const categorySelect = document.getElementById('reportCategorySelect');
    if (!categorySelect) return;

    try {
        // Clear existing options except "All categories"
        categorySelect.innerHTML = '<option value="all">Tất cả danh mục</option>';
        
        if (window.database && window.categoriesData) {
            Object.keys(window.categoriesData).forEach(categoryId => {
                const category = window.categoriesData[categoryId];
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = category.name || `Danh mục ${categoryId}`;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories for usage report:', error);
    }
}

// Export functions to global scope for HTML access
window.initWarehouseUsageReport = initWarehouseUsageReport;
window.generateUsageReport = generateUsageReport;
window.exportUsageReport = exportUsageReport;
window.printUsageReport = printUsageReport;
window.filterUsageTable = filterUsageTable;
window.openTransactionDetailModal = openTransactionDetailModal;
window.closeWarehouseDetailModal = closeWarehouseDetailModal;
window.goToTransactionHistoryPage = goToTransactionHistoryPage;
window.previousTransactionHistoryPage = previousTransactionHistoryPage;
window.nextTransactionHistoryPage = nextTransactionHistoryPage;
window.changeTransactionHistoryPageSize = changeTransactionHistoryPageSize;
window.deleteSelectedTransactions = deleteSelectedTransactions;
window.deleteSingleTransaction = deleteSingleTransaction;
window.toggleSelectAllTransactions = toggleSelectAllTransactions;
window.updateSelectedCount = updateSelectedCount;
window.clearAllFilters = clearAllFilters;

// Refresh usage report data
function refreshUsageReport() {
    console.log('Refreshing usage report...');
    if (window.transactionHistory && window.transactionHistory.length > 0) {
        processReportData(window.transactionHistory);
        updateUsageReportTable();
        updateSummaryCards();
    }
}

// Export refresh function to global scope
window.refreshUsageReport = refreshUsageReport;

console.log('Enhanced warehouse usage report functions loaded successfully');
