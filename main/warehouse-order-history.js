// ===== ORDER HISTORY MANAGEMENT =====
// Global variables for order history
let orderHistoryData = [];
let orderHistoryFilteredData = [];
let orderHistoryCurrentPage = 1;
let orderHistoryPageSize = 10;

// Load order history data from Firebase
async function loadOrderHistoryData() {
    if (!window.database) {
        throw new Error('Firebase database not available');
    }

    try {
        console.log('Loading order history data for store:', currentFilters.store);
        
        let orders = {};
        
        if (currentFilters.store === 'all') {
            // Load all orders
            const ordersRef = window.database.ref('orders');
            const ordersSnapshot = await ordersRef.once('value');
            orders = ordersSnapshot.val() || {};
        } else {
            // Load store-specific orders
            const storeOrdersRef = window.database.ref('orders');
            const storeOrdersSnapshot = await storeOrdersRef.once('value');
            const allOrders = storeOrdersSnapshot.val() || {};
            
            // Filter by store
            orders = {};
            Object.keys(allOrders).forEach(orderId => {
                const order = allOrders[orderId];
                if (order.storeId === currentFilters.store) {
                    orders[orderId] = order;
                }
            });
        }

        // Convert to array and sort by date (newest first)
        orderHistoryData = Object.values(orders).map(order => ({
            ...order,
            timestamp: new Date(order.date || order.createdAt).getTime()
        })).sort((a, b) => b.timestamp - a.timestamp);

        console.log('Loaded order history data:', orderHistoryData.length, 'orders');
        
        // Apply filters and update table
        filterOrderHistoryTable();
        
    } catch (error) {
        console.error('Error loading order history data:', error);
        orderHistoryData = [];
        orderHistoryFilteredData = [];
        updateOrderHistoryTable();
    }
}

