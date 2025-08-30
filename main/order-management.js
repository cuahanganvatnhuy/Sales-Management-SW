// Order Management JavaScript
let ordersData = {};
let productsData = {};
let filteredOrders = {};
let currentPage = 1;
const itemsPerPage = 20;
let currentEditOrderId = null;

// Store selected order IDs globally
let selectedOrderIds = [];

// Search and filter state
let searchFilters = {
    searchTerm: '',
    platform: '',
    store: '',
    priceRange: ''
};

// Debounce timer for search
let searchDebounceTimer = null;

// Status mapping
const statusMap = {
    'pending': { text: 'Đang xử lý', class: 'status-pending', icon: 'fas fa-clock' },
    'processing': { text: 'Đang giao', class: 'status-processing', icon: 'fas fa-truck' },
    'completed': { text: 'Hoàn thành', class: 'status-completed', icon: 'fas fa-check-circle' },
    'cancelled': { text: 'Đã hủy', class: 'status-cancelled', icon: 'fas fa-times-circle' }
};

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
    loadStoresForFilter();
    loadCustomersForRetailFilter();
    
    // Listen for store context changes
    window.addEventListener('storeContextChanged', function() {
        console.log('Store context changed, reloading orders...');
        loadData();
        loadStoresForFilter();
        loadCustomersForRetailFilter();
    });
});

// Load data from Firebase
async function loadData() {
    showLoading(true);
    let hasError = false;
    
    try {
        // Load orders (critical)
        await loadOrders();
        console.log('✅ Orders loaded successfully');
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        showNotification('Lỗi tải đơn hàng!', 'error');
        hasError = true;
    }
    
    try {
        // Load products (non-critical for order management)
        await loadProducts();
        console.log('✅ Products loaded successfully');
    } catch (error) {
        console.error('⚠️ Error loading products:', error);
        console.log('📝 Orders can still be displayed without product details');
        productsData = {}; // Set empty products data
    }
    
    try {
        displayOrders();
        if (!hasError) {
            console.log('✅ All data loaded successfully');
        }
    } catch (error) {
        console.error('❌ Error displaying orders:', error);
        showNotification('Lỗi hiển thị đơn hàng!', 'error');
    }
    
    showLoading(false);
}

// Load orders from Firebase (store-specific)
async function loadOrders() {
    try {
        console.log('Loading orders from Firebase...');
        
        // Get selected store from localStorage
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (!selectedStoreId) {
            console.log('No store selected, showing empty orders');
            ordersData = {};
            filteredOrders = {};
            return;
        }
        
        console.log('Loading orders for store:', selectedStoreId);
        
        // DEBUG: Check both possible paths
        console.log('🔍 DEBUG: Checking Firebase paths...');
        
        // Check new path: stores/{storeId}/orders
        const newPathSnapshot = await firebase.database().ref(`stores/${selectedStoreId}/orders`).once('value');
        const newPathData = newPathSnapshot.val() || {};
        console.log('📁 New path (stores/{storeId}/orders):', Object.keys(newPathData).length, 'orders');
        console.log('📄 New path data:', newPathData);
        
        // Check old path: store_orders/{storeId} 
        const oldPathSnapshot = await firebase.database().ref(`store_orders/${selectedStoreId}`).once('value');
        const oldPathData = oldPathSnapshot.val() || {};
        console.log('📁 Old path (store_orders/{storeId}):', Object.keys(oldPathData).length, 'orders');
        console.log('📄 Old path data:', oldPathData);
        
        // Use data from whichever path has orders
        if (Object.keys(newPathData).length > 0) {
            ordersData = newPathData;
            console.log('✅ Using NEW path data');
        } else if (Object.keys(oldPathData).length > 0) {
            ordersData = oldPathData;
            console.log('⚠️ Using OLD path data - consider migrating!');
        } else {
            ordersData = {};
            console.log('❌ No orders found in either path');
        }
        
        filteredOrders = { ...ordersData };
        
        console.log('Orders loaded for store:', selectedStoreId, 'Count:', Object.keys(ordersData).length);
        console.log('Final orders data:', ordersData);
        
        // Reset to first page after reload
        currentPage = 1;
    } catch (error) {
        console.error('Error loading orders:', error);
        throw error;
    }
}

// Load products from Firebase
async function loadProducts() {
    try {
        const snapshot = await firebase.database().ref('products').once('value');
        productsData = snapshot.val() || {};
        console.log('Products loaded:', Object.keys(productsData).length);
    } catch (error) {
        console.error('Error loading products:', error);
        productsData = {}; // Set empty products data on error
        throw error; // Still throw to let loadData handle it
    }
}



