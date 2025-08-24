// Warehouse Import Report - Báo cáo nhập kho
console.log('=== Warehouse Import Report Loading ===');

// Global variables
let importReportData = {};
let importTransactionHistory = [];
let importFilters = {
    period: 'all',
    store: 'all',
    category: 'all',
    supplier: 'all',
    product: 'all',
    status: 'all',
    startDate: null,
    endDate: null
};

// Pagination variables
let currentImportPage = 1;
let itemsPerImportPage = 5; // Reduced to 5 for testing
let totalImportPages = 1;
let allImportTransactions = [];

// Statistics filters
let importStatsFilters = {
    dateRange: 'all',
    store: 'all',
    product: 'all',
    category: 'all',
    supplier: 'all',
    startDate: null,
    endDate: null
};

// Initialize import report
function initWarehouseImportReport() {
    console.log('Initializing warehouse import report...');
    
    try {
        // Set default filters
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (selectedStoreId) {
            importFilters.store = selectedStoreId;
        }
        
        // Initialize statistics filters
        initImportStatsFilters();
        
        // Initialize main filters
        initImportFilters();
        
        // Load data and generate report
        loadImportReportData();
        
    } catch (error) {
        console.error('Error initializing import report:', error);
    }
}

// Load import report data
async function loadImportReportData() {
    try {
        console.log('Loading import report data...');
        
        // Load products data first to get correct units
        if (!window.products) {
            const productsRef = window.database.ref('products');
            const productsSnapshot = await productsRef.once('value');
            window.products = productsSnapshot.val() || {};
            console.log('Loaded products data:', Object.keys(window.products).length, 'products');
        }
        
        // Load categories data if not loaded
        if (!window.categories) {
            const categoriesRef = window.database.ref('categories');
            const categoriesSnapshot = await categoriesRef.once('value');
            window.categories = categoriesSnapshot.val() || {};
            console.log('Loaded categories data:', Object.keys(window.categories).length, 'categories');
        }
        
        // Load warehouse transactions (only 'in' type)
        const transactionsRef = window.database.ref('warehouseTransactions');
        const transactionsSnapshot = await transactionsRef.once('value');
        const allTransactions = transactionsSnapshot.val() || {};
        
        // Filter only import transactions
        const importTransactions = {};
        Object.keys(allTransactions).forEach(transactionId => {
            const transaction = allTransactions[transactionId];
            if (transaction.type === 'in' || transaction.type === 'stock_in') {
                importTransactions[transactionId] = transaction;
            }
        });
        
        // Apply filters
        let filteredTransactions = applyImportFilters(importTransactions);
        
        
        // Store globally
        window.importTransactionHistory = filteredTransactions;
        importTransactionHistory = filteredTransactions;
        
        importReportData = {
            transactions: filteredTransactions,
            totalTransactions: filteredTransactions.length
        };
        
        console.log('Import report data loaded:', {
            totalImportTransactions: filteredTransactions.length,
            filters: importFilters
        });
        
        // Process and display data with filtered transactions
        processImportReportData(filteredTransactions);
        
    } catch (error) {
        console.error('Error loading import report data:', error);
    }
}

