// Warehouse Export Report Functions
console.log('=== Warehouse Export Report Loading ===');

// Global variables for export report
let exportReportData = [];
let filteredExportData = [];
let currentExportPage = 1;
let exportItemsPerPage = 15;
let exportReportLoaded = false;

// Initialize export report
function initExportReport() {
    console.log('Initializing export report...');
    if (!exportReportLoaded) {
        loadExportReportData();
        setupExportReportEventListeners();
        setupStatsFilterEventListeners();
        exportReportLoaded = true;
    }
    refreshExportReportDisplay();
}

// Load export report data from Firebase
async function loadExportReportData() {
    try {
        showLoadingOverlay();
        console.log('Loading export report data...');
        
        if (!window.database) {
            throw new Error('Firebase database not initialized');
        }

        // Load warehouse transactions of type 'out' or 'export'
        const transactionsRef = window.database.ref('warehouseTransactions');
        const snapshot = await transactionsRef.once('value');
        const allTransactions = snapshot.val() || {};
        
        // Load products and stores data for enrichment
        const [productsSnapshot, storesSnapshot] = await Promise.all([
            window.database.ref('products').once('value'),
            window.database.ref('stores').once('value')
        ]);
        const productsData = productsSnapshot.val() || {};
        console.log('Loaded products:', Object.keys(productsData).length);
        // Debug: Log sample transaction to see actual structure
        const sampleKey = Object.keys(allTransactions)[0];
        if (sampleKey) {
            console.log('Sample transaction structure:', allTransactions[sampleKey]);
        }
        
        // Filter for export transactions and enrich with product/store data
        exportReportData = Object.keys(allTransactions)
            .map(key => {
                const transaction = { id: key, ...allTransactions[key] };
                
                console.log(`Processing transaction ${key}:`, {
                    productId: transaction.productId,
                    productName: transaction.productName,
                    storeId: transaction.storeId,
                    storeName: transaction.storeName,
                    performedBy: transaction.performedBy
                });
                
                // Try multiple ways to find product information
                let productId = transaction.productId || transaction.product_id || transaction.productID;
                
                if (productId && productsData[productId]) {
                    const product = productsData[productId];
                    transaction.productName = product.name || transaction.productName;
                    transaction.productSKU = product.sku || product.SKU || product.code || transaction.productSKU || 'N/A';
                    transaction.productUnit = product.unit || product.Unit || product.unitType || transaction.productUnit || 'cái';
                    console.log(`Found product by ID ${productId}:`, product);
                } else if (transaction.productName) {
                    // Try to find by name or existing SKU
                    const productByName = Object.values(productsData).find(p => 
                        p.name === transaction.productName || 
                        (transaction.productSKU && (p.sku === transaction.productSKU || p.SKU === transaction.productSKU))
                    );
                    
                    if (productByName) {
                        transaction.productSKU = productByName.sku || productByName.SKU || productByName.code || transaction.productSKU || 'N/A';
                        transaction.productUnit = productByName.unit || productByName.Unit || productByName.unitType || transaction.productUnit || 'cái';
                        console.log(`Found product by name:`, productByName);
                    } else {
                        // Keep existing values from transaction
                        transaction.productSKU = transaction.productSKU || transaction.sku || 'N/A';
                        transaction.productUnit = transaction.productUnit || transaction.unit || 'cái';
                        console.log(`No product found, keeping existing values:`, {
                            sku: transaction.productSKU,
                            unit: transaction.productUnit
                        });
                    }
                } else {
                    // Keep existing values from transaction
                    transaction.productSKU = transaction.productSKU || transaction.sku || 'N/A';
                    transaction.productUnit = transaction.productUnit || transaction.unit || 'cái';
                }
                
                // Get store name with better fallback logic
                transaction.storeName = getStoreNameFromExportTransaction(transaction);
                
                console.log(`Final transaction data:`, {
                    productName: transaction.productName,
                    productSKU: transaction.productSKU,
                    productUnit: transaction.productUnit,
                    storeName: transaction.storeName
                });
                
                return transaction;
            })
            .filter(transaction => 
                transaction.type === 'out' || 
                transaction.type === 'export' ||
                transaction.transactionType === 'out' ||
                transaction.transactionType === 'export'
            )
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log('Export transactions loaded:', exportReportData.length);
        
        // Load stores and products data for filtering
        await loadStoresForFilter();
        await loadProductsForFilter();
        
        // Load data for statistics filters
        await loadStoresForStatsFilter();
        await loadProductsForStatsFilter();
        
        // Load stores data globally for store name resolution
        await loadStoresDataGlobally();
        
        // Apply initial filters
        applyExportFilters();
        
        hideLoadingOverlay();
        
    } catch (error) {
        console.error('Error loading export report data:', error);
        showNotification('Lỗi tải dữ liệu báo cáo xuất kho: ' + error.message, 'error');
        hideLoadingOverlay();
    }
}

// Load stores for filter dropdown
async function loadStoresForFilter() {
    try {
        const storesRef = window.database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};
        
        const storeFilter = document.getElementById('exportStoreFilter');
        if (storeFilter) {
            // Clear existing options except "All stores"
            storeFilter.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
            
            Object.keys(stores).forEach(storeId => {
                const store = stores[storeId];
                const option = document.createElement('option');
                option.value = store.name; // Use store name as value instead of ID
                option.textContent = store.name || `Cửa hàng ${storeId}`;
                storeFilter.appendChild(option);
            });
            
            // Destroy existing Bootstrap Select if exists
            if (typeof $ !== 'undefined' && $.fn.selectpicker) {
                $(storeFilter).selectpicker('destroy');
            }
        }
    } catch (error) {
        console.error('Error loading stores for filter:', error);
    }
}

