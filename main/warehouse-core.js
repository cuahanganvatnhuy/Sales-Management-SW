// Warehouse Management Core Functions
console.log('=== Warehouse Management Core Loading ===');

// Global variables
let warehouseData = {};
let categoriesData = {};
let stockInCounter = 0;
let stockOutCounter = 0;

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
        
        // Initialize UI
        updateDashboard();
        populateCategoryFilter();
        populateProductSelects();
        displayWarehouseTable();
        
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
                minStock: product.minStock || 10
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
    if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue) + ' VNĐ';
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
    if (outOfStockCountEl) outOfStockCountEl.textContent = outOfStockCount;
}

// Format currency
function formatCurrency(amount) {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return '0';
    return new Intl.NumberFormat('vi-VN').format(numAmount);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const icon = notification.querySelector('.notification-icon');
    const messageSpan = notification.querySelector('.notification-message');
    
    // Set icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    if (icon) icon.className = `notification-icon ${iconClass}`;
    if (messageSpan) messageSpan.textContent = message;
    
    // Set notification type class
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

// Populate category filter
function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    // Clear existing options except "All"
    categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
    
    // Add category options
    Object.values(categoriesData).forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categoryFilter.appendChild(option);
    });
}

// Populate product selects in modals
function populateProductSelects() {
    const selects = ['stockInProduct', 'stockOutProduct', 'adjustmentProduct'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '<option value="">Chọn sản phẩm</option>';
        
        // Add product options
        Object.values(warehouseData).forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.unit})`;
            option.setAttribute('data-unit', product.unit);
            option.setAttribute('data-stock', product.stock || 0);
            select.appendChild(option);
        });
    });
}

// Display warehouse table
function displayWarehouseTable() {
    const tbody = document.getElementById('warehouseTableBody');
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
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm)) return false;
        
        return true;
    });
    
    // Sort by name
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    
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
            <td>${product.name}</td>
            <td>${product.sku || 'N/A'}</td>
            <td>${stock} ${product.unit}</td>
            <td>${formatCurrency(product.price || 0)} VNĐ/${product.unit}</td>
            <td><span class="status ${statusClass}">${status}</span></td>
            <td>
                <button type="button" class="btn btn-sm btn-success" onclick="openStockInModal('${product.id}')">
                    <i class="fas fa-plus"></i>
                </button>
                <button type="button" class="btn btn-sm btn-warning" onclick="openStockOutModal('${product.id}')">
                    <i class="fas fa-minus"></i>
                </button>
                <button type="button" class="btn btn-sm btn-info" onclick="openAdjustmentModal('${product.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Show empty state if no products
    if (filteredProducts.length === 0) {
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
    }
}

// Modal functions (placeholders)
function openStockInModal(productId) {
    console.log('Opening stock in modal for product:', productId);
    // TODO: Implement modal logic
}

function openStockOutModal(productId) {
    console.log('Opening stock out modal for product:', productId);
    // TODO: Implement modal logic
}

function openAdjustmentModal(productId) {
    console.log('Opening adjustment modal for product:', productId);
    // TODO: Implement modal logic
}

// Filter functions
function filterWarehouse() {
    displayWarehouseTable();
}

function searchWarehouse() {
    displayWarehouseTable();
}

// Export functions to global scope
window.initializeWarehouseManagement = initializeWarehouseManagement;
window.loadWarehouseData = loadWarehouseData;
window.updateDashboard = updateDashboard;
window.formatCurrency = formatCurrency;
window.showNotification = showNotification;
window.populateCategoryFilter = populateCategoryFilter;
window.populateProductSelects = populateProductSelects;
window.displayWarehouseTable = displayWarehouseTable;
window.openStockInModal = openStockInModal;
window.openStockOutModal = openStockOutModal;
window.openAdjustmentModal = openAdjustmentModal;
window.filterWarehouse = filterWarehouse;
window.searchWarehouse = searchWarehouse;
