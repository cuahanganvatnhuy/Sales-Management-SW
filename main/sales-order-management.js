// Sales Order Management JavaScript
let salesOrdersData = {};
let filteredSalesOrders = {};
let currentView = 'tmdt';
let currentPage = 1;
const itemsPerPage = 20;
let selectedOrders = new Set();

// Search and filter state
let searchFilters = {
    searchTerm: '',
    platform: '',
    store: '',
    priceRange: '',
    customer: ''
};

// Debounce timer for search
let searchDebounceTimer = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    
    // Listen for store context changes
    window.addEventListener('storeContextChanged', function() {
        loadSalesOrdersData();
    });
});

// Initialize page
function initializePage() {
    loadSalesOrdersData();
    loadStoresForFilters();
}

// Setup event listeners
function setupEventListeners() {
    // View switching buttons
    document.getElementById('tmdt-btn')?.addEventListener('click', () => switchSalesOrderView('tmdt'));
    document.getElementById('retail-btn')?.addEventListener('click', () => switchSalesOrderView('retail'));
    document.getElementById('wholesale-btn')?.addEventListener('click', () => switchSalesOrderView('wholesale'));
}

// Switch between order views
function switchSalesOrderView(viewType) {
    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Hide all sections
    document.querySelectorAll('.order-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    
    // Activate selected button and section
    const activeBtn = document.getElementById(`${viewType}-btn`);
    const activeSection = document.getElementById(`${viewType}-orders-section`);
    
    if (activeBtn) activeBtn.classList.add('active');
    if (activeSection) {
        activeSection.classList.remove('hidden');
        activeSection.classList.add('active');
    }
    
    currentView = viewType;
    currentPage = 1;
    loadSalesOrdersData();
}

// Load sales orders data from Firebase
async function loadSalesOrdersData() {
    const storeId = localStorage.getItem('selectedStoreId');
    if (!storeId || !window.database) return;
    
    try {
        console.log('Loading sales orders for store:', storeId);
        
        // Load from the actual sales order collections
        const promises = [
            // Load TMDT sales orders from multiple possible sources
            window.database.ref(`stores/${storeId}/tmdtSalesOrders`).once('value'),
            window.database.ref(`stores/${storeId}/orders`).once('value'), // Check regular orders
            window.database.ref(`stores/${storeId}/salesOrders`).once('value'), // Check sales orders from TMDT module
            // Load retail sales orders  
            window.database.ref(`stores/${storeId}/retailSalesOrders`).once('value'),
            // Load wholesale sales orders
            window.database.ref(`stores/${storeId}/wholesaleSalesOrders`).once('value'),
            // Also check global orders collection (not store-specific)
            window.database.ref('orders').once('value')
        ];
        
        const [tmdtSnapshot, ordersSnapshot, salesOrdersSnapshot, retailSnapshot, wholesaleSnapshot, globalOrdersSnapshot] = await Promise.all(promises);
        
        const tmdtOrders = tmdtSnapshot.val() || {};
        const regularOrders = ordersSnapshot.val() || {};
        const salesOrders = salesOrdersSnapshot.val() || {};
        const retailOrders = retailSnapshot.val() || {};
        const wholesaleOrders = wholesaleSnapshot.val() || {};
        const globalOrders = globalOrdersSnapshot.val() || {};
        
        console.log('TMDT orders loaded:', Object.keys(tmdtOrders).length);
        console.log('Regular orders loaded:', Object.keys(regularOrders).length);
        console.log('Sales orders loaded:', Object.keys(salesOrders).length);
        console.log('Retail orders loaded:', Object.keys(retailOrders).length);
        console.log('Wholesale orders loaded:', Object.keys(wholesaleOrders).length);
        console.log('Global orders loaded:', Object.keys(globalOrders).length);
        
        // Debug: Check for wholesale orders in regular orders
        console.log('🔍 Checking regular orders for wholesale orders:');
        console.log('🔍 All regular orders:', Object.keys(regularOrders));
        Object.entries(regularOrders).forEach(([orderId, order]) => {
            console.log('🔍 Checking order:', orderId, {
                source: order.source,
                orderType: order.orderType, 
                orderId: order.orderId,
                hasWholesaleInId: order.orderId && order.orderId.includes('WHOLESALE')
            });
            
            if (order.source === 'wholesale_sales' || order.orderType === 'wholesale' || 
                (order.orderId && order.orderId.includes('WHOLESALE'))) {
                console.log('✅ Found wholesale order in regular orders:', orderId, order);
            }
        });
        
        // Combine all orders with proper source identification
        const allOrders = {};
        
        // Add TMDT orders with source identification
        Object.entries(tmdtOrders).forEach(([orderId, order]) => {
            allOrders[orderId] = {
                ...order,
                source: 'tmdt_sales',
                orderType: 'ecommerce'
            };
        });
        
        // Add TMDT orders from regular orders collection (check for platform field)
        Object.entries(regularOrders).forEach(([orderId, order]) => {
            if (order.platform || order.platformName || order.source === 'tmdt_sales' || order.orderType === 'ecommerce') {
                allOrders[orderId] = {
                    ...order,
                    source: 'tmdt_sales',
                    orderType: 'ecommerce'
                };
            }
        });
        
        // Add TMDT orders from salesOrders collection (from TMDT module)
        Object.entries(salesOrders).forEach(([orderId, order]) => {
            if (order.platform || order.platformName || order.source === 'tmdt_sales' || order.orderType === 'ecommerce') {
                allOrders[orderId] = {
                    ...order,
                    source: 'tmdt_sales',
                    orderType: 'ecommerce'
                };
            }
        });
        
        // Add retail orders with source identification
        Object.entries(retailOrders).forEach(([orderId, order]) => {
            allOrders[orderId] = {
                ...order,
                source: 'retail_sales',
                orderType: 'retail'
            };
        });
        
        // Add wholesale orders with source identification
        Object.entries(wholesaleOrders).forEach(([orderId, order]) => {
            allOrders[orderId] = {
                ...order,
                source: 'wholesale_sales',
                orderType: 'wholesale'
            };
        });
        
        // Add wholesale orders from regular orders collection (check for wholesale indicators)
        Object.entries(regularOrders).forEach(([orderId, order]) => {
            if (order.source === 'wholesale_sales' || order.orderType === 'wholesale' || 
                (order.orderId && order.orderId.includes('WHOLESALE'))) {
                allOrders[orderId] = {
                    ...order,
                    source: 'wholesale_sales',
                    orderType: 'wholesale'
                };
            }
        });
        
        // Add wholesale orders from salesOrders collection (from wholesale module)
        Object.entries(salesOrders).forEach(([orderId, order]) => {
            if (order.source === 'wholesale_sales' || order.orderType === 'wholesale' || 
                (order.orderId && order.orderId.includes('WHOLESALE'))) {
                allOrders[orderId] = {
                    ...order,
                    source: 'wholesale_sales',
                    orderType: 'wholesale'
                };
            }
        });
        
        // Add wholesale orders from global orders collection (where wholesale orders are actually saved)
        console.log('🔍 Checking global orders for wholesale orders:');
        Object.entries(globalOrders).forEach(([orderId, order]) => {
            console.log('🔍 Checking global order:', orderId, {
                source: order.source,
                orderType: order.orderType, 
                orderId: order.orderId,
                storeId: order.storeId,
                hasWholesaleInId: order.orderId && order.orderId.includes('WHOLESALE')
            });
            
            // Only include orders from the selected store
            if (order.storeId === storeId && (
                order.source === 'wholesale_sales' || 
                order.orderType === 'wholesale' || 
                (order.orderId && order.orderId.includes('WHOLESALE'))
            )) {
                console.log('✅ Found wholesale order in global orders:', orderId, order);
                allOrders[orderId] = {
                    ...order,
                    source: 'wholesale_sales',
                    orderType: 'wholesale'
                };
            }
        });
        
        salesOrdersData = allOrders;
        filteredSalesOrders = {};
        console.log('Total sales orders loaded:', Object.keys(salesOrdersData).length);
        
        // Debug: Check final wholesale orders count
        const wholesaleOrdersCount = Object.values(salesOrdersData).filter(order => 
            order.source === 'wholesale_sales' || order.orderType === 'wholesale'
        ).length;
        console.log('🔍 Final wholesale orders count:', wholesaleOrdersCount);
        
        // Debug: List all wholesale orders with full data
        Object.entries(salesOrdersData).forEach(([orderId, order]) => {
            if (order.source === 'wholesale_sales' || order.orderType === 'wholesale') {
                console.log('📦 Wholesale order found:', orderId, order);
            }
        });
        
        displayCurrentViewOrders();
        updateStatistics();
        updatePagination();
        updateSearchResultsInfo();
        
    } catch (error) {
        console.error('Error loading sales orders:', error);
    }
}

// Toggle select all checkbox
function toggleSelectAll(orderType) {
    const selectAllCheckbox = document.getElementById(`select-all-${orderType}`);
    const orderCheckboxes = document.querySelectorAll(`input[name="order-checkbox-${orderType}"]`);
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        if (selectAllCheckbox.checked) {
            selectedOrders.add(checkbox.value);
        } else {
            selectedOrders.delete(checkbox.value);
        }
    });
    
    updateDeleteButtonState(orderType);
}

