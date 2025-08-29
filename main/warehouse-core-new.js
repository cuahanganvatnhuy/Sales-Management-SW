// Warehouse Management Core Functions - Complete Implementation
console.log('=== Warehouse Management Core Loading ===');

// Global variables
let warehouseData = {};
let categoriesData = {};
let stockInCounter = 0;
let stockOutCounter = 0;
let warehouseTransactions = [];
let categoryChart = null;
let valueChart = null;

// Initialize warehouse management
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing warehouse management...');
    setTimeout(initializeWarehouseManagement, 500);
});

async function initializeWarehouseManagement() {
    try {
        console.log('=== Initializing Warehouse Management ===');
        
        // Check Firebase connection
        if (!window.database) {
            console.log('Initializing Firebase...');
            if (typeof firebase !== 'undefined') {
                window.database = firebase.database();
            } else {
                throw new Error('Firebase not loaded');
            }
        }
        
        // Load data
        await loadWarehouseData();
        await loadCategories();
        await loadTransactionHistory();
        
        // Initialize UI
        updateDashboard();
        populateCategoryFilter();
        populateProductSelects();
        displayWarehouseTable();
        initializeCharts();
        checkLowStockAlerts();
        
        console.log('Warehouse management initialized successfully');
        showNotification('Hệ thống quản lý kho đã sẵn sàng!', 'success');
        
    } catch (error) {
        console.error('Error initializing warehouse management:', error);
        showNotification('Lỗi khởi tạo hệ thống: ' + error.message, 'error');
    }
}

// Load warehouse data
async function loadWarehouseData() {
    try {
        console.log('Loading warehouse data...');
        const snapshot = await database.ref('products').once('value');
        const products = snapshot.val() || {};
        
        warehouseData = {};
        for (const [id, product] of Object.entries(products)) {
            warehouseData[id] = {
                ...product,
                id: id,
                stock: product.stock || 0,
                unit: product.unit || 'cái',
                conversion: product.conversion || 1,
                costPrice: product.costPrice || product.price || 0,
                minStock: product.minStock || 10,
                maxStock: product.maxStock || 1000
            };
        }
        
        console.log(`Loaded ${Object.keys(warehouseData).length} products`);
        window.warehouseData = warehouseData;
        
    } catch (error) {
        console.error('Error loading warehouse data:', error);
        throw error;
    }
}

// Load categories
async function loadCategories() {
    try {
        console.log('Loading categories...');
        const snapshot = await database.ref('categories').once('value');
        categoriesData = snapshot.val() || {};
        console.log(`Loaded ${Object.keys(categoriesData).length} categories`);
        
    } catch (error) {
        console.error('Error loading categories:', error);
        categoriesData = {};
    }
}

// Load transaction history
async function loadTransactionHistory() {
    try {
        console.log('Loading transaction history...');
        const snapshot = await database.ref('warehouseTransactions').orderByChild('timestamp').limitToLast(100).once('value');
        const transactions = snapshot.val() || {};
        warehouseTransactions = Object.values(transactions).reverse();
        console.log(`Loaded ${warehouseTransactions.length} transactions`);
        
    } catch (error) {
        console.error('Error loading transaction history:', error);
        warehouseTransactions = [];
    }
}