// Display orders in table
function displayOrders() {
    console.log('🔄 displayOrders called');
    console.log('📊 filteredOrders:', filteredOrders);
    console.log('🔢 filteredOrders keys:', Object.keys(filteredOrders || {}));
    
    try {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) {
            console.error('❌ ordersTableBody not found!');
            console.log('🔍 Available elements with "orders" in id:');
            const allElements = document.querySelectorAll('[id*="orders"]');
            allElements.forEach(el => console.log('  -', el.id, el.tagName));
            throw new Error('ordersTableBody element not found');
        }
        
        console.log('✅ Found ordersTableBody element');
        
        if (!filteredOrders || Object.keys(filteredOrders).length === 0) {
            console.log('📝 No orders to display, showing empty state');
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-shopping-cart"></i>
                            <p>Chưa có đơn hàng nào</p>
                        </div>
                    </td>
                </tr>
            `;
            updatePagination(0);
            return;
        }
        
        console.log('📊 Processing', Object.keys(filteredOrders).length, 'orders');
        
        // Sort orders by creation date (newest first)
        const sortedOrders = Object.entries(filteredOrders).sort((a, b) => 
            new Date(b[1].createdAt) - new Date(a[1].createdAt)
        );
        
        // Pagination
        const totalOrders = sortedOrders.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedOrders = sortedOrders.slice(startIndex, endIndex);
        
        let ordersHTML = '';
        let index = startIndex + 1;
        
        for (const [orderId, order] of paginatedOrders) {
            // Lấy thông tin sản phẩm từ database
            const product = productsData[order.productId] || {};
            
            // Ưu tiên lấy SKU từ order (cho các order mới), sau đó từ product database
            const productSKU = order.sku || product.sku || 'N/A';
            const productName = order.productName || product.name || 'Sản phẩm không xác định';
            
            ordersHTML += `
                <tr>
                    <td class="text-center">
                        <input type="checkbox" class="product-checkbox" value="${orderId}" onchange="console.log('Checkbox changed:', this.value, this.checked); updateBulkActions();">
                    </td>
                    <td class="text-center">${index}</td>
                    <td>
                        <div class="order-product-info">
                            <div class="product-name-sku">
                                <strong>Sản Phẩm:</strong> ${productName} - <strong>SKU:</strong> ${productSKU}
                            </div>
                            <div class="product-details">
                                <span class="quantity-info"><strong>Số Lượng (kg):</strong> ${order.quantity}</span>
                                <span class="price-info"><strong>Giá:</strong> ${formatCurrency(order.price)}</span>
                                <span class="total-info"><strong>Tổng Tiền:</strong> ${formatCurrency(order.total)}</span>
                            </div>
                        </div>
                    </td>
                    <td class="text-center">${formatDate(order.orderDate)}</td>
                    <td class="text-center">
                        <button class="btn btn-danger btn-small" onclick="deleteOrder('${orderId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            index++;
        }
        
        tbody.innerHTML = ordersHTML;
        console.log('✅ Orders HTML updated successfully');
        
        // Debug: Check if checkboxes were created
        setTimeout(() => {
            const createdCheckboxes = document.querySelectorAll('.product-checkbox');
            console.log('After displayOrders, found checkboxes:', createdCheckboxes.length);
        }, 50);
        
        updateBulkActions();
        updatePagination(totalOrders);
        
    } catch (error) {
        console.error('❌ Error in displayOrders:', error);
        throw error; // Re-throw to be caught by loadData
    }
}

// Update pagination controls
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const showingTo = Math.min(currentPage * itemsPerPage, totalItems);
    
    // Update pagination info
    document.getElementById('showingFrom').textContent = showingFrom;
    document.getElementById('showingTo').textContent = showingTo;
    document.getElementById('totalItems').textContent = totalItems;
    
    // Update pagination buttons
    const paginationContainer = document.querySelector('.pagination-buttons');
    if (!paginationContainer) return;
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="btn-pagination ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Trước
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="btn-pagination ${i === currentPage ? 'active' : ''}" 
                    onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button class="btn-pagination ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Sau <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(Object.keys(filteredOrders).length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayOrders();
}

// Helper function to delete order by ID (store-specific)
function deleteOrderById(orderId) {
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (!selectedStoreId) {
        throw new Error('No store selected');
    }
    return firebase.database().ref(`stores/${selectedStoreId}/orders/${orderId}`).remove();
}

// Delete single order
async function deleteOrder(orderId) {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
        return;
    }
    
    try {
        await deleteOrderById(orderId);
        showNotification('Xóa đơn hàng thành công!', 'success');
        await loadOrders();
        displayOrders();
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification('Lỗi xóa đơn hàng!', 'error');
    }
}

