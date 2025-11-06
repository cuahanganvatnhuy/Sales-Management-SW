// Simple Authentication System - No conflicts
console.log('🔐 Loading Simple Auth System...');

// Simple user storage
let currentUser = null;

// Define user roles and permissions
const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager', 
    EMPLOYEE: 'employee',
    VIEWER: 'viewer'
};

const PERMISSIONS = {
    // User permissions
    USER_READ: 'user_read',
    USER_CREATE: 'user_create',
    USER_UPDATE: 'user_update',
    USER_DELETE: 'user_delete',
    
    // Product permissions
    PRODUCT_READ: 'product_read',
    PRODUCT_CREATE: 'product_create',
    PRODUCT_UPDATE: 'product_update',
    PRODUCT_DELETE: 'product_delete',
    PRODUCT_CATEGORY_MANAGE: 'product_category_manage',
    SELLING_PRODUCT_MANAGE: 'selling_product_manage',
    
    // Order permissions
    ORDER_READ: 'order_read',
    ORDER_CREATE: 'order_create',
    ORDER_UPDATE: 'order_update',
    ORDER_DELETE: 'order_delete',
    ORDER_TMDT: 'order_tmdt',
    ORDER_RETAIL: 'order_retail',
    ORDER_WHOLESALE: 'order_wholesale',
    SALES_ORDER_MANAGE: 'sales_order_manage',
    
    // Store permissions
    STORE_READ: 'store_read',
    STORE_CREATE: 'store_create',
    STORE_UPDATE: 'store_update',
    STORE_DELETE: 'store_delete',
    
    // Profit permissions
    PROFIT_READ: 'profit_read',
    PROFIT_OVERVIEW: 'profit_overview',
    PROFIT_TMDT: 'profit_tmdt',
    PROFIT_RETAIL: 'profit_retail',
    PROFIT_WHOLESALE: 'profit_wholesale',
    
    // Warehouse permissions
    WAREHOUSE_READ: 'warehouse_read',
    WAREHOUSE_MANAGE: 'warehouse_manage',
    WAREHOUSE_EXPORT: 'warehouse_export',
    WAREHOUSE_IMPORT: 'warehouse_import',
    
    // Invoice permissions
    INVOICE_READ: 'invoice_read',
    INVOICE_CREATE: 'invoice_create',
    INVOICE_GLOBAL: 'invoice_global',
    INVOICE_STORE: 'invoice_store',
    
    // Shipping permissions
    SHIPPING_READ: 'shipping_read',
    SHIPPING_MANAGE: 'shipping_manage',
    
    // Report permissions
    REPORT_READ: 'report_read',
    REPORT_CREATE: 'report_create',
    
    // Settings permissions
    SETTINGS_READ: 'settings_read',
    SETTINGS_UPDATE: 'settings_update',
    SYSTEM_CONFIG: 'system_config'
};

