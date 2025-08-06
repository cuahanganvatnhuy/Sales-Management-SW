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
                const yearStart = new Date(now.getFullYear(), 0, 1);
                const yearEnd = new Date(now.getFullYear(), 11, 31);
                dateRangeSpan.textContent = `${formatUsageDate(yearStart)} - ${formatUsageDate(yearEnd)}`;
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
        const selectedStoreData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
        
        // Clear existing options except "All stores"
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
                    
                    // Select current store if available
                    if (selectedStoreData.id === storeId) {
                        option.selected = true;
                        currentFilters.store = storeId;
                    }
                    
                    storeSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading stores for usage report:', error);
    }
}

// Generate comprehensive usage report
async function generateUsageReport() {
    console.log('Generating usage report with filters:', currentFilters);
    
    try {
        // Show loading state
        showUsageReportLoading(true);
        
        // Update current filters from UI
        updateCurrentFilters();
        
        // Fetch transaction history and warehouse data
        await loadUsageReportData();
        
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
        throw new Error('Firebase database not available');
    }

    try {
        // Load transaction history
        const transactionsRef = window.database.ref('warehouseTransactions');
        const transactionsSnapshot = await transactionsRef.once('value');
        const transactions = transactionsSnapshot.val() || {};
        
        // Load current warehouse data
        const warehouseRef = window.database.ref('warehouse');
        const warehouseSnapshot = await warehouseRef.once('value');
        const warehouse = warehouseSnapshot.val() || {};
        
        // Filter transactions by date range and store
        transactionHistory = filterTransactionsByPeriod(transactions);
        usageReportData = {
            transactions: transactionHistory,
            warehouse: warehouse
        };
        
        console.log('Loaded usage report data:', {
            transactionCount: transactionHistory.length,
            warehouseProducts: Object.keys(warehouse).length
        });
        
    } catch (error) {
        console.error('Error loading usage report data:', error);
        throw error;
    }
}

