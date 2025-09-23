// Script tạo tài khoản admin chính
// Chạy script này một lần để tạo tài khoản admin đầu tiên

// Simple password hashing function (trong production nên dùng bcrypt)
function simpleHash(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}

// Tạo tài khoản admin chính
async function createMainAdminAccount() {
    if (!window.database) {
        console.error('Firebase database not initialized');
        return;
    }

    const adminData = {
        username: 'phuc999979',
        email: 'admin@salesmanagement.com',
        passwordHash: simpleHash('phuc999979'), // Hash mật khẩu
        fullName: 'Super Administrator',
        role: 'super_admin',
        permissions: ['*'], // Toàn quyền
        storeAccess: ['*'], // Truy cập tất cả cửa hàng
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        lastLogin: null,
        loginCount: 0
    };

    try {
        // Tạo user với ID cố định để dễ quản lý
        const userId = 'admin_phuc999979';
        
        // Kiểm tra xem tài khoản đã tồn tại chưa
        const existingUser = await window.database.ref(`users/${userId}`).once('value');
        
        if (existingUser.exists()) {
            console.log('✅ Tài khoản admin đã tồn tại:', adminData.username);
            return userId;
        }

        // Tạo tài khoản mới
        await window.database.ref(`users/${userId}`).set(adminData);
        
        
        return userId;
        
    } catch (error) {
        console.error('❌ Lỗi tạo tài khoản admin:', error);
        throw error;
    }
}

// Tạo cấu trúc roles và permissions
async function createRolesAndPermissions() {
    if (!window.database) {
        console.error('Firebase database not initialized');
        return;
    }

    const roles = {
        super_admin: {
            name: 'Super Administrator',
            description: 'Toàn quyền hệ thống',
            permissions: ['*'],
            level: 100
        },
        admin: {
            name: 'Administrator', 
            description: 'Quản trị viên',
            permissions: [
                'users.manage',
                'stores.manage', 
                'orders.manage',
                'products.manage',
                'reports.view',
                'settings.manage'
            ],
            level: 90
        },
        manager: {
            name: 'Manager',
            description: 'Quản lý cửa hàng',
            permissions: [
                'orders.view',
                'orders.create',
                'orders.edit',
                'products.view',
                'products.edit',
                'reports.view'
            ],
            level: 50
        },
        staff: {
            name: 'Staff',
            description: 'Nhân viên',
            permissions: [
                'orders.view',
                'orders.create',
                'products.view'
            ],
            level: 10
        }
    };

    const permissions = {
        'users.manage': 'Quản lý tài khoản người dùng',
        'stores.manage': 'Quản lý cửa hàng',
        'orders.view': 'Xem đơn hàng',
        'orders.create': 'Tạo đơn hàng',
        'orders.edit': 'Sửa đơn hàng',
        'orders.delete': 'Xóa đơn hàng',
        'orders.manage': 'Quản lý đơn hàng (full)',
        'products.view': 'Xem sản phẩm',
        'products.edit': 'Sửa sản phẩm',
        'products.delete': 'Xóa sản phẩm',
        'products.manage': 'Quản lý sản phẩm (full)',
        'reports.view': 'Xem báo cáo',
        'settings.manage': 'Quản lý cài đặt hệ thống'
    };

    try {
        await window.database.ref('roles').set(roles);
        await window.database.ref('permissions').set(permissions);
        
        console.log('✅ Tạo roles và permissions thành công!');
        
    } catch (error) {
        console.error('❌ Lỗi tạo roles và permissions:', error);
        throw error;
    }
}

// Hàm chính để khởi tạo hệ thống
async function initializeAuthSystem() {
    console.log('🚀 Bắt đầu khởi tạo hệ thống authentication...');
    
    try {
        // Đợi Firebase sẵn sàng
        if (!window.database) {
            console.log('⏳ Đang chờ Firebase khởi tạo...');
            await new Promise(resolve => {
                const checkFirebase = () => {
                    if (window.database) {
                        resolve();
                    } else {
                        setTimeout(checkFirebase, 100);
                    }
                };
                checkFirebase();
            });
        }

        // Tạo roles và permissions trước
        await createRolesAndPermissions();
        
        // Tạo tài khoản admin
        const adminId = await createMainAdminAccount();
        
      
        
        return adminId;
        
    } catch (error) {
        console.error('❌ Lỗi khởi tạo hệ thống:', error);
    }
}

// Export functions để có thể gọi từ console
window.createMainAdminAccount = createMainAdminAccount;
window.createRolesAndPermissions = createRolesAndPermissions;
window.initializeAuthSystem = initializeAuthSystem;

console.log('🔧 Admin Account Creator loaded');
console.log('Available functions: createMainAdminAccount(), initializeAuthSystem()');