// Load products for filter dropdown
async function loadProductsForFilter() {
    try {
        const productsRef = window.database.ref('products');
        const snapshot = await productsRef.once('value');
        const products = snapshot.val() || {};
        
        const productFilter = document.getElementById('exportProductFilter');
        if (productFilter) {
            // Clear existing options except "All products"
            productFilter.innerHTML = '<option value="all">Tất cả sản phẩm</option>';
            
            Object.keys(products).forEach(productId => {
                const product = products[productId];
                const option = document.createElement('option');
                option.value = productId;
                option.textContent = `${product.name || `Sản phẩm ${productId}`} (${product.sku || 'N/A'})`;
                productFilter.appendChild(option);
            });
            
            // Destroy existing Bootstrap Select if exists and reinitialize
            if (typeof $ !== 'undefined' && $.fn.selectpicker) {
                $(productFilter).selectpicker('destroy');
                $(productFilter).selectpicker({
                    liveSearch: true,
                    liveSearchPlaceholder: 'Tìm kiếm sản phẩm...',
                    noneResultsText: 'Không tìm thấy sản phẩm nào',
                    size: 10
                });
                
                // Ensure single selection behavior
                $(productFilter).on('changed.bs.select', function(e, clickedIndex, isSelected, previousValue) {
                    if (isSelected && clickedIndex !== undefined) {
                        // Deselect all other options
                        $(this).find('option').prop('selected', false);
                        // Select only the clicked option
                        $(this).find('option').eq(clickedIndex).prop('selected', true);
                        $(this).selectpicker('refresh');
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading products for filter:', error);
    }
}

// Load stores data globally for store name resolution
async function loadStoresDataGlobally() {
    try {
        const storesRef = window.database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};
        
        // Store globally for use in getStoreNameFromExportTransaction
        window.storesData = stores;
        
        console.log('Loaded stores data globally:', Object.keys(stores).length, 'stores');
    } catch (error) {
        console.error('Error loading stores data globally:', error);
    }
}

// Setup event listeners for export report
function setupExportReportEventListeners() {
    // Date range filter
    const dateRangeSelect = document.getElementById('exportDateRange');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            toggleCustomDateRange();
            applyExportFilters();
        });
        
        // Initialize custom date range visibility on load
        setTimeout(() => {
            toggleCustomDateRange();
        }, 100);
    }
    
    // Custom date inputs
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput) {
        startDateInput.addEventListener('change', applyExportFilters);
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', applyExportFilters);
    }
    
    // Store filter
    const storeFilter = document.getElementById('exportStoreFilter');
    if (storeFilter) {
        storeFilter.addEventListener('change', applyExportFilters);
    }
    
    // Reason filter
    const reasonFilter = document.getElementById('exportReasonFilter');
    if (reasonFilter) {
        reasonFilter.addEventListener('change', applyExportFilters);
    }
    
    // Product search autocomplete
    setupProductSearchAutocomplete();
    
    // Product filter (hidden input)
    const productFilter = document.getElementById('exportProductFilter');
    if (productFilter) {
        productFilter.addEventListener('change', applyExportFilters);
    }
    
    // Status filter
    const statusFilter = document.getElementById('exportStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyExportFilters);
    }
    
    // Export to Excel button
    const exportBtn = document.getElementById('exportToExcelBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportExportReportToExcel);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshExportReportBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadExportReportData();
        });
    }
}

// Toggle custom date range visibility
function toggleCustomDateRange() {
    const dateRangeSelect = document.getElementById('exportDateRange');
    const customDateRange = document.getElementById('customDateRange');
    
    console.log('🔄 Toggling main export custom date range. Current value:', dateRangeSelect?.value);
    
    if (dateRangeSelect && customDateRange) {
        // Force hide first
        customDateRange.classList.add('hidden');
        customDateRange.classList.remove('visible');
        
        if (dateRangeSelect.value === 'custom') {
            console.log('✅ Showing main export custom date range');
            customDateRange.classList.remove('hidden');
            customDateRange.classList.add('visible');
        } else {
            console.log('❌ Hiding main export custom date range');
            // Clear custom date inputs when switching away from custom
            const startDate = document.getElementById('startDate');
            const endDate = document.getElementById('endDate');
            if (startDate) startDate.value = '';
            if (endDate) endDate.value = '';
        }
    }
}

