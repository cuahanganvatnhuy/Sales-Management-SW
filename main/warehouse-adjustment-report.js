// Warehouse Adjustment Report Management
let adjustmentReportData = [];
let filteredAdjustmentData = [];
let currentAdjustmentPage = 1;
let adjustmentItemsPerPage = parseInt(localStorage.getItem('adjustmentItemsPerPage')) || 15;

// Initialize Adjustment Report
function initAdjustmentReport() {
    console.log('Initializing Adjustment Report...');
    loadAdjustmentReportData();
    setupAdjustmentFilters();
    loadAdjustmentPageSize();
}

// Load adjustment report data from Firebase
function loadAdjustmentReportData() {
    if (!database) {
        console.error('Firebase database not initialized');
        return;
    }

    const transactionsRef = ref(database, 'warehouseTransactions');
    onValue(transactionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Filter for adjustment transactions
            adjustmentReportData = Object.entries(data)
                .map(([id, transaction]) => ({
                    id,
                    ...transaction
                }))
                .filter(transaction => 
                    transaction.type === 'adjustment' || 
                    transaction.transactionType === 'adjustment'
                )
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else {
            adjustmentReportData = [];
        }
        
        filteredAdjustmentData = [...adjustmentReportData];
        updateAdjustmentStatistics();
        displayAdjustmentReportTable();
        updateAdjustmentPagination();
        populateAdjustmentFilters();
    });
}

// Setup adjustment filters
function setupAdjustmentFilters() {
    const dateRange = document.getElementById('adjustmentDateRange');
    const storeFilter = document.getElementById('adjustmentStoreFilter');
    const typeFilter = document.getElementById('adjustmentTypeFilter');
    const productFilter = document.getElementById('adjustmentProductFilter');

    if (dateRange) {
        dateRange.addEventListener('change', applyAdjustmentFilters);
    }
    if (storeFilter) {
        storeFilter.addEventListener('change', applyAdjustmentFilters);
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', applyAdjustmentFilters);
    }
    if (productFilter) {
        productFilter.addEventListener('change', applyAdjustmentFilters);
    }

    // Custom date range
    const startDate = document.getElementById('adjustmentStartDate');
    const endDate = document.getElementById('adjustmentEndDate');
    if (startDate) startDate.addEventListener('change', applyAdjustmentFilters);
    if (endDate) endDate.addEventListener('change', applyAdjustmentFilters);
}

// Populate adjustment filters
function populateAdjustmentFilters() {
    populateAdjustmentStoreFilter();
    populateAdjustmentTypeFilter();
    populateAdjustmentProductFilter();
}

// Populate store filter for adjustment
function populateAdjustmentStoreFilter() {
    const storeFilter = document.getElementById('adjustmentStoreFilter');
    if (!storeFilter) return;

    const stores = [...new Set(adjustmentReportData.map(item => item.storeName).filter(Boolean))];
    
    storeFilter.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
    stores.forEach(store => {
        storeFilter.innerHTML += `<option value="${store}">${store}</option>`;
    });
}

// Populate adjustment type filter
function populateAdjustmentTypeFilter() {
    const typeFilter = document.getElementById('adjustmentTypeFilter');
    if (!typeFilter) return;

    const types = [...new Set(adjustmentReportData.map(item => item.reason || item.adjustmentType).filter(Boolean))];
    
    typeFilter.innerHTML = '<option value="all">Tất cả loại điều chỉnh</option>';
    types.forEach(type => {
        typeFilter.innerHTML += `<option value="${type}">${type}</option>`;
    });
}

// Populate product filter for adjustment
function populateAdjustmentProductFilter() {
    const productFilter = document.getElementById('adjustmentProductFilter');
    if (!productFilter) return;

    const products = [...new Set(adjustmentReportData.map(item => item.productName).filter(Boolean))];
    
    productFilter.innerHTML = '<option value="all">Tất cả sản phẩm</option>';
    products.forEach(product => {
        const sku = adjustmentReportData.find(item => item.productName === product)?.productSku || '';
        productFilter.innerHTML += `<option value="${product}">${product} ${sku ? `(${sku})` : ''}</option>`;
    });
}