// Update dashboard
function updateDashboard() {
    const products = Object.values(warehouseData);
    const totalProducts = products.length;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    products.forEach(product => {
        const stock = product.stock || 0;
        const costPrice = product.costPrice || 0;
        totalValue += stock * costPrice;
        
        if (stock <= 0) {
            outOfStockCount++;
        } else if (stock <= (product.minStock || 10)) {
            lowStockCount++;
        }
    });
    
    // Update dashboard cards
    const totalProductsEl = document.getElementById('totalProducts');
    const totalValueEl = document.getElementById('totalValue');
    const lowStockCountEl = document.getElementById('lowStockCount');
    const outOfStockCountEl = document.getElementById('outOfStockCount');
    
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
    if (outOfStockCountEl) outOfStockCountEl.textContent = outOfStockCount;
    
    // Update charts if they exist
    updateCharts();
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const messageEl = notification.querySelector('.notification-message');
    const iconEl = notification.querySelector('.notification-icon');
    
    if (messageEl) messageEl.textContent = message;
    
    // Set icon based on type
    if (iconEl) {
        iconEl.className = 'notification-icon';
        if (type === 'success') {
            iconEl.classList.add('fas', 'fa-check-circle');
        } else if (type === 'error') {
            iconEl.classList.add('fas', 'fa-exclamation-circle');
        } else if (type === 'warning') {
            iconEl.classList.add('fas', 'fa-exclamation-triangle');
        } else {
            iconEl.classList.add('fas', 'fa-info-circle');
        }
    }
    
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

// Show loading
function showLoading(show = true) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Populate category filter
function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
    
    Object.entries(categoriesData).forEach(([id, category]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = category.name;
        categoryFilter.appendChild(option);
    });
}

// Populate product selects in modals
function populateProductSelects() {
    const selects = [
        document.getElementById('stockInProduct'),
        document.getElementById('stockOutProduct'),
        document.getElementById('adjustmentProduct')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        
        select.innerHTML = '<option value="">Chọn sản phẩm</option>';
        
        Object.entries(warehouseData).forEach(([id, product]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${product.name} (${product.sku || 'N/A'})`;
            select.appendChild(option);
        });
    });
}

// Display warehouse table
function displayWarehouseTable() {
    const tbody = document.querySelector('.warehouse-table tbody');
    const emptyState = document.querySelector('.empty-state-container');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Get filter values
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const stockFilter = document.getElementById('stockFilter')?.value || '';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // Filter products
    let filteredProducts = Object.values(warehouseData).filter(product => {
        // Category filter
        if (categoryFilter && product.categoryId !== categoryFilter) return false;
        
        // Stock status filter
        const stock = product.stock || 0;
        if (stockFilter === 'low' && stock > (product.minStock || 10)) return false;
        if (stockFilter === 'out' && stock > 0) return false;
        if (stockFilter === 'in' && stock <= 0) return false;
        
        // Search filter
        if (searchTerm) {
            const searchableText = `${product.name} ${product.sku || ''}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    // Sort by name
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    
    // Show/hide empty state
    if (filteredProducts.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Không tìm thấy sản phẩm nào</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Display products
    filteredProducts.forEach((product, index) => {
        const row = document.createElement('tr');
        const stock = product.stock || 0;
        const minStock = product.minStock || 10;
        
        // Determine status
        let status = 'Còn hàng';
        let statusClass = 'status-in-stock';
        if (stock <= 0) {
            status = 'Hết hàng';
            statusClass = 'status-out-of-stock';
        } else if (stock <= minStock) {
            status = 'Sắp hết';
            statusClass = 'status-low-stock';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="product-info">
                    <strong>${product.name}</strong>
                    <small class="text-muted d-block">${categoriesData[product.categoryId]?.name || 'Chưa phân loại'}</small>
                </div>
            </td>
            <td><code>${product.sku || 'N/A'}</code></td>
            <td>
                <span class="stock-quantity ${statusClass}">
                    ${formatCurrency(stock)} ${product.unit}
                </span>
                <small class="text-muted d-block">Min: ${minStock}</small>
            </td>
            <td>${formatCurrency(product.costPrice || 0)} VNĐ</td>
            <td><span class="status ${statusClass}">${status}</span></td>
            <td class="action-buttons">
                <button type="button" class="btn btn-sm btn-success" onclick="openStockInModal('${product.id}')" title="Nhập kho">
                    <i class="fas fa-plus"></i>
                </button>
                <button type="button" class="btn btn-sm btn-warning" onclick="openStockOutModal('${product.id}')" title="Xuất kho" ${stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-minus"></i>
                </button>
                <button type="button" class="btn btn-sm btn-info" onclick="openAdjustmentModal('${product.id}')" title="Điều chỉnh">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}