// Filter order history table
function filterOrderHistoryTable() {
    const typeFilter = document.getElementById('orderHistoryTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('orderHistoryStatusFilter')?.value || 'all';
    const searchTerm = document.getElementById('orderHistorySearch')?.value.toLowerCase() || '';

    orderHistoryFilteredData = orderHistoryData.filter(order => {
        // Type filter
        if (typeFilter !== 'all' && order.type !== typeFilter) {
            return false;
        }

        // Status filter
        if (statusFilter !== 'all' && order.status !== statusFilter) {
            return false;
        }

        // Search filter
        if (searchTerm) {
            const searchableText = [
                order.id || '',
                order.customerName || '',
                order.originalOrderId || '',
                ...(order.products || []).map(p => p.name || ''),
                ...(order.products || []).map(p => p.sku || '')
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    });

    // Reset to first page when filtering
    orderHistoryCurrentPage = 1;
    updateOrderHistoryTable();
}

// Update order history table
function updateOrderHistoryTable() {
    const tableBody = document.getElementById('orderHistoryTableBody');
    if (!tableBody) return;

    // Calculate pagination
    const totalItems = orderHistoryFilteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / orderHistoryPageSize));
    const startIndex = (orderHistoryCurrentPage - 1) * orderHistoryPageSize;
    const endIndex = Math.min(startIndex + orderHistoryPageSize, totalItems);
    const currentPageData = orderHistoryFilteredData.slice(startIndex, endIndex);

    // Clear table
    tableBody.innerHTML = '';

    // Populate table
    currentPageData.forEach((order, index) => {
        const row = document.createElement('tr');
        const globalIndex = startIndex + index + 1;

        // Get order type display
        const orderTypeMap = {
            'retail_order': '🛒 Đơn hàng lẻ',
            'wholesale_order': '🏪 Đơn hàng sỉ',
            'tmdt_order': '📱 Đơn hàng TMĐT'
        };
        const orderTypeDisplay = orderTypeMap[order.type] || order.type || 'N/A';

        // Get status display
        const statusMap = {
            'completed': '✅ Hoàn thành',
            'pending': '⏳ Đang xử lý',
            'cancelled': '❌ Đã hủy'
        };
        const statusDisplay = statusMap[order.status] || order.status || 'N/A';

        // Get products summary
        const products = order.products || [];
        const productSummary = products.length > 0 
            ? products.map(p => `${p.name} (${p.quantity})`).join(', ')
            : 'N/A';
        const totalQuantity = products.reduce((sum, p) => sum + (p.quantity || 0), 0);

        // Get store name
        const storeName = getStoreName(order.storeId) || order.storeId || 'N/A';

        // Format date
        const orderDate = new Date(order.date || order.createdAt);
        const formattedDate = orderDate.toLocaleString('vi-VN');

        row.innerHTML = `
            <td>${globalIndex}</td>
            <td>${formattedDate}</td>
            <td>${order.originalOrderId || order.id || 'N/A'}</td>
            <td><span class="order-type-badge">${orderTypeDisplay}</span></td>
            <td>${order.customerName || 'N/A'}</td>
            <td title="${productSummary}">${productSummary.length > 50 ? productSummary.substring(0, 50) + '...' : productSummary}</td>
            <td>${totalQuantity}</td>
            <td>${formatCurrency(order.totalAmount || 0)}</td>
            <td><span class="status-badge status-${order.status}">${statusDisplay}</span></td>
            <td>${storeName}</td>
        `;

        tableBody.appendChild(row);
    });

    // Update pagination info
    updateOrderHistoryPaginationInfo(startIndex + 1, endIndex, totalItems);
    updateOrderHistoryPaginationControls(orderHistoryCurrentPage, totalPages);
}

// Update pagination info
function updateOrderHistoryPaginationInfo(start, end, total) {
    const startEl = document.getElementById('orderHistoryShowingStart');
    const endEl = document.getElementById('orderHistoryShowingEnd');
    const totalEl = document.getElementById('orderHistoryTotal');

    if (startEl) startEl.textContent = start;
    if (endEl) endEl.textContent = end;
    if (totalEl) totalEl.textContent = total;
}

// Update pagination controls
function updateOrderHistoryPaginationControls(currentPage, totalPages) {
    // Update button states
    const firstBtn = document.getElementById('orderHistoryFirstBtn');
    const prevBtn = document.getElementById('orderHistoryPrevBtn');
    const nextBtn = document.getElementById('orderHistoryNextBtn');
    const lastBtn = document.getElementById('orderHistoryLastBtn');

    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (lastBtn) lastBtn.disabled = currentPage === totalPages;

    // Update page numbers
    const pageNumbersContainer = document.getElementById('orderHistoryPageNumbers');
    if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = '';
        
        const maxVisiblePages = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let end = Math.min(totalPages, start + maxVisiblePages - 1);
        
        if (end - start + 1 < maxVisiblePages) {
            start = Math.max(1, end - maxVisiblePages + 1);
        }

        for (let i = start; i <= end; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-number ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => goToOrderHistoryPage(i);
            pageNumbersContainer.appendChild(pageBtn);
        }
    }
}

// Navigation functions for order history pagination
function goToOrderHistoryPage(page) {
    if (page === 'last') {
        const totalPages = Math.ceil(orderHistoryFilteredData.length / orderHistoryPageSize) || 1;
        orderHistoryCurrentPage = totalPages;
    } else {
        orderHistoryCurrentPage = parseInt(page);
    }
    updateOrderHistoryTable();
}

function previousOrderHistoryPage() {
    if (orderHistoryCurrentPage > 1) {
        orderHistoryCurrentPage--;
        updateOrderHistoryTable();
    }
}

function nextOrderHistoryPage() {
    const totalPages = Math.ceil(orderHistoryFilteredData.length / orderHistoryPageSize) || 1;
    if (orderHistoryCurrentPage < totalPages) {
        orderHistoryCurrentPage++;
        updateOrderHistoryTable();
    }
}

function changeOrderHistoryPageSize() {
    const pageSizeSelect = document.getElementById('orderHistoryPageSize');
    if (pageSizeSelect) {
        orderHistoryPageSize = parseInt(pageSizeSelect.value);
        orderHistoryCurrentPage = 1; // Reset to first page
        updateOrderHistoryTable();
    }
}

// Helper function to get store name
function getStoreName(storeId) {
    if (!storeId || !window.storesData) return storeId;
    const store = window.storesData[storeId];
    return store ? store.name : storeId;
}

// Helper function to format currency
function formatCurrency(amount) {
    if (typeof amount !== 'number') return '0 VNĐ';
    return amount.toLocaleString('vi-VN') + ' VNĐ';
}

console.log('Warehouse order history functions loaded successfully');
