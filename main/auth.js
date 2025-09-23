// ===== AUTHENTICATION SYSTEM =====

// User roles and permissions
const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager', 
    EMPLOYEE: 'employee',
    VIEWER: 'viewer'
};

const PERMISSIONS = {
    // Dashboard
    DASHBOARD_READ: 'dashboard_read',
    
    // User management
    USER_CREATE: 'user_create',
    USER_READ: 'user_read',
    USER_UPDATE: 'user_update',
    USER_DELETE: 'user_delete',
    
    // Store management
    STORE_CREATE: 'store_create',
    STORE_READ: 'store_read',
    STORE_UPDATE: 'store_update',
    STORE_DELETE: 'store_delete',
    
    // Product management
    PRODUCT_CREATE: 'product_create',
    PRODUCT_READ: 'product_read',
    PRODUCT_UPDATE: 'product_update',
    PRODUCT_DELETE: 'product_delete',
    PRODUCT_CATEGORY_MANAGE: 'product_category_manage',
    SELLING_PRODUCT_MANAGE: 'selling_product_manage',
    
    // Order management - Tạo đơn hàng
    ORDER_CREATE: 'order_create',
    ORDER_READ: 'order_read',
    ORDER_UPDATE: 'order_update',
    ORDER_DELETE: 'order_delete',
    
    // TMĐT Orders
    TMDT_ORDER_CREATE: 'tmdt_order_create',
    TMDT_ORDER_READ: 'tmdt_order_read',
    TMDT_ORDER_UPDATE: 'tmdt_order_update',
    TMDT_ORDER_DELETE: 'tmdt_order_delete',
    
    // Retail Orders (Bán lẻ)
    RETAIL_ORDER_CREATE: 'retail_order_create',
    RETAIL_ORDER_READ: 'retail_order_read',
    RETAIL_ORDER_UPDATE: 'retail_order_update',
    RETAIL_ORDER_DELETE: 'retail_order_delete',
    
    // Wholesale Orders (Bán sỉ)
    WHOLESALE_ORDER_CREATE: 'wholesale_order_create',
    WHOLESALE_ORDER_READ: 'wholesale_order_read',
    WHOLESALE_ORDER_UPDATE: 'wholesale_order_update',
    WHOLESALE_ORDER_DELETE: 'wholesale_order_delete',
    
    // Sales Orders Management (Đơn hàng bán)
    SALES_ORDER_READ: 'sales_order_read',
    SALES_ORDER_UPDATE: 'sales_order_update',
    SALES_ORDER_DELETE: 'sales_order_delete',
    
    // Order Management (Quản lý đơn hàng)
    ORDER_MANAGEMENT_READ: 'order_management_read',
    ORDER_MANAGEMENT_UPDATE: 'order_management_update',
    
    // Sales Order Management (Quản lý đơn hàng bán)
    SALES_ORDER_MANAGEMENT_READ: 'sales_order_management_read',
    SALES_ORDER_MANAGEMENT_UPDATE: 'sales_order_management_update',
    
    // Profit Management (Quản lý lợi nhuận)
    PROFIT_READ: 'profit_read',
    PROFIT_UPDATE: 'profit_update',
    PROFIT_OVERVIEW: 'profit_overview',
    PROFIT_TMDT: 'profit_tmdt',
    PROFIT_RETAIL: 'profit_retail',
    PROFIT_WHOLESALE: 'profit_wholesale',
    
    // Warehouse management
    WAREHOUSE_READ: 'warehouse_read',
    WAREHOUSE_UPDATE: 'warehouse_update',
    WAREHOUSE_CREATE: 'warehouse_create',
    WAREHOUSE_DELETE: 'warehouse_delete',
    
    // Shipping Cost Management
    SHIPPING_COST_READ: 'shipping_cost_read',
    SHIPPING_COST_UPDATE: 'shipping_cost_update',
    
    // Invoice Management
    INVOICE_READ: 'invoice_read',
    INVOICE_CREATE: 'invoice_create',
    INVOICE_UPDATE: 'invoice_update',
    INVOICE_DELETE: 'invoice_delete',
    INVOICE_GLOBAL: 'invoice_global',
    INVOICE_STORE: 'invoice_store',
    
    // Reports and analytics
    REPORTS_READ: 'reports_read',
    REPORTS_CREATE: 'reports_create',
    REPORTS_EXPORT: 'reports_export',
    
    // System settings
    SETTINGS_READ: 'settings_read',
    SETTINGS_UPDATE: 'settings_update',
    SETTINGS_SYSTEM: 'settings_system'
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
    [USER_ROLES.ADMIN]: Object.values(PERMISSIONS), // All permissions
    [USER_ROLES.MANAGER]: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.STORE_READ,
        PERMISSIONS.STORE_UPDATE,
        PERMISSIONS.PRODUCT_CREATE,
        PERMISSIONS.PRODUCT_READ,
        PERMISSIONS.PRODUCT_UPDATE,
        PERMISSIONS.PRODUCT_DELETE,
        PERMISSIONS.ORDER_CREATE,
        PERMISSIONS.ORDER_READ,
        PERMISSIONS.ORDER_UPDATE,
        PERMISSIONS.ORDER_DELETE,
        PERMISSIONS.WAREHOUSE_READ,
        PERMISSIONS.WAREHOUSE_UPDATE,
        PERMISSIONS.REPORTS_READ,
        PERMISSIONS.PROFIT_READ,
        PERMISSIONS.SETTINGS_READ
    ],
    [USER_ROLES.EMPLOYEE]: [
        PERMISSIONS.STORE_READ,
        PERMISSIONS.PRODUCT_READ,
        PERMISSIONS.ORDER_CREATE,
        PERMISSIONS.ORDER_READ,
        PERMISSIONS.ORDER_UPDATE,
        PERMISSIONS.WAREHOUSE_READ,
        PERMISSIONS.WAREHOUSE_UPDATE,
        PERMISSIONS.REPORTS_READ
    ],
    [USER_ROLES.VIEWER]: [
        PERMISSIONS.STORE_READ,
        PERMISSIONS.PRODUCT_READ,
        PERMISSIONS.ORDER_READ,
        PERMISSIONS.WAREHOUSE_READ,
        PERMISSIONS.REPORTS_READ
    ]
};