// Update individual order selection
function toggleOrderSelection(orderId, orderType) {
    const checkbox = document.querySelector(`input[value="${orderId}"]`);
    if (checkbox.checked) {
        selectedOrders.add(orderId);
    } else {
        selectedOrders.delete(orderId);
    }
    
    // Update select all checkbox state
    const orderCheckboxes = document.querySelectorAll(`input[name="order-checkbox-${orderType}"]`);
    const selectAllCheckbox = document.getElementById(`select-all-${orderType}`);
    const checkedCount = Array.from(orderCheckboxes).filter(cb => cb.checked).length;
    
    selectAllCheckbox.checked = checkedCount === orderCheckboxes.length;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < orderCheckboxes.length;
    
    updateDeleteButtonState(orderType);
}

// Update delete button state
function updateDeleteButtonState(orderType) {
    const deleteButton = document.getElementById(`delete-selected-${orderType}`);
    if (deleteButton) {
        deleteButton.disabled = selectedOrders.size === 0;
    }
}

// Delete selected orders
async function deleteSelectedOrders(orderType) {
    if (selectedOrders.size === 0) {
        alert('Vui lòng chọn ít nhất một đơn hàng để xóa.');
        return;
    }
    
    const confirmMessage = `Bạn có chắc chắn muốn xóa ${selectedOrders.size} đơn hàng đã chọn?`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const storeId = localStorage.getItem('selectedStoreId');
        const promises = [];
        
        for (const orderId of selectedOrders) {
            const order = salesOrdersData[orderId];
            if (order) {
                // Determine which collection to delete from based on order source
                let collectionPath;
                if (order.source === 'tmdt_sales' || order.orderType === 'ecommerce') {
                    collectionPath = `stores/${storeId}/salesOrders/${orderId}`;
                } else if (order.source === 'retail_sales') {
                    collectionPath = `stores/${storeId}/retailSalesOrders/${orderId}`;
                } else if (order.source === 'wholesale_sales') {
                    collectionPath = `stores/${storeId}/wholesaleSalesOrders/${orderId}`;
                }
                
                if (collectionPath) {
                    promises.push(window.database.ref(collectionPath).remove());
                }
            }
        }
        
        await Promise.all(promises);
        
        // Clear selection and reload data
        selectedOrders.clear();
        await loadSalesOrdersData();
        
        alert(`Đã xóa thành công ${promises.length} đơn hàng.`);
        
    } catch (error) {
        console.error('Error deleting selected orders:', error);
        alert('Có lỗi xảy ra khi xóa đơn hàng. Vui lòng thử lại.');
    }
}

// Delete all orders of a specific type
async function deleteAllOrders(orderType) {
    const orders = getOrdersByType(orderType);
    if (orders.length === 0) {
        alert(`Không có đơn hàng ${getOrderTypeLabel(orderType)} nào để xóa.`);
        return;
    }
    
    const confirmMessage = `Bạn có chắc chắn muốn xóa TẤT CẢ ${orders.length} đơn hàng ${getOrderTypeLabel(orderType)}? Hành động này không thể hoàn tác.`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const storeId = localStorage.getItem('selectedStoreId');
        const promises = [];
        
        for (const order of orders) {
            let collectionPath;
            if (orderType === 'tmdt') {
                collectionPath = `stores/${storeId}/salesOrders/${order.orderId || order.id}`;
            } else if (orderType === 'retail') {
                collectionPath = `stores/${storeId}/retailSalesOrders/${order.orderId || order.id}`;
            } else if (orderType === 'wholesale') {
                collectionPath = `stores/${storeId}/wholesaleSalesOrders/${order.orderId || order.id}`;
            }
            
            if (collectionPath) {
                promises.push(window.database.ref(collectionPath).remove());
            }
        }
        
        await Promise.all(promises);
        
        // Clear selection and reload data
        selectedOrders.clear();
        await loadSalesOrdersData();
        
        alert(`Đã xóa thành công tất cả ${promises.length} đơn hàng ${getOrderTypeLabel(orderType)}.`);
        
    } catch (error) {
        console.error('Error deleting all orders:', error);
        alert('Có lỗi xảy ra khi xóa đơn hàng. Vui lòng thử lại.');
    }
}

