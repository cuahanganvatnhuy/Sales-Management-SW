// Wholesale Order Management JavaScript
// Handles display, filtering, pagination, and management of wholesale orders

let wholesaleOrdersData = [];
let filteredWholesaleOrders = [];
let currentWholesalePage = 1;
const wholesaleOrdersPerPage = 15;
let selectedWholesaleOrders = [];

// Initialize wholesale order management
function initializeWholesaleOrderManagement() {
    console.log('Initializing wholesale order management...');
    loadWholesaleOrders();
    setupWholesaleEventListeners();
    initializeWholesaleFilters();
    
    // Load filter data for statistics section
    setTimeout(() => {
        if (typeof loadWholesaleStoresForFilter === 'function') {
            loadWholesaleStoresForFilter();
        }
        if (typeof loadWholesaleProductsForFilter === 'function') {
            loadWholesaleProductsForFilter();
        }
    }, 1000);
}

// Setup event listeners for wholesale order management
function setupWholesaleEventListeners() {
    // Filter event listeners
    const wholesaleDateFilter = document.getElementById('wholesaleDateFilter');
    const wholesaleStoreFilter = document.getElementById('wholesaleStoreFilter');
    const wholesaleProductFilter = document.getElementById('wholesaleProductFilter');
    
    if (wholesaleDateFilter) {
        wholesaleDateFilter.addEventListener('change', filterWholesaleOrders);
    }
    if (wholesaleStoreFilter) {
        wholesaleStoreFilter.addEventListener('change', filterWholesaleOrders);
    }
    if (wholesaleProductFilter) {
        wholesaleProductFilter.addEventListener('input', filterWholesaleOrders);
    }
    
    // Export button
    const exportWholesaleBtn = document.getElementById('exportWholesaleOrdersBtn');
    if (exportWholesaleBtn) {
        exportWholesaleBtn.addEventListener('click', exportWholesaleOrdersToExcel);
    }
    
    // Select all checkbox
    const selectAllWholesale = document.getElementById('selectAllWholesale');
    if (selectAllWholesale) {
        selectAllWholesale.addEventListener('change', toggleSelectAllWholesaleOrders);
    }
}

// Initialize wholesale order filters
function initializeWholesaleFilters() {
    // Set default date filter to current month
    const wholesaleDateFilter = document.getElementById('wholesaleDateFilter');
    if (wholesaleDateFilter) {
        const currentDate = new Date();
        const currentMonth = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
        wholesaleDateFilter.value = currentMonth;
    }
    
    // Load stores for filter
    loadStoresForWholesaleFilter();
}

