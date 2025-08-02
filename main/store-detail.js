// Store Detail Management
let currentStoreId = null;
let storeData = null;
let storeProducts = {};
let storeOrders = {};

// Get store ID from URL
function getStoreIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('storeId');
}

// Load page when DOM is ready
window.addEventListener('DOMContentLoaded', function() {
    currentStoreId = getStoreIdFromUrl();
    
    if (!currentStoreId) {
        showNotification('Không tìm thấy ID cửa hàng!', 'error');
        setTimeout(() => {
            window.location.href = 'stores.html';
        }, 2000);
        return;
    }
    
    loadStoreData();
});

// Load store data
async function loadStoreData() {
    try {
        showLoading(true);
        
        // Load store info
        const storeSnapshot = await database.ref(`stores/${currentStoreId}`).once('value');
        storeData = storeSnapshot.val();
        
        if (!storeData) {
            showNotification('Không tìm thấy cửa hàng!', 'error');
            setTimeout(() => {
                window.location.href = 'stores.html';
            }, 2000);
            return;
        }
        
        // Load store products and orders
        await Promise.all([
            loadStoreProducts(),
            loadStoreOrders()
        ]);
        
        displayStoreInfo();
        displayStoreProducts();
        displayStoreOrders();
        updateAnalytics();
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading store data:', error);
        showNotification('Lỗi tải dữ liệu cửa hàng!', 'error');
        showLoading(false);
    }
}

// Load store products
async function loadStoreProducts() {
    try {
        const snapshot = await database.ref(`store_products/${currentStoreId}`).once('value');
        storeProducts = snapshot.val() || {};
    } catch (error) {
        console.error('Error loading store products:', error);
        storeProducts = {};
    }
}

// Load store orders
async function loadStoreOrders() {
    try {
        const snapshot = await database.ref(`store_orders/${currentStoreId}`).once('value');
        storeOrders = snapshot.val() || {};
    } catch (error) {
        console.error('Error loading store orders:', error);
        storeOrders = {};
    }
}

// Display store information
function displayStoreInfo() {
    document.getElementById('storeTitle').textContent = storeData.name;
    
    // Update header with store name
    updateHeaderWithStoreName();
    
    const storeInfoContainer = document.getElementById('storeDetailInfo');
    const statusBadge = storeData.status === 'active' 
        ? '<span class="badge badge-success">Hoạt Động</span>'
        : '<span class="badge badge-warning">Tạm Dừng</span>';
    
    storeInfoContainer.innerHTML = `
        <div class="store-detail-grid">
            <div class="store-detail-item">
                <div class="store-detail-label">
                    <i class="fas fa-store"></i> Tên Cửa Hàng:
                </div>
                <div class="store-detail-value">${storeData.name}</div>
            </div>
            
            <div class="store-detail-item">
                <div class="store-detail-label">
                    <i class="fas fa-user"></i> Chủ Cửa Hàng:
                </div>
                <div class="store-detail-value">${storeData.owner}</div>
            </div>
            
            <div class="store-detail-item">
                <div class="store-detail-label">
                    <i class="fas fa-map-marker-alt"></i> Địa Chỉ:
                </div>
                <div class="store-detail-value">${storeData.address}</div>
            </div>
            
            <div class="store-detail-item">
                <div class="store-detail-label">
                    <i class="fas fa-phone"></i> Điện Thoại:
                </div>
                <div class="store-detail-value">${storeData.phone}</div>
            </div>
            
            ${storeData.email ? `
                <div class="store-detail-item">
                    <div class="store-detail-label">
                        <i class="fas fa-envelope"></i> Email:
                    </div>
                    <div class="store-detail-value">${storeData.email}</div>
                </div>
            ` : ''}
            
            <div class="store-detail-item">
                <div class="store-detail-label">
                    <i class="fas fa-info-circle"></i> Trạng Thái:
                </div>
                <div class="store-detail-value">${statusBadge}</div>
            </div>
        </div>
    `;
}