// Helper function to get orders by type
function getOrdersByType(orderType) {
    return Object.values(salesOrdersData).filter(order => {
        if (orderType === 'tmdt') {
            return order.source === 'tmdt_sales' || order.orderType === 'ecommerce' || order.platform;
        } else if (orderType === 'retail') {
            return order.source === 'retail_sales' || order.orderType === 'retail';
        } else if (orderType === 'wholesale') {
            return order.source === 'wholesale_sales' || order.orderType === 'wholesale';
        }
        return false;
    });
}

// Helper function to get order type label
function getOrderTypeLabel(orderType) {
    const labels = {
        'tmdt': 'TMĐT',
        'retail': 'Bán Lẻ',
        'wholesale': 'Bán Sỉ'
    };
    return labels[orderType] || orderType;
}

// Display orders for current view
function displayCurrentViewOrders() {
    // Use filtered orders if available, otherwise filter from all data
    let ordersToDisplay;
    if (Array.isArray(filteredSalesOrders) && filteredSalesOrders.length >= 0) {
        ordersToDisplay = filteredSalesOrders;
    } else if (Object.keys(filteredSalesOrders).length > 0) {
        ordersToDisplay = Object.values(filteredSalesOrders);
    } else {
        ordersToDisplay = filterOrdersByType(salesOrdersData, currentView);
    }
    
    console.log(`Displaying ${ordersToDisplay.length} orders for ${currentView}`);
    
    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = ordersToDisplay.slice(startIndex, endIndex);
    
    switch(currentView) {
        case 'tmdt':
            displayTmdtOrders(paginatedOrders);
            break;
        case 'retail':
            displayRetailOrders(paginatedOrders);
            break;
        case 'wholesale':
            displayWholesaleOrders(paginatedOrders);
            break;
    }
}

// Filter orders by type
function filterOrdersByType(orders, type) {
    return Object.keys(orders)
        .map(key => ({ id: key, ...orders[key] }))
        .filter(order => {
            switch(type) {
                case 'tmdt':
                    return order.source === 'tmdt_sales' || order.orderType === 'ecommerce' || order.platform;
                case 'retail':
                    return order.source === 'retail_sales' || order.orderType === 'retail';
                case 'wholesale':
                    return order.source === 'wholesale_sales' || order.orderType === 'wholesale';
                default:
                    return false;
            }
        })
        .sort((a, b) => new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate));
}

// Display TMDT orders
function displayTmdtOrders(orders) {
    const tableBody = document.getElementById('tmdt-orders-table-body');
    if (!tableBody) return;
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="13" class="text-center">
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Chưa có đơn hàng TMĐT nào</p>
                </div>
            </td></tr>
        `;
        return;
    }
    
    const rows = orders.map((order, index) => {
        const profit = (order.sellingPrice || 0) - (order.importPrice || 0);
        const totalProfit = profit * (order.quantity || 1);
        
        return `
            <tr onclick="viewSalesOrderDetail('${order.id}')">
                <td class="text-center">
                    <input type="checkbox" name="order-checkbox-tmdt" value="${order.id}" onchange="toggleOrderSelection('${order.id}', 'tmdt')" onclick="event.stopPropagation()">
                </td>
                <td class="text-center">${index + 1}</td>
                <td class="text-center"><strong>${order.orderId || order.id}</strong></td>
                <td>${order.productName || 'N/A'}</td>
                <td class="text-center">${order.sku || 'N/A'}</td>
                <td class="text-center">${order.quantity || 0}</td>
                <td class="text-right">${formatCurrency(order.sellingPrice || 0)}</td>
                <td class="text-right">${formatCurrency(order.importPrice || 0)}</td>
                <td class="text-right ${profit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalProfit)}</td>
                <td class="text-right"><strong>${formatCurrency(order.totalAmount || 0)}</strong></td>
                <td class="text-center">${order.platformName || order.platform || 'N/A'}</td>
                <td class="text-center">${order.storeName || 'N/A'}</td>
                <td class="text-center">${formatDate(new Date(order.createdAt || order.orderDate))}</td>
                <td class="text-center">
                    <button class="btn btn-info btn-small" onclick="event.stopPropagation(); viewSalesOrderDetail('${order.id}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = rows;
}

