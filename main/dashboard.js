// Dashboard Management
let dashboardData = {
    orders: {},
    products: {},
    stores: {}
};

// Select store from modal
async function selectStoreFromModal(storeId) {
    try {
        console.log('=== selectStoreFromModal called ===');
        console.log('Store ID:', storeId);
        
        // Get store data first
        const stores = await getAllStores();
        const storeData = stores[storeId];
        
        if (!storeData) {
            throw new Error(`Store not found: ${storeId}`);
        }
        
        console.log('Store data found:', storeData);
        
        // Manual store context setting (avoiding header.js conflict)
        console.log('Setting store context manually...');
        localStorage.setItem('selectedStoreId', storeId);
        localStorage.setItem('selectedStoreData', JSON.stringify(storeData));
        
        // Update header manually
        const currentStoreName = document.getElementById('currentStoreName');
        if (currentStoreName) {
            currentStoreName.textContent = storeData.name;
            console.log('Header updated with store name:', storeData.name);
        }
        
        // Hide modal
        const modal = document.getElementById('storeSelectionModal');
        if (modal) {
            modal.classList.add('hidden');
            console.log('Modal hidden');
        }
        
        // Show dashboard content
        const dashboardContent = document.getElementById('dashboardContent');
        if (dashboardContent) {
            dashboardContent.classList.remove('hidden');
            console.log('Dashboard content shown');
        }
        
        // Load dashboard data for selected store
        console.log('Loading dashboard data...');
        await loadDashboardData();
        
        showNotification(`Đã chọn cửa hàng: ${storeData.name}`, 'success');
        
    } catch (error) {
        console.error('Error selecting store:', error);
        showNotification('Lỗi chọn cửa hàng: ' + error.message, 'error');
    }
}

// Cancel store selection
function cancelStoreSelection() {
    const modal = document.getElementById('storeSelectionModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Redirect to stores page or show message
    showNotification('Vui lòng chọn cửa hàng từ header để tiếp tục', 'info');
}

// Hide store selection modal (for HTML onclick)
function hideStoreSelectionModal() {
    cancelStoreSelection();
}

// Listen for store context changes
document.addEventListener('storeContextChanged', function(event) {
    console.log('Store context changed in dashboard:', event.detail);
    
    // Hide modal if open
    const modal = document.getElementById('storeSelectionModal');
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
    }
    
    // Show dashboard content
    const dashboardContent = document.getElementById('dashboardContent');
    if (dashboardContent) {
        dashboardContent.classList.remove('hidden');
    }
    
    // Reload dashboard data
    loadDashboardData();
});

// Make functions globally accessible for onclick handlers
window.selectStoreFromModal = selectStoreFromModal;
window.hideStoreSelectionModal = hideStoreSelectionModal;

// Check store context availability
function checkStoreContextAvailability() {
    console.log('=== Store Context Availability Check ===');
    console.log('setCurrentStore:', typeof setCurrentStore);
    console.log('getCurrentStoreContext:', typeof getCurrentStoreContext);
    console.log('isStoreSelected:', typeof isStoreSelected);
    console.log('getAllStores:', typeof getAllStores);
    console.log('database:', typeof database);
    console.log('==========================================');
}

// Initialize dashboard when page loads
window.addEventListener('DOMContentLoaded', function() {
    // Wait for store context to be ready
    setTimeout(() => {
        checkStoreContextAvailability();
        initializeDashboard();
    }, 300);
});

// Listen for store context changes
document.addEventListener('storeContextChanged', function(event) {
    const storeContext = event.detail;
    if (storeContext.isStoreSelected) {
        loadDashboardData();
        showDashboardContent();
    } else {
        showStoreSelectionMessage();
    }
});

// Initialize dashboard
function initializeDashboard() {
    // Check if store is selected
    if (typeof isStoreSelected === 'function' && isStoreSelected()) {
        loadDashboardData();
        showDashboardContent();
    } else {
        showStoreSelectionMessage();
        // Auto-show modal if no store selected
        setTimeout(() => {
            showStoreSelectionModal();
        }, 1000);
    }
}