// Apply adjustment filters
function applyAdjustmentFilters() {
    const dateRange = document.getElementById('adjustmentDateRange')?.value || 'all';
    const storeFilter = document.getElementById('adjustmentStoreFilter')?.value || 'all';
    const typeFilter = document.getElementById('adjustmentTypeFilter')?.value || 'all';
    const productFilter = document.getElementById('adjustmentProductFilter')?.value || 'all';
    const startDate = document.getElementById('adjustmentStartDate')?.value;
    const endDate = document.getElementById('adjustmentEndDate')?.value;

    filteredAdjustmentData = adjustmentReportData.filter(item => {
        // Date filter
        if (dateRange !== 'all') {
            const itemDate = new Date(item.timestamp);
            const now = new Date();
            
            switch (dateRange) {
                case 'today':
                    if (!isSameDay(itemDate, now)) return false;
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (itemDate < weekAgo) return false;
                    break;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (itemDate < monthAgo) return false;
                    break;
                case 'quarter':
                    const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    if (itemDate < quarterAgo) return false;
                    break;
                case 'custom':
                    if (startDate && itemDate < new Date(startDate)) return false;
                    if (endDate && itemDate > new Date(endDate)) return false;
                    break;
            }
        }

        // Store filter
        if (storeFilter !== 'all' && item.storeName !== storeFilter) return false;

        // Type filter
        if (typeFilter !== 'all' && (item.reason || item.adjustmentType) !== typeFilter) return false;

        // Product filter
        if (productFilter !== 'all' && item.productName !== productFilter) return false;

        return true;
    });

    currentAdjustmentPage = 1;
    updateAdjustmentStatistics();
    displayAdjustmentReportTable();
    updateAdjustmentPagination();
}

// Update adjustment statistics based on filtered data
function updateAdjustmentStatistics() {
    const totalAdjustments = filteredAdjustmentData.length;
    const totalIncreaseQty = filteredAdjustmentData
        .filter(item => (item.quantity || 0) > 0)
        .reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalDecreaseQty = Math.abs(filteredAdjustmentData
        .filter(item => (item.quantity || 0) < 0)
        .reduce((sum, item) => sum + (item.quantity || 0), 0));
    const totalValue = filteredAdjustmentData.reduce((sum, item) => sum + Math.abs(item.totalValue || (item.quantity * item.unitPrice) || 0), 0);
    
    // Calculate additional statistics
    const uniqueProducts = new Set(filteredAdjustmentData.map(item => item.productName).filter(Boolean)).size;
    const uniqueStores = new Set(filteredAdjustmentData.map(item => item.storeName).filter(Boolean)).size;
    const uniqueTypes = new Set(filteredAdjustmentData.map(item => item.reason || item.adjustmentType).filter(Boolean)).size;
    
    // Update DOM elements with animation
    const totalAdjustmentsEl = document.getElementById('totalAdjustmentsCount');
    const totalIncreaseEl = document.getElementById('totalIncreaseQuantity');
    const totalDecreaseEl = document.getElementById('totalDecreaseQuantity');
    const totalValueEl = document.getElementById('totalAdjustmentValue');
    const uniqueProductsEl = document.getElementById('uniqueAdjustmentProducts');
    const uniqueStoresEl = document.getElementById('uniqueAdjustmentStores');
    const uniqueTypesEl = document.getElementById('uniqueAdjustmentTypes');
    
    // Add updating animation class
    [totalAdjustmentsEl, totalIncreaseEl, totalDecreaseEl, totalValueEl, uniqueProductsEl, uniqueStoresEl, uniqueTypesEl].forEach(el => {
        if (el) {
            el.classList.add('updating');
            setTimeout(() => el.classList.remove('updating'), 300);
        }
    });
    
    if (totalAdjustmentsEl) totalAdjustmentsEl.textContent = totalAdjustments;
    if (totalIncreaseEl) totalIncreaseEl.textContent = totalIncreaseQty.toLocaleString();
    if (totalDecreaseEl) totalDecreaseEl.textContent = totalDecreaseQty.toLocaleString();
    if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);
    if (uniqueProductsEl) uniqueProductsEl.textContent = uniqueProducts;
    if (uniqueStoresEl) uniqueStoresEl.textContent = uniqueStores;
    if (uniqueTypesEl) uniqueTypesEl.textContent = uniqueTypes;
    
    // Update filter info display
    updateAdjustmentFilterInfo();
}