// Load stores for wholesale filter dropdown
async function loadStoresForWholesaleFilter() {
    try {
        const storesRef = window.database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};
        
        const wholesaleStoreFilter = document.getElementById('wholesaleStoreFilter');
        if (wholesaleStoreFilter) {
            wholesaleStoreFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
            
            Object.values(stores).forEach(store => {
                const option = document.createElement('option');
                option.value = store.name;
                option.textContent = store.name;
                wholesaleStoreFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading stores for wholesale filter:', error);
    }
}

// Load products for wholesale filter dropdown
async function loadProductsForWholesaleFilter() {
    try {
        const productsRef = window.database.ref('products');
        const snapshot = await productsRef.once('value');
        const products = snapshot.val() || {};
        
        const wholesaleProductFilter = document.getElementById('wholesaleProductFilter');
        if (wholesaleProductFilter) {
            wholesaleProductFilter.innerHTML = '<option value="">Tất cả sản phẩm</option>';
            
            Object.values(products).forEach(product => {
                const option = document.createElement('option');
                option.value = product.name;
                option.textContent = product.name;
                wholesaleProductFilter.appendChild(option);
            });
            
            console.log(`Loaded ${Object.keys(products).length} products for wholesale filter`);
        }
    } catch (error) {
        console.error('Error loading products for wholesale filter:', error);
    }
}

// Load wholesale orders from Firebase
async function loadWholesaleOrders() {
    // Try to get store ID from multiple sources
    let storeId = window.selectedStoreId || localStorage.getItem('selectedStoreId');
    
    if (!storeId) {
        console.error('No store selected for wholesale orders');
        console.log('Available store sources:', {
            windowSelectedStoreId: window.selectedStoreId,
            localStorageStoreId: localStorage.getItem('selectedStoreId'),
            windowStoreData: window.selectedStoreData
        });
        return;
    }
    
    try {
        console.log('Loading wholesale orders for store:', storeId);
        
        // Debug: Check all stores first
        const allStoresSnapshot = await window.database.ref('stores').once('value');
        const allStores = allStoresSnapshot.val() || {};
        console.log('All stores in database:', Object.keys(allStores));
        
        // Check each store for orders
        Object.keys(allStores).forEach(sId => {
            if (allStores[sId].orders) {
                const orderCount = Object.keys(allStores[sId].orders).length;
                console.log(`Store ${sId} (${allStores[sId].name}) has ${orderCount} orders`);
                
                // Check for wholesale orders specifically
                const wholesaleCount = Object.values(allStores[sId].orders).filter(order => 
                    order.type === 'wholesale' || order.customerName
                ).length;
                console.log(`  - ${wholesaleCount} wholesale orders`);
            }
        });
        
        // Load wholesale orders from ALL stores, not just current store
        let allWholesaleOrders = [];
        
        Object.keys(allStores).forEach(sId => {
            if (allStores[sId].orders) {
                const storeOrders = allStores[sId].orders;
                Object.keys(storeOrders).forEach(orderId => {
                    const order = storeOrders[orderId];
                    
                    // Check if it's a wholesale order
                    const isWholesale = order.type === 'wholesale' || 
                                      order.orderType === 'wholesale' ||
                                      order.source === 'wholesale' ||
                                      (order.customerName && !order.platform);
                    
                    if (isWholesale) {
                        allWholesaleOrders.push({
                            id: orderId,
                            storeId: sId,
                            storeName: order.storeName || allStores[sId].name || 'Không xác định',
                            ...order
                        });
                        console.log(`Found wholesale order ${orderId} in store ${sId}:`, order);
                    }
                });
            }
        });
        
        // Sort by date
        wholesaleOrdersData = allWholesaleOrders.sort((a, b) => 
            new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt)
        );
        
        // Store in global variable for reports
        window.wholesaleOrdersData = wholesaleOrdersData;
        
        console.log(`Loaded ${wholesaleOrdersData.length} wholesale orders`);
        
        // Apply filters and display
        filterWholesaleOrders();
        updateWholesaleStatistics();
        
    } catch (error) {
        console.error('Error loading wholesale orders:', error);
        showNotification('Lỗi khi tải dữ liệu đơn hàng sỉ', 'error');
    }
}

// Filter wholesale orders based on current filter settings
function filterWholesaleOrders() {
    const dateFilter = document.getElementById('wholesaleDateFilter')?.value;
    const storeFilter = document.getElementById('wholesaleStoreFilter')?.value;
    const productFilter = document.getElementById('wholesaleProductFilter')?.value;
    
    filteredWholesaleOrders = wholesaleOrdersData.filter(order => {
        // Date filter
        let dateMatch = true;
        if (dateFilter) {
            const orderDate = new Date(order.orderDate || order.createdAt);
            const filterDate = new Date(dateFilter + '-01');
            const nextMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 1);
            
            dateMatch = orderDate >= filterDate && orderDate < nextMonth;
        }
        
        // Store filter
        let storeMatch = true;
        if (storeFilter) {
            storeMatch = order.storeName === storeFilter;
        }
        
        // Product filter
        let productMatch = true;
        if (productFilter) {
            productMatch = order.items && order.items.some(item => 
                item.productName && item.productName === productFilter
            );
        }
        
        return dateMatch && storeMatch && productMatch;
    });
    
    // Reset pagination
    currentWholesalePage = 1;
    selectedWholesaleOrders = [];
    
    // Update display
    displayWholesaleOrders();
    updateWholesalePagination();
    updateWholesaleStatistics();
}