// Display retail orders
function displayRetailOrders(orders) {
    const tableBody = document.getElementById('retail-orders-table-body');
    if (!tableBody) return;
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="13" class="text-center">
                <div class="empty-state">
                    <i class="fas fa-store"></i>
                    <p>Chưa có đơn hàng lẻ nào</p>
                </div>
            </td></tr>
        `;
        return;
    }
    
    const rows = orders.map((order, index) => {
        // Handle retail orders with items array structure
        if (order.items && Array.isArray(order.items)) {
            // For multi-item orders, show summary info
            const totalQuantity = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const firstItem = order.items[0] || {};
            const productNames = order.items.map(item => item.productName).join(', ');
            const skus = order.items.map(item => item.sku).join(', ');
            
            // Calculate average prices for display
            const avgSellingPrice = order.items.reduce((sum, item) => sum + (item.sellingPrice || 0), 0) / order.items.length;
            const avgImportPrice = order.items.reduce((sum, item) => sum + (item.importPrice || 0), 0) / order.items.length;
            
            // Get units from items
            const units = order.items.map(item => item.unit || 'lỗi').join(', ');
            
            return `
                <tr onclick="viewSalesOrderDetail('${order.id}')">
                    <td class="text-center" onclick="event.stopPropagation()">
                        <input type="checkbox" class="order-checkbox" data-order-id="${order.id}" onchange="toggleOrderSelection('retail')">
                    </td>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">${order.orderId || order.id}</td>
                    <td>${order.customerName || 'Khách lẻ'}</td>
                    <td title="${productNames}">${order.items.length > 1 ? `${order.items.length} sản phẩm` : firstItem.productName || 'N/A'}</td>
                    <td class="text-center" title="${skus}">${order.items.length > 1 ? 'Nhiều SKU' : firstItem.sku || 'N/A'}</td>
                    <td class="text-center" title="${units}">${order.items.length > 1 ? 'Khác nhau' : firstItem.unit || 'lỗi'}</td>
                    <td class="text-center">${totalQuantity}</td>
                    <td class="text-right">${order.items.length > 1 ? 'Khác nhau' : formatCurrency(firstItem.sellingPrice || 0)}</td>
                    <td class="text-right">${order.items.length > 1 ? 'Khác nhau' : formatCurrency(firstItem.importPrice || 0)}</td>
                    <td class="text-right ${(order.totalProfit || 0) >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(order.totalProfit || 0)}</td>
                    <td class="text-center">${order.storeName || 'N/A'}</td>
                    <td class="text-right"><strong>${formatCurrency(order.totalAmount || 0)}</strong></td>
                    <td class="text-center">${formatDate(new Date(order.createdAt || order.orderDate))}</td>
                    <td class="text-center">
                        <button class="btn btn-info btn-small" onclick="event.stopPropagation(); viewSalesOrderDetail('${order.id}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            // Handle single-item orders (legacy format)
            const profit = (order.sellingPrice || 0) - (order.importPrice || 0);
            const totalProfit = profit * (order.quantity || 1);
            
            return `
                <tr onclick="viewSalesOrderDetail('${order.id}')">
                    <td class="text-center" onclick="event.stopPropagation()">
                        <input type="checkbox" class="order-checkbox" data-order-id="${order.id}" onchange="toggleOrderSelection('retail')">
                    </td>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">${order.orderId || order.id}</td>
                    <td>${order.customerName || 'Khách lẻ'}</td>
                    <td>${order.productName || 'N/A'}</td>
                    <td class="text-center">${order.sku || 'N/A'}</td>
                    <td class="text-center">${order.unit || 'lỗi'}</td>
                    <td class="text-center">${order.quantity || 0}</td>
                    <td class="text-right">${formatCurrency(order.sellingPrice || 0)}</td>
                    <td class="text-right">${formatCurrency(order.importPrice || 0)}</td>
                    <td class="text-right ${profit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalProfit)}</td>
                    <td class="text-center">${order.storeName || 'N/A'}</td>
                    <td class="text-right"><strong>${formatCurrency(order.totalAmount || 0)}</strong></td>
                    <td class="text-center">${formatDate(new Date(order.createdAt || order.orderDate))}</td>
                    <td class="text-center">
                        <button class="btn btn-info btn-small" onclick="event.stopPropagation(); viewSalesOrderDetail('${order.id}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
    
    tableBody.innerHTML = rows;
}

// Display wholesale orders
function displayWholesaleOrders(orders) {
    const tableBody = document.getElementById('wholesale-orders-table-body');
    if (!tableBody) return;
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="13" class="text-center">
                <div class="empty-state">
                    <i class="fas fa-warehouse"></i>
                    <p>Chưa có đơn hàng sỉ nào</p>
                </div>
            </td></tr>
        `;
        return;
    }
    
    const rows = orders.map((order, index) => {
        // Handle wholesale orders with items array structure
        const firstItem = order.items && order.items.length > 0 ? order.items[0] : {};
        const productName = firstItem.productName || order.productName || 'N/A';
        const quantity = firstItem.quantity || order.quantity || 0;
        const sellingPrice = firstItem.sellingPrice || order.sellingPrice || 0;
        const importPrice = firstItem.importPrice || order.importPrice || 0;
        const unit = firstItem.unit || order.unit || 'lỗi ';
        const totalAmount = order.total || order.totalAmount || order.subtotal || 0;
        const depositAmount = order.deposit || order.depositAmount || 0;
        
        return `
            <tr onclick="viewSalesOrderDetail('${order.id}')">
                <td class="text-center" onclick="event.stopPropagation()">
                    <input type="checkbox" class="order-checkbox" data-order-id="${order.id}" onchange="toggleOrderSelection('wholesale')">
                </td>
                <td class="text-center">${index + 1}</td>
                <td class="text-center">${order.orderId || order.id}</td>
                <td>${order.customerName || 'N/A'}</td>
                <td class="text-center">${order.customerPhone || 'N/A'}</td>
                <td>${productName}</td>
                <td class="text-center">${quantity}</td>
                <td class="text-right">${formatCurrency(sellingPrice)}</td>
                <td class="text-right">${formatCurrency(importPrice)}</td>
                <td class="text-center">${unit}</td>
                <td class="text-right"><strong>${formatCurrency(totalAmount)}</strong></td>
                <td class="text-right">${formatCurrency(depositAmount)}</td>
                <td class="text-center">${formatDate(new Date(order.createdAt || order.orderDate))}</td>
                <td class="text-center">
                    <button class="btn btn-info btn-small" onclick="event.stopPropagation(); viewSalesOrderDetail('${order.id}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = rows;
}

// Update statistics
function updateStatistics() {
    let ordersToCount;
    if (Array.isArray(filteredSalesOrders) && filteredSalesOrders.length >= 0) {
        ordersToCount = filteredSalesOrders;
    } else if (Object.keys(filteredSalesOrders).length > 0) {
        ordersToCount = Object.values(filteredSalesOrders);
    } else {
        ordersToCount = filterOrdersByType(salesOrdersData, currentView);
    }
    
    console.log(`Updating statistics for ${ordersToCount.length} orders`);
    
    const totalOrders = ordersToCount.length;
    const totalRevenue = ordersToCount.reduce((sum, order) => {
        // For wholesale orders, use total/subtotal field
        return sum + (order.total || order.totalAmount || order.subtotal || 0);
    }, 0);
    const totalProfit = ordersToCount.reduce((sum, order) => {
        // Calculate profit from items array if available
        if (order.items && Array.isArray(order.items)) {
            const itemsProfit = order.items.reduce((itemSum, item) => {
                const profit = (item.sellingPrice || 0) - (item.importPrice || 0);
                return itemSum + (profit * (item.quantity || 0));
            }, 0);
            return sum + itemsProfit;
        } else {
            // Fallback for single item orders
            const profit = (order.sellingPrice || 0) - (order.importPrice || 0);
            return sum + (profit * (order.quantity || 1));
        }
    }, 0);
    
    console.log(`Statistics: ${totalOrders} orders, ${totalRevenue} revenue, ${totalProfit} profit`);
    
    // Update statistics cards
    const prefix = currentView === 'tmdt' ? 'tmdt' : currentView;
    const totalOrdersEl = document.getElementById(`${prefix}-total-orders`);
    const totalRevenueEl = document.getElementById(`${prefix}-total-revenue`);
    const totalProfitEl = document.getElementById(`${prefix}-total-profit`);
    
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);
    if (totalProfitEl) totalProfitEl.textContent = formatCurrency(totalProfit);
}

// View order detail
function viewSalesOrderDetail(orderId) {
    const order = salesOrdersData[orderId];
    if (!order) return;
    
    const modal = document.getElementById('order-detail-modal');
    const content = document.getElementById('order-detail-content');
    
    if (!modal || !content) return;
    
    const profit = (order.sellingPrice || 0) - (order.importPrice || 0);
    const totalProfit = profit * (order.quantity || 1);
    
    content.innerHTML = `
        <div class="invoice-container">
            <!-- Invoice Header -->
            <div class="invoice-header">
                <div class="company-info">
                    <h2 class="company-name">${order.storeName || 'CỬA HÀNG'}</h2>
                    <p class="invoice-title">PHIẾU CHI TIẾT ĐỚN HÀNG</p>
                </div>
                <div class="invoice-number">
                    <h3>Số: ${order.orderId || order.id}</h3>
                    <p>Ngày: ${formatDate(new Date(order.createdAt || order.orderDate))}</p>
                </div>
            </div>

            <!-- Customer & Order Info -->
            <div class="invoice-info-section">
                <div class="info-row">
                    <div class="info-left">
                        <strong>Loại đơn hàng:</strong> ${getOrderTypeText(order)}
                    </div>
                    <div class="info-right">
                        ${order.customerName ? `<strong>Khách hàng:</strong> ${order.customerName}` : ''}
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-left">
                        ${order.customerPhone ? `<strong>Số điện thoại:</strong> ${order.customerPhone}` : ''}
                    </div>
                    <div class="info-right">
                        ${order.platformName ? `<strong>Sàn TMĐT:</strong> ${order.platformName}` : ''}
                    </div>
                </div>
                ${order.customerAddress ? `
                <div class="info-row">
                    <div class="info-left">
                        <strong>Địa chỉ:</strong> ${order.customerAddress}
                    </div>
                    <div class="info-right">
                        ${order.paymentStatus ? `<strong>Trạng thái thanh toán:</strong> ${order.paymentStatus === 'pending' ? 'Chưa thanh toán' : order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentStatus}` : ''}
                    </div>
                </div>
                ` : ''}
                ${order.deliveryDate ? `
                <div class="info-row">
                    <div class="info-left">
                        <strong>Ngày giao hàng:</strong> ${order.deliveryDate}
                    </div>
                    <div class="info-right">
                        ${order.discount > 0 ? `<strong>Giảm giá:</strong> ${formatCurrency(order.discount)}` : ''}
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Product Details Table -->
            <div class="invoice-table-container">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên sản phẩm</th>
                            <th>SKU</th>
                            <th>Đơn vị</th>
                            <th>Số lượng</th>
                            <th>Giá bán</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items && Array.isArray(order.items) ? 
                            order.items.map((item, index) => `
                                <tr>
                                    <td class="text-center">${index + 1}</td>
                                    <td>${item.productName || 'N/A'}</td>
                                    <td class="text-center">${item.sku || 'N/A'}</td>
                                    <td class="text-center">${item.unit || 'lỗi'}</td>
                                    <td class="text-center">${item.quantity || 0}</td>
                                    <td class="text-right">${formatCurrency(item.sellingPrice || 0)}</td>
                                    <td class="text-right"><strong>${formatCurrency((item.sellingPrice || 0) * (item.quantity || 0))}</strong></td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td class="text-center">1</td>
                                    <td>${order.productName || 'N/A'}</td>
                                    <td class="text-center">${order.sku || 'N/A'}</td>
                                    <td class="text-center">${order.unit || 'lỗi'}</td>
                                    <td class="text-center">${order.quantity || 0}</td>
                                    <td class="text-right">${formatCurrency(order.sellingPrice || 0)}</td>
                                    <td class="text-right"><strong>${formatCurrency((order.sellingPrice || 0) * (order.quantity || 0))}</strong></td>
                                </tr>
                            `}
                    </tbody>
                </table>
            </div>

            <!-- Summary Section -->
            <div class="invoice-summary">
                <div class="summary-row">
                    <span class="summary-label">Tổng tiền hàng:</span>
                    <span class="summary-value">${formatCurrency(order.subtotal || order.totalAmount || order.total || 0)}</span>
                </div>
                ${order.discount > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Giảm giá:</span>
                    <span class="summary-value">-${formatCurrency(order.discount)}</span>
                </div>
                ` : ''}
                ${order.shipping > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Phí vận chuyển:</span>
                    <span class="summary-value">${formatCurrency(order.shipping)}</span>
                </div>
                ` : ''}
                ${order.deposit > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Tiền cọc:</span>
                    <span class="summary-value">${formatCurrency(order.deposit)}</span>
                </div>
                ` : ''}
                ${order.remaining > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Còn lại:</span>
                    <span class="summary-value">${formatCurrency(order.remaining)}</span>
                </div>
                ` : ''}
                <div class="summary-row profit-row">
                    <span class="summary-label">Lợi nhuận:</span>
                    <span class="summary-value ${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                        ${formatCurrency(totalProfit)}
                    </span>
                </div>
                <div class="summary-row total-row">
                    <span class="summary-label">TỔNG CỘNG:</span>
                    <span class="summary-value total-amount">${formatCurrency(order.total || order.totalAmount || order.subtotal || 0)}</span>
                </div>
            </div>

            <!-- Footer -->
            <div class="invoice-footer">
                <div class="footer-note">
                    <p><em>Cảm ơn quý khách đã mua hàng!</em></p>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// Close order detail modal
function closeSalesOrderDetail() {
    const modal = document.getElementById('order-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Get order type text
function getOrderTypeText(order) {
    if (order.source === 'tmdt_sales' || order.platform) return 'TMĐT';
    if (order.source === 'retail_sales') return 'Bán lẻ';
    if (order.source === 'wholesale_sales' || order.customerName) return 'Bán sỉ';
    return 'Không xác định';
}

// Load stores for filters
function loadStoresForFilters() {
    if (!window.database) return;
    
    window.database.ref('stores').once('value')
        .then(snapshot => {
            const stores = snapshot.val() || {};
            
            // Update all store filter dropdowns
            const storeFilters = [
                'tmdt-store-filter',
                'retail-store-filter', 
                'wholesale-store-filter'
            ];
            
            storeFilters.forEach(filterId => {
                const select = document.getElementById(filterId);
                if (select) {
                    select.innerHTML = '<option value="">Tất cả cửa hàng</option>';
                    Object.entries(stores).forEach(([storeId, store]) => {
                        const option = document.createElement('option');
                        option.value = storeId;
                        option.textContent = store.name;
                        select.appendChild(option);
                        
                        // Also add option by store name for compatibility
                        const nameOption = document.createElement('option');
                        nameOption.value = store.name;
                        nameOption.textContent = store.name;
                        nameOption.style.display = 'none'; // Hidden duplicate for filtering
                        select.appendChild(nameOption);
                    });
                }
            });
        })
        .catch(error => console.error('Error loading stores:', error));
}

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
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Debounced search function
function debouncedSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        applySearchFilters();
    }, 300);
}

// Apply search and filters
function applySearchFilters() {
    const currentOrders = filterOrdersByType(salesOrdersData, currentView);
    
    // Get filter values based on current view
    const searchTerm = document.getElementById(`${currentView}-search-input`)?.value.toLowerCase() || '';
    const platformFilter = document.getElementById(`${currentView}-platform-filter`)?.value || '';
    const storeFilter = document.getElementById(`${currentView}-store-filter`)?.value || '';
    const priceRangeFilter = document.getElementById(`${currentView}-price-filter`)?.value || '';
    const customerFilter = document.getElementById(`${currentView}-customer-filter`)?.value.toLowerCase() || '';
    
    filteredSalesOrders = currentOrders.filter(order => {
        let matches = true;
        
        // Search term filter
        if (searchTerm) {
            // Build searchable text including customer name and product info from items
            let searchableText = `${order.orderId || order.id} ${order.customerName || ''} ${order.productName || ''} ${order.sku || ''}`;
            
            // Add product info from items array if available
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    searchableText += ` ${item.productName || ''} ${item.sku || ''}`;
                });
            }
            
            matches = matches && searchableText.toLowerCase().includes(searchTerm);
        }
        
        // Platform filter (for TMDT)
        if (platformFilter && currentView === 'tmdt') {
            matches = matches && (order.platform === platformFilter || order.platformName === platformFilter);
        }
        
        // Store filter
        if (storeFilter) {
            matches = matches && (order.storeId === storeFilter || order.storeName === storeFilter);
        }
        
        // Price range filter
        if (priceRangeFilter) {
            const totalAmount = order.totalAmount || 0;
            switch(priceRangeFilter) {
                case '0-100000':
                    matches = matches && totalAmount < 100000;
                    break;
                case '100000-500000':
                    matches = matches && totalAmount >= 100000 && totalAmount < 500000;
                    break;
                case '500000-1000000':
                    matches = matches && totalAmount >= 500000 && totalAmount < 1000000;
                    break;
                case '1000000-5000000':
                    matches = matches && totalAmount >= 1000000 && totalAmount < 5000000;
                    break;
                case '5000000-999999999':
                    matches = matches && totalAmount >= 5000000;
                    break;
            }
        }
        
        // Customer filter (for retail and wholesale)
        if (customerFilter && (currentView === 'retail' || currentView === 'wholesale')) {
            const customerName = (order.customerName || '').toLowerCase();
            const customerPhone = (order.customerPhone || '').toLowerCase();
            matches = matches && (customerName.includes(customerFilter) || customerPhone.includes(customerFilter));
        }
        
        return matches;
    });
    
    currentPage = 1;
    displayCurrentViewOrders();
    updatePagination();
    updateSearchResultsInfo();
}

// Search and filter functions
function handleTmdtSearch() { debouncedSearch(); }
function handleRetailSearch() { debouncedSearch(); }
function handleWholesaleSearch() { debouncedSearch(); }

// Date filter functions
function applyTmdtDateFilter() { applyDateFilter('tmdt'); }
function applyRetailDateFilter() { applyDateFilter('retail'); }
function applyWholesaleDateFilter() { applyDateFilter('wholesale'); }

function applyDateFilter(type) {
    console.log(`Applying date filter for type: ${type}`);
    
    const fromDateInput = document.getElementById(`${type}-from-date`);
    const toDateInput = document.getElementById(`${type}-to-date`);
    
    if (!fromDateInput || !toDateInput) {
        console.error(`Date inputs not found for type: ${type}`);
        console.log(`Looking for: ${type}-from-date and ${type}-to-date`);
        return;
    }
    
    const fromDate = fromDateInput.value;
    const toDate = toDateInput.value;
    
    console.log(`Date range: ${fromDate} to ${toDate}`);
    
    if (!fromDate && !toDate) {
        console.log('No dates selected, showing all orders');
        // If no dates selected, show all orders
        filteredSalesOrders = {};
        currentPage = 1;
        displayCurrentViewOrders();
        updatePagination();
        updateStatistics();
        updateSearchResultsInfo();
        return;
    }
    
    const currentOrders = filterOrdersByType(salesOrdersData, currentView);
    console.log(`Total orders before filtering: ${currentOrders.length}`);
    
    filteredSalesOrders = currentOrders.filter(order => {
        const orderDate = order.createdAt || order.orderDate;
        if (!orderDate) {
            console.log(`Order ${order.id} has no date`);
            return false;
        }
        
        const orderDateStr = new Date(orderDate).toISOString().split('T')[0];
        console.log(`Order ${order.id} date: ${orderDateStr}`);
        
        let matches = true;
        if (fromDate && orderDateStr < fromDate) {
            console.log(`Order ${order.id} before fromDate`);
            matches = false;
        }
        if (toDate && orderDateStr > toDate) {
            console.log(`Order ${order.id} after toDate`);
            matches = false;
        }
        
        return matches;
    });
    
    console.log(`Filtered orders count: ${filteredSalesOrders.length}`);
    
    currentPage = 1;
    displayCurrentViewOrders();
    updatePagination();
    updateStatistics();
    updateSearchResultsInfo();
}

// Period filter functions
function filterTmdtByPeriod(period) { filterByPeriod('tmdt', period); }
function filterRetailByPeriod(period) { filterByPeriod('retail', period); }
function filterWholesaleByPeriod(period) { filterByPeriod('wholesale', period); }

function filterByPeriod(type, period) {
    const today = new Date();
    let fromDate, toDate;
    
    switch(period) {
        case 'today':
            fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
        case 'week':
            const dayOfWeek = today.getDay();
            const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            fromDate = new Date(today);
            fromDate.setDate(today.getDate() - mondayOffset);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(fromDate);
            toDate.setDate(fromDate.getDate() + 6);
            toDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
            break;
        default:
            filteredSalesOrders = filterOrdersByType(salesOrdersData, currentView);
            currentPage = 1;
            displayCurrentViewOrders();
            updatePagination();
            updateStatistics();
            return;
    }
    
    // Update date input fields
    updateDateInputFields(fromDate, toDate);
    
    const currentOrders = filterOrdersByType(salesOrdersData, currentView);
    
    filteredSalesOrders = currentOrders.filter(order => {
        const orderDate = new Date(order.createdAt || order.orderDate);
        return orderDate >= fromDate && orderDate <= toDate;
    });
    
    currentPage = 1;
    displayCurrentViewOrders();
    updatePagination();
    updateStatistics();
}

// Helper function to update date input fields
function updateDateInputFields(fromDate, toDate) {
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    // Update date inputs based on current view
    const fromDateInput = document.getElementById(`${currentView}-from-date`);
    const toDateInput = document.getElementById(`${currentView}-to-date`);
    
    if (fromDateInput) {
        fromDateInput.value = formatDate(fromDate);
    }
    if (toDateInput) {
        toDateInput.value = formatDate(toDate);
    }
}

// Clear filter functions
function clearTmdtFilters() { clearFilters('tmdt'); }
function clearRetailFilters() { clearFilters('retail'); }
function clearWholesaleFilters() { clearFilters('wholesale'); }

// Clear search filter functions
function clearTmdtSearchFilters() { clearSearchFilters('tmdt'); }
function clearRetailSearchFilters() { clearSearchFilters('retail'); }
function clearWholesaleSearchFilters() { clearSearchFilters('wholesale'); }

// Toggle select all orders
function toggleSelectAllOrders(orderType) {
    const selectAllCheckbox = document.getElementById(`select-all-${orderType}`);
    const orderCheckboxes = document.querySelectorAll(`#${orderType}-orders-table-body .order-checkbox`);
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const orderId = checkbox.getAttribute('data-order-id');
        if (selectAllCheckbox.checked) {
            selectedOrders.add(orderId);
        } else {
            selectedOrders.delete(orderId);
        }
    });
    
    updateDeleteButtonState(orderType);
}