// Update adjustment filter info display
function updateAdjustmentFilterInfo() {
    const filterInfoEl = document.getElementById('adjustmentFilterInfo');
    if (!filterInfoEl) return;
    
    const activeFilters = [];
    
    // Check date filter
    const dateRange = document.getElementById('adjustmentDateRange')?.value;
    if (dateRange && dateRange !== 'all') {
        const dateTexts = {
            'today': 'Hôm nay',
            'week': '7 ngày qua', 
            'month': '30 ngày qua',
            'quarter': '90 ngày qua',
            'custom': 'Tùy chỉnh'
        };
        activeFilters.push(`📅 ${dateTexts[dateRange] || dateRange}`);
    }
    
    // Check store filter
    const storeFilter = document.getElementById('adjustmentStoreFilter')?.value;
    if (storeFilter && storeFilter !== 'all') {
        activeFilters.push(`🏪 ${storeFilter}`);
    }
    
    // Check type filter
    const typeFilter = document.getElementById('adjustmentTypeFilter')?.value;
    if (typeFilter && typeFilter !== 'all') {
        activeFilters.push(`⚖️ ${typeFilter}`);
    }
    
    // Check product filter
    const productFilter = document.getElementById('adjustmentProductFilter')?.value;
    if (productFilter && productFilter !== 'all') {
        const productName = document.getElementById('adjustmentProductFilter')?.selectedOptions[0]?.textContent || 'Sản phẩm';
        activeFilters.push(`📦 ${productName.split('(')[0].trim()}`);
    }
    
    if (activeFilters.length > 0) {
        filterInfoEl.innerHTML = `
            <div class="active-filters">
                <span class="filter-label">🔍 Đang lọc:</span>
                ${activeFilters.map(filter => `<span class="filter-tag">${filter}</span>`).join('')}
                <button class="clear-filters-btn" onclick="clearAllAdjustmentFilters()" title="Xóa tất cả bộ lọc">
                    <i class="fas fa-times"></i> Xóa bộ lọc
                </button>
            </div>
        `;
    } else {
        filterInfoEl.innerHTML = `
            <div class="no-filters">
                <span class="filter-label">📊 Hiển thị tất cả dữ liệu</span>
            </div>
        `;
    }
}

// Clear all adjustment filters
function clearAllAdjustmentFilters() {
    // Reset all filter dropdowns
    const dateRange = document.getElementById('adjustmentDateRange');
    const storeFilter = document.getElementById('adjustmentStoreFilter');
    const typeFilter = document.getElementById('adjustmentTypeFilter');
    const productFilter = document.getElementById('adjustmentProductFilter');
    const startDate = document.getElementById('adjustmentStartDate');
    const endDate = document.getElementById('adjustmentEndDate');
    
    if (dateRange) dateRange.value = 'all';
    if (storeFilter) storeFilter.value = 'all';
    if (typeFilter) typeFilter.value = 'all';
    if (productFilter) productFilter.value = 'all';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';
    
    // Hide custom date range
    const customDateRange = document.getElementById('adjustmentCustomDateRange');
    if (customDateRange) {
        customDateRange.style.display = 'none';
    }
    
    // Apply filters (will show all data)
    applyAdjustmentFilters();
    
    showNotification('Đã xóa tất cả bộ lọc', 'success');
}

// Display adjustment report table
function displayAdjustmentReportTable() {
    const tbody = document.getElementById('adjustmentReportTableBody');
    if (!tbody) {
        console.error('Adjustment report table body not found');
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentAdjustmentPage - 1) * adjustmentItemsPerPage;
    const endIndex = startIndex + adjustmentItemsPerPage;
    const pageData = filteredAdjustmentData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="no-data-message">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Không có dữ liệu điều chỉnh kho</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageData.map((item, index) => {
        const quantity = item.quantity || 0;
        const quantityClass = quantity > 0 ? 'text-success' : quantity < 0 ? 'text-danger' : '';
        const quantityIcon = quantity > 0 ? '📈' : quantity < 0 ? '📉' : '➖';
        
        return `
            <tr onclick="openAdjustmentDetailModal('${item.id}')" style="cursor: pointer;">
                <td>${startIndex + index + 1}</td>
                <td>${formatDateTime(item.timestamp)}</td>
                <td>${item.storeName || 'Không xác định'}</td>
                <td>${item.productName || 'Không xác định'}</td>
                <td>${item.productSku || 'N/A'}</td>
                <td class="text-center ${quantityClass}">${quantityIcon} ${Math.abs(quantity)}</td>
                <td>${item.reason || item.adjustmentType || 'Không xác định'}</td>
                <td class="text-end">${formatCurrency(Math.abs(item.totalValue || (quantity * item.unitPrice) || 0))}</td>
            </tr>
        `;
    }).join('');
}