// Show store selection message
function showStoreSelectionMessage() {
    const storeSelectionMessage = document.getElementById('storeSelectionMessage');
    const dashboardStats = document.getElementById('dashboardStats');
    const recentOrdersSection = document.getElementById('recentOrdersSection');
    const quickActionsSection = document.getElementById('quickActionsSection');
    
    if (storeSelectionMessage) storeSelectionMessage.classList.remove('hidden');
    if (dashboardStats) dashboardStats.classList.add('hidden');
    if (recentOrdersSection) recentOrdersSection.classList.add('hidden');
    if (quickActionsSection) quickActionsSection.classList.add('hidden');
}

// Show dashboard content
function showDashboardContent() {
    const storeSelectionMessage = document.getElementById('storeSelectionMessage');
    const dashboardStats = document.getElementById('dashboardStats');
    const recentOrdersSection = document.getElementById('recentOrdersSection');
    const quickActionsSection = document.getElementById('quickActionsSection');
    
    if (storeSelectionMessage) storeSelectionMessage.classList.add('hidden');
    if (dashboardStats) dashboardStats.classList.remove('hidden');
    if (recentOrdersSection) recentOrdersSection.classList.remove('hidden');
    if (quickActionsSection) quickActionsSection.classList.remove('hidden');
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading(true);
        
        // Load orders for selected store
        await loadStoreOrders();
        
        // Load global products
        await loadGlobalProducts();
        
        // Load stores
        await loadStores();
        
        // Update dashboard stats
        updateDashboardStats();
        
        // Load recent orders
        loadRecentOrders();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Lỗi tải dữ liệu dashboard!', 'error');
    } finally {
        showLoading(false);
    }
}

// Load orders for selected store
async function loadStoreOrders() {
    try {
        // Always get fresh store ID from localStorage
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        console.log('🔍 Fresh store ID from localStorage:', selectedStoreId);
        
        if (selectedStoreId) {
            console.log('📆 Loading dashboard orders for store:', selectedStoreId);
            
            // Use store-context for consistent paths
            if (typeof getStoreDataPath === 'function') {
                console.log('✅ store-context.js is available');
                const ordersPath = getStoreDataPath('orders');
                console.log('📁 Using store-context path:', ordersPath);
                
                if (ordersPath) {
                    const snapshot = await database.ref(ordersPath).once('value');
                    dashboardData.orders = snapshot.val() || {};
                    console.log('📆 Orders loaded from store-context path:', Object.keys(dashboardData.orders).length);
                } else {
                    console.warn('⚠️ getStoreDataPath returned null, falling back to manual paths');
                    dashboardData.orders = {};
                }
            } else {
                // Fallback: check both paths for backward compatibility
                console.log('⚠️ store-context.js not available, using fallback paths');
                console.log('🔍 Checking both old and new paths...');
                
                // Check new path first
                const newPath = `stores/${selectedStoreId}/orders`;
                const newSnapshot = await database.ref(newPath).once('value');
                const newPathData = newSnapshot.val() || {};
                
                // Check old path
                const oldPath = `store_orders/${selectedStoreId}`;
                const oldSnapshot = await database.ref(oldPath).once('value');
                const oldPathData = oldSnapshot.val() || {};
                
                console.log('📁 New path orders:', Object.keys(newPathData).length);
                console.log('📁 Old path orders:', Object.keys(oldPathData).length);
                
                // Use whichever has data
                if (Object.keys(newPathData).length > 0) {
                    dashboardData.orders = newPathData;
                    console.log('✅ Dashboard using NEW path data');
                } else if (Object.keys(oldPathData).length > 0) {
                    dashboardData.orders = oldPathData;
                    console.log('⚠️ Dashboard using OLD path data');
                } else {
                    dashboardData.orders = {};
                    console.log('❌ No orders found in either path');
                }
            }
            
            console.log(`Dashboard orders loaded for store ${selectedStoreId}:`, Object.keys(dashboardData.orders).length, 'orders');
        } else {
            // Fallback to all orders
            dashboardData.orders = await getAllOrders();
            console.log('Dashboard orders loaded (all stores):', Object.keys(dashboardData.orders).length, 'orders');
        }
    } catch (error) {
        console.error('Error loading store orders:', error);
        dashboardData.orders = {};
    }
}

// Load global products
async function loadGlobalProducts() {
    try {
        dashboardData.products = await getAllProducts();
        console.log('Dashboard products loaded:', dashboardData.products);
    } catch (error) {
        console.error('Error loading products:', error);
        dashboardData.products = {};
    }
}

// Load stores
async function loadStores() {
    try {
        dashboardData.stores = await getAllStores();
        console.log('Dashboard stores loaded:', dashboardData.stores);
    } catch (error) {
        console.error('Error loading stores:', error);
        dashboardData.stores = {};
    }
}

// Update dashboard stats
function updateDashboardStats() {
    const orders = dashboardData.orders;
    const products = dashboardData.products;
    
    // Calculate total orders
    const totalOrders = Object.keys(orders).length;
    document.getElementById('totalOrders').textContent = totalOrders;
    
    // Calculate total revenue
    let totalRevenue = 0;
    Object.values(orders).forEach(order => {
        totalRevenue += order.total || 0;
    });
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue) + ' VNĐ';
    
    // Calculate total products
    const totalProducts = Object.keys(products).length;
    document.getElementById('totalProducts').textContent = totalProducts;
    
    // Calculate today's orders
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = Object.values(orders).filter(order => 
        order.orderDate === today
    ).length;
    document.getElementById('todayOrders').textContent = todayOrders;
}

// Load recent orders
function loadRecentOrders() {
    const orders = dashboardData.orders;
    const recentOrdersList = document.getElementById('recentOrdersList');
    const noRecentOrders = document.getElementById('noRecentOrders');
    
    if (!orders || Object.keys(orders).length === 0) {
        recentOrdersList.innerHTML = '';
        noRecentOrders.classList.remove('hidden');
        return;
    }
    
    noRecentOrders.classList.add('hidden');
    
    // Get recent orders (last 5)
    const recentOrders = Object.entries(orders)
        .sort(([,a], [,b]) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    let ordersHTML = '';
    recentOrders.forEach(([orderId, order]) => {
        ordersHTML += `
            <div class="recent-order-item">
                <div class="order-info">
                    <div class="order-product">
                        <i class="fas fa-box"></i>
                        <span>${order.productName}</span>
                    </div>
                    <div class="order-details">
                        <span class="order-quantity">${order.quantity} kg</span>
                        <span class="order-total">${formatCurrency(order.total)} VNĐ</span>
                    </div>
                </div>
                <div class="order-date">
                    ${formatDate(order.orderDate)}
                </div>
            </div>
        `;
    });
    
    recentOrdersList.innerHTML = ordersHTML;
}

// Show store selection modal
function showStoreSelectionModal() {
    const modal = document.getElementById('storeSelectionModal');
    if (modal) {
        modal.classList.remove('hidden');
        loadStoresInModal();
    } else {
        console.warn('Store selection modal not found on this page');
    }
}

// Hide store selection modal
function hideStoreSelectionModal() {
    const modal = document.getElementById('storeSelectionModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Load stores in modal
async function loadStoresInModal() {
    try {
        console.log('=== loadStoresInModal called ===');
        const stores = await getAllStores();
        console.log('Stores from database:', stores);
        console.log('Number of stores:', Object.keys(stores || {}).length);
        const storesList = document.getElementById('storesList');
        
        if (!stores || Object.keys(stores).length === 0) {
            storesList.innerHTML = `
                <div class="no-stores-message">
                    <i class="fas fa-store-slash"></i>
                    <p>Chưa có cửa hàng nào trong hệ thống.</p>
                    <a href="stores.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Tạo Cửa Hàng Đầu Tiên
                    </a>
                </div>
            `;
            return;
        }
        
        let storesHTML = '';
        Object.entries(stores).forEach(([storeId, store]) => {
            storesHTML += `
                <div class="store-item" data-store-id="${storeId}">
                    <div class="store-icon">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="store-info">
                        <h4>${store.name}</h4>
                        <p>${store.address || 'Chưa có địa chỉ'}</p>
                    </div>
                    <div class="store-select">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        });
        
        storesList.innerHTML = storesHTML;
        
        // Add event listeners to store items
        const storeItems = storesList.querySelectorAll('.store-item');
        console.log('Found store items:', storeItems.length);
        
        storeItems.forEach((item, index) => {
            const storeId = item.getAttribute('data-store-id');
            console.log(`Adding event listener to store ${index}:`, storeId);
            
            item.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                console.log('=== STORE ITEM CLICKED ===');
                console.log('Store ID:', storeId);
                console.log('Element:', this);
                selectStoreFromModal(storeId);
            });
            
            // Also add hover effect for visual feedback
            item.style.cursor = 'pointer';
        });
        
    } catch (error) {
        console.error('Error loading stores in modal:', error);
        document.getElementById('storesList').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Lỗi tải danh sách cửa hàng!</p>
            </div>
        `;
    }
}



// Format currency
function formatCurrency(amount) {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return '0';
    return new Intl.NumberFormat('vi-VN').format(numAmount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Show loading state
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles if not exists
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }
            .toast-success { background: #4caf50; }
            .toast-error { background: #f44336; }
            .toast-warning { background: #ff9800; }
            .toast-info { background: #2196f3; }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Listen for store context changes (for loading overlay management)
// Wrap in DOMContentLoaded to ensure proper initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard: DOM loaded, adding store context event listener');
    
    document.addEventListener('storeContextChanged', async function(event) {
    console.log('🏪 Dashboard: Store context changed event received');
    console.log('Event detail:', event.detail);
    console.log('New store ID:', event.detail?.storeId);
    console.log('New store data:', event.detail?.storeData);
    
    try {
        // Clear existing data first
        dashboardData = {
            orders: {},
            products: {},
            stores: {}
        };
        console.log('🧽 Dashboard data cleared');
        
        // Force reload dashboard data with new store context
        console.log('🔄 Force reloading dashboard data...');
        console.log('📊 Before reload - Orders count:', Object.keys(dashboardData.orders).length);
        
        await loadDashboardData();
        
        console.log('✅ Dashboard data reloaded successfully');
        console.log('📊 After reload - Orders count:', Object.keys(dashboardData.orders).length);
        console.log('📊 After reload - Orders data:', dashboardData.orders);
        
        // Update header to show current store
        if (event.detail?.storeData) {
            const currentStoreName = document.getElementById('currentStoreName');
            if (currentStoreName) {
                currentStoreName.textContent = event.detail.storeData.name;
            }
        }
        
        // Auto-hide loading overlay after data loads
        setTimeout(() => {
            const overlay = document.getElementById('storeChangeOverlay');
            if (overlay) {
                console.log('🔄 Hiding store change overlay...');
                overlay.style.animation = 'fadeIn 0.3s ease reverse';
                setTimeout(() => overlay.remove(), 300);
            }
        }, 500); // Longer delay to ensure data is fully displayed
        
    } catch (error) {
        console.error('❌ Error reloading dashboard data:', error);
        
        // Hide overlay even on error
        const overlay = document.getElementById('storeChangeOverlay');
        if (overlay) overlay.remove();
        
        showNotification('Lỗi tải dữ liệu dashboard!', 'error');
    }
    }); // End of storeContextChanged event listener
}); // End of DOMContentLoaded
