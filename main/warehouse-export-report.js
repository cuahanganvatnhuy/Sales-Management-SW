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
                
                // Use the same logic as usage report for store name
                transaction.storeName = getStoreNameFromTransaction(transaction);
                
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
        }
    } catch (error) {
        console.error('Error loading products for filter:', error);
    }
}

// Setup event listeners for export report
function setupExportReportEventListeners() {
    // Date range filter
    const dateRangeSelect = document.getElementById('exportDateRange');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', applyExportFilters);
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
    
    // Product filter
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

// Apply filters to export data
function applyExportFilters() {
    const dateRange = document.getElementById('exportDateRange')?.value || 'all';
    const storeFilter = document.getElementById('exportStoreFilter')?.value || 'all';
    const reasonFilter = document.getElementById('exportReasonFilter')?.value || 'all';
    const productFilter = document.getElementById('exportProductFilter')?.value || 'all';
    
    console.log('Applying filters:', { dateRange, storeFilter, reasonFilter, productFilter });
    
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

console.log('=== Warehouse Export Report Loaded ===');