const ROLE_PERMISSIONS = {
    [USER_ROLES.ADMIN]: [
        // User permissions
        'user_read', 'user_create', 'user_update', 'user_delete',
        
        // Product permissions
        'product_read', 'product_create', 'product_update', 'product_delete',
        'product_category_manage', 'selling_product_manage',
        
        // Order permissions
        'order_read', 'order_create', 'order_update', 'order_delete',
        'order_tmdt', 'order_retail', 'order_wholesale', 'sales_order_manage',
        
        // Store permissions
        'store_read', 'store_create', 'store_update', 'store_delete',
        
        // Profit permissions
        'profit_read', 'profit_overview', 'profit_tmdt', 'profit_retail', 'profit_wholesale',
        
        // Warehouse permissions
        'warehouse_read', 'warehouse_manage', 'warehouse_export', 'warehouse_import',
        
        // Invoice permissions
        'invoice_read', 'invoice_create', 'invoice_global', 'invoice_store',
        
        // Shipping permissions
        'shipping_read', 'shipping_manage',
        
        // Report permissions
        'report_read', 'report_create',
        
        // Financial Transactions permissions
        'financial_read', 'financial_upload', 'financial_save', 'financial_manage',
        
        // Settings permissions
        'settings_read', 'settings_update', 'system_config',
        
        // Special admin permission
        'all'
    ],
    [USER_ROLES.MANAGER]: [
        // User permissions (read only)
        'user_read',
        
        // Product permissions
        'product_read', 'product_create', 'product_update',
        'product_category_manage', 'selling_product_manage',
        
        // Order permissions
        'order_read', 'order_create', 'order_update',
        'order_tmdt', 'order_retail', 'order_wholesale', 'sales_order_manage',
        
        // Store permissions
        'store_read', 'store_update',
        
        // Profit permissions
        'profit_read', 'profit_overview', 'profit_tmdt', 'profit_retail', 'profit_wholesale',
        
        // Warehouse permissions
        'warehouse_read', 'warehouse_manage',
        
        // Invoice permissions
        'invoice_read', 'invoice_create',
        
        // Shipping permissions
        'shipping_read',
        
        // Report permissions
        'report_read',
        
        // Financial Transactions permissions
        'financial_read', 'financial_upload', 'financial_save'
    ],
    [USER_ROLES.EMPLOYEE]: [
        // Product permissions (read only)
        'product_read', 'selling_product_manage',
        
        // Order permissions (limited)
        'order_read', 'order_create', 'order_tmdt', 'order_retail',
        
        // Store permissions (read only)
        'store_read',
        
        // Warehouse permissions (read only)
        'warehouse_read',
        
        // Invoice permissions (basic)
        'invoice_read', 'invoice_create',
        
        // Financial Transactions permissions (read only)
        'financial_read'
    ],
    [USER_ROLES.VIEWER]: [
        // Product permissions (read only)
        'product_read',
        
        // Order permissions (read only)
        'order_read',
        
        // Store permissions (read only)
        'store_read',
        
        // Profit permissions (read only)
        'profit_read', 'profit_overview',
        
        // Warehouse permissions (read only)
        'warehouse_read',
        
        // Invoice permissions (read only)
        'invoice_read',
        
        // Report permissions (read only)
        'report_read'
    ]
};

// Permission display mapping for UI
const PERMISSION_DISPLAY = {
    // User permissions
    'user_read': '👥 Xem danh sách người dùng',
    'user_create': '👥 Tạo tài khoản mới',
    'user_update': '👥 Chỉnh sửa tài khoản',
    'user_delete': '👥 Xóa tài khoản',
    
    // Product permissions
    'product_read': '📦 Xem sản phẩm',
    'product_create': '📦 Thêm sản phẩm mới',
    'product_update': '📦 Chỉnh sửa sản phẩm',
    'product_delete': '📦 Xóa sản phẩm',
    'product_category_manage': '🏷️ Quản lý danh mục sản phẩm',
    'selling_product_manage': '💰 Quản lý sản phẩm bán',
    
    // Order permissions
    'order_read': '📋 Xem đơn hàng',
    'order_create': '📋 Tạo đơn hàng',
    'order_update': '📋 Chỉnh sửa đơn hàng',
    'order_delete': '📋 Xóa đơn hàng',
    'order_tmdt': '🛒 Đơn hàng TMĐT',
    'order_retail': '🏪 Đơn hàng bán lẻ',
    'order_wholesale': '📦 Đơn hàng bán sỉ',
    'sales_order_manage': '📈 Quản lý đơn hàng bán',
    
    // Store permissions
    'store_read': '🏢 Xem cửa hàng',
    'store_create': '🏢 Tạo cửa hàng mới',
    'store_update': '🏢 Chỉnh sửa cửa hàng',
    'store_delete': '🏢 Xóa cửa hàng',
    
    // Profit permissions
    'profit_read': '💹 Xem lợi nhuận',
    'profit_overview': '💹 Tổng quan lợi nhuận',
    'profit_tmdt': '💰 Lợi nhuận TMĐT',
    'profit_retail': '🏪 Lợi nhuận bán lẻ',
    'profit_wholesale': '📦 Lợi nhuận bán sỉ',
    
    // Warehouse permissions
    'warehouse_read': '🏭 Xem kho hàng',
    'warehouse_manage': '🏭 Quản lý kho',
    'warehouse_export': '🏭 Xuất kho',
    'warehouse_import': '🏭 Nhập kho',
    
    // Invoice permissions
    'invoice_read': '🧾 Xem hóa đơn',
    'invoice_create': '🧾 Tạo hóa đơn',
    'invoice_global': '🧾 Hóa đơn toàn bộ',
    'invoice_store': '🏪 Hóa đơn từng cửa hàng',
    
    // Shipping permissions
    'shipping_read': '🚚 Xem chi phí vận chuyển',
    'shipping_manage': '🚚 Quản lý vận chuyển',
    
    // Report permissions
    'report_read': '📊 Xem báo cáo',
    'report_create': '📊 Tạo báo cáo',
    
    // Financial Transactions permissions
    'financial_read': '💳 Xem giao dịch tài chính',
    'financial_upload': '💳 Tải lên dữ liệu giao dịch',
    'financial_save': '💳 Lưu giao dịch tài chính',
    'financial_manage': '💳 Quản lý giao dịch đầy đủ',
    
    // Settings permissions
    'settings_read': '⚙️ Xem cài đặt',
    'settings_update': '⚙️ Chỉnh sửa cài đặt',
    'system_config': '⚙️ Cấu hình hệ thống',
    
    // Special permissions
    'all': '🔑 Toàn quyền hệ thống'
};