// Setup Product Search Autocomplete
function setupProductSearchAutocomplete() {
    const searchInput = document.getElementById('exportProductSearch');
    const suggestionsContainer = document.getElementById('productSuggestions');
    const clearBtn = document.getElementById('clearProductSearch');
    const hiddenFilter = document.getElementById('exportProductFilter');
    
    let products = [];
    let selectedProductId = 'all';
    
    // Load products from Firebase database
    async function loadProducts() {
        try {
            if (window.database) {
                console.log('🔄 Loading products from Firebase...');
                const snapshot = await window.database.ref('products').once('value');
                const data = snapshot.val();
                
                if (data) {
                    products = Object.keys(data).map(key => ({
                        id: key,
                        name: data[key].name || 'Không có tên',
                        sku: data[key].sku || '',
                        unit: data[key].unit || 'cái',
                        stock: data[key].stock || 0,
                        category: data[key].category || 'Chưa phân loại'
                    }));
                    console.log('📦 Loaded products from Firebase:', products.length);
                } else {
                    console.log('⚠️ No products found in Firebase');
                    products = [];
                }
            } else if (window.warehouseData && Array.isArray(window.warehouseData)) {
                products = window.warehouseData.map(item => ({
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                    unit: item.unit,
                    stock: item.stock || 0,
                    category: item.category || 'Chưa phân loại'
                }));
                console.log('📦 Loaded products from warehouseData:', products.length);
            } else {
                console.log('⚠️ No database connection or warehouse data available');
                products = [];
            }
        } catch (error) {
            console.error('❌ Error loading products:', error);
            products = [];
        }
    }
    
    // Filter products based on search term
    function filterProducts(searchTerm) {
        if (!searchTerm.trim()) {
            return products.slice(0, 15); // Show first 15 products when no search
        }
        
        const term = searchTerm.toLowerCase();
        return products.filter(product => 
            product.name.toLowerCase().includes(term) ||
            product.sku.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term)
        ).slice(0, 15);
    }
    
    // Render suggestions
    function renderSuggestions(filteredProducts) {
        let html = `
            <div class="suggestion-item all-products" data-value="all">
                <i class="fas fa-list"></i>
                <span>Tất cả sản phẩm</span>
            </div>
        `;
        
        filteredProducts.forEach(product => {
            html += `
                <div class="suggestion-item" data-value="${product.id}">
                    <i class="fas fa-box"></i>
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-details">SKU: ${product.sku} • ${product.category}</div>
                        <div class="product-stock">Tồn kho: ${product.stock} ${product.unit}</div>
                    </div>
                </div>
            `;
        });
        
        suggestionsContainer.innerHTML = html;
        
        // Add click listeners
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                selectProduct(item.dataset.value, item);
            });
        });
    }
    
    // Select a product
    function selectProduct(productId, element) {
        selectedProductId = productId;
        hiddenFilter.value = productId;
        
        if (productId === 'all') {
            searchInput.value = '';
            clearBtn.style.display = 'none';
        } else {
            const product = products.find(p => p.id === productId);
            if (product) {
                searchInput.value = product.name;
                clearBtn.style.display = 'inline-block';
            }
        }
        
        hideSuggestions();
        
        // Trigger change event for filtering
        hiddenFilter.dispatchEvent(new Event('change'));
    }
    
    // Show suggestions
    function showSuggestions() {
        suggestionsContainer.style.display = 'block';
        searchInput.parentElement.style.borderRadius = '8px 8px 0 0';
    }
    
    // Hide suggestions
    function hideSuggestions() {
        suggestionsContainer.style.display = 'none';
        searchInput.parentElement.style.borderRadius = '8px';
    }
    
    // Search input events
    searchInput.addEventListener('input', async (e) => {
        const searchTerm = e.target.value;
        
        if (searchTerm.trim() === '') {
            clearBtn.style.display = 'none';
            selectedProductId = 'all';
            hiddenFilter.value = 'all';
            hiddenFilter.dispatchEvent(new Event('change'));
        } else {
            clearBtn.style.display = 'inline-block';
        }
        
        await loadProducts();
        const filtered = filterProducts(searchTerm);
        renderSuggestions(filtered);
        showSuggestions();
    });
    
    searchInput.addEventListener('focus', async () => {
        await loadProducts();
        const filtered = filterProducts(searchInput.value);
        renderSuggestions(filtered);
        showSuggestions();
    });
    
    searchInput.addEventListener('blur', (e) => {
        setTimeout(() => {
            if (!suggestionsContainer.contains(document.activeElement)) {
                hideSuggestions();
            }
        }, 150);
    });
    
    // Clear button
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        selectedProductId = 'all';
        hiddenFilter.value = 'all';
        hiddenFilter.dispatchEvent(new Event('change'));
        searchInput.focus();
    });
    
    // Keyboard navigation
    let selectedIndex = -1;
    searchInput.addEventListener('keydown', (e) => {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                selectProduct(items[selectedIndex].dataset.value, items[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });
    
    function updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }
    
    // Initialize - Load products from Firebase when setting up
    loadProducts();
}

// Apply filters to export report data
function applyExportFilters() {
    const dateRange = document.getElementById('exportDateRange')?.value || 'all';
    const storeFilter = document.getElementById('exportStoreFilter')?.value || 'all';
    const reasonFilter = document.getElementById('exportReasonFilter')?.value || 'all';
    const productFilter = document.getElementById('exportProductFilter')?.value || 'all';
    
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    console.log('Applying filters:', { dateRange, storeFilter, reasonFilter, productFilter, startDate, endDate });
    
    filteredExportData = exportReportData.filter(transaction => {
        // Date filter
        if (dateRange !== 'all') {
            const transactionDate = new Date(transaction.timestamp);
            const now = new Date();
            
            switch (dateRange) {
                case 'today':
                    if (!isSameDay(transactionDate, now)) return false;
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (transactionDate < weekAgo) return false;
                    break;
                case 'month':
                    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    if (transactionDate < monthAgo) return false;
                    break;
                case 'quarter':
                    const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                    if (transactionDate < quarterAgo) return false;
                    break;
                case 'custom':
                    if (startDate) {
                        const start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        if (transactionDate < start) return false;
                    }
                    
                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (transactionDate > end) return false;
                    }
                    break;
            }
        }
        
        // Apply custom date range even when dateRange is 'all' if dates are selected
        if (dateRange === 'all' && (startDate || endDate)) {
            const transactionDate = new Date(transaction.timestamp);
            
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (transactionDate < start) return false;
            }
            
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (transactionDate > end) return false;
            }
        }
        
        // Store filter
        if (storeFilter !== 'all') {
            console.log('Checking store filter:', {
                storeFilter,
                transactionStoreId: transaction.storeId,
                transactionStoreName: transaction.storeName,
                transactionPerformedBy: transaction.performedBy
            });
            
            if (transaction.storeId !== storeFilter && 
                transaction.storeName !== storeFilter &&
                transaction.performedBy !== storeFilter) {
                return false;
            }
        }
        
        // Reason filter
        if (reasonFilter !== 'all') {
            const transactionReason = (transaction.reason || '').toLowerCase();
            const filterReason = reasonFilter.toLowerCase();
            
            // Map filter values to possible reason values
            switch (filterReason) {
                case 'sale':
                    if (!transactionReason.includes('sale') && 
                        !transactionReason.includes('bán') &&
                        !transactionReason.includes('sell')) {
                        return false;
                    }
                    break;
                case 'return':
                    if (!transactionReason.includes('return') && 
                        !transactionReason.includes('trả') &&
                        !transactionReason.includes('hoàn')) {
                        return false;
                    }
                    break;
                case 'transfer':
                    if (!transactionReason.includes('transfer') && 
                        !transactionReason.includes('chuyển') &&
                        !transactionReason.includes('move')) {
                        return false;
                    }
                    break;
                case 'damaged':
                    if (!transactionReason.includes('damaged') && 
                        !transactionReason.includes('hỏng') &&
                        !transactionReason.includes('broken')) {
                        return false;
                    }
                    break;
                case 'expired':
                    if (!transactionReason.includes('expired') && 
                        !transactionReason.includes('hết hạn') &&
                        !transactionReason.includes('expire')) {
                        return false;
                    }
                    break;
                default:
                    if (transaction.reason !== reasonFilter) {
                        return false;
                    }
            }
        }
        
        // Product filter
        if (productFilter !== 'all') {
            if (transaction.productId !== productFilter && 
                transaction.productName !== productFilter) {
                return false;
            }
        }
        
        
        return true;
    });
    
    console.log('Filtered data:', filteredExportData.length);
    
    // Reset to first page
    currentExportPage = 1;
    
    // Update display
    updateExportStatistics();
    displayExportReportTable();
    updateExportPagination();
    return filteredExportData.length;
}