// Display wholesale orders in table
function displayWholesaleOrders() {
    const tableBody = document.getElementById('wholesaleOrdersTableBody');
    if (!tableBody) return;
    
    // Calculate pagination
    const startIndex = (currentWholesalePage - 1) * wholesaleOrdersPerPage;
    const endIndex = startIndex + wholesaleOrdersPerPage;
    const ordersToShow = filteredWholesaleOrders.slice(startIndex, endIndex);
    
    if (ordersToShow.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="padding: 20px; color: #666;">
                    <i class="fas fa-inbox"></i><br>
                    Không có đơn hàng sỉ nào được tìm thấy
                </td>
            </tr>
        `;
        return;
    }
    
    const tableRows = ordersToShow.map(order => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const totalWeight = calculateOrderWeight(order);
        const totalValue = calculateOrderValue(order);
        const isSelected = selectedWholesaleOrders.includes(order.id);
        
        return `
            <tr onclick="toggleWholesaleOrderSelection('${order.id}')" style="cursor: pointer;">
                <td>
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="updateWholesaleOrderSelection('${order.id}', this.checked)"
                           onclick="event.stopPropagation()">
                </td>
                <td><strong>${order.id}</strong></td>
                <td>${formatDate(orderDate)}</td>
                <td class="text-left">
                    <strong>${order.customerName || 'Không xác định'}</strong><br>
                    <small class="text-muted">${order.customerPhone || ''}</small>
                </td>
                <td class="text-left">${order.storeName || 'Không xác định'}</td>
                <td class="text-center">${order.items ? order.items.length : 0}</td>
                <td class="text-right"><strong>${totalWeight.toFixed(1)} kg</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalValue)}</strong></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="viewWholesaleOrderDetails('${order.id}')" 
                            title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" 
                            onclick="printWholesaleOrder('${order.id}')" 
                            title="In đơn hàng">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = tableRows;
    
    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllWholesale');
    if (selectAllCheckbox) {
        const allVisible = ordersToShow.every(order => selectedWholesaleOrders.includes(order.id));
        const someSelected = ordersToShow.some(order => selectedWholesaleOrders.includes(order.id));
        
        selectAllCheckbox.checked = allVisible && ordersToShow.length > 0;
        selectAllCheckbox.indeterminate = someSelected && !allVisible;
    }
}

// Calculate total weight of an order
function calculateOrderWeight(order) {
    if (!order.items || !Array.isArray(order.items)) return 0;
    
    return order.items.reduce((total, item) => {
        const quantity = item.quantity || 0;
        const weight = calculateProductWeight(item.productName, quantity);
        return total + weight;
    }, 0);
}

// Calculate total value of an order
function calculateOrderValue(order) {
    if (!order.items || !Array.isArray(order.items)) return 0;
    
    return order.items.reduce((total, item) => {
        return total + (item.total || (item.price * item.quantity) || 0);
    }, 0);
}