// Load adjustment page size from localStorage
function loadAdjustmentPageSize() {
    const savedPageSize = localStorage.getItem('adjustmentItemsPerPage');
    if (savedPageSize) {
        adjustmentItemsPerPage = parseInt(savedPageSize);
        const pageSizeSelect = document.getElementById('adjustmentPageSize');
        if (pageSizeSelect) {
            pageSizeSelect.value = adjustmentItemsPerPage;
        }
    }
    
    // Setup page size change handler
    const pageSizeSelect = document.getElementById('adjustmentPageSize');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            adjustmentItemsPerPage = parseInt(this.value);
            localStorage.setItem('adjustmentItemsPerPage', adjustmentItemsPerPage);
            currentAdjustmentPage = 1;
            displayAdjustmentReportTable();
            updateAdjustmentPagination();
        });
    }
}

// Update adjustment pagination
function updateAdjustmentPagination() {
    const totalItems = filteredAdjustmentData.length;
    const totalPages = Math.ceil(totalItems / adjustmentItemsPerPage);
    const paginationContainer = document.getElementById('adjustmentReportPagination');
    
    if (!paginationContainer) return;
    
    // Update pagination info
    const startItem = totalItems === 0 ? 0 : (currentAdjustmentPage - 1) * adjustmentItemsPerPage + 1;
    const endItem = Math.min(currentAdjustmentPage * adjustmentItemsPerPage, totalItems);
    
    paginationContainer.innerHTML = `
        <div class="pagination-info">
            <span class="pagination-text">Hiển thị ${startItem}-${endItem} trong tổng số ${totalItems} bản ghi</span>
        </div>
        <div class="pagination-controls">
            ${createAdjustmentPaginationButton(1, '⏮', 'Trang đầu', currentAdjustmentPage === 1)}
            ${createAdjustmentPaginationButton(currentAdjustmentPage - 1, '⏪', 'Trang trước', currentAdjustmentPage === 1)}
            ${createAdjustmentPaginationNumbers(currentAdjustmentPage, totalPages)}
            ${createAdjustmentPaginationButton(currentAdjustmentPage + 1, '⏩', 'Trang sau', currentAdjustmentPage === totalPages)}
            ${createAdjustmentPaginationButton(totalPages, '⏭', 'Trang cuối', currentAdjustmentPage === totalPages)}
        </div>
        <div class="page-size-selector">
            <label for="adjustmentPageSize">Hiển thị:</label>
            <select id="adjustmentPageSize" class="form-select form-select-sm">
                <option value="10" ${adjustmentItemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${adjustmentItemsPerPage === 15 ? 'selected' : ''}>15</option>
                <option value="25" ${adjustmentItemsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${adjustmentItemsPerPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${adjustmentItemsPerPage === 100 ? 'selected' : ''}>100</option>
            </select>
            <span>bản ghi/trang</span>
        </div>
    `;
    
    // Re-attach page size event listener
    loadAdjustmentPageSize();
}

// Create adjustment pagination button
function createAdjustmentPaginationButton(page, text, title, disabled) {
    const disabledClass = disabled ? 'disabled' : '';
    const onclickAttr = disabled ? '' : `onclick="goToAdjustmentPage(${page})"`;
    return `<button class="pagination-btn ${disabledClass}" ${onclickAttr} title="${title}">${text}</button>`;
}