// Toggle individual order selection
function toggleOrderSelection(orderType) {
    const orderCheckboxes = document.querySelectorAll(`#${orderType}-orders-table-body .order-checkbox`);
    const selectAllCheckbox = document.getElementById(`select-all-${orderType}`);
    
    // Update selectedOrders set
    orderCheckboxes.forEach(checkbox => {
        const orderId = checkbox.getAttribute('data-order-id');
        if (checkbox.checked) {
            selectedOrders.add(orderId);
        } else {
            selectedOrders.delete(orderId);
        }
    });
    
    // Update select all checkbox state
    const checkedBoxes = document.querySelectorAll(`#${orderType}-orders-table-body .order-checkbox:checked`);
    selectAllCheckbox.checked = checkedBoxes.length === orderCheckboxes.length;
    selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < orderCheckboxes.length;
    
    updateDeleteButtonState(orderType);
}

// Update delete button state
function updateDeleteButtonState(orderType) {
    const deleteButton = document.getElementById(`delete-selected-${orderType}`);
    const checkedBoxes = document.querySelectorAll(`#${orderType}-orders-table-body .order-checkbox:checked`);
    
    if (deleteButton) {
        deleteButton.disabled = checkedBoxes.length === 0;
    }
}

function clearFilters(type) {
    // Clear date inputs
    const fromDateInput = document.getElementById(`${type}-from-date`);
    const toDateInput = document.getElementById(`${type}-to-date`);
    if (fromDateInput) fromDateInput.value = '';
    if (toDateInput) toDateInput.value = '';
    
    // Reset filtered orders
    filteredSalesOrders = filterOrdersByType(salesOrdersData, currentView);
    currentPage = 1;
    displayCurrentViewOrders();
    updatePagination();
    updateStatistics();
}