// Simple login function
async function simpleLogin(username, password, rememberMe = false) {
    console.log('🔐 Simple login attempt:', username);
    
    try {
        // First try Firebase authentication if available
        if (typeof database !== 'undefined') {
            console.log('🔍 Trying Firebase authentication...');
            
            try {
                // Search for user by username
                const usersRef = database.ref('users');
                const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
                const users = snapshot.val();
                
                if (users) {
                    const userId = Object.keys(users)[0];
                    const user = users[userId];
                    
                    console.log('👤 Found user in Firebase:', user.username);
                    
                    // Check if user is active
                    if (user.status !== 'active') {
                        throw new Error('Tài khoản đã bị vô hiệu hóa');
                    }
                    
                    // Verify password
                    if (user.password !== password) {
                        throw new Error('Mật khẩu không chính xác');
                    }
                    
                    // Create user session from Firebase data
                    const userSession = {
                        id: userId,
                        username: user.username,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role,
                        permissions: user.permissions || (user.role && ROLE_PERMISSIONS[user.role]) || ['all'],
                        storeAccess: user.storeAccess || ['all'],
                        loginTime: new Date().toISOString()
                    };
                    
                    // Update last login in Firebase
                    await usersRef.child(userId).update({
                        lastLogin: new Date().toISOString(),
                        lastActivity: new Date().toISOString()
                    });
                    
                    // Save session
                    currentUser = userSession;
                    
                    console.log('💾 Saving Firebase user session:', userSession);
                    console.log('💾 Remember me:', rememberMe);
                    
                    if (rememberMe) {
                        localStorage.setItem('simpleUser', JSON.stringify(userSession));
                        console.log('💾 Session saved to localStorage');
                    } else {
                        sessionStorage.setItem('simpleUser', JSON.stringify(userSession));
                        console.log('💾 Session saved to sessionStorage');
                    }
                    
                    console.log('✅ Firebase login successful');
                    
                    // Update UI immediately after login
                    setTimeout(() => {
                        authSystem.updateAuthUI();
                    }, 100);
                    
                    return userSession;
                }
            } catch (fbError) {
                console.log('⚠️ Firebase authentication failed:', fbError.message);
                // Continue to fallback admin check
            }
        }
        
        // Fallback: Check hardcoded admin
        if (username === 'admin' && password === 'admin123') {
            const userSession = {
                id: 'admin-simple',
                username: 'admin',
                fullName: 'Quản trị viên',
                email: 'admin@system.com',
                role: 'admin',
                permissions: ['all'],
                storeAccess: ['all'],
                loginTime: new Date().toISOString()
            };
            
            // Save session
            currentUser = userSession;
            
            console.log('💾 Saving fallback admin session:', userSession);
            
            if (rememberMe) {
                localStorage.setItem('simpleUser', JSON.stringify(userSession));
                console.log('💾 Session saved to localStorage');
            } else {
                sessionStorage.setItem('simpleUser', JSON.stringify(userSession));
                console.log('💾 Session saved to sessionStorage');
            }
            
            console.log('✅ Fallback admin login successful');
            
            // Update UI immediately after login
            setTimeout(() => {
                authSystem.updateAuthUI();
            }, 100);
            
            return userSession;
        } else {
            throw new Error('Tên đăng nhập không tồn tại hoặc mật khẩu không đúng');
        }
    } catch (error) {
        console.error('❌ Simple login failed:', error);
        throw error;
    }
}