// Delete selected orders
async function deleteSelectedOrders() {
    console.log('deleteSelectedOrders called');
    console.log('selectedOrderIds from global:', selectedOrderIds);
    
    if (selectedOrderIds.length === 0) {
        showNotification('Vui lòng chọn ít nhất một đơn hàng để xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${selectedOrderIds.length} đơn hàng đã chọn?`)) {
        return;
    }
    
    try {
        const deletePromises = [];
        
        selectedOrderIds.forEach(orderId => {
            deletePromises.push(deleteOrderById(orderId));
        });
        
        await Promise.all(deletePromises);
        
        showNotification(`Đã xóa ${selectedOrderIds.length} đơn hàng thành công!`, 'success');
        await loadOrders();
        displayOrders();
        updateBulkActions();
    } catch (error) {
        console.error('Error deleting orders:', error);
        showNotification('Lỗi xóa đơn hàng!', 'error');
    }
}

// Delete all orders
async function deleteAllOrders() {
    const totalOrders = Object.keys(filteredOrders).length;
    if (totalOrders === 0) {
        showNotification('Không có đơn hàng nào để xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa TẤT CẢ ${totalOrders} đơn hàng? Hành động này không thể hoàn tác!`)) {
        return;
    }
    
    // Double confirm for delete all
    if (!confirm('Đây là hành động nguy hiểm! Bạn thực sự muốn xóa tất cả đơn hàng?')) {
        return;
    }
    
    try {
        const deletePromises = [];
        
        Object.keys(filteredOrders).forEach(orderId => {
            deletePromises.push(deleteOrderById(orderId));
        });
        
        await Promise.all(deletePromises);
        
        showNotification(`Đã xóa tất cả ${totalOrders} đơn hàng thành công!`, 'success');
        await loadOrders();
        displayOrders();
        updateBulkActions();
    } catch (error) {
        console.error('Error deleting all orders:', error);
        showNotification('Lỗi xóa tất cả đơn hàng!', 'error');
    }
}

// Clear selection
function clearSelection() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = false);
    document.getElementById('selectAll').checked = false;
    updateBulkActions();
}

// Toggle select all (called from HTML onchange)
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    toggleSelectAllDirect(selectAll.checked);
}

// Toggle select all with direct state
function toggleSelectAllDirect(isChecked) {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    console.log('toggleSelectAllDirect called, isChecked:', isChecked);
    console.log('Found checkboxes:', checkboxes.length);
    
    // Set all visible checkboxes to match select all state
    checkboxes.forEach((checkbox, index) => {
        // Force update both property and attribute
        checkbox.checked = isChecked;
        if (isChecked) {
            checkbox.setAttribute('checked', 'checked');
        } else {
            checkbox.removeAttribute('checked');
        }
        
        // Trigger change event to force UI update
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log(`Checkbox ${index} (${checkbox.value}) set to:`, checkbox.checked);
        console.log(`Checkbox ${index} has attribute:`, checkbox.hasAttribute('checked'));
    });
    
    updateBulkActions();
}

// Setup event listeners
function setupEventListeners() {
    // Select all checkbox event listener
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            console.log('Select all checkbox changed via event listener:', this.checked);
            toggleSelectAllDirect(this.checked);
        });
    }
    
    // Date inputs
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    
    if (fromDateInput) fromDateInput.addEventListener('change', applyDateFilter);
    if (toDateInput) toDateInput.addEventListener('change', applyDateFilter);
    
    // Edit order form
    const editForm = document.getElementById('editOrderForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditOrderSubmit);
    }
    
    // Show all orders by default
    // filterByPeriod('today'); // Commented out to show all orders initially
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchOrder').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    filteredOrders = {};
    
    Object.entries(ordersData).forEach(([orderId, order]) => {
        let matches = true;
        
        // Search filter
        if (searchTerm) {
            const product = productsData[order.productId] || { name: '' };
            const searchableText = `${orderId} ${product.name}`.toLowerCase();
            matches = matches && searchableText.includes(searchTerm);
        }
        
        // Status filter
        if (statusFilter) {
            matches = matches && order.status === statusFilter;
        }
        
        // Date filter
        if (dateFilter) {
            matches = matches && order.orderDate === dateFilter;
        }
        
        if (matches) {
            filteredOrders[orderId] = order;
        }
    });
    
    currentPage = 1;
    displayOrders();
}

// Apply date filter
function applyDateFilter() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    filteredOrders = {};
    
    Object.entries(ordersData).forEach(([orderId, order]) => {
        const orderDate = order.orderDate;
        let matches = true;
        
        if (fromDate && orderDate < fromDate) {
            matches = false;
        }
        
        if (toDate && orderDate > toDate) {
            matches = false;
        }
        
        if (matches) {
            filteredOrders[orderId] = order;
        }
    });
    
    currentPage = 1;
    displayOrders();
}