function clearSearchFilters(type) {
    // Clear search and filter inputs
    const searchInput = document.getElementById(`${type}-search-input`);
    const platformFilter = document.getElementById(`${type}-platform-filter`);
    const storeFilter = document.getElementById(`${type}-store-filter`);
    const priceFilter = document.getElementById(`${type}-price-filter`);
    const customerFilter = document.getElementById(`${type}-customer-filter`);
    
    if (searchInput) searchInput.value = '';
    if (platformFilter) platformFilter.value = '';
    if (storeFilter) storeFilter.value = '';
    if (priceFilter) priceFilter.value = '';
    if (customerFilter) customerFilter.value = '';
    
    // Reset filtered orders
    filteredSalesOrders = filterOrdersByType(salesOrdersData, currentView);
    currentPage = 1;
    displayCurrentViewOrders();
    updatePagination();
    updateStatistics();
    updateSearchResultsInfo();
}

// Export functions
function exportTmdtOrders() { exportOrders('tmdt'); }
function exportRetailOrders() { exportOrders('retail'); }
function exportWholesaleOrders() { exportOrders('wholesale'); }

// Update pagination controls
function updatePagination() {
    const ordersToCount = Object.keys(filteredSalesOrders).length > 0 ? Object.values(filteredSalesOrders) : filterOrdersByType(salesOrdersData, currentView);
    const totalItems = ordersToCount.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const showingTo = Math.min(currentPage * itemsPerPage, totalItems);
    
    // Update pagination info elements
    const showingFromEl = document.getElementById(`${currentView}-showing-from`);
    const showingToEl = document.getElementById(`${currentView}-showing-to`);
    const totalItemsEl = document.getElementById(`${currentView}-total-items`);
    
    if (showingFromEl) showingFromEl.textContent = showingFrom;
    if (showingToEl) showingToEl.textContent = showingTo;
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    
    // Update pagination controls
    const paginationControls = document.getElementById(`${currentView}-pagination-buttons`);
    if (paginationControls && totalPages > 1) {
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i> Trước
        </button>`;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        paginationHTML += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            Sau <i class="fas fa-chevron-right"></i>
        </button>`;
        
        paginationControls.innerHTML = paginationHTML;
        paginationControls.style.display = 'flex';
    } else if (paginationControls) {
        paginationControls.style.display = 'none';
    }
}