// Apply import filters to transactions
function applyImportFilters(transactions) {
    let filtered = Object.entries(transactions);
    
    console.log('Applying filters:', importFilters);
    console.log('Total transactions before filter:', filtered.length);
    
    // Filter by store
    if (importFilters.store && importFilters.store !== 'all') {
        filtered = filtered.filter(([id, transaction]) => {
            return transaction.storeId === importFilters.store;
        });
        console.log('After store filter:', filtered.length);
    }
    
    // Filter by supplier
    if (importFilters.supplier && importFilters.supplier !== 'all') {
        filtered = filtered.filter(([id, transaction]) => {
            return transaction.supplierId === importFilters.supplier;
        });
        console.log('After supplier filter:', filtered.length);
    }
    
    // Filter by product
    if (importFilters.product && importFilters.product !== 'all') {
        console.log('Filtering by product:', importFilters.product);
        filtered = filtered.filter(([id, transaction]) => {
            if (!transaction.items) {
                console.log('Transaction has no items:', id);
                return false;
            }
            
            const hasProduct = transaction.items.some(item => {
                console.log('Checking item:', item);
                // Check both productId and productName for flexibility
                const match = item.productId === importFilters.product || 
                       item.productName === importFilters.product ||
                       (window.products && window.products[item.productId] && 
                        window.products[item.productId].name === importFilters.product);
                
                if (match) {
                    console.log('Found matching product in item:', item);
                }
                return match;
            });
            
            return hasProduct;
        });
        console.log('After product filter:', filtered.length);
    }
    
    // Filter by category
    if (importFilters.category && importFilters.category !== 'all') {
        filtered = filtered.filter(([id, transaction]) => {
            if (!transaction.items) return false;
            return transaction.items.some(item => {
                // Check if categoryId is directly available or needs to be resolved from product
                return item.categoryId === importFilters.category || 
                       (item.category && item.category === importFilters.category) ||
                       (window.products && window.products[item.productId] && 
                        window.products[item.productId].categoryId === importFilters.category);
            });
        });
    }
    
    // Filter by status
    if (importFilters.status && importFilters.status !== 'all') {
        filtered = filtered.filter(([id, transaction]) => {
            return transaction.status === importFilters.status;
        });
    }
    
    // Filter by date range
    if (importFilters.period && importFilters.period !== 'all') {
        const now = new Date();
        let startDate, endDate;
        
        switch (importFilters.period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
                break;
            case 'custom':
                if (importFilters.startDate) {
                    startDate = new Date(importFilters.startDate);
                    startDate.setHours(0, 0, 0, 0); // Start of day
                }
                if (importFilters.endDate) {
                    endDate = new Date(importFilters.endDate);
                    endDate.setHours(23, 59, 59, 999); // End of day
                }
                break;
            default:
                // If no period is set, use custom date range if available
                if (importFilters.startDate) {
                    startDate = new Date(importFilters.startDate);
                    startDate.setHours(0, 0, 0, 0);
                }
                if (importFilters.endDate) {
                    endDate = new Date(importFilters.endDate);
                    endDate.setHours(23, 59, 59, 999);
                }
                break;
        }
        
        if (startDate || endDate) {
            filtered = filtered.filter(([id, transaction]) => {
                const transactionDate = new Date(transaction.timestamp || transaction.date || transaction.createdAt);
                if (startDate && transactionDate < startDate) return false;
                if (endDate && transactionDate >= endDate) return false;
                return true;
            });
        }
    }
    
    // Convert back to object
    const result = {};
    filtered.forEach(([id, transaction]) => {
        result[id] = transaction;
    });
    
    return result;
}