// Filter by period (today, week, month)
function filterByPeriod(period) {
    const today = new Date();
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    
    // Remove active class from all buttons
    document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
    
    let fromDate, toDate;
    
    switch (period) {
        case 'today':
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
        case 'week':
            // Get Monday of current week
            const dayOfWeek = today.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
            startDate = new Date(today);
            startDate.setDate(today.getDate() + mondayOffset);
            startDate.setHours(0, 0, 0, 0);
            
            // Get Sunday of current week
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
            break;
    }
    
    // Update date inputs
    document.getElementById('fromDate').value = formatDateForInput(startDate);
    document.getElementById('toDate').value = formatDateForInput(endDate);
    
    // Apply filter
    applyDateFilter();
    
    // Show notification
    const periodNames = {
        'today': 'Hôm nay',
        'week': 'Tuần này', 
        'month': 'Tháng này'
    };
    showNotification(`Đã lọc theo ${periodNames[period]}`, 'info');
}

// Clear all filters
function clearAllFilters() {
    document.getElementById('fromDate').value = '';
    document.getElementById('toDate').value = '';
    
    // Remove active class from quick buttons
    document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
    
    filteredOrders = { ...ordersData };
    currentPage = 1;
    displayOrders();
}

// Load stores for filter dropdown
async function loadStoresForFilter() {
    try {
        console.log('loadStoresForFilter called');
        const storeFilter = document.getElementById('storeFilter');
        const retailStoreFilter = document.getElementById('retailStoreFilter');
        
        if (!storeFilter && !retailStoreFilter) {
            console.log('No store filter elements found');
            return;
        }
        
        console.log('Loading stores from Firebase...');
        const snapshot = await firebase.database().ref('stores').once('value');
        const stores = snapshot.val() || {};
        
        console.log('Raw stores data:', stores);
        
        // Update TMĐT store filter
        if (storeFilter) {
            storeFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
            Object.entries(stores).forEach(([storeId, store]) => {
                const option = document.createElement('option');
                option.value = store.name || `Cửa hàng ${storeId}`;
                option.textContent = store.name || `Cửa hàng ${storeId}`;
                storeFilter.appendChild(option);
            });
        }
        
        // Update Retail store filter
        if (retailStoreFilter) {
            retailStoreFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
            Object.entries(stores).forEach(([storeId, store]) => {
                const option = document.createElement('option');
                option.value = store.name || `Cửa hàng ${storeId}`;
                option.textContent = store.name || `Cửa hàng ${storeId}`;
                retailStoreFilter.appendChild(option);
            });
        }
        
        console.log('Stores loaded for filters:', Object.keys(stores).length);
    } catch (error) {
        console.error('Error loading stores for filter:', error);
    }
}

// Load customers for retail filter dropdown
async function loadCustomersForRetailFilter() {
    try {
        console.log('loadCustomersForRetailFilter called');
        const customerFilter = document.getElementById('retailCustomerFilter');
        
        if (!customerFilter) {
            console.log('retailCustomerFilter element not found');
            return;
        }
        
        console.log('Loading customers from Firebase...');
        const snapshot = await firebase.database().ref('customers').once('value');
        const customers = snapshot.val() || {};
        
        console.log('Raw customers data:', customers);
        
        // Clear existing options except "Tất cả khách hàng"
        customerFilter.innerHTML = '<option value="">Tất cả khách hàng</option>';
        
        // Add customer options
        Object.entries(customers).forEach(([customerId, customer]) => {
            console.log('Adding customer:', customerId, customer);
            const option = document.createElement('option');
            option.value = customer.name || customer.customerName || `Khách hàng ${customerId}`;
            option.textContent = customer.name || customer.customerName || `Khách hàng ${customerId}`;
            customerFilter.appendChild(option);
        });
        
        console.log('Customers loaded for filter:', Object.keys(customers).length);
    } catch (error) {
        console.error('Error loading customers for filter:', error);
    }
}