// Change page
function changePage(page) {
    const ordersToCount = Object.keys(filteredSalesOrders).length > 0 ? Object.values(filteredSalesOrders) : filterOrdersByType(salesOrdersData, currentView);
    const totalPages = Math.ceil(ordersToCount.length / itemsPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayCurrentViewOrders();
    updatePagination();
}

// Update search results info
function updateSearchResultsInfo() {
    const ordersToCount = Object.keys(filteredSalesOrders).length > 0 ? Object.values(filteredSalesOrders) : filterOrdersByType(salesOrdersData, currentView);
    const allOrders = filterOrdersByType(salesOrdersData, currentView);
    
    const searchResultsCount = document.getElementById(`${currentView}-search-results-count`);
    if (searchResultsCount) {
        if (Object.keys(filteredSalesOrders).length > 0 && ordersToCount.length !== allOrders.length) {
            searchResultsCount.textContent = `Tìm thấy ${ordersToCount.length} / ${allOrders.length} đơn hàng`;
            searchResultsCount.style.display = 'block';
        } else {
            searchResultsCount.style.display = 'none';
        }
    }
}

// Export orders to Excel
function exportOrders(type) {
    const ordersToExport = filteredSalesOrders.length > 0 ? filteredSalesOrders : filterOrdersByType(salesOrdersData, currentView);
    
    if (ordersToExport.length === 0) {
        showNotification('Không có dữ liệu để xuất!', 'warning');
        return;
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data based on order type
    let headers, data;
    
    switch(type) {
        case 'tmdt':
            headers = ['STT', 'Mã ĐH', 'Sản Phẩm', 'SKU', 'Số Lượng', 'Giá Bán', 'Giá Nhập', 'Lợi Nhuận', 'Tổng Tiền', 'Sàn TMĐT', 'Cửa Hàng', 'Ngày Tạo'];
            data = ordersToExport.map((order, index) => {
                const profit = (order.sellingPrice || 0) - (order.importPrice || 0);
                const totalProfit = profit * (order.quantity || 1);
                return [
                    index + 1,
                    order.orderId || order.id,
                    order.productName || 'N/A',
                    order.sku || 'N/A',
                    order.quantity || 0,
                    order.sellingPrice || 0,
                    order.importPrice || 0,
                    totalProfit,
                    order.totalAmount || 0,
                    order.platformName || order.platform || 'N/A',
                    order.storeName || 'N/A',
                    formatDate(new Date(order.createdAt || order.orderDate))
                ];
            });
            break;
            
        case 'retail':
            headers = ['STT', 'Mã ĐH', 'Khách Hàng', 'Sản Phẩm', 'SKU', 'Số Lượng', 'Giá Bán', 'Giá Nhập', 'Lợi Nhuận', 'Cửa Hàng', 'Tổng Tiền', 'Ngày Tạo'];
            data = ordersToExport.map((order, index) => {
                const profit = (order.sellingPrice || 0) - (order.importPrice || 0);
                const totalProfit = profit * (order.quantity || 1);
                return [
                    index + 1,
                    order.orderId || order.id,
                    order.customerName || 'Khách lẻ',
                    order.productName || 'N/A',
                    order.sku || 'N/A',
                    order.quantity || 0,
                    order.sellingPrice || 0,
                    order.importPrice || 0,
                    totalProfit,
                    order.storeName || 'N/A',
                    order.totalAmount || 0,
                    formatDate(new Date(order.createdAt || order.orderDate))
                ];
            });
            break;
            
        case 'wholesale':
            headers = ['STT', 'Mã ĐH', 'Khách Hàng', 'SĐT', 'Sản Phẩm', 'Số Lượng', 'Giá Bán', 'Giá Nhập', 'Đơn Vị', 'Tổng Tiền', 'Tiền Cọc', 'Ngày Tạo'];
            data = ordersToExport.map((order, index) => {
                const profit = (order.sellingPrice || 0) - (order.importPrice || 0);
                const totalProfit = profit * (order.quantity || 1);
                return [
                    index + 1,
                    order.orderId || order.id,
                    order.customerName || 'N/A',
                    order.customerPhone || 'N/A',
                    order.productName || 'N/A',
                    order.quantity || 0,
                    order.sellingPrice || 0,
                    order.importPrice || 0,
                    order.unit || 'cái',
                    order.totalAmount || 0,
                    order.depositAmount || 0,
                    formatDate(new Date(order.createdAt || order.orderDate))
                ];
            });
            break;
    }
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Add worksheet to workbook
    const sheetName = type === 'tmdt' ? 'Đơn Hàng TMĐT' : type === 'retail' ? 'Đơn Hàng Lẻ' : 'Đơn Hàng Sỉ';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Generate filename
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `don-hang-ban-${type}-${dateStr}.xlsx`;
    
    // Save file
    try {
        XLSX.writeFile(wb, filename);
        showNotification(`Đã xuất ${ordersToExport.length} đơn hàng thành công!`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Lỗi xuất file Excel!', 'error');
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}


// Make functions globally available
window.switchSalesOrderView = switchSalesOrderView;
window.viewSalesOrderDetail = viewSalesOrderDetail;
window.closeSalesOrderDetail = closeSalesOrderDetail;
window.handleTmdtSearch = handleTmdtSearch;
window.handleRetailSearch = handleRetailSearch;
window.handleWholesaleSearch = handleWholesaleSearch;
window.applyTmdtDateFilter = applyTmdtDateFilter;
window.applyRetailDateFilter = applyRetailDateFilter;
window.applyWholesaleDateFilter = applyWholesaleDateFilter;
window.filterTmdtByPeriod = filterTmdtByPeriod;
window.filterRetailByPeriod = filterRetailByPeriod;
window.filterWholesaleByPeriod = filterWholesaleByPeriod;
window.clearTmdtFilters = clearTmdtFilters;
window.clearRetailFilters = clearRetailFilters;
window.clearWholesaleFilters = clearWholesaleFilters;
window.clearTmdtSearchFilters = clearTmdtSearchFilters;
window.clearRetailSearchFilters = clearRetailSearchFilters;
window.clearWholesaleSearchFilters = clearWholesaleSearchFilters;
window.exportTmdtOrders = exportTmdtOrders;
window.exportRetailOrders = exportRetailOrders;
window.exportWholesaleOrders = exportWholesaleOrders;
window.toggleSelectAll = toggleSelectAll;
window.toggleOrderSelection = toggleOrderSelection;
window.deleteSelectedOrders = deleteSelectedOrders;
window.deleteAllOrders = deleteAllOrders;
window.changePage = changePage;