// Filter transactions by selected period
function filterTransactionsByPeriod(transactions) {
    const now = new Date();
    let startDate, endDate;
    
    // Calculate date range based on selected period
    switch (currentFilters.period) {
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
            // For custom or unknown periods, use last 30 days
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = now;
    }
    
    // Filter transactions
    const filteredTransactions = [];
    Object.keys(transactions).forEach(transactionId => {
        const transaction = transactions[transactionId];
        const transactionDate = new Date(transaction.timestamp);
        
        // Check date range
        if (transactionDate >= startDate && transactionDate < endDate) {
            // Check store filter
            if (currentFilters.store === 'all' || transaction.storeId === currentFilters.store) {
                filteredTransactions.push({
                    id: transactionId,
                    ...transaction
                });
            }
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
    
    // Generate product usage table
    generateProductUsageTable();
    
    // Generate transaction history table
    generateTransactionHistoryTable();
    
    // Show or hide empty state
    toggleUsageReportEmptyState();
}

// Calculate summary statistics for usage report
function calculateUsageSummaryStats() {
    let totalMovements = 0;
    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalUsageValue = 0;
    
    transactionHistory.forEach(transaction => {
        totalMovements++;
        
        if (transaction.type === 'in') {
            totalStockIn += parseInt(transaction.quantity) || 0;
        } else if (transaction.type === 'out') {
            totalStockOut += parseInt(transaction.quantity) || 0;
            totalUsageValue += (parseInt(transaction.quantity) || 0) * (parseFloat(transaction.unitPrice) || 0);
        }
    });
    
    return {
        totalMovements,
        totalStockIn,
        totalStockOut,
        totalUsageValue
    };
}

// Update usage summary cards
function updateUsageSummaryCards(stats) {
    const totalMovementsEl = document.getElementById('totalMovements');
    const totalStockInEl = document.getElementById('totalStockIn');
    const totalStockOutEl = document.getElementById('totalStockOut');
    const totalUsageValueEl = document.getElementById('totalUsageValue');
    
    if (totalMovementsEl) totalMovementsEl.textContent = stats.totalMovements.toLocaleString();
    if (totalStockInEl) totalStockInEl.textContent = stats.totalStockIn.toLocaleString();
    if (totalStockOutEl) totalStockOutEl.textContent = stats.totalStockOut.toLocaleString();
    if (totalUsageValueEl) totalUsageValueEl.textContent = formatUsageCurrency(stats.totalUsageValue);
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
                <td colspan="10" class="text-center">
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
            <td>${product.beginningStock.toLocaleString()}</td>
            <td class="text-success">${product.stockIn.toLocaleString()}</td>
            <td class="text-danger">${product.stockOut.toLocaleString()}</td>
            <td>${product.endingStock.toLocaleString()}</td>
            <td><span class="usage-percentage ${usageClass}">${usagePercentage}%</span></td>
            <td>${formatUsageCurrency(product.usageValue)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Calculate product usage data
function calculateProductUsageData() {
    const productUsage = {};
    
    // Initialize with current warehouse data
    Object.keys(usageReportData.warehouse).forEach(productId => {
        const product = usageReportData.warehouse[productId];
        productUsage[productId] = {
            id: productId,
            name: product.name,
            sku: product.sku,
            category: product.category,
            beginningStock: parseInt(product.quantity) || 0,
            stockIn: 0,
            stockOut: 0,
            endingStock: parseInt(product.quantity) || 0,
            usageValue: 0
        };
    });
    
    // Process transactions
    transactionHistory.forEach(transaction => {
        const productId = transaction.productId;
        if (!productUsage[productId]) {
            // Product might have been deleted, create entry
            productUsage[productId] = {
                id: productId,
                name: transaction.productName || 'Sản phẩm đã xóa',
                sku: transaction.productSku || '-',
                category: transaction.productCategory || '-',
                beginningStock: 0,
                stockIn: 0,
                stockOut: 0,
                endingStock: 0,
                usageValue: 0
            };
        }
        
        const quantity = parseInt(transaction.quantity) || 0;
        const unitPrice = parseFloat(transaction.unitPrice) || 0;
        
        if (transaction.type === 'in') {
            productUsage[productId].stockIn += quantity;
            productUsage[productId].beginningStock -= quantity; // Adjust beginning stock
        } else if (transaction.type === 'out') {
            productUsage[productId].stockOut += quantity;
            productUsage[productId].beginningStock += quantity; // Adjust beginning stock
            productUsage[productId].usageValue += quantity * unitPrice;
        }
    });
    
    // Filter by category if selected
    let filteredProducts = Object.values(productUsage);
    if (currentFilters.category !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.category === currentFilters.category
        );
    }
    
    // Sort by usage value (descending)
    return filteredProducts.sort((a, b) => b.usageValue - a.usageValue);
}

// Export functions to global scope
window.initWarehouseUsageReport = initWarehouseUsageReport;
window.generateUsageReport = generateUsageReport;
window.filterUsageTable = filterUsageTable;
window.exportUsageReport = exportUsageReport;
window.printUsageReport = printUsageReport;

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

// Initialize charts (placeholder)
function initializeUsageCharts() {
    console.log('Usage charts initialization - placeholder');
}

function updateUsageCharts() {
    console.log('Usage charts update - placeholder');
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
        const typeFilter = document.getElementById('transactionTypeFilter');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedType = typeFilter ? typeFilter.value : 'all';
        
        const tableRows = document.querySelectorAll('#transactionHistoryTable tbody tr');
        tableRows.forEach(row => {
            const productName = row.cells[3]?.textContent.toLowerCase() || '';
            const transactionType = row.cells[2]?.textContent.toLowerCase() || '';
            
            const matchesSearch = productName.includes(searchTerm);
            const matchesType = selectedType === 'all' || 
                (selectedType === 'in' && transactionType.includes('nhập')) ||
                (selectedType === 'out' && transactionType.includes('xuất')) ||
                (selectedType === 'adjustment' && transactionType.includes('điều chỉnh'));
            
            if (matchesSearch && matchesType) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
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
                <td colspan="10" class="text-center">
                    <em>Không có giao dịch nào trong khoảng thời gian đã chọn</em>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate table rows
    transactionHistory.forEach((transaction, index) => {
        const row = document.createElement('tr');
        
        const transactionDate = new Date(transaction.timestamp);
        const typeClass = transaction.type === 'in' ? 'in' : transaction.type === 'out' ? 'out' : 'adjustment';
        const typeText = transaction.type === 'in' ? 'Nhập' : transaction.type === 'out' ? 'Xuất' : 'Điều chỉnh';
        
        const quantity = parseInt(transaction.quantity) || 0;
        const unitPrice = parseFloat(transaction.unitPrice) || 0;
        const totalValue = quantity * unitPrice;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${transactionDate.toLocaleString('vi-VN')}</td>
            <td><span class="transaction-type ${typeClass}">${typeText}</span></td>
            <td>${transaction.productName || 'N/A'}</td>
            <td>${transaction.productSku || '-'}</td>
            <td>${quantity.toLocaleString()}</td>
            <td>${formatUsageCurrency(unitPrice)}</td>
            <td>${formatUsageCurrency(totalValue)}</td>
            <td>${transaction.reason || '-'}</td>
            <td>${transaction.performedBy || 'Hệ thống'}</td>
        `;
        
        tableBody.appendChild(row);
    });
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

console.log('Enhanced warehouse usage report functions loaded successfully');