// Display retail orders with comprehensive data
function displayRetailOrders() {
    console.log('🔄 displayRetailOrders called');
    
    const tbody = document.getElementById('retailOrdersTableBody');
    if (!tbody) {
        console.error('❌ retailOrdersTableBody element not found');
        return;
    }
    
    console.log('✅ Found retailOrdersTableBody element');
    
    // Enhanced sample data with more realistic retail orders
    const sampleRetailOrders = [
        {
            id: 'retail_175654351028_3011kuzrh',
            customerName: 'Hoàng Phúc',
            productName: 'Áo thun cotton nam',
            sku: 'AT001-XL-BLK',
            quantity: '2',
            unit: 'Cái',
            storeName: 'Cửa hàng Quận 1',
            total: 350000,
            createdAt: '30/08/2025',
            status: 'completed'
        },
        {
            id: 'retail_175654440219_5o6qb0pj',
            customerName: 'Phạm Hoàng Phúc',
            productName: 'Quần jean nữ skinny',
            sku: 'QJ002-M-BLU',
            quantity: '1',
            unit: 'Cái',
            storeName: 'Cửa hàng Quận 3',
            total: 450000,
            createdAt: '30/08/2025',
            status: 'processing'
        },
        {
            id: 'retail_175654567890_abc123',
            customerName: 'Nguyễn Thị Mai',
            productName: 'Giày sneaker trắng',
            sku: 'GS003-38-WHT',
            quantity: '1',
            unit: 'Đôi',
            storeName: 'Cửa hàng Quận 7',
            total: 890000,
            createdAt: '29/08/2025',
            status: 'completed'
        },
        {
            id: 'retail_175654678901_def456',
            customerName: 'Trần Văn Nam',
            productName: 'Túi xách da thật',
            sku: 'TX004-BRN-L',
            quantity: '1',
            unit: 'Cái',
            storeName: 'Cửa hàng Quận 1',
            total: 1200000,
            createdAt: '29/08/2025',
            status: 'pending'
        },
        {
            id: 'retail_175654789012_ghi789',
            customerName: 'Lê Thị Hoa',
            productName: 'Đầm công sở',
            sku: 'DCS005-S-NAV',
            quantity: '2',
            unit: 'Cái',
            storeName: 'Cửa hàng Quận 5',
            total: 680000,
            createdAt: '28/08/2025',
            status: 'completed'
        },
        {
            id: 'retail_175654890123_jkl012',
            customerName: 'Võ Minh Tuấn',
            productName: 'Kính mát nam',
            sku: 'KM006-BLK-UV',
            quantity: '1',
            unit: 'Cái',
            storeName: 'Cửa hàng Quận 2',
            total: 320000,
            createdAt: '28/08/2025',
            status: 'processing'
        },
        {
            id: 'retail_175654901234_mno345',
            customerName: 'Đặng Thị Lan',
            productName: 'Ví da nữ cao cấp',
            sku: 'VD007-PNK-S',
            quantity: '1',
            unit: 'Cái',
            storeName: 'Cửa hàng Quận 4',
            total: 280000,
            createdAt: '27/08/2025',
            status: 'completed'
        },
        {
            id: 'retail_175655012345_pqr678',
            customerName: 'Bùi Văn Đức',
            productName: 'Áo khoác hoodie',
            sku: 'AK008-L-GRY',
            quantity: '1',
            unit: 'Cái',
            storeName: 'Cửa hàng Quận 6',
            total: 520000,
            createdAt: '27/08/2025',
            status: 'cancelled'
        }
    ];
    
    if (sampleRetailOrders.length === 0) {
        console.log('📝 No retail orders to display, showing empty state');
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-store"></i>
                        <p>Chưa có đơn hàng lẻ nào</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('📊 Processing', sampleRetailOrders.length, 'retail orders');
    
    let ordersHTML = '';
    let index = 1;
    
    for (const order of sampleRetailOrders) {
        const statusInfo = statusMap[order.status] || statusMap['pending'];
        
        ordersHTML += `
            <tr>
                <td class="text-center">${index}</td>
                <td class="order-id">${order.id}</td>
                <td class="customer-name">${order.customerName}</td>
                <td class="product-name">${order.productName}</td>
                <td class="product-sku">${order.sku}</td>
                <td class="quantity text-center">${order.quantity}</td>
                <td class="unit text-center">${order.unit}</td>
                <td class="store-name">${order.storeName}</td>
                <td class="total-amount text-right">
                    <span class="amount">${formatCurrency(order.total)}</span>
                </td>
                <td class="created-date text-center">${order.createdAt}</td>
                <td class="status text-center">
                    <span class="status-badge ${statusInfo.class}">
                        <i class="${statusInfo.icon}"></i>
                        ${statusInfo.text}
                    </span>
                </td>
                <td class="actions text-center">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="viewRetailOrder('${order.id}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRetailOrder('${order.id}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        index++;
    }
    
    tbody.innerHTML = ordersHTML;
    console.log('✅ Retail orders displayed successfully');
}

// View retail order details
function viewRetailOrder(orderId) {
    console.log('Viewing retail order:', orderId);
    showNotification('Chức năng xem chi tiết đơn hàng lẻ đang được phát triển', 'info');
}

// Delete retail order
function deleteRetailOrder(orderId) {
    if (confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
        console.log('Deleting retail order:', orderId);
        showNotification('Chức năng xóa đơn hàng lẻ đang được phát triển', 'info');
    }
}

// Debounced search function for real-time filtering
function debouncedSearch() {
    console.log('debouncedSearch called');
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        console.log('Executing search after delay');
        applySearchFilters();
    }, 300); // 300ms delay
}

// Expose functions to global scope
window.debouncedSearch = debouncedSearch;
window.applySearchFilters = applySearchFilters;

// Apply search and filters
function applySearchFilters() {
    console.log('applySearchFilters called');
    console.log('ordersData:', ordersData);
    
    // Get filter values
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const platformFilter = document.getElementById('platformFilter')?.value || '';
    const storeFilter = document.getElementById('storeFilter')?.value || '';
    const priceRangeFilter = document.getElementById('priceRangeFilter')?.value || '';
    
    console.log('Search term:', searchTerm);
    
    // Update search filters state
    searchFilters = {
        searchTerm,
        platform: platformFilter,
        store: storeFilter,
        priceRange: priceRangeFilter
    };
    
    // If no filters are applied, show all orders
    if (!searchTerm && !platformFilter && !storeFilter && !priceRangeFilter) {
        filteredOrders = { ...ordersData };
        updateSearchResultsInfo(Object.keys(filteredOrders).length);
        currentPage = 1;
        displayOrders();
        return;
    }
    
    // Apply filters to orders
    filteredOrders = {};
    let matchCount = 0;
    
    Object.entries(ordersData).forEach(([orderId, order]) => {
        let matches = true;
        
        // Search term filter (order ID, SKU, product name)
        if (searchTerm) {
            const searchableText = [
                orderId,
                order.orderId || '',
                order.sku || '',
                order.productName || '',
                (order.items && order.items[0]) ? order.items[0].name : '',
                (order.items && order.items[0]) ? order.items[0].sku : ''
            ].join(' ').toLowerCase();
            
            console.log('Checking order:', orderId, 'searchableText:', searchableText);
            matches = matches && searchableText.includes(searchTerm);
            console.log('Match result:', matches);
        }
        
        // Platform filter
        if (platformFilter) {
            const orderPlatform = order.platform || '';
            matches = matches && orderPlatform === platformFilter;
        }
        
        // Store filter
        if (storeFilter) {
            const orderStoreId = order.storeId || localStorage.getItem('selectedStoreId');
            matches = matches && orderStoreId === storeFilter;
        }
        
        // Price range filter
        if (priceRangeFilter) {
            const [minPrice, maxPrice] = priceRangeFilter.split('-').map(Number);
            const orderTotal = order.total || 0;
            matches = matches && orderTotal >= minPrice && orderTotal <= maxPrice;
        }
        
        if (matches) {
            filteredOrders[orderId] = order;
            matchCount++;
        }
    });
    
    // Update search results info
    updateSearchResultsInfo(matchCount);
    
    // Reset to first page and display
    currentPage = 1;
    displayOrders();
}

// Update search results info
function updateSearchResultsInfo(matchCount) {
    const searchResultsCount = document.getElementById('searchResultsCount');
    if (!searchResultsCount) return;
    
    const totalOrders = Object.keys(ordersData).length;
    const hasFilters = searchFilters.searchTerm || searchFilters.platform || 
                      searchFilters.store || searchFilters.priceRange;
    
    if (hasFilters) {
        searchResultsCount.innerHTML = `
            <i class="fas fa-filter"></i> 
            Tìm thấy <strong>${matchCount}</strong> đơn hàng 
            trong tổng số <strong>${totalOrders}</strong> đơn hàng
        `;
        searchResultsCount.className = 'search-results-info filtered';
    } else {
        searchResultsCount.innerHTML = `Hiển thị tất cả <strong>${totalOrders}</strong> đơn hàng`;
        searchResultsCount.className = 'search-results-info';
    }
}

// Clear search filters
function clearSearchFilters() {
    // Clear all filter inputs
    const searchInput = document.getElementById('searchInput');
    const platformFilter = document.getElementById('platformFilter');
    const storeFilter = document.getElementById('storeFilter');
    const priceRangeFilter = document.getElementById('priceRangeFilter');
    
    if (searchInput) searchInput.value = '';
    if (platformFilter) platformFilter.value = '';
    if (storeFilter) storeFilter.value = '';
    if (priceRangeFilter) priceRangeFilter.value = '';
    
    // Reset search filters state
    searchFilters = {
        searchTerm: '',
        platform: '',
        store: '',
        priceRange: ''
    };
    
    // Show all orders
    filteredOrders = { ...ordersData };
    currentPage = 1;
    
    // Update display
    updateSearchResultsInfo(Object.keys(filteredOrders).length);
    displayOrders();
    
    showNotification('Đã xóa tất cả bộ lọc', 'info');
}

// Toggle select all
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.order-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkActions();
}

// Update bulk actions visibility
function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const checkedBoxes = document.querySelectorAll('.product-checkbox:checked');
    const selectAll = document.getElementById('selectAll');
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    const totalOrders = Object.keys(filteredOrders).length;
    
    // Store selected order IDs
    selectedOrderIds = Array.from(checkedBoxes).map(cb => cb.value);
    console.log('updateBulkActions - selectedOrderIds:', selectedOrderIds);
    
    // Update select all checkbox
    if (selectAll) {
        selectAll.checked = checkboxes.length > 0 && checkedBoxes.length === checkboxes.length;
        selectAll.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
    }
    
    // Show bulk actions if there are orders or selected items
    if (bulkActions && selectedCount) {
        if (totalOrders > 0) {
            bulkActions.style.display = 'flex';
            if (checkedBoxes.length > 0) {
                selectedCount.textContent = checkedBoxes.length;
            } else {
                selectedCount.textContent = '0';
            }
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

// Update selected orders status
async function updateSelectedStatus(newStatus) {
    const checkedBoxes = document.querySelectorAll('.product-checkbox:checked');
    const orderIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (orderIds.length === 0) {
        showNotification('Vui lòng chọn ít nhất một đơn hàng!', 'warning');
        return;
    }
    
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (!selectedStoreId) {
        showNotification('Vui lòng chọn cửa hàng!', 'error');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn cập nhật trạng thái ${orderIds.length} đơn hàng?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const updates = {};
        orderIds.forEach(orderId => {
            updates[`stores/${selectedStoreId}/orders/${orderId}/status`] = newStatus;
            updates[`stores/${selectedStoreId}/orders/${orderId}/updatedAt`] = new Date().toISOString();
        });
        
        await firebase.database().ref().update(updates);
        
        // Update local data
        orderIds.forEach(orderId => {
            if (ordersData[orderId]) {
                ordersData[orderId].status = newStatus;
                ordersData[orderId].updatedAt = new Date().toISOString();
            }
        });
        
        filteredOrders = { ...ordersData };
        updateStatistics();
        displayOrders();
        
        // Clear selections
        document.getElementById('selectAll').checked = false;
        updateBulkActions();
        
        showNotification(`Đã cập nhật trạng thái ${orderIds.length} đơn hàng!`, 'success');
        
    } catch (error) {
        console.error('Error updating orders:', error);
        showNotification('Lỗi khi cập nhật đơn hàng!', 'error');
    } finally {
        showLoading(false);
    }
}

// Delete selected orders
async function deleteSelectedOrders() {
    const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
    const orderIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (orderIds.length === 0) {
        showNotification('Vui lòng chọn ít nhất một đơn hàng!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${orderIds.length} đơn hàng? Hành động này không thể hoàn tác!`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const updates = {};
        orderIds.forEach(orderId => {
            updates[`orders/${orderId}`] = null;
        });
        
        await firebase.database().ref().update(updates);
        
        // Update local data
        orderIds.forEach(orderId => {
            delete ordersData[orderId];
            delete filteredOrders[orderId];
        });
        
        updateStatistics();
        displayOrders();
        
        // Clear selections
        document.getElementById('selectAll').checked = false;
        updateBulkActions();
        
        showNotification(`Đã xóa ${orderIds.length} đơn hàng!`, 'success');
        
    } catch (error) {
        console.error('Error deleting orders:', error);
        showNotification('Lỗi khi xóa đơn hàng!', 'error');
    } finally {
        showLoading(false);
    }
}

// View order detail
function viewOrderDetail(orderId) {
    const order = ordersData[orderId];
    const product = productsData[order.productId] || { name: 'Sản phẩm không tồn tại' };
    const status = statusMap[order.status] || statusMap['pending'];
    
    const detailHTML = `
        <div class="order-detail">
            <div class="detail-row">
                <label>Mã Đơn Hàng:</label>
                <span>${orderId}</span>
            </div>
            <div class="detail-row">
                <label>Ngày Tạo:</label>
                <span>${formatDate(order.orderDate)}</span>
            </div>
            <div class="detail-row">
                <label>Sản Phẩm:</label>
                <span>${product.name}</span>
            </div>
            <div class="detail-row">
                <label>Số Lượng:</label>
                <span>${order.quantity} kg</span>
            </div>
            <div class="detail-row">
                <label>Đơn Giá:</label>
                <span>${formatCurrency(order.price)}</span>
            </div>
            <div class="detail-row">
                <label>Tổng Tiền:</label>
                <span class="total-amount">${formatCurrency(order.total)}</span>
            </div>
            <div class="detail-row">
                <label>Trạng Thái:</label>
                <span class="status-badge ${status.class}">
                    <i class="${status.icon}"></i>
                    ${status.text}
                </span>
            </div>
            ${order.notes ? `
                <div class="detail-row">
                    <label>Ghi Chú:</label>
                    <span>${order.notes}</span>
                </div>
            ` : ''}
            <div class="detail-row">
                <label>Cập Nhật Lần Cuối:</label>
                <span>${order.updatedAt ? formatDateTime(order.updatedAt) : 'Chưa cập nhật'}</span>
            </div>
        </div>
    `;
    
    document.getElementById('orderDetailContent').innerHTML = detailHTML;
    document.getElementById('orderDetailModal').classList.remove('hidden');
}

// Close order detail modal
function closeOrderDetail() {
    document.getElementById('orderDetailModal').classList.add('hidden');
}

// Edit order
function editOrder(orderId) {
    const order = ordersData[orderId];
    currentEditOrderId = orderId;
    
    document.getElementById('editOrderStatus').value = order.status;
    document.getElementById('editOrderNotes').value = order.notes || '';
    
    document.getElementById('editOrderModal').classList.remove('hidden');
}

// Close edit order modal
function closeEditOrder() {
    document.getElementById('editOrderModal').classList.add('hidden');
    currentEditOrderId = null;
}

// Handle edit order form submit
async function handleEditOrderSubmit(e) {
    e.preventDefault();
    
    if (!currentEditOrderId) return;
    
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (!selectedStoreId) {
        showNotification('Vui lòng chọn cửa hàng!', 'error');
        return;
    }
    
    const newStatus = document.getElementById('editOrderStatus').value;
    const notes = document.getElementById('editOrderNotes').value.trim();
    
    showLoading(true);
    
    try {
        const updates = {
            [`stores/${selectedStoreId}/orders/${currentEditOrderId}/status`]: newStatus,
            [`stores/${selectedStoreId}/orders/${currentEditOrderId}/notes`]: notes,
            [`stores/${selectedStoreId}/orders/${currentEditOrderId}/updatedAt`]: new Date().toISOString()
        };
        
        await firebase.database().ref().update(updates);
        
        // Update local data
        ordersData[currentEditOrderId].status = newStatus;
        ordersData[currentEditOrderId].notes = notes;
        ordersData[currentEditOrderId].updatedAt = new Date().toISOString();
        
        filteredOrders = { ...ordersData };
        updateStatistics();
        displayOrders();
        closeEditOrder();
        
        showNotification('Đã cập nhật đơn hàng thành công!', 'success');
        
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Lỗi khi cập nhật đơn hàng!', 'error');
    } finally {
        showLoading(false);
    }
}

// Export orders to Excel (placeholder)
function exportOrders() {
    showNotification('Tính năng xuất Excel đang được phát triển!', 'info');
}

// Update pagination
function updatePagination(totalItems) {
    try {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Update pagination info
        const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const showingTo = Math.min(currentPage * itemsPerPage, totalItems);
        
        const showingFromEl = document.getElementById('showingFrom');
        const showingToEl = document.getElementById('showingTo');
        const totalItemsEl = document.getElementById('totalItems');
        
        if (showingFromEl) showingFromEl.textContent = showingFrom;
        if (showingToEl) showingToEl.textContent = showingTo;
        if (totalItemsEl) totalItemsEl.textContent = totalItems;
        
        console.log('📊 Pagination info updated:', showingFrom, '-', showingTo, 'of', totalItems);
        
        // Update pagination buttons
        const paginationContainer = document.querySelector('.pagination-buttons');
        if (!paginationContainer) {
            console.warn('⚠️ pagination-buttons container not found, skipping button generation');
            return;
        }
    
    // Generate pagination buttons
    let paginationHTML = '';
    
    if (totalPages > 1) {
        // Previous button
        paginationHTML += `
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage || i === 1 || i === totalPages || 
                (i >= currentPage - 1 && i <= currentPage + 1)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                            onclick="changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                paginationHTML += '<span class="pagination-dots">...</span>';
            }
        }
        
        // Next button
        paginationHTML += `
            <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }
    
        paginationContainer.innerHTML = paginationHTML;
        console.log('✅ Pagination buttons updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating pagination:', error);
        // Don't throw error to prevent cascading failures
    }
}

// Change page
function changePage(page) {
    const totalItems = Object.keys(filteredOrders).length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displayOrders();
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