// Current user session
let currentUser = null;
let isAuthInitialized = false;

// Authentication functions
class AuthSystem {
    constructor() {
        // Prevent multiple initialization
        if (isAuthInitialized) {
            console.log('⚠️ Auth system already initialized, skipping...');
            return;
        }
        
        // Add small delay to ensure DOM and other scripts are ready
        setTimeout(() => {
            this.initializeAuth();
        }, 100);
    }

    // Initialize authentication system
    async initializeAuth() {
        try {
            console.log('🔄 Initializing authentication system...');
            
            // Prevent re-initialization if already done
            if (isAuthInitialized) {
                console.log('⚠️ Auth already initialized, skipping...');
                return;
            }
            
            isAuthInitialized = true;
            
            // Check if user is already logged in
            const savedUserLocal = localStorage.getItem('currentUser');
            const savedUserSession = sessionStorage.getItem('currentUser');
            const savedUser = savedUserLocal || savedUserSession;
            
            console.log('🔍 Checking for saved sessions:');
            console.log('  - localStorage:', !!savedUserLocal);
            console.log('  - sessionStorage:', !!savedUserSession);
            console.log('  - Final savedUser:', !!savedUser);
            
            if (savedUser) {
                const userData = JSON.parse(savedUser);
                console.log('User data:', userData);
                
                // For fallback mode or if database not available
                if (typeof database === 'undefined' || userData.id === 'admin-default') {
                    currentUser = userData;
                    this.updateAuthUI();
                    console.log('✅ Auth initialized (fallback mode)');
                    return;
                }
                
                // Verify user still exists and is active
                console.log('🔍 Verifying user session for:', userData.id);
                const isValid = await this.verifyUserSession(userData.id);
                console.log('🔍 Session verification result:', isValid);
                
                if (isValid) {
                    currentUser = userData;
                    this.updateAuthUI();
                    console.log('✅ Auth initialized with valid session');
                } else {
                    console.log('❌ Invalid session, clearing data');
                    // Just clear session data, don't redirect on index page
                    currentUser = null;
                    localStorage.removeItem('currentUser');
                    sessionStorage.removeItem('currentUser');
                }
            } else {
                console.log('ℹ️ No saved user session found');
                
                // Check if we're on a protected page (not login page)
                const currentPath = window.location.pathname;
                const isLoginPage = currentPath === '/login.html' || currentPath.endsWith('/login.html');
                const isIndexPage = currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/index.html');
                
                console.log('🔍 Current path:', currentPath);
                console.log('🔍 Is login page:', isLoginPage);
                console.log('🔍 Is index page:', isIndexPage);
                
                // Only redirect if we're on index page or view pages, but NOT on login page
                if (!isLoginPage && (isIndexPage || currentPath.includes('view/'))) {
                    console.log('🔒 No session found on protected page, redirecting to login');
                    const loginUrl = window.location.origin.includes('localhost') || window.location.protocol === 'file:' 
                        ? 'login.html' 
                        : '/login.html';
                    
                    // Add a small delay to prevent immediate redirect during page load
                    setTimeout(() => {
                        window.location.href = loginUrl;
                    }, 500);
                    return;
                }
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
            // Just clear session data, don't redirect on index page
            currentUser = null;
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
        }
    }

    // Login function
    async login(username, password, rememberMe = false) {
        try {
            console.log('🔐 Attempting login for:', username);
            console.log('Database available:', typeof database !== 'undefined');
            
            // Check if database is available
            if (typeof database === 'undefined') {
                // Create default admin for testing
                if (username === 'admin' && password === 'admin123') {
                    const userSession = {
                        id: 'admin-default',
                        username: 'admin',
                        fullName: 'Quản trị viên hệ thống',
                        email: 'admin@system.com',
                        role: USER_ROLES.ADMIN,
                        permissions: ROLE_PERMISSIONS[USER_ROLES.ADMIN] || [],
                        storeAccess: ['all'],
                        loginTime: new Date().toISOString(),
                        lastActivity: new Date().toISOString()
                    };
                    
                    currentUser = userSession;
                    
                    if (rememberMe) {
                        localStorage.setItem('currentUser', JSON.stringify(userSession));
                    } else {
                        sessionStorage.setItem('currentUser', JSON.stringify(userSession));
                    }
                    
                    console.log('✅ Login successful (fallback mode):', userSession.fullName);
                    return userSession;
                } else {
                    throw new Error('Database không khả dụng và thông tin đăng nhập không hợp lệ');
                }
            }
            
            // Get user from database
            const usersRef = database.ref('users');
            
            // First try to find admin with fixed ID
            if (username === 'admin') {
                const adminRef = usersRef.child('admin-root-account');
                const adminSnapshot = await adminRef.once('value');
                
                if (adminSnapshot.exists()) {
                    const adminUser = adminSnapshot.val();
                    const userId = 'admin-root-account';
                    const user = adminUser;
                    
                    console.log('🔍 Found admin with fixed ID:', userId);
                    
                    // Check if user is active
                    if (user.status !== 'active') {
                        throw new Error('Tài khoản đã bị vô hiệu hóa');
                    }
                    
                    // Verify password (in production, use proper hashing)
                    if (user.password !== password) {
                        throw new Error('Mật khẩu không chính xác');
                    }
                    
                    // Create user session for admin
                    const userSession = {
                        id: userId,
                        username: user.username,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role,
                        permissions: ROLE_PERMISSIONS[user.role] || [],
                        storeAccess: user.storeAccess || [],
                        loginTime: new Date().toISOString(),
                        lastActivity: new Date().toISOString()
                    };
                    
                    // Save session
                    currentUser = userSession;
                    
                    console.log('💾 Saving user session:', userSession);
                    console.log('💾 Remember me:', rememberMe);
                    
                    if (rememberMe) {
                        localStorage.setItem('currentUser', JSON.stringify(userSession));
                        console.log('💾 Session saved to localStorage');
                    } else {
                        sessionStorage.setItem('currentUser', JSON.stringify(userSession));
                        console.log('💾 Session saved to sessionStorage');
                    }
                    
                    // Verify session was saved
                    const savedSession = rememberMe ? 
                        localStorage.getItem('currentUser') : 
                        sessionStorage.getItem('currentUser');
                    console.log('✅ Session verification after save:', !!savedSession);
                    
                    // Update last login time
                    await adminRef.update({
                        lastLogin: new Date().toISOString(),
                        lastActivity: new Date().toISOString()
                    });
                    
                    console.log('✅ Admin login successful:', user.fullName);
                    return userSession;
                }
            }
            
            // If not admin or admin not found, search by username
            const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
            const users = snapshot.val();
            
            if (!users) {
                throw new Error('Tên đăng nhập không tồn tại');
            }
            
            const userId = Object.keys(users)[0];
            const user = users[userId];
            
            // Check if user is active
            if (user.status !== 'active') {
                throw new Error('Tài khoản đã bị vô hiệu hóa');
            }
            
            // Verify password (in production, use proper hashing)
            if (user.password !== password) {
                throw new Error('Mật khẩu không chính xác');
            }
            
            // Create user session
            const userSession = {
                id: userId,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                permissions: ROLE_PERMISSIONS[user.role] || [],
                storeAccess: user.storeAccess || [],
                loginTime: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            };
            
            // Save session
            currentUser = userSession;
            
            console.log('💾 Saving user session:', userSession);
            console.log('💾 Remember me:', rememberMe);
            
            if (rememberMe) {
                localStorage.setItem('currentUser', JSON.stringify(userSession));
                console.log('💾 Session saved to localStorage');
            } else {
                sessionStorage.setItem('currentUser', JSON.stringify(userSession));
                console.log('💾 Session saved to sessionStorage');
            }
            
            // Verify session was saved
            const savedSession = rememberMe ? 
                localStorage.getItem('currentUser') : 
                sessionStorage.getItem('currentUser');
            console.log('✅ Session verification after save:', !!savedSession);
            
            // Update last login time
            await database.ref(`users/${userId}`).update({
                lastLogin: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            });
            
            console.log('✅ Login successful for:', user.fullName);
            return userSession;
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    // Logout function
    logout() {
        console.log('🚪 Logging out user');
        
        // Clear session
        currentUser = null;
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        
        // Redirect to login page only if not already on login page
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath === '/login.html' || currentPath.endsWith('/login.html');
        const isIndexPage = currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/index.html');
        
        console.log('Current path:', currentPath);
        console.log('Is login page:', isLoginPage);
        console.log('Is index page:', isIndexPage);
        
        if (!isLoginPage) {
            // Handle different environments
            const loginUrl = window.location.origin.includes('localhost') || window.location.protocol === 'file:' 
                ? 'login.html' 
                : '/login.html';
            
            console.log('Redirecting to:', loginUrl);
            window.location.href = loginUrl;
        }
    }

    // Verify user session
    async verifyUserSession(userId) {
        try {
            // Skip verification if database not available
            if (typeof database === 'undefined') {
                console.log('Database not available, skipping session verification');
                return true;
            }
            
            // Special handling for admin with fixed ID
            if (userId === 'admin-root-account') {
                const adminRef = database.ref('users/admin-root-account');
                const snapshot = await adminRef.once('value');
                const user = snapshot.val();
                
                console.log('Session verification for admin:', userId);
                console.log('Admin data from Firebase:', user);
                
                const isValid = user && user.status === 'active';
                console.log('Admin session is valid:', isValid);
                
                return isValid;
            }
            
            const userRef = database.ref(`users/${userId}`);
            const snapshot = await userRef.once('value');
            const user = snapshot.val();
            
            console.log('Session verification for user:', userId);
            console.log('User data from Firebase:', user);
            
            const isValid = user && user.status === 'active';
            console.log('Session is valid:', isValid);
            
            return isValid;
        } catch (error) {
            console.error('Error verifying user session:', error);
            return false;
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return currentUser !== null;
    }

    // Check if user has specific role
    hasRole(role) {
        if (!currentUser) return false;
        return currentUser.role === role;
    }

    // Check if user has specific permission
    hasPermission(permission) {
        if (!this.isAuthenticated()) return false;
        
        const user = this.getCurrentUser();
        if (!user || !user.permissions) return false;
        
        return user.permissions.includes(permission);
    }

    // Require specific permission (redirect if not authorized)
    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            console.warn(`Access denied. Required permission: ${permission}`);
            if (typeof showNotification === 'function') {
                showNotification('Bạn không có quyền truy cập chức năng này', 'error');
            }
            
            // Redirect to dashboard
            setTimeout(() => {
                const dashboardUrl = window.location.origin.includes('localhost') || window.location.protocol === 'file:' 
                    ? '/index.html' 
                    : '/index.html';
                window.location.href = dashboardUrl;
            }, 2000);
            
            return false;
        }
        return true;
    }

    // Check if user can access store
    canAccessStore(storeId) {
        if (!currentUser) return false;
        
        // Admin can access all stores
        if (currentUser.role === USER_ROLES.ADMIN) return true;
        
        // Check store access list
        return currentUser.storeAccess.includes(storeId) || currentUser.storeAccess.includes('all');
    }

    // Update user activity
    async updateActivity() {
        if (!currentUser) return;
        
        try {
            const now = new Date().toISOString();
            currentUser.lastActivity = now;
            
            // Update in storage
            const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
            storage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update in database
            await database.ref(`users/${currentUser.id}`).update({
                lastActivity: now
            });
        } catch (error) {
            console.error('Error updating user activity:', error);
        }
    }

    // Update auth UI elements
    updateAuthUI() {
        if (!currentUser) return;
        
        // Update user info in header
        const userNameElements = document.querySelectorAll('.current-user-name');
        userNameElements.forEach(el => {
            el.textContent = currentUser.fullName;
        });
        
        const userRoleElements = document.querySelectorAll('.current-user-role');
        userRoleElements.forEach(el => {
            el.textContent = this.getRoleDisplayName(currentUser.role);
        });
        
        // Show/hide elements based on permissions
        this.updatePermissionBasedUI();
    }

    // Update UI based on permissions
    updatePermissionBasedUI() {
        // Hide/show navigation items based on permissions
        const navItems = document.querySelectorAll('[data-permission]');
        navItems.forEach(item => {
            const requiredPermission = item.getAttribute('data-permission');
            if (this.hasPermission(requiredPermission)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide/show buttons based on permissions
        const actionButtons = document.querySelectorAll('[data-action-permission]');
        actionButtons.forEach(button => {
            const requiredPermission = button.getAttribute('data-action-permission');
            if (this.hasPermission(requiredPermission)) {
                button.style.display = '';
                button.disabled = false;
            } else {
                button.style.display = 'none';
                button.disabled = true;
            }
        });
    }

    // Get role display name
    getRoleDisplayName(role) {
        const roleNames = {
            [USER_ROLES.ADMIN]: 'Quản trị viên',
            [USER_ROLES.MANAGER]: 'Quản lý',
            [USER_ROLES.EMPLOYEE]: 'Nhân viên',
            [USER_ROLES.VIEWER]: 'Người xem'
        };
        return roleNames[role] || role;
    }

    // Create default admin account
    async createDefaultAdmin() {
        try {
            // Check if database is available
            if (typeof database === 'undefined') {
                console.log('⚠️ Database not available, skipping admin creation');
                return;
            }
            
            const usersRef = database.ref('users');
            const adminId = 'admin-root-account';
            const adminRef = usersRef.child(adminId);
            
            // Check if admin already exists
            const snapshot = await adminRef.once('value');
            
            if (snapshot.exists()) {
                console.log('✅ Default admin account already exists');
                return;
            }
            
            // Create hardcoded admin account with fixed ID
            const adminData = {
                id: adminId,
                username: 'admin',
                password: 'admin123', // In production, use proper hashing
                fullName: 'Quản Trị Viên Hệ Thống',
                email: 'admin@system.com',
                role: USER_ROLES.ADMIN,
                status: 'active',
                isSystemAdmin: true, // Mark as system admin (undeletable)
                createdAt: new Date().toISOString(),
                createdBy: 'system',
                lastLogin: null,
                lastActivity: null,
                storeAccess: ['all'], // Access to all stores
                permissions: Object.values(PERMISSIONS) // All permissions
            };
            
            // Set with custom ID instead of push()
            await adminRef.set(adminData);
            
            console.log('✅ Hardcoded admin account created successfully');
            console.log('🔑 Login with: admin / admin123');
            console.log('📍 Admin ID:', adminId);
            
        } catch (error) {
            console.error('❌ Error creating default admin:', error);
        }
    }
}

// Initialize auth system
const authSystem = new AuthSystem();

// Activity tracker
let activityTimer;
function startActivityTracking() {
    // Update activity every 5 minutes
    activityTimer = setInterval(() => {
        if (authSystem.isAuthenticated()) {
            authSystem.updateActivity();
        }
    }, 5 * 60 * 1000);
    
    // Update activity on user interaction
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, () => {
            if (authSystem.isAuthenticated()) {
                clearTimeout(activityTimer);
                activityTimer = setTimeout(() => {
                    authSystem.updateActivity();
                }, 30000); // Update after 30 seconds of inactivity
            }
        });
    });
}

// Auto logout after inactivity (30 minutes)
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (authSystem.isAuthenticated()) {
            alert('Phiên đăng nhập đã hết hạn do không hoạt động');
            authSystem.logout();
        }
    }, 30 * 60 * 1000); // 30 minutes
}