// Simple logout function
function simpleLogout() {
    console.log('🚪 Simple logout');
    currentUser = null;
    localStorage.removeItem('simpleUser');
    sessionStorage.removeItem('simpleUser');
    
    // Redirect to login if not already there
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');
    
    if (!isLoginPage) {
        window.location.href = 'login.html';
    }
}

// Simple check authentication
function simpleIsAuthenticated() {
    if (currentUser) return true;
    
    // Check storage
    const saved = localStorage.getItem('simpleUser') || sessionStorage.getItem('simpleUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        return true;
    }
    
    return false;
}

// Simple init function
function simpleInitAuth() {
    console.log('🔄 Simple auth init');
    
    // Check if user is logged in
    const saved = localStorage.getItem('simpleUser') || sessionStorage.getItem('simpleUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        console.log('✅ Found saved session:', currentUser.username);
        
        // Update UI when session is restored
        setTimeout(() => {
            authSystem.updateAuthUI();
            // Force update menu visibility
            if (typeof window.updateMenuVisibility === 'function') {
                window.updateMenuVisibility();
            }
        }, 500);
        
        return;
    }
    
    // Check if we're on a protected page
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');
    const isProtectedPage = currentPath.includes('index.html') || currentPath.includes('view/');
    
    console.log('🔍 Current path:', currentPath);
    console.log('🔍 Is login page:', isLoginPage);
    console.log('🔍 Is protected page:', isProtectedPage);
    
    if (!isLoginPage && isProtectedPage) {
        console.log('🔒 No session on protected page, redirecting...');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// Compatibility functions for existing code
function getCurrentUser() {
    return currentUser;
}

function hasPermission(permission) {
    console.log('🔍 hasPermission check for:', permission);
    console.log('🔍 Current user:', currentUser);
    
    if (!currentUser) {
        console.log('❌ No current user');
        return false;
    }
    
    // Admin has all permissions
    if (currentUser.role === 'admin') {
        console.log('✅ Admin user - permission granted');
        return true;
    }
    
    // Check if user has 'all' permission
    if (currentUser.permissions && currentUser.permissions.includes('all')) {
        console.log('✅ User has "all" permissions');
        return true;
    }
    
    // Check specific permission
    if (currentUser.permissions && currentUser.permissions.includes(permission)) {
        console.log('✅ User has specific permission');
        return true;
    }
    
    console.log('❌ Permission denied for:', permission);
    return false;
}

function hasRole(role) {
    return currentUser && currentUser.role === role;
}

function canAccessStore(storeId) {
    return currentUser && (currentUser.storeAccess.includes('all') || currentUser.storeAccess.includes(storeId));
}

// Create a simple authSystem object for compatibility
const authSystem = {
    login: simpleLogin,
    logout: simpleLogout,
    isAuthenticated: simpleIsAuthenticated,
    getCurrentUser: getCurrentUser,
    hasPermission: hasPermission,
    hasRole: hasRole,
    canAccessStore: canAccessStore,
    updateAuthUI: () => {
        console.log('🔄 Updating auth UI with user:', currentUser);
        
        if (!currentUser) {
            console.log('⚠️ No current user to update UI');
            return;
        }
        
        // Update user name elements
        const userNameElements = document.querySelectorAll('.current-user-name');
        userNameElements.forEach(el => {
            el.textContent = currentUser.fullName;
            console.log('✅ Updated user name element:', el);
        });
        
        // Update user role elements
        const userRoleElements = document.querySelectorAll('.current-user-role');
        userRoleElements.forEach(el => {
            const roleDisplayName = {
                'admin': 'Quản trị viên',
                'manager': 'Quản lý',
                'employee': 'Nhân viên',
                'viewer': 'Người xem'
            };
            el.textContent = roleDisplayName[currentUser.role] || currentUser.role;
            console.log('✅ Updated user role element:', el);
        });
        
        console.log('✅ Auth UI update completed');
        
        // Update menu visibility based on permissions
        if (typeof window.updateMenuVisibility === 'function') {
            setTimeout(() => {
                window.updateMenuVisibility();
            }, 200);
        }
    }
};

// Export functions
window.simpleLogin = simpleLogin;
window.simpleLogout = simpleLogout;
window.simpleIsAuthenticated = simpleIsAuthenticated;
window.simpleInitAuth = simpleInitAuth;
window.simpleCurrentUser = () => currentUser;

// Global functions for page protection
function requireAuth() {
    if (!simpleIsAuthenticated()) {
        console.log('🔒 Not authenticated, redirecting to login');
        window.location.href = '../login.html';
        return false;
    }
    return true;
}

function requirePermission(permission) {
    console.log('🔍 Checking permission:', permission);
    console.log('🔍 Current user:', currentUser);
    
    if (!simpleIsAuthenticated()) {
        console.log('🔒 Not authenticated for permission check');
        window.location.href = '../login.html';
        return false;
    }
    
    if (!currentUser) {
        console.log('🔒 No current user for permission check');
        return false;
    }
    
    console.log('🔍 User role:', currentUser.role);
    console.log('🔍 User permissions:', currentUser.permissions);
    
    // Admin has all permissions
    if (currentUser.role === 'admin') {
        console.log('✅ Admin user - all permissions granted');
        return true;
    }
    
    // Check if user has 'all' permission
    if (currentUser.permissions && currentUser.permissions.includes('all')) {
        console.log('✅ User has "all" permissions');
        return true;
    }
    
    // Check specific permission
    if (currentUser.permissions && currentUser.permissions.includes(permission)) {
        console.log('✅ User has specific permission:', permission);
        return true;
    }
    
    console.log('❌ Permission denied:', permission);
    console.log('❌ User permissions:', currentUser.permissions);
    return false;
}

// Export compatibility objects
window.authSystem = authSystem;
window.getCurrentUser = getCurrentUser;
window.requireAuth = requireAuth;
window.requirePermission = requirePermission;
window.createAdditionalAdmins = createAdditionalAdmins;

// Export roles and permissions for compatibility
window.USER_ROLES = USER_ROLES;
window.PERMISSIONS = PERMISSIONS;
window.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
window.PERMISSION_DISPLAY = PERMISSION_DISPLAY;

// Create additional admin accounts
async function createAdditionalAdmins() {
    if (typeof database === 'undefined') {
        console.log('⚠️ Database not available, skipping additional admin creation');
        return;
    }
    
    try {
        const usersRef = database.ref('users');
        
        // Create hoangphuc9999 admin account
        const adminId = 'hoangphuc9999-admin';
        const adminRef = usersRef.child(adminId);
        
        // Check if already exists
        const snapshot = await adminRef.once('value');
        if (snapshot.exists()) {
            console.log('✅ hoangphuc9999 admin already exists');
            return;
        }
        
        // Create the admin account
        const adminData = {
            id: adminId,
            username: 'hoangphuc9999',
            password: 'hoangphuc9999',
            fullName: 'Hoàng Phúc Admin',
            email: 'hoangphuc9999@admin.com',
            role: 'admin',
            status: 'active',
            isSystemAdmin: true,
            createdAt: new Date().toISOString(),
            createdBy: 'system',
            lastLogin: null,
            lastActivity: null,
            storeAccess: ['all'],
            permissions: Object.values(ROLE_PERMISSIONS.admin) // All admin permissions
        };
        
        await adminRef.set(adminData);
        console.log('✅ Created hoangphuc9999 admin account successfully');
        console.log('🔑 Login: hoangphuc9999 / hoangphuc9999');
        
    } catch (error) {
        console.error('❌ Error creating additional admin:', error);
    }
}

// Auto init when DOM loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Simple auth DOM loaded');
    setTimeout(() => {
        simpleInitAuth();
        // Force UI update after page load
        if (simpleIsAuthenticated()) {
            authSystem.updateAuthUI();
        }
        // Create additional admin accounts
        createAdditionalAdmins();
    }, 500);
});

console.log('✅ Simple Auth System loaded');