// Filter import transactions by period
function filterImportTransactionsByPeriod(transactions) {
    const now = new Date();
    let startDate, endDate;
    
    switch (importFilters.period) {
        case 'all':
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
            break;
            
        default:
            startDate = new Date(0);
            endDate = new Date();
    }
    
    // Filter by date range
    const filteredTransactions = [];
    Object.keys(transactions).forEach(transactionId => {
        const transaction = transactions[transactionId];
        const transactionDate = new Date(transaction.timestamp);
        
        if (transactionDate >= startDate && transactionDate < endDate) {
            filteredTransactions.push({
                id: transactionId,
                ...transaction
            });
        }
    });
    
    return filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Process import report data
function processImportReportData(filteredTransactions) {
    // Convert filtered transactions object to array format for processing
    let transactionArray = Object.entries(filteredTransactions).map(([id, transaction]) => ({
        id,
        ...transaction
    }));
    
    // Apply statistics filters to the transaction array
    transactionArray = applyStatsFiltersToTransactions(transactionArray);
    
    // Calculate summary statistics
    const summaryStats = calculateImportSummaryStats(transactionArray);
    
    // Update summary cards
    updateImportSummaryCards(summaryStats);
    
    // Generate import table with filtered data
    generateImportReportTable(transactionArray);
    
    // Update charts if needed
    updateImportCharts(transactionArray);
}

// Calculate import summary statistics
function calculateImportSummaryStats(transactionArray) {
    let totalImports = 0;
    let totalQuantity = 0;
    let totalValue = 0;
    let supplierStats = {};
    let productStats = {};
    
    transactionArray.forEach(transaction => {
        totalImports++;
        
        const quantity = parseInt(transaction.quantity) || 0;
        const unitPrice = parseFloat(transaction.unitPrice) || 0;
        const value = quantity * unitPrice;
        
        totalQuantity += quantity;
        totalValue += value;
        
        // Supplier statistics
        const supplier = transaction.supplier || 'Không xác định';
        if (!supplierStats[supplier]) {
            supplierStats[supplier] = { imports: 0, quantity: 0, value: 0 };
        }
        supplierStats[supplier].imports++;
        supplierStats[supplier].quantity += quantity;
        supplierStats[supplier].value += value;
        
        // Product statistics
        const productName = transaction.productName || 'Không xác định';
        if (!productStats[productName]) {
            productStats[productName] = { imports: 0, quantity: 0, value: 0 };
        }
        productStats[productName].imports++;
        productStats[productName].quantity += quantity;
        productStats[productName].value += value;
    });
    
    return {
        totalImports,
        totalQuantity,
        totalValue,
        supplierStats,
        productStats
    };
}

// Update import summary cards
function updateImportSummaryCards(stats) {
    const totalImportsEl = document.getElementById('totalImportsCount');
    const totalQuantityEl = document.getElementById('totalImportQuantity');
    const totalValueEl = document.getElementById('totalImportValue');
    
    console.log('Updating import summary cards:', stats);
    
    if (totalImportsEl) {
        totalImportsEl.textContent = stats.totalImports.toLocaleString();
        console.log('Updated totalImportsCount:', stats.totalImports);
    } else {
        console.error('totalImportsCount element not found');
    }
    
    if (totalQuantityEl) {
        totalQuantityEl.textContent = stats.totalQuantity.toLocaleString();
    }
    
    if (totalValueEl) {
        totalValueEl.textContent = formatCurrency(stats.totalValue);
    }
}

// Generate import report table with pagination
function generateImportReportTable(transactionArray) {
    const tableBody = document.getElementById('importReportTableBody');
    if (!tableBody) return;
    
    // Store all transactions for pagination
    allImportTransactions = transactionArray || [];
    
    // Calculate pagination
    totalImportPages = Math.ceil(allImportTransactions.length / itemsPerImportPage);
    if (currentImportPage > totalImportPages) currentImportPage = 1;
    
    tableBody.innerHTML = '';
    
    if (!allImportTransactions || allImportTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    <em>Không có dữ liệu nhập kho phù hợp với bộ lọc đã chọn</em>
                </td>
            </tr>
        `;
        updateImportPagination();
        return;
    }
    
    // Get current page data
    const startIndex = (currentImportPage - 1) * itemsPerImportPage;
    const endIndex = startIndex + itemsPerImportPage;
    const currentPageData = allImportTransactions.slice(startIndex, endIndex);
    
    currentPageData.forEach((transaction, index) => {
        const row = document.createElement('tr');
        const transactionDate = new Date(transaction.timestamp);
        const quantity = parseInt(transaction.quantity) || 0;
        const unitPrice = parseFloat(transaction.unitPrice) || 0;
        const totalValue = quantity * unitPrice;
        
        // Get unit from product data if available
        let productUnit = 'Cái';
        
        // First try to get from transaction data
        if (transaction.unit) {
            productUnit = transaction.unit;
        }
        // Then try to get from product database
        else if (window.products && transaction.productId && window.products[transaction.productId]) {
            productUnit = window.products[transaction.productId].unit || productUnit;
        }
        // Also check if productSku exists and try to find product by SKU
        else if (window.products && transaction.productSku) {
            const productBySku = Object.values(window.products).find(p => p.sku === transaction.productSku);
            if (productBySku) {
                productUnit = productBySku.unit || productUnit;
            }
        }
        
        const globalIndex = startIndex + index + 1;
        
        // Get category name with fallback logic
        let categoryName = 'N/A';
        
        // First try transaction data
        if (transaction.categoryName) {
            categoryName = transaction.categoryName;
        }
        // Then try from product database
        else if (window.products && transaction.productId && window.products[transaction.productId]) {
            const product = window.products[transaction.productId];
            if (product.categoryId && window.categories && window.categories[product.categoryId]) {
                categoryName = window.categories[product.categoryId].name;
            }
        }
        // Fallback: assign category based on product name
        else if (transaction.productName) {
            const productName = transaction.productName.toLowerCase();
            if (productName.includes('phô mai') || productName.includes('sữa') || productName.includes('bơ')) {
                categoryName = 'Sữa và bơ sữa';
            } else if (productName.includes('khô') || productName.includes('gạo') || productName.includes('bột')) {
                categoryName = 'Thực phẩm khô';
            } else if (productName.includes('bánh') || productName.includes('kẹo') || productName.includes('snack')) {
                categoryName = 'Bánh kẹo';
            } else if (productName.includes('nước') || productName.includes('trà') || productName.includes('cà phê')) {
                categoryName = 'Nước giải khát';
            } else {
                categoryName = 'Thực phẩm khác';
            }
        }

        row.innerHTML = `
            <td>
                <input type="checkbox" class="import-row-checkbox" value="${transaction.id}" onchange="updateImportDeleteButton()">
            </td>
            <td>${globalIndex}</td>
            <td>${transactionDate.toLocaleDateString('vi-VN')}</td>
            <td>${transaction.productName || 'N/A'}</td>
            <td>${categoryName}</td>
            <td>${transaction.productSku || transaction.sku || 'N/A'}</td>
            <td>${quantity.toLocaleString()}</td>
            <td>${productUnit}</td>
            <td>${formatCurrency(unitPrice)}</td>
            <td>${formatCurrency(totalValue)}</td>
            <td>${transaction.storeName || transaction.storeId || 'N/A'}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteImportTransaction('${transaction.id}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update pagination controls
    updateImportPagination();
}

// Update import charts
function updateImportCharts(transactionArray) {
    // Chart implementation will be added later
}

// Format currency
function formatCurrency(amount) {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN').format(numAmount) + ' VNĐ';
}

// Toggle all import row selection
function toggleAllImportSelection() {
    const selectAllCheckbox = document.getElementById('selectAllImport');
    const rowCheckboxes = document.querySelectorAll('.import-row-checkbox');
    
    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateImportDeleteButton();
}

// Update delete button state based on selected rows
function updateImportDeleteButton() {
    const selectedCheckboxes = document.querySelectorAll('.import-row-checkbox:checked');
    const selectAllCheckbox = document.getElementById('selectAllImport');
    const allCheckboxes = document.querySelectorAll('.import-row-checkbox');
    
    // Update select all checkbox state
    if (selectedCheckboxes.length === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (selectedCheckboxes.length === allCheckboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
    
    // Show/hide bulk delete button
    const bulkDeleteBtn = document.getElementById('bulkDeleteImportBtn');
    if (bulkDeleteBtn) {
        if (selectedCheckboxes.length > 0) {
            bulkDeleteBtn.style.display = 'inline-block';
            bulkDeleteBtn.textContent = `Xóa ${selectedCheckboxes.length} mục đã chọn`;
        } else {
            bulkDeleteBtn.style.display = 'none';
        }
    }
}

// Delete single import transaction
function deleteImportTransaction(transactionId) {
    if (confirm('Bạn có chắc chắn muốn xóa giao dịch nhập kho này?')) {
        // Remove from Firebase
        if (window.database) {
            window.database.ref(`warehouseTransactions/${transactionId}`).remove()
                .then(() => {
                    alert('Đã xóa giao dịch thành công!');
                    loadImportReportData(); // Reload data
                })
                .catch((error) => {
                    console.error('Error deleting transaction:', error);
                    alert('Có lỗi xảy ra khi xóa giao dịch!');
                });
        }
    }
}

// Delete selected import transactions
function deleteSelectedImportTransactions() {
    const selectedCheckboxes = document.querySelectorAll('.import-row-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        alert('Vui lòng chọn ít nhất một giao dịch để xóa!');
        return;
    }
    
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} giao dịch đã chọn?`)) {
        const deletePromises = selectedIds.map(id => {
            return window.database.ref(`warehouseTransactions/${id}`).remove();
        });
        
        Promise.all(deletePromises)
            .then(() => {
                alert(`Đã xóa ${selectedIds.length} giao dịch thành công!`);
                loadImportReportData(); // Reload data
            })
            .catch((error) => {
                console.error('Error deleting transactions:', error);
                alert('Có lỗi xảy ra khi xóa các giao dịch!');
            });
    }
}

// Initialize statistics filters
function initImportStatsFilters() {
    console.log('Initializing import statistics filters...');
    
    // Setup date range filter
    const dateRangeSelect = document.getElementById('statsImportDateRange');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            importStatsFilters.dateRange = this.value;
            toggleImportStatsCustomDateRange();
        });
        
        // Initialize the custom date range visibility on load
        toggleImportStatsCustomDateRange();
    }
    
    // Setup custom date inputs
    const startDateInput = document.getElementById('statsImportStartDate');
    const endDateInput = document.getElementById('statsImportEndDate');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            importStatsFilters.startDate = this.value;
        });
        
        // Enable pointer events for the input itself
        startDateInput.style.pointerEvents = 'auto';
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', function() {
            importStatsFilters.endDate = this.value;
        });
        
        // Enable pointer events for the input itself
        endDateInput.style.pointerEvents = 'auto';
    }
    
    // Setup store filter
    const storeSelect = document.getElementById('statsImportStoreFilter');
    if (storeSelect) {
        storeSelect.addEventListener('change', function() {
            importStatsFilters.store = this.value;
        });
    }
    
    // Setup product filter
    const productSelect = document.getElementById('statsImportProductFilter');
    if (productSelect) {
        productSelect.addEventListener('change', function() {
            importStatsFilters.product = this.value;
        });
    }
    
    // Setup supplier filter
    const supplierSelect = document.getElementById('statsImportSupplierFilter');
    if (supplierSelect) {
        supplierSelect.addEventListener('change', function() {
            importStatsFilters.supplier = this.value;
        });
    }
    
    // Setup apply button
    const applyBtn = document.getElementById('applyImportStatsFiltersBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyImportStatsFilters);
    }
    
    // Setup reset button
    const resetBtn = document.getElementById('resetImportStatsFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetImportStatsFilters);
    }
    
    // Load filter options
    loadImportFilterOptions();
}

// Toggle custom date range visibility for statistics filters
function toggleImportStatsCustomDateRange() {
    const customDateRange = document.getElementById('statsImportCustomDateRange');
    if (customDateRange) {
        if (importStatsFilters.dateRange === 'custom') {
            customDateRange.classList.remove('hidden');
            customDateRange.style.display = 'block';
        } else {
            customDateRange.classList.add('hidden');
            customDateRange.style.display = 'none';
        }
    }
}

// Load filter options
async function loadImportFilterOptions() {
    if (!window.database) return;
    
    try {
        // Load stores
        const storesRef = window.database.ref('stores');
        const storesSnapshot = await storesRef.once('value');
        const stores = storesSnapshot.val() || {};
        
        const storeSelect = document.getElementById('statsImportStoreFilter');
        if (storeSelect) {
            // Clear existing options except "All"
            storeSelect.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
            
            Object.keys(stores).forEach(storeId => {
                const store = stores[storeId];
                const option = document.createElement('option');
                option.value = storeId;
                option.textContent = store.name || `Store ${storeId}`;
                storeSelect.appendChild(option);
            });
        }
        
        // Load products from products collection
        const productsRef = window.database.ref('products');
        const productsSnapshot = await productsRef.once('value');
        const products = productsSnapshot.val() || {};
        
        const productSelect = document.getElementById('statsImportProductFilter');
        if (productSelect) {
            productSelect.innerHTML = '<option value="all">Tất cả sản phẩm</option>';
            
            Object.keys(products).forEach(productId => {
                const product = products[productId];
                const option = document.createElement('option');
                option.value = productId;
                option.textContent = product.name || `Product ${productId}`;
                productSelect.appendChild(option);
            });
            
            console.log('Loaded products for filter:', Object.keys(products).length);
        }
        
        // Load suppliers from transactions
        const transactionsRef = window.database.ref('warehouseTransactions');
        const transactionsSnapshot = await transactionsRef.once('value');
        const transactions = transactionsSnapshot.val() || {};
        
        const suppliers = new Set();
        Object.values(transactions).forEach(transaction => {
            if ((transaction.type === 'in' || transaction.type === 'stock_in') && transaction.supplier) {
                suppliers.add(transaction.supplier);
            }
        });
        
        const supplierSelect = document.getElementById('statsImportSupplierFilter');
        if (supplierSelect) {
            supplierSelect.innerHTML = '<option value="all">Tất cả nhà cung cấp</option>';
            
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier;
                option.textContent = supplier;
                supplierSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error loading import filter options:', error);
    }
}

// Apply statistics filters
function applyImportStatsFilters() {
    console.log('Applying import statistics filters:', importStatsFilters);
    
    // Show filter status
    const filterStatus = document.getElementById('statsImportFilterStatus');
    const filterSummary = document.getElementById('statsImportFilterSummary');
    
    if (filterStatus && filterSummary) {
        const isFiltered = importStatsFilters.dateRange !== 'all' || 
                          importStatsFilters.store !== 'all' || 
                          importStatsFilters.product !== 'all' || 
                          importStatsFilters.supplier !== 'all';
        
        if (isFiltered) {
            filterStatus.style.display = 'block';
            
            let summaryText = 'Lọc theo: ';
            const filters = [];
            
            if (importStatsFilters.dateRange !== 'all') {
                filters.push(`Thời gian: ${getDateRangeText(importStatsFilters.dateRange)}`);
            }
            if (importStatsFilters.store !== 'all') {
                const storeSelect = document.getElementById('statsImportStoreFilter');
                const storeName = storeSelect.options[storeSelect.selectedIndex].text;
                filters.push(`Cửa hàng: ${storeName}`);
            }
            if (importStatsFilters.product !== 'all') {
                const productSelect = document.getElementById('statsImportProductFilter');
                const productName = productSelect.options[productSelect.selectedIndex].text;
                filters.push(`Sản phẩm: ${productName}`);
            }
            if (importStatsFilters.supplier !== 'all') {
                filters.push(`Nhà cung cấp: ${importStatsFilters.supplier}`);
            }
            
            filterSummary.textContent = summaryText + filters.join(', ');
        } else {
            filterStatus.style.display = 'none';
        }
    }
    
    // Reload data with filters
    loadImportReportData();
}

// Reset statistics filters
function resetImportStatsFilters() {
    importStatsFilters = {
        dateRange: 'all',
        store: 'all',
        product: 'all',
        supplier: 'all',
        startDate: null,
        endDate: null
    };
    
    // Reset UI elements
    const dateRangeSelect = document.getElementById('statsImportDateRange');
    if (dateRangeSelect) dateRangeSelect.value = 'all';
    
    const storeSelect = document.getElementById('statsImportStoreFilter');
    if (storeSelect) storeSelect.value = 'all';
    
    const productSelect = document.getElementById('statsImportProductFilter');
    if (productSelect) productSelect.value = 'all';
    
    const supplierSelect = document.getElementById('statsImportSupplierFilter');
    if (supplierSelect) supplierSelect.value = 'all';
    
    const startDateInput = document.getElementById('statsImportStartDate');
    if (startDateInput) startDateInput.value = '';
    
    const endDateInput = document.getElementById('statsImportEndDate');
    if (endDateInput) endDateInput.value = '';
    
    // Hide custom date range
    toggleImportStatsCustomDateRange();
    
    // Hide filter status
    const filterStatus = document.getElementById('statsImportFilterStatus');
    if (filterStatus) filterStatus.style.display = 'none';
    
    // Reload data
    loadImportReportData();
}

// Get date range text for display
function getDateRangeText(dateRange) {
    switch (dateRange) {
        case 'today': return 'Hôm nay';
        case 'week': return '7 ngày qua';
        case 'month': return '30 ngày qua';
        case 'quarter': return '3 tháng qua';
        case 'custom': return 'Tùy chọn';
        default: return 'Tất cả';
    }
}

// Apply statistics filters to transactions
function applyStatsFiltersToTransactions(transactions) {
    let filteredTransactions = [...transactions];
    
    // Apply date range filter
    if (importStatsFilters.dateRange !== 'all') {
        const now = new Date();
        let startDate, endDate;
        
        switch (importStatsFilters.dateRange) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'quarter':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'custom':
                if (importStatsFilters.startDate) {
                    startDate = new Date(importStatsFilters.startDate);
                }
                if (importStatsFilters.endDate) {
                    endDate = new Date(importStatsFilters.endDate);
                    endDate.setDate(endDate.getDate() + 1); // Include end date
                }
                break;
        }
        
        if (startDate || endDate) {
            filteredTransactions = filteredTransactions.filter(transaction => {
                const transactionDate = new Date(transaction.timestamp);
                if (startDate && transactionDate < startDate) return false;
                if (endDate && transactionDate >= endDate) return false;
                return true;
            });
        }
    }
    
    // Apply store filter
    if (importStatsFilters.store !== 'all') {
        filteredTransactions = filteredTransactions.filter(transaction => 
            transaction.storeId === importStatsFilters.store
        );
    }
    
    // Apply product filter
    if (importStatsFilters.product !== 'all') {
        filteredTransactions = filteredTransactions.filter(transaction => 
            transaction.productId === importStatsFilters.product
        );
    }
    
    // Apply supplier filter
    if (importStatsFilters.supplier !== 'all') {
        filteredTransactions = filteredTransactions.filter(transaction => 
            transaction.supplier === importStatsFilters.supplier
        );
    }
    
    return filteredTransactions;
}

// Initialize main import filters
function initImportFilters() {
    console.log('Initializing import filters...');
    
    // Date range filter
    const dateRangeSelect = document.getElementById('importDateRange');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            importFilters.period = this.value;
            toggleImportCustomDateRange();
            loadImportReportData();
        });
        
        // Initialize the custom date range visibility on load
        toggleImportCustomDateRange();
    }
    
    // Also handle custom date range inputs
    const startDateInput = document.getElementById('importStartDate');
    const endDateInput = document.getElementById('importEndDate');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            importFilters.startDate = this.value;
            importFilters.period = 'custom'; // Set to custom when date is changed
            console.log('Start date changed to:', this.value);
            loadImportReportData();
        });
        startDateInput.style.pointerEvents = 'auto';
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', function() {
            importFilters.endDate = this.value;
            importFilters.period = 'custom'; // Set to custom when date is changed
            console.log('End date changed to:', this.value);
            loadImportReportData();
        });
        endDateInput.style.pointerEvents = 'auto';
    }
    
    // Handle date input visibility for import report section
    const importDateInputs = document.querySelectorAll('#importStartDate, #importEndDate');
    const importDateWrappers = document.querySelectorAll('.date-input-wrapper');
    
    if (dateRangeSelect) {
        importDateWrappers.forEach(wrapper => {
            const label = wrapper.querySelector('label');
            if (label && (label.textContent.includes('Từ ngày') || label.textContent.includes('Đến ngày'))) {
                if (dateRangeSelect.value === 'custom') {
                    wrapper.style.display = 'block';
                } else {
                    wrapper.style.display = 'none';
                }
            }
        });
        
        // Also handle the parent container
        const customDateContainer = document.getElementById('importCustomDateRange');
        if (customDateContainer) {
            if (dateRangeSelect.value === 'custom') {
                customDateContainer.style.display = 'block';
            } else {
                customDateContainer.style.display = 'none';
            }
        }
    }
    
    // Store filter
    const storeSelect = document.getElementById('importStoreFilter');
    if (storeSelect) {
        storeSelect.addEventListener('change', function() {
            importFilters.store = this.value;
            loadImportReportData();
        });
        loadStoreOptions(storeSelect);
    }
    
    // Supplier filter
    const supplierSelect = document.getElementById('importSupplierFilter');
    if (supplierSelect) {
        supplierSelect.addEventListener('change', function() {
            importFilters.supplier = this.value;
            loadImportReportData();
        });
        loadSupplierOptions(supplierSelect);
    }
    
    // Product filter
    const productSelect = document.getElementById('importProductFilter');
    if (productSelect) {
        productSelect.addEventListener('change', function() {
            importFilters.product = this.value;
            loadImportReportData();
        });
        loadProductOptions(productSelect);
    }
    
    // Category filter
    const categorySelect = document.getElementById('importCategoryFilter');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            importFilters.category = this.value;
            loadImportReportData();
        });
        loadCategoryOptions(categorySelect);
    }
    
    // Status filter
    const statusSelect = document.getElementById('importStatusFilter');
    if (statusSelect) {
        statusSelect.addEventListener('change', function() {
            importFilters.status = this.value;
            loadImportReportData();
        });
    }
    
    // Apply filters button
    const applyBtn = document.getElementById('applyImportFiltersBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            console.log('Apply button clicked');
            
            // Read current filter values
            importFilters.period = document.getElementById('importPeriodFilter')?.value || 'all';
            importFilters.store = document.getElementById('importStoreFilter')?.value || 'all';
            importFilters.supplier = document.getElementById('importSupplierFilter')?.value || 'all';
            importFilters.product = document.getElementById('importProductFilter')?.value || 'all';
            importFilters.category = document.getElementById('importCategoryFilter')?.value || 'all';
            
            console.log('Current filters:', importFilters);
            
            loadImportReportData();
        });
    } else {
        console.log('Apply button not found');
    }
    
    // Reset filters button
    const resetBtn = document.getElementById('resetImportFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            console.log('Reset button clicked');
            resetImportFilters();
        });
    } else {
        console.log('Reset button not found');
    }
}

// Reset import filters
function resetImportFilters() {
    // Reset filter values
    importFilters = {
        period: 'all',
        store: 'all',
        category: 'all',
        supplier: 'all',
        product: 'all',
        status: 'all',
        startDate: null,
        endDate: null
    };
    
    // Reset UI elements
    const dateRangeSelect = document.getElementById('importDateRange');
    const storeSelect = document.getElementById('importStoreFilter');
    const supplierSelect = document.getElementById('importSupplierFilter');
    const productSelect = document.getElementById('importProductFilter');
    const categorySelect = document.getElementById('importCategoryFilter');
    const statusSelect = document.getElementById('importStatusFilter');
    const startDateInput = document.getElementById('importStartDate');
    const endDateInput = document.getElementById('importEndDate');
    const customDateRange = document.getElementById('importCustomDateRange');
    
    if (dateRangeSelect) dateRangeSelect.value = 'all';
    if (storeSelect) storeSelect.value = 'all';
    if (supplierSelect) supplierSelect.value = 'all';
    if (productSelect) productSelect.value = 'all';
    if (categorySelect) categorySelect.value = 'all';
    if (statusSelect) statusSelect.value = 'all';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (customDateRange) customDateRange.classList.add('hidden');
    
    // Reload data
    loadImportReportData();
}

// Toggle custom date range visibility for import filters
function toggleImportCustomDateRange() {
    const dateRangeSelect = document.getElementById('importDateRange');
    const customDateRange = document.getElementById('importCustomDateRange');
    
    if (dateRangeSelect && customDateRange) {
        if (dateRangeSelect.value === 'custom') {
            customDateRange.classList.remove('hidden');
            customDateRange.style.display = 'block';
        } else {
            customDateRange.classList.add('hidden');
            customDateRange.style.display = 'none';
            // Clear custom dates when not using custom range
            importFilters.startDate = null;
            importFilters.endDate = null;
            
            const startInput = document.getElementById('importStartDate');
            const endInput = document.getElementById('importEndDate');
            if (startInput) startInput.value = '';
            if (endInput) endInput.value = '';
        }
    }
}

// Load product options for filter
async function loadProductOptions(selectElement) {
    try {
        if (!window.database) return;
        
        const productsRef = window.database.ref('products');
        const snapshot = await productsRef.once('value');
        const products = snapshot.val() || {};
        
        // Clear existing options except "Tất cả"
        selectElement.innerHTML = '<option value="all">Tất cả sản phẩm</option>';
        
        // Add product options
        Object.entries(products).forEach(([productId, product]) => {
            if (product && product.name) {
                const option = document.createElement('option');
                option.value = product.name; // Use product name as value for easier filtering
                option.textContent = product.name;
                selectElement.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('Error loading product options:', error);
    }
}

// Load category options for filter
async function loadCategoryOptions(selectElement) {
    try {
        if (!window.database) return;
        
        const categoriesRef = window.database.ref('categories');
        const snapshot = await categoriesRef.once('value');
        const categories = snapshot.val() || {};
        
        // Clear existing options except "Tất cả"
        selectElement.innerHTML = '<option value="all">Tất cả danh mục</option>';
        
        // Add category options
        Object.entries(categories).forEach(([categoryId, category]) => {
            if (category && category.name) {
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = category.name;
                selectElement.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('Error loading category options:', error);
    }
}

// Load supplier options for filter
async function loadSupplierOptions(selectElement) {
    try {
        if (!window.database) return;
        
        const suppliersRef = window.database.ref('suppliers');
        const snapshot = await suppliersRef.once('value');
        const suppliers = snapshot.val() || {};
        
        // Clear existing options except "Tất cả"
        selectElement.innerHTML = '<option value="all">Tất cả nhà cung cấp</option>';
        
        // Add supplier options
        Object.entries(suppliers).forEach(([supplierId, supplier]) => {
            if (supplier && supplier.name) {
                const option = document.createElement('option');
                option.value = supplierId;
                option.textContent = supplier.name;
                selectElement.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('Error loading supplier options:', error);
    }
}

// Load store options for filter
async function loadStoreOptions(selectElement) {
    try {
        if (!window.database) return;
        
        const storesRef = window.database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};
        
        // Clear existing options except "Tất cả"
        selectElement.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
        
        // Add store options
        Object.entries(stores).forEach(([storeId, store]) => {
            if (store && store.name) {
                const option = document.createElement('option');
                option.value = storeId;
                option.textContent = store.name;
                selectElement.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('Error loading store options:', error);
    }
}

// Update import pagination
function updateImportPagination() {
    const paginationContainer = document.getElementById('importReportPagination');
    if (!paginationContainer) {
        console.error('Pagination container not found');
        return;
    }
    
    console.log('Updating pagination:', {
        totalPages: totalImportPages,
        currentPage: currentImportPage,
        totalItems: allImportTransactions.length
    });
    
    paginationContainer.innerHTML = '';
    
    // Always show pagination info, even for single page
    if (totalImportPages <= 1) {
        // Show info even for single page
        const infoDiv = document.createElement('div');
        infoDiv.className = 'pagination-info';
        infoDiv.innerHTML = `
            <span class="pagination-text">
                Hiển thị ${allImportTransactions.length} bản ghi
            </span>
        `;
        paginationContainer.appendChild(infoDiv);
        return;
    }
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentImportPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" onclick="changeImportPage(${currentImportPage - 1})" ${currentImportPage === 1 ? 'tabindex="-1"' : ''}>
            <i class="fas fa-chevron-left"></i> Trước
        </a>
    `;
    paginationContainer.appendChild(prevLi);
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentImportPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalImportPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentImportPage ? 'active' : ''}`;
        pageLi.innerHTML = `
            <a class="page-link" href="#" onclick="changeImportPage(${i})">${i}</a>
        `;
        paginationContainer.appendChild(pageLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentImportPage === totalImportPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" onclick="changeImportPage(${currentImportPage + 1})" ${currentImportPage === totalImportPages ? 'tabindex="-1"' : ''}>
            Sau <i class="fas fa-chevron-right"></i>
        </a>
    `;
    paginationContainer.appendChild(nextLi);
    
    // Add pagination info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'pagination-info';
    infoDiv.innerHTML = `
        <span class="pagination-text">
            Hiển thị ${Math.min((currentImportPage - 1) * itemsPerImportPage + 1, allImportTransactions.length)} - 
            ${Math.min(currentImportPage * itemsPerImportPage, allImportTransactions.length)} 
            trong tổng số ${allImportTransactions.length} bản ghi
        </span>
    `;
    paginationContainer.appendChild(infoDiv);
}

// Change import page
function changeImportPage(page) {
    if (page < 1 || page > totalImportPages || page === currentImportPage) return;
    
    currentImportPage = page;
    generateImportReportTable(allImportTransactions);
}

// Export functions to global scope
window.initImportFilters = initImportFilters;
window.initImportStatsFilters = initImportStatsFilters;
window.loadImportReportData = loadImportReportData;
window.resetImportFilters = resetImportFilters;
window.toggleImportCustomDateRange = toggleImportCustomDateRange;
window.toggleAllImportSelection = toggleAllImportSelection;
window.updateImportDeleteButton = updateImportDeleteButton;
window.deleteImportTransaction = deleteImportTransaction;
window.deleteSelectedImportTransactions = deleteSelectedImportTransactions;
window.resetImportFilters = resetImportFilters;
window.changeImportPage = changeImportPage;

console.log('Warehouse Import Report functions loaded successfully');