// Global function for page protection
function requireAuth() {
    if (!authSystem.isAuthenticated()) {
        // Handle different environments
        const loginUrl = window.location.origin.includes('localhost') || window.location.protocol === 'file:' 
            ? 'login.html' 
            : '/login.html';
        
        console.log('Not authenticated, redirecting to:', loginUrl);
        window.location.href = loginUrl;
        return false;
    }
    return true;
}

// Global function for permission checking
function requirePermission(permission) {
    if (typeof authSystem !== 'undefined') {
        return authSystem.requirePermission(permission);
    }
    return false;
}

// Global functions
window.authSystem = authSystem;
window.USER_ROLES = USER_ROLES;
window.PERMISSIONS = PERMISSIONS;
window.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
window.requireAuth = requireAuth;
window.requirePermission = requirePermission;

// Initialize when DOM is loaded (prevent multiple initialization)
if (!window.authInitialized) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 DOM loaded, initializing auth system...');
        window.authInitialized = true;
        
        // Start activity tracking if authenticated
        if (authSystem.isAuthenticated()) {
            startActivityTracking();
            resetInactivityTimer();
            authSystem.updateAuthUI();
        }
        
        // Create default admin if needed
        if (typeof database !== 'undefined') {
            authSystem.createDefaultAdmin();
        }
    });
}

console.log('🔐 Authentication system loaded');