// Update wholesale order pagination
function updateWholesalePagination() {
    const totalPages = Math.ceil(filteredWholesaleOrders.length / wholesaleOrdersPerPage);
    const paginationContainer = document.getElementById('wholesalePagination');
    
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="btn btn-outline-primary btn-sm me-1" 
                onclick="changeWholesalePage(${currentWholesalePage - 1})"
                ${currentWholesalePage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentWholesalePage - 2);
    const endPage = Math.min(totalPages, currentWholesalePage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="btn ${i === currentWholesalePage ? 'btn-primary' : 'btn-outline-primary'} btn-sm me-1"
                    onclick="changeWholesalePage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button class="btn btn-outline-primary btn-sm" 
                onclick="changeWholesalePage(${currentWholesalePage + 1})"
                ${currentWholesalePage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // Update page info
    const pageInfo = document.getElementById('wholesalePageInfo');
    if (pageInfo) {
        const startItem = (currentWholesalePage - 1) * wholesaleOrdersPerPage + 1;
        const endItem = Math.min(currentWholesalePage * wholesaleOrdersPerPage, filteredWholesaleOrders.length);
        pageInfo.textContent = `Hiển thị ${startItem}-${endItem} trong tổng số ${filteredWholesaleOrders.length} đơn hàng`;
    }
}

// Change wholesale page
function changeWholesalePage(page) {
    const totalPages = Math.ceil(filteredWholesaleOrders.length / wholesaleOrdersPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    currentWholesalePage = page;
    displayWholesaleOrders();
    updateWholesalePagination();
}

// Update wholesale statistics
function updateWholesaleStatistics() {
    const totalOrders = filteredWholesaleOrders.length;
    let totalWeight = 0;
    let totalValue = 0;
    
    console.log('Updating statistics for', totalOrders, 'filtered orders');
    
    filteredWholesaleOrders.forEach(order => {
        const orderWeight = calculateOrderWeight(order);
        const orderValue = calculateOrderValue(order);
        totalWeight += orderWeight;
        totalValue += orderValue;
        console.log(`Order ${order.id}: weight=${orderWeight.toFixed(1)}kg, value=${orderValue}`);
    });
    
    console.log(`Total statistics: orders=${totalOrders}, weight=${totalWeight.toFixed(1)}kg, value=${totalValue}`);
    
    // Update statistics elements with correct IDs from HTML
    const totalOrdersElement = document.getElementById('totalWholesaleOrdersCount');
    const totalWeightElement = document.getElementById('totalWholesaleQuantity');
    const totalValueElement = document.getElementById('totalWholesaleValue');
    const warehouseUsageElement = document.getElementById('wholesaleUsagePercentage');
    
    console.log('Statistics elements found:', {
        totalOrders: !!totalOrdersElement,
        totalWeight: !!totalWeightElement,
        totalValue: !!totalValueElement,
        warehouseUsage: !!warehouseUsageElement
    });
    
    if (totalOrdersElement) {
        totalOrdersElement.textContent = totalOrders;
        console.log('Updated total orders to:', totalOrders);
    }
    if (totalWeightElement) {
        totalWeightElement.textContent = totalWeight.toFixed(1) + ' kg';
        console.log('Updated total weight to:', totalWeight.toFixed(1) + ' kg');
    }
    if (totalValueElement) {
        totalValueElement.textContent = formatCurrency(totalValue);
        console.log('Updated total value to:', formatCurrency(totalValue));
    }
    
    // Calculate warehouse usage percentage (assuming 10000kg capacity)
    if (warehouseUsageElement) {
        const warehouseCapacity = 10000; // kg
        const usagePercentage = (totalWeight / warehouseCapacity * 100).toFixed(1);
        warehouseUsageElement.textContent = usagePercentage + '%';
        console.log('Updated warehouse usage to:', usagePercentage + '%');
    }
}

// Toggle wholesale order selection
function toggleWholesaleOrderSelection(orderId) {
    const checkbox = document.querySelector(`input[onchange*="${orderId}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        updateWholesaleOrderSelection(orderId, checkbox.checked);
    }
}

// Update wholesale order selection
function updateWholesaleOrderSelection(orderId, isSelected) {
    if (isSelected) {
        if (!selectedWholesaleOrders.includes(orderId)) {
            selectedWholesaleOrders.push(orderId);
        }
    } else {
        selectedWholesaleOrders = selectedWholesaleOrders.filter(id => id !== orderId);
    } 
    
    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllWholesale');
    if (selectAllCheckbox) {
        const startIndex = (currentWholesalePage - 1) * wholesaleOrdersPerPage;
        const endIndex = startIndex + wholesaleOrdersPerPage;
        const visibleOrders = filteredWholesaleOrders.slice(startIndex, endIndex);
        
        const allVisible = visibleOrders.every(order => selectedWholesaleOrders.includes(order.id));
        const someSelected = visibleOrders.some(order => selectedWholesaleOrders.includes(order.id));
        
        selectAllCheckbox.checked = allVisible && visibleOrders.length > 0;
        selectAllCheckbox.indeterminate = someSelected && !allVisible;
    }
}

// Toggle select all wholesale orders
function toggleSelectAllWholesaleOrders(event) {
    const isChecked = event.target.checked;
    const startIndex = (currentWholesalePage - 1) * wholesaleOrdersPerPage;
    const endIndex = startIndex + wholesaleOrdersPerPage;
    const visibleOrders = filteredWholesaleOrders.slice(startIndex, endIndex);
    
    visibleOrders.forEach(order => {
        updateWholesaleOrderSelection(order.id, isChecked);
        const checkbox = document.querySelector(`input[onchange*="${order.id}"]`);
        if (checkbox) {
            checkbox.checked = isChecked;
        }
    });
}

// Export wholesale orders to Excel
function exportWholesaleOrdersToExcel() {
    if (filteredWholesaleOrders.length === 0) {
        showNotification('Không có dữ liệu để xuất', 'warning');
        return;
    }
    
    const data = filteredWholesaleOrders.map(order => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const totalWeight = calculateOrderWeight(order);
        const totalValue = calculateOrderValue(order);
        
        return {
            'Mã đơn hàng': order.id,
            'Ngày tạo': formatDate(orderDate),
            'Khách hàng': order.customerName || 'Không xác định',
            'SĐT khách hàng': order.customerPhone || '',
            'Cửa hàng': order.storeName || 'Không xác định',
            'Số sản phẩm': order.items ? order.items.length : 0,
            'Tổng khối lượng (kg)': totalWeight.toFixed(1),
            'Tổng giá trị': totalValue,
            'Ghi chú': order.notes || ''
        };
    });
    
    // Create and download Excel file
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng sỉ');
    
    const fileName = `don-hang-si-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showNotification('Đã xuất dữ liệu thành công!', 'success');
}

// Export functions to global scope
window.initializeWholesaleOrderManagement = initializeWholesaleOrderManagement;
window.loadWholesaleOrders = loadWholesaleOrders;
window.filterWholesaleOrders = filterWholesaleOrders;
window.changeWholesalePage = changeWholesalePage;
window.toggleWholesaleOrderSelection = toggleWholesaleOrderSelection;
window.updateWholesaleOrderSelection = updateWholesaleOrderSelection;
window.toggleSelectAllWholesaleOrders = toggleSelectAllWholesaleOrders;
window.exportWholesaleOrdersToExcel = exportWholesaleOrdersToExcel;