// Pagination variables
let exportPageSize = 10;

// Update pagination for export report
function updateExportPagination() {
    const totalItems = filteredExportData.length;
    const totalPages = Math.ceil(totalItems / exportPageSize);
    const paginationContainer = document.getElementById('exportReportPagination');
    
    if (!paginationContainer) return;
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `<li class="page-item ${currentExportPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToExportPage(${currentExportPage - 1})">‹</a>
    </li>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentExportPage - 2 && i <= currentExportPage + 2)) {
            paginationHTML += `<li class="page-item ${i === currentExportPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToExportPage(${i})">${i}</a>
            </li>`;
        } else if (i === currentExportPage - 3 || i === currentExportPage + 3) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Next button
    paginationHTML += `<li class="page-item ${currentExportPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToExportPage(${currentExportPage + 1})">›</a>
    </li>`;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Go to specific page
function goToExportPage(page) {
    const totalPages = Math.ceil(filteredExportData.length / exportPageSize);
    if (page < 1 || page > totalPages) return;
    
    currentExportPage = page;
    updateExportPagination();
    displayExportReportTable();
}

// Display export report table with pagination
function displayExportReportTable() {
    const tableBody = document.getElementById('exportReportTableBody');
    if (!tableBody) return;
    
    const startIndex = (currentExportPage - 1) * exportPageSize;
    const endIndex = Math.min(startIndex + exportPageSize, filteredExportData.length);
    const pageData = filteredExportData.slice(startIndex, endIndex);
    
    let html = '';
    pageData.forEach((transaction, index) => {
        const globalIndex = startIndex + index;
        
        html += `
            <tr>
                <td>${globalIndex + 1}</td>
                <td>${formatDate(transaction.timestamp)}</td>
                <td><span class="status-badge export-badge">XUẤT KHO</span></td>
                <td>${transaction.productName || 'N/A'}</td>
                <td>${transaction.sku || 'N/A'}</td>
                <td class="${transaction.quantity < 0 ? 'text-danger' : 'text-primary'}">${Math.abs(transaction.quantity)}</td>
                <td>kg</td>
                <td>${formatCurrency(transaction.unitPrice || 0)}</td>
                <td class="text-success">${formatCurrency(transaction.totalValue || 0)}</td>
                <td>${getReasonText(transaction.reason)}</td>
                <td>${transaction.orderType || 'N/A'}</td>
                <td>${transaction.storeName || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="printExportReceipt('${transaction.id || globalIndex.toString()}')" title="In phiếu">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteExportRecord('${transaction.id || globalIndex.toString()}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Print single export receipt
function printExportReceipt(id) {
    const transaction = filteredExportData.find((item, index) => 
        (item.id || index.toString()) === id
    );
    
    if (transaction) {
        printExportReceipts([transaction]);
    }
}

// Delete single export record
function deleteExportRecord(id) {
    const transaction = filteredExportData.find((item, index) => 
        (item.id || index.toString()) === id
    );
    
    if (transaction && confirm(`Bạn có chắc chắn muốn xóa bản ghi xuất kho "${transaction.productName || 'N/A'}"?`)) {
        // Implementation for deleting single export
        console.log('Deleting export:', id);
        
        // Refresh data
        loadExportReportData();
        
        alert('Đã xóa thành công bản ghi xuất kho!');
    }
}

// Print export receipts
function printExportReceipts(transactions) {
    let printContent = `
        <html>
        <head>
            <title>Phiếu Xuất Kho</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { page-break-after: always; margin-bottom: 30px; }
                .receipt:last-child { page-break-after: auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h2 { margin: 0; color: #333; }
                .info { margin: 20px 0; }
                .info div { margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .total { font-weight: bold; background-color: #f9f9f9; }
                .signature { margin-top: 40px; display: flex; justify-content: space-between; }
                .signature div { text-align: center; width: 200px; }
            </style>
        </head>
        <body>
    `;
    
    transactions.forEach((transaction, index) => {
        printContent += `
            <div class="receipt">
                <div class="header">
                    <h2>PHIẾU XUẤT KHO</h2>
                    <p>Số: ${transaction.id || `XK${Date.now()}`}</p>
                </div>
                
                <div class="info">
                    <div><strong>Ngày xuất:</strong> ${formatDate(transaction.timestamp)}</div>
                    <div><strong>Cửa hàng:</strong> ${transaction.storeName || 'N/A'}</div>
                    <div><strong>Lý do xuất:</strong> ${getReasonText(transaction.reason)}</div>
                    <div><strong>Loại đơn hàng:</strong> ${transaction.orderType || 'N/A'}</div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên sản phẩm</th>
                            <th>SKU</th>
                            <th>Số lượng</th>
                            <th>Đơn vị</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>${transaction.productName || 'N/A'}</td>
                            <td>${transaction.sku || 'N/A'}</td>
                            <td>${Math.abs(transaction.quantity)}</td>
                            <td>kg</td>
                            <td>${formatCurrency(transaction.unitPrice || 0)}</td>
                            <td>${formatCurrency(transaction.totalValue || 0)}</td>
                        </tr>
                        <tr class="total">
                            <td colspan="6"><strong>Tổng cộng:</strong></td>
                            <td><strong>${formatCurrency(transaction.totalValue || 0)}</strong></td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="signature">
                    <div>
                        <p><strong>Người xuất</strong></p>
                        <br><br>
                        <p>_________________</p>
                    </div>
                    <div>
                        <p><strong>Người nhận</strong></p>
                        <br><br>
                        <p>_________________</p>
                    </div>
                    <div>
                        <p><strong>Thủ kho</strong></p>
                        <br><br>
                        <p>_________________</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    printContent += `
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Get store name from export transaction - only from transaction data, not current selection
function getStoreNameFromExportTransaction(transaction) {
    console.log('🔍 DEBUG: thông tin hàng:', {
        id: transaction.id,
        performedBy: transaction.performedBy,
        storeName: transaction.storeName,
        storeId: transaction.storeId,
        fromStore: transaction.fromStore,
        sourceStore: transaction.sourceStore,
        notes: transaction.notes,
        allFields: Object.keys(transaction)
    });
    
    // First try to get from performedBy field (this is the actual store that performed the transaction)
    if (transaction.performedBy && transaction.performedBy !== 'Hệ thống' && transaction.performedBy !== 'System') {
        console.log('✅ Found store name from performedBy:', transaction.performedBy);
        return transaction.performedBy;
    }
    
    // Then try storeName field directly (if it was saved in the transaction)
    if (transaction.storeName && transaction.storeName !== 'N/A' && transaction.storeName !== 'Không xác định') {
        console.log('✅ Found store name from storeName:', transaction.storeName);
        return transaction.storeName;
    }
    
    // Try to get store name from storeId using global stores data (this is the original store)
    if (transaction.storeId && window.storesData && window.storesData[transaction.storeId]) {
        const storeName = window.storesData[transaction.storeId].name;
        console.log('✅ Found store name from storeId lookup:', storeName);
        return storeName;
    }
    
    // Try other transaction fields that might contain store info
    if (transaction.fromStore && window.storesData && window.storesData[transaction.fromStore]) {
        const storeName = window.storesData[transaction.fromStore].name;
        console.log('✅ Found store name from fromStore:', storeName);
        return storeName;
    }
    
    if (transaction.sourceStore && window.storesData && window.storesData[transaction.sourceStore]) {
        const storeName = window.storesData[transaction.sourceStore].name;
        console.log('✅ Found store name from sourceStore:', storeName);
        return storeName;
    }
    
    // Last resort: try to extract from any field that might contain store info
    if (transaction.notes && transaction.notes.includes('cửa hàng')) {
        const match = transaction.notes.match(/cửa hàng\s+([^,\s]+)/i);
        if (match) {
            console.log('✅ Found store name from notes:', match[1]);
            return match[1];
        }
    }
    
    console.log('❌ No store name found, returning "Không xác định"');
    console.log('🔍 Available stores data:', window.storesData ? Object.keys(window.storesData) : 'Not loaded');
    return 'Không xác định';
}

// Convert reason to Vietnamese text
function getReasonText(reason) {
    if (!reason) return 'Không xác định';
    
    const reasonLower = reason.toLowerCase();
    
    // Map English reasons to Vietnamese
    if (reasonLower.includes('sale') || reasonLower.includes('sell')) {
        return 'Bán hàng';
    }
    if (reasonLower.includes('return')) {
        return 'Trả hàng';
    }
    if (reasonLower.includes('transfer')) {
        return 'Chuyển kho';
    }
    if (reasonLower.includes('damaged') || reasonLower.includes('damage')) {
        return 'Hàng hỏng';
    }
    if (reasonLower.includes('expired') || reasonLower.includes('expire')) {
        return 'Hết hạn';
    }
    
    // Return original if already in Vietnamese or unknown
    return reason;
}

function updateExportStatistics() {
    const totalExports = filteredExportData.length;
    const totalQuantity = filteredExportData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = filteredExportData.reduce((sum, item) => sum + (item.totalValue || (item.quantity * item.unitPrice) || 0), 0);
    
    // Update DOM elements
    const totalExportsEl = document.getElementById('totalExportsCount');
    const totalQuantityEl = document.getElementById('totalExportQuantity');
    const totalValueEl = document.getElementById('totalExportValue');
    
    if (totalExportsEl) totalExportsEl.textContent = totalExports;
    if (totalQuantityEl) totalQuantityEl.textContent = totalQuantity;
    if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);
}

// Display export report table
function displayExportReportTable() {
    const tbody = document.getElementById('exportReportTableBody');
    if (!tbody) {
        console.error('Export report table body not found');
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentExportPage - 1) * exportItemsPerPage;
    const endIndex = startIndex + exportItemsPerPage;
    const pageData = filteredExportData.slice(startIndex, endIndex);
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Không có dữ liệu xuất kho</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Populate table rows
    pageData.forEach((transaction, index) => {
        const row = createExportReportRow(transaction, startIndex + index + 1);
        tbody.appendChild(row);
    });
}

// Create export report table row
function createExportReportRow(transaction, stt) {
    const row = document.createElement('tr');
    row.className = 'report-row';
    row.onclick = () => openExportDetailModal(transaction.id);
    
    const timestamp = new Date(transaction.timestamp);
    const formattedDate = timestamp.toLocaleDateString('vi-VN');
    const formattedTime = timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    row.innerHTML = `
        <td>
            <input type="checkbox" class="export-checkbox" value="${transaction.id}" onchange="updateExportSelection(event)">
        </td>
        <td>${stt}</td>
        <td>
            <div class="datetime-cell">
                <div class="date">${formattedDate}</div>
                <div class="time">${formattedTime}</div>
            </div>
        </td>
        <td>
            <span class="transaction-type ${transaction.type || 'out'}">${getTransactionTypeText(transaction.type || 'out')}</span>
        </td>
        <td class="product-name">${transaction.productName || 'N/A'}</td>
        <td>${transaction.productSKU || 'N/A'}</td>
        <td class="quantity">${transaction.quantity || 0}</td>
        <td class="unit">${transaction.productUnit || 'không có'}</td>
        <td class="price">${formatCurrency(transaction.unitPrice || 0)}</td>
        <td class="total-value">${formatCurrency(transaction.totalValue || (transaction.quantity * transaction.unitPrice) || 0)}</td>
        <td class="reason">${getReasonText(transaction.reason)}</td>
        <td class="order-type">${getOrderTypeText(transaction.orderType)}</td>
        <td class="store-name">${transaction.storeName || 'N/A'}</td>
        <td>
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="event.stopPropagation(); openExportDetailModal('${transaction.id}')" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action btn-edit" onclick="event.stopPropagation(); editExportTransaction('${transaction.id}')" title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Update export pagination
function updateExportPagination() {
    const totalPages = Math.ceil(filteredExportData.length / exportItemsPerPage);
    const paginationContainer = document.getElementById('exportReportPagination');
    
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    if (currentExportPage > 1) {
        const prevBtn = createPaginationButton('‹', currentExportPage - 1);
        paginationContainer.appendChild(prevBtn);
    }
    
    // Page numbers
    const startPage = Math.max(1, currentExportPage - 2);
    const endPage = Math.min(totalPages, currentExportPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPaginationButton(i, i);
        if (i === currentExportPage) {
            pageBtn.classList.add('active');
        }
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next button
    if (currentExportPage < totalPages) {
        const nextBtn = createPaginationButton('›', currentExportPage + 1);
        paginationContainer.appendChild(nextBtn);
    }
}

// Create pagination button
function createPaginationButton(text, page) {
    const button = document.createElement('button');
    button.className = 'pagination-btn';
    button.textContent = text;
    button.onclick = () => goToExportPage(page);
    return button;
}

// Go to specific export page
function goToExportPage(page) {
    const totalPages = Math.ceil(filteredExportData.length / exportItemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentExportPage = page;
    displayExportReportTable();
    updateExportPagination();
}

// Refresh export report
function refreshExportReport() {
    exportReportLoaded = false;
    initExportReport();
    showNotification('Báo cáo xuất kho đã được làm mới', 'success');
}

// Refresh export report display
function refreshExportReportDisplay() {
    applyExportFilters();
}

// Export to Excel
function exportToExcel() {
    try {
        if (filteredExportData.length === 0) {
            showNotification('Không có dữ liệu để xuất', 'warning');
            return;
        }
        
        // Prepare data for Excel export
        const excelData = filteredExportData.map((transaction, index) => ({
            'STT': index + 1,
            'Thời gian': new Date(transaction.timestamp).toLocaleString('vi-VN'),
            'Loại': getTransactionTypeText(transaction.type || 'out'),
            'Sản phẩm': transaction.productName || 'N/A',
            'SKU': transaction.productSKU || 'N/A',
            'Số lượng': transaction.quantity || 0,
            'Đơn vị': transaction.productUnit || 'cái',
            'Đơn giá': transaction.unitPrice || 0,
            'Tổng giá trị': transaction.totalValue || (transaction.quantity * transaction.unitPrice) || 0,
            'Lý do': transaction.reason || 'N/A',
            'Loại đơn hàng': getOrderTypeText(transaction.orderType),
            'Cửa hàng': transaction.storeName || 'N/A',
            'Trạng thái': getStatusText(transaction.status)
        }));
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo xuất kho');
        
        // Generate filename with current date
        const now = new Date();
        const filename = `BaoCaoXuatKho_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showNotification('Xuất Excel thành công!', 'success');
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Lỗi xuất Excel: ' + error.message, 'error');
    }
}

// Helper functions
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function getTransactionTypeText(type) {
    const types = {
        'out': 'Xuất kho',
        'export': 'Xuất kho',
        'sale': 'Bán hàng',
        'transfer': 'Chuyển kho'
    };
    return types[type] || 'Xuất kho';
}

function getOrderTypeText(orderType) {
    const types = {
        'retail': 'Bán lẻ',
        'wholesale': 'Bán sỉ',
        'tmdt': 'TMĐT',
        'online': 'Online'
    };
    return types[orderType] || 'N/A';
}

function getStatusText(status) {
    const statuses = {
        'pending': 'Chờ xử lý',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy',
        'processing': 'Đang xử lý'
    };
    return statuses[status] || 'N/A';
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

// Export detail modal functions
function openExportDetailModal(transactionId) {
    const transaction = exportReportData.find(t => t.id === transactionId);
    if (!transaction) {
        showNotification('Không tìm thấy giao dịch', 'error');
        return;
    }
    
    // Create modal content
    const modalContent = `
        <div class="transaction-detail-modal">
            <div class="modal-header">
                <h3><i class="fas fa-file-export"></i> Chi tiết giao dịch xuất kho</h3>
                <button class="close-btn" onclick="closeExportDetailModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-grid">
                    <div class="detail-card">
                        <h4><i class="fas fa-info-circle"></i> Thông tin cơ bản</h4>
                        <div class="detail-row">
                            <span class="label">Mã giao dịch:</span>
                            <span class="value">${transaction.id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Thời gian:</span>
                            <span class="value">${new Date(transaction.timestamp).toLocaleString('vi-VN')}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Loại:</span>
                            <span class="value">${getTransactionTypeText(transaction.type)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Trạng thái:</span>
                            <span class="value status-${transaction.status}">${getStatusText(transaction.status)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-card">
                        <h4><i class="fas fa-box"></i> Thông tin sản phẩm</h4>
                        <div class="detail-row">
                            <span class="label">Tên sản phẩm:</span>
                            <span class="value">${transaction.productName || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">SKU:</span>
                            <span class="value">${transaction.productSKU || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Số lượng:</span>
                            <span class="value">${transaction.quantity || 0}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Đơn vị:</span>
                            <span class="value">${transaction.productUnit || 'cái'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Đơn giá:</span>
                            <span class="value">${formatCurrency(transaction.unitPrice || 0)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Tổng giá trị:</span>
                            <span class="value total-value">${formatCurrency(transaction.totalValue || (transaction.quantity * transaction.unitPrice) || 0)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-card">
                        <h4><i class="fas fa-store"></i> Thông tin khác</h4>
                        <div class="detail-row">
                            <span class="label">Cửa hàng:</span>
                            <span class="value">${transaction.storeName || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Loại đơn hàng:</span>
                            <span class="value">${getOrderTypeText(transaction.orderType)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Lý do:</span>
                            <span class="value">${transaction.reason || 'N/A'}</span>
                        </div>
                        ${transaction.notes ? `
                        <div class="detail-row">
                            <span class="label">Ghi chú:</span>
                            <span class="value">${transaction.notes}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeExportDetailModal()">Đóng</button>
                <button class="btn btn-primary" onclick="editExportTransaction('${transaction.id}')">Chỉnh sửa</button>
            </div>
        </div>
    `;
    
    // Show modal
    showModal(modalContent);
}

function closeExportDetailModal() {
    hideModal();
}

function editExportTransaction(transactionId) {
    // Implementation for editing transaction
    showNotification('Chức năng chỉnh sửa đang được phát triển', 'info');
}

function updateExportSelection(event) {
    // Handle checkbox selection
    const checkboxes = document.querySelectorAll('.export-checkbox:checked');
    const selectAllCheckbox = document.getElementById('selectAllExports');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.indeterminate = checkboxes.length > 0 && checkboxes.length < document.querySelectorAll('.export-checkbox').length;
        selectAllCheckbox.checked = checkboxes.length === document.querySelectorAll('.export-checkbox').length;
    }
}

function toggleSelectAllExports(checkbox) {
    const exportCheckboxes = document.querySelectorAll('.export-checkbox');
    exportCheckboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

// Tab switching function
function switchReportTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName + 'ReportTab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to selected tab button
    const selectedButton = document.querySelector(`.tab-button[onclick*="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Initialize the selected report
    switch (tabName) {
        case 'export':
            initExportReport();
            break;
        case 'import':
            if (typeof initImportReport === 'function') {
                initImportReport();
            }
            break;
        case 'adjustment':
            if (typeof initAdjustmentReport === 'function') {
                initAdjustmentReport();
            }
            break;
    }
}

// Setup event listeners for statistics filters
function setupStatsFilterEventListeners() {
    // Statistics date range filter
    const statsDateRangeSelect = document.getElementById('statsExportDateRange');
    if (statsDateRangeSelect) {
        statsDateRangeSelect.addEventListener('change', function() {
            toggleStatsCustomDateRange();
        });
        
        // Initialize custom date range visibility on load
        setTimeout(() => {
            toggleStatsCustomDateRange();
        }, 100);
    }
    
    // Statistics custom date inputs
    const statsStartDateInput = document.getElementById('statsStartDate');
    const statsEndDateInput = document.getElementById('statsEndDate');
    if (statsStartDateInput) {
        statsStartDateInput.addEventListener('change', function() {
            // Auto-apply when date changes
            if (document.getElementById('statsExportDateRange').value === 'custom') {
                applyStatsFilters();
            }
        });
    }
    if (statsEndDateInput) {
        statsEndDateInput.addEventListener('change', function() {
            // Auto-apply when date changes
            if (document.getElementById('statsExportDateRange').value === 'custom') {
                applyStatsFilters();
            }
        });
    }
    
    // Apply and reset buttons
    const applyStatsBtn = document.getElementById('applyStatsFiltersBtn');
    if (applyStatsBtn) {
        applyStatsBtn.addEventListener('click', applyStatsFilters);
    }
    
    const resetStatsBtn = document.getElementById('resetStatsFiltersBtn');
    if (resetStatsBtn) {
        resetStatsBtn.addEventListener('click', resetStatsFilters);
    }
}

// Toggle custom date range visibility for statistics filters
function toggleStatsCustomDateRange() {
    const statsDateRangeSelect = document.getElementById('statsExportDateRange');
    const statsCustomDateRange = document.getElementById('statsCustomDateRange');
    
    console.log('🔄 Toggling custom date range. Current value:', statsDateRangeSelect?.value);
    
    if (statsDateRangeSelect && statsCustomDateRange) {
        // Force hide first
        statsCustomDateRange.classList.add('hidden');
        statsCustomDateRange.classList.remove('visible');
        
        if (statsDateRangeSelect.value === 'custom') {
            console.log('✅ Showing custom date range');
            statsCustomDateRange.classList.remove('hidden');
            statsCustomDateRange.classList.add('visible');
        } else {
            console.log('❌ Hiding custom date range');
            // Clear custom date inputs when switching away from custom
            const statsStartDate = document.getElementById('statsStartDate');
            const statsEndDate = document.getElementById('statsEndDate');
            if (statsStartDate) statsStartDate.value = '';
            if (statsEndDate) statsEndDate.value = '';
            // Auto-apply when switching away from custom
            if (statsDateRangeSelect.value !== 'all') {
                applyStatsFilters();
            }
        }
    }
}

// Apply statistics filters
function applyStatsFilters() {
    const dateRange = document.getElementById('statsExportDateRange')?.value || 'all';
    const storeFilter = document.getElementById('statsExportStoreFilter')?.value || 'all';
    const productFilter = document.getElementById('statsExportProductFilter')?.value || 'all';
    const startDate = document.getElementById('statsStartDate')?.value;
    const endDate = document.getElementById('statsEndDate')?.value;
    
    console.log('🔍 Applying statistics filters:', { dateRange, storeFilter, productFilter, startDate, endDate });
    
    // Filter data based on statistics filters
    let statsFilteredData = exportReportData.filter(transaction => {
        // Date filter
        if (dateRange !== 'all') {
            const transactionDate = new Date(transaction.timestamp);
            const now = new Date();
            
            switch (dateRange) {
                case 'today':
                    if (!isSameDay(transactionDate, now)) return false;
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (transactionDate < weekAgo) return false;
                    break;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (transactionDate < monthAgo) return false;
                    break;
                case 'quarter':
                    const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    if (transactionDate < quarterAgo) return false;
                    break;
                case 'custom':
                    if (startDate) {
                        const start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        if (transactionDate < start) return false;
                    }
                    
                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (transactionDate > end) return false;
                    }
                    break;
            }
        }
        
        // Store filter
        if (storeFilter !== 'all') {
            if (transaction.storeId !== storeFilter && 
                transaction.storeName !== storeFilter &&
                transaction.performedBy !== storeFilter) {
                return false;
            }
        }
        
        // Product filter
        if (productFilter !== 'all') {
            if (transaction.productId !== productFilter && 
                transaction.productName !== productFilter) {
                return false;
            }
        }
        
        return true;
    });
    
    // Update statistics with filtered data
    updateStatsWithFilteredData(statsFilteredData);
    
    // Update filter status display
    updateStatsFilterStatus();
    
    console.log('📊 Statistics updated with filtered data:', statsFilteredData.length, 'transactions');
}

// Update statistics with filtered data
function updateStatsWithFilteredData(filteredData) {
    const totalExports = filteredData.length;
    const totalQuantity = filteredData.reduce((sum, item) => sum + Math.abs(item.quantity || 0), 0);
    const totalValue = filteredData.reduce((sum, item) => sum + (item.totalValue || (Math.abs(item.quantity || 0) * (item.unitPrice || 0))), 0);
    
    // Update DOM elements
    const totalExportsEl = document.getElementById('totalExportsCount');
    const totalQuantityEl = document.getElementById('totalExportQuantity');
    const totalValueEl = document.getElementById('totalExportValue');
    
    if (totalExportsEl) {
        totalExportsEl.textContent = totalExports;
        totalExportsEl.parentElement.classList.add('stats-filtered');
    }
    if (totalQuantityEl) {
        totalQuantityEl.textContent = Math.round(totalQuantity * 100) / 100;
        totalQuantityEl.parentElement.classList.add('stats-filtered');
    }
    if (totalValueEl) {
        totalValueEl.textContent = formatCurrency(totalValue);
        totalValueEl.parentElement.classList.add('stats-filtered');
    }
    
    // Add visual indicators to statistics cards
    const statsCards = document.querySelectorAll('.stats-container .stat-card');
    statsCards.forEach(card => {
        card.classList.add('stats-filtered');
        if (!card.querySelector('.stats-filter-badge')) {
            const filterBadge = document.createElement('span');
            filterBadge.className = 'stats-filter-badge';
            filterBadge.innerHTML = '<i class="fas fa-filter"></i>';
            filterBadge.title = 'Thống kê đã được lọc';
            card.appendChild(filterBadge);
        }
    });
}

// Update statistics filter status display
function updateStatsFilterStatus() {
    const dateRange = document.getElementById('statsExportDateRange')?.value || 'all';
    const storeFilter = document.getElementById('statsExportStoreFilter')?.value || 'all';
    const productFilter = document.getElementById('statsExportProductFilter')?.value || 'all';
    const startDate = document.getElementById('statsStartDate')?.value;
    const endDate = document.getElementById('statsEndDate')?.value;
    
    // Count active filters
    let activeFilters = 0;
    let filterSummary = [];
    
    if (dateRange !== 'all' || startDate || endDate) {
        activeFilters++;
        if (dateRange === 'custom') {
            filterSummary.push(`📅 ${startDate || '...'} - ${endDate || '...'}`);
        } else {
            const dateLabels = {
                'today': 'Hôm nay',
                'week': '7 ngày qua',
                'month': '30 ngày qua',
                'quarter': '3 tháng qua'
            };
            filterSummary.push(`📅 ${dateLabels[dateRange] || dateRange}`);
        }
    }
    
    if (storeFilter !== 'all') {
        activeFilters++;
        filterSummary.push(`🏪 ${storeFilter}`);
    }
    
    if (productFilter !== 'all') {
        activeFilters++;
        const productName = document.getElementById('statsExportProductFilter')?.selectedOptions[0]?.textContent || productFilter;
        filterSummary.push(`📦 ${productName}`);
    }
    
    // Update filter status display
    const filterStatusEl = document.getElementById('statsFilterStatus');
    const filterSummaryEl = document.getElementById('statsFilterSummary');
    
    if (filterStatusEl && filterSummaryEl) {
        if (activeFilters > 0) {
            filterSummaryEl.textContent = filterSummary.join(' • ');
            filterStatusEl.style.display = 'block';
        } else {
            filterStatusEl.style.display = 'none';
        }
    }
}

// Reset statistics filters
function resetStatsFilters() {
    // Reset all filter controls
    const statsDateRangeSelect = document.getElementById('statsExportDateRange');
    const statsStoreFilter = document.getElementById('statsExportStoreFilter');
    const statsProductFilter = document.getElementById('statsExportProductFilter');
    const statsStartDate = document.getElementById('statsStartDate');
    const statsEndDate = document.getElementById('statsEndDate');
    const statsCustomDateRange = document.getElementById('statsCustomDateRange');
    
    if (statsDateRangeSelect) statsDateRangeSelect.value = 'all';
    if (statsStoreFilter) statsStoreFilter.value = 'all';
    if (statsProductFilter) statsProductFilter.value = 'all';
    if (statsStartDate) statsStartDate.value = '';
    if (statsEndDate) statsEndDate.value = '';
    if (statsCustomDateRange) {
        statsCustomDateRange.classList.add('hidden');
        statsCustomDateRange.classList.remove('visible');
    }
    
    // Reset statistics to show all data
    updateStatsWithFilteredData(exportReportData);
    
    // Remove visual indicators
    const statsCards = document.querySelectorAll('.stats-container .stat-card');
    statsCards.forEach(card => {
        card.classList.remove('stats-filtered');
        const filterBadge = card.querySelector('.stats-filter-badge');
        if (filterBadge) {
            filterBadge.remove();
        }
    });
    
    // Hide filter status
    const filterStatusEl = document.getElementById('statsFilterStatus');
    if (filterStatusEl) {
        filterStatusEl.style.display = 'none';
    }
    
    console.log('📊 Statistics filters reset');
}

// Load stores for statistics filter dropdown
async function loadStoresForStatsFilter() {
    try {
        const storesRef = window.database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};
        
        const storeFilter = document.getElementById('statsExportStoreFilter');
        if (storeFilter) {
            // Clear existing options except "All stores"
            storeFilter.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
            
            Object.keys(stores).forEach(storeId => {
                const store = stores[storeId];
                const option = document.createElement('option');
                option.value = store.name; // Use store name as value
                option.textContent = store.name || `Cửa hàng ${storeId}`;
                storeFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading stores for statistics filter:', error);
    }
}

// Load products for statistics filter dropdown
async function loadProductsForStatsFilter() {
    try {
        const productsRef = window.database.ref('products');
        const snapshot = await productsRef.once('value');
        const products = snapshot.val() || {};
        
        const productFilter = document.getElementById('statsExportProductFilter');
        if (productFilter) {
            // Clear existing options except "All products"
            productFilter.innerHTML = '<option value="all">Tất cả sản phẩm</option>';
            
            Object.keys(products).forEach(productId => {
                const product = products[productId];
                const option = document.createElement('option');
                option.value = productId;
                option.textContent = `${product.name || `Sản phẩm ${productId}`} (${product.sku || 'N/A'})`;
                productFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading products for statistics filter:', error);
    }
}

console.log('=== Warehouse Export Report Loaded ===');