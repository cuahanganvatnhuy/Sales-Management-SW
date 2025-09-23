// Page Protection System
console.log('🛡️ Loading Page Protection System...');

// Page permission mapping
const PAGE_PERMISSIONS = {
    // Product pages
    'products.html': 'product_create',
    'product-management.html': 'product_read',
    'product-categories.html': 'product_category_manage',
    'selling-products.html': 'selling_product_manage',
    
    // Order pages
    'orders.html': 'order_tmdt',
    'retail-orders.html': 'order_retail',
    'wholesale-orders.html': 'order_wholesale',
    'order-management.html': 'order_read',
    'sales-orders-tmdt.html': 'order_tmdt',
    'sales-orders-retail.html': 'order_retail',
    'sales-orders-wholesale.html': 'order_wholesale',
    'sales-order-management.html': 'sales_order_manage',
    
    // Profit pages
    'overview-profit.html': 'profit_overview',
    'profit-management.html': 'profit_tmdt',
    'retail-profit.html': 'profit_retail',
    'wholesale-profit.html': 'profit_wholesale',
    
    // Store pages
    'stores.html': 'store_read',
    'store-detail.html': 'store_read',
    
    // User management
    'user-management.html': 'user_read',
    
    // Reports
    'reports.html': 'report_read',
    
    // Warehouse
    'warehouse-management.html': 'warehouse_read',
    
    // Shipping
    'shipping-cost-management.html': 'shipping_read',
    
    // Invoice
    'global-invoice.html': 'invoice_global',
    'store-invoice.html': 'invoice_store',
    
    // Settings
    'settings.html': 'settings_read'
};

// Function to get current page name
function getCurrentPageName() {
    const path = window.location.pathname;
    const pageName = path.split('/').pop();
    return pageName;
}

// Function to check page permission
function checkPagePermission() {
    console.log('🔍 Checking page permission...');
    
    const pageName = getCurrentPageName();
    const requiredPermission = PAGE_PERMISSIONS[pageName];
    
    console.log('📄 Current page:', pageName);
    console.log('🔑 Required permission:', requiredPermission);
    
    // If no permission required for this page, allow access
    if (!requiredPermission) {
        console.log('✅ No permission required for this page');
        return true;
    }
    
    // Check authentication first
    if (typeof requireAuth === 'function' && !requireAuth()) {
        console.log('❌ Auth check failed');
        return false;
    }
    
    // Check specific permission
    if (typeof requirePermission === 'function' && !requirePermission(requiredPermission)) {
        console.log('❌ Permission check failed for:', requiredPermission);
        
        // Show alert and redirect
        alert(`Bạn không có quyền truy cập trang này!\nQuyền cần thiết: ${requiredPermission}`);
        
        // Redirect to dashboard
        setTimeout(() => {
            if (window.location.pathname.includes('/view/')) {
                window.location.href = '../index.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);
        
        return false;
    }
    
    console.log('✅ Permission check passed for:', requiredPermission);
    return true;
}

// Function to initialize page protection
function initPageProtection() {
    console.log('🛡️ Initializing page protection...');
    
    // Wait for auth system to be ready
    setTimeout(() => {
        checkPagePermission();
    }, 1000);
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛡️ Page protection DOM loaded');
    initPageProtection();
});

// Export functions
window.checkPagePermission = checkPagePermission;
window.initPageProtection = initPageProtection;
window.PAGE_PERMISSIONS = PAGE_PERMISSIONS;

console.log('✅ Page Protection System loaded');