// Create adjustment pagination numbers
function createAdjustmentPaginationNumbers(currentPage, totalPages) {
    let buttons = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        buttons += createAdjustmentPaginationButton(1, '1', 'Trang 1', false);
        if (startPage > 2) {
            buttons += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        buttons += `<button class="pagination-btn ${activeClass}" onclick="goToAdjustmentPage(${i})" title="Trang ${i}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttons += '<span class="pagination-ellipsis">...</span>';
        }
        buttons += createAdjustmentPaginationButton(totalPages, totalPages.toString(), `Trang ${totalPages}`, false);
    }
    
    return buttons;
}

// Go to adjustment page
function goToAdjustmentPage(page) {
    const totalPages = Math.ceil(filteredAdjustmentData.length / adjustmentItemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentAdjustmentPage = page;
        displayAdjustmentReportTable();
        updateAdjustmentPagination();
    }
}

// Open adjustment detail modal
function openAdjustmentDetailModal(transactionId) {
    const transaction = filteredAdjustmentData.find(item => item.id === transactionId);
    if (!transaction) {
        console.error('Transaction not found:', transactionId);
        return;
    }
    
    const quantity = transaction.quantity || 0;
    const adjustmentType = quantity > 0 ? 'Tăng' : quantity < 0 ? 'Giảm' : 'Không đổi';
    const adjustmentIcon = quantity > 0 ? '📈' : quantity < 0 ? '📉' : '➖';
    const adjustmentClass = quantity > 0 ? 'text-success' : quantity < 0 ? 'text-danger' : '';
    
    const modalContent = `
        <div class="transaction-detail-card">
            <div class="detail-header">
                <h4><i class="fas fa-balance-scale text-warning"></i> Chi Tiết Điều Chỉnh Kho</h4>
            </div>
            <div class="detail-body">
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="detail-label">📅 Thời gian:</span>
                        <span class="detail-value">${formatDateTime(transaction.timestamp)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">🏪 Cửa hàng:</span>
                        <span class="detail-value">${transaction.storeName || 'Không xác định'}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="detail-label">📦 Sản phẩm:</span>
                        <span class="detail-value">${transaction.productName || 'Không xác định'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">🏷️ SKU:</span>
                        <span class="detail-value">${transaction.productSku || 'N/A'}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="detail-label">⚖️ Loại điều chỉnh:</span>
                        <span class="detail-value ${adjustmentClass}">${adjustmentIcon} ${adjustmentType}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">📊 Số lượng:</span>
                        <span class="detail-value ${adjustmentClass}">${Math.abs(quantity)}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="detail-label">📋 Lý do:</span>
                        <span class="detail-value">${transaction.reason || transaction.adjustmentType || 'Không xác định'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">💵 Giá trị:</span>
                        <span class="detail-value total-value">${formatCurrency(Math.abs(transaction.totalValue || (quantity * transaction.unitPrice) || 0))}</span>
                    </div>
                </div>
                ${transaction.notes ? `
                <div class="detail-row">
                    <div class="detail-item full-width">
                        <span class="detail-label">📝 Ghi chú:</span>
                        <span class="detail-value">${transaction.notes}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    openWarehouseDetailModal('Chi Tiết Giao Dịch Điều Chỉnh Kho', modalContent);
}

// Export adjustment report to Excel
function exportAdjustmentReportToExcel() {
    if (filteredAdjustmentData.length === 0) {
        showNotification('Không có dữ liệu để xuất', 'warning');
        return;
    }
    
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
        ['STT', 'Thời gian', 'Cửa hàng', 'Sản phẩm', 'SKU', 'Số lượng', 'Loại điều chỉnh', 'Lý do', 'Giá trị', 'Ghi chú']
    ];
    
    filteredAdjustmentData.forEach((item, index) => {
        const quantity = item.quantity || 0;
        const adjustmentType = quantity > 0 ? 'Tăng' : quantity < 0 ? 'Giảm' : 'Không đổi';
        
        worksheetData.push([
            index + 1,
            formatDateTime(item.timestamp),
            item.storeName || 'Không xác định',
            item.productName || 'Không xác định',
            item.productSku || 'N/A',
            Math.abs(quantity),
            adjustmentType,
            item.reason || item.adjustmentType || 'Không xác định',
            Math.abs(item.totalValue || (quantity * item.unitPrice) || 0),
            item.notes || ''
        ]);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo điều chỉnh kho');
    
    const fileName = `bao-cao-dieu-chinh-kho-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    showNotification('Đã xuất báo cáo thành công', 'success');
}

// Utility functions
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN');
}

function formatCurrency(amount) {
    if (!amount) return '0₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}