// Display store products
function displayStoreProducts() {
    const container = document.getElementById('storeProductsContainer');
    const emptyState = document.getElementById('productsEmptyState');
    
    if (!storeProducts || Object.keys(storeProducts).length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    let productsHTML = '';
    let index = 1;
    
    for (const [productId, product] of Object.entries(storeProducts)) {
        const statusBadge = product.status === 'active' 
            ? '<span class="badge badge-success">Còn Hàng</span>'
            : '<span class="badge badge-danger">Hết Hàng</span>';
            
        productsHTML += `
            <tr>
                <td class="text-center">${index}</td>
                <td>${product.name}</td>
                <td class="text-center sku-cell">${product.sku || 'N/A'}</td>
                <td class="text-right">${formatCurrency(product.price)} VNĐ</td>
                <td class="text-center">${product.stock || 0}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">
                    <div class="action-buttons">
                        <button class="btn btn-warning btn-small" onclick="editStoreProduct('${productId}')" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteStoreProduct('${productId}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        index++;
    }
    
    container.innerHTML = productsHTML;
}

// Display store orders
function displayStoreOrders() {
    const container = document.getElementById('storeOrdersContainer');
    const emptyState = document.getElementById('ordersEmptyState');
    
    if (!storeOrders || Object.keys(storeOrders).length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    let ordersHTML = '';
    let index = 1;
    
    // Sort orders by date (newest first)
    const sortedOrders = Object.entries(storeOrders).sort((a, b) => 
        new Date(b[1].createdAt || 0) - new Date(a[1].createdAt || 0)
    );
    
    for (const [orderId, order] of sortedOrders) {
        const statusBadge = getOrderStatusBadge(order.status || 'pending');
        const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('vi-VN');
        
        ordersHTML += `
            <tr>
                <td class="text-center">${index}</td>
                <td class="text-center">${orderId.substring(0, 8)}...</td>
                <td>${order.productName || 'N/A'}</td>
                <td class="text-center">${order.quantity || 0} kg</td>
                <td class="text-right">${formatCurrency(order.total || 0)} VNĐ</td>
                <td class="text-center">${orderDate}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">
                    <div class="action-buttons">
                        <button class="btn btn-info btn-small" onclick="viewStoreOrder('${orderId}')" title="Xem">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteStoreOrder('${orderId}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        index++;
    }
    
    container.innerHTML = ordersHTML;
}

// Get order status badge
function getOrderStatusBadge(status) {
    const badges = {
        pending: '<span class="badge badge-warning">Chờ Xử Lý</span>',
        processing: '<span class="badge badge-info">Đang Xử Lý</span>',
        completed: '<span class="badge badge-success">Hoàn Thành</span>',
        cancelled: '<span class="badge badge-danger">Đã Hủy</span>'
    };
    return badges[status] || badges.pending;
}

// Update analytics
function updateAnalytics() {
    const totalProducts = Object.keys(storeProducts).length;
    const totalOrders = Object.keys(storeOrders).length;
    const totalRevenue = Object.values(storeOrders).reduce((sum, order) => sum + (order.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Update header stats
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    
    // Update analytics tab
    document.getElementById('analyticsProducts').textContent = totalProducts;
    document.getElementById('analyticsOrders').textContent = totalOrders;
    document.getElementById('analyticsRevenue').textContent = formatCurrency(totalRevenue) + ' VNĐ';
    document.getElementById('analyticsAverage').textContent = formatCurrency(averageOrderValue) + ' VNĐ';
}

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Add active class to clicked nav link
    event.target.closest('.nav-link').classList.add('active');
}

// Product management functions
function addStoreProduct() {
    // Redirect to add product page with store context
    window.location.href = `products.html?storeId=${currentStoreId}`;
}

function editStoreProduct(productId) {
    // Redirect to edit product page
    window.location.href = `products.html?storeId=${currentStoreId}&productId=${productId}`;
}

async function deleteStoreProduct(productId) {
    const product = storeProducts[productId];
    if (!product) return;
    
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) {
        return;
    }
    
    try {
        showLoading(true);
        await database.ref(`store_products/${currentStoreId}/${productId}`).remove();
        showNotification('Xóa sản phẩm thành công!', 'success');
        loadStoreData();
        showLoading(false);
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Lỗi xóa sản phẩm!', 'error');
        showLoading(false);
    }
}

// Order management functions
function addStoreOrder() {
    // Redirect to add order page with store context
    window.location.href = `orders.html?storeId=${currentStoreId}`;
}

function viewStoreOrder(orderId) {
    // Show order details in modal or redirect to order detail page
    showNotification('Tính năng xem chi tiết đơn hàng đang được phát triển!', 'info');
}

async function deleteStoreOrder(orderId) {
    const order = storeOrders[orderId];
    if (!order) return;
    
    if (!confirm(`Bạn có chắc muốn xóa đơn hàng này?`)) {
        return;
    }
    
    try {
        showLoading(true);
        await database.ref(`store_orders/${currentStoreId}/${orderId}`).remove();
        showNotification('Xóa đơn hàng thành công!', 'success');
        loadStoreData();
        showLoading(false);
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification('Lỗi xóa đơn hàng!', 'error');
        showLoading(false);
    }
}

// Utility functions
function formatCurrency(amount) {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return '0';
    return new Intl.NumberFormat('vi-VN').format(numAmount);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const messageEl = notification.querySelector('.notification-message');
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    icon.className = `notification-icon ${icons[type]}`;
    messageEl.textContent = message;
    
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Update header with store name
function updateHeaderWithStoreName() {
    if (storeData && storeData.name) {
        const userInfo = document.querySelector('.user-info span');
        if (userInfo) {
            userInfo.textContent = storeData.name;
        }
    }
}
