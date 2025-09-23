// ===== USER MANAGEMENT SYSTEM =====

// Global variables
let allUsers = {};
let filteredUsers = {};
let currentPage = 1;
let usersPerPage = 10;
let editingUserId = null;
let allStores = {};

// Initialize user management
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeUserManagement();
    }, 1000);
});

async function initializeUserManagement() {
    try {
        console.log('🔧 Initializing user management...');
        
        // Check authentication and permissions
        if (typeof authSystem === 'undefined' || !authSystem.isAuthenticated()) {
            console.error('User not authenticated');
            return;
        }
        
        if (!authSystem.hasPermission('user_read')) {
            console.error('User does not have permission to read users');
            showNotification('Bạn không có quyền truy cập trang này', 'error');
            return;
        }
        
        // Load data
        await loadUsers();
        await loadStores();
        updateStatistics();
        renderUsersTable();
        
        console.log('✅ User management initialized successfully');
        
    } catch (error) {
        console.error('Error initializing user management:', error);
        showNotification('Lỗi khởi tạo trang quản lý user', 'error');
    }
}

// ===== DATA LOADING =====

async function loadUsers() {
    try {
        console.log('📥 Loading users...');
        
        if (typeof database === 'undefined') {
            console.warn('Database not available');
            return;
        }
        
        const usersRef = database.ref('users');
        const snapshot = await usersRef.once('value');
        allUsers = snapshot.val() || {};
        filteredUsers = { ...allUsers };
        
        console.log(`✅ Loaded ${Object.keys(allUsers).length} users`);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Lỗi tải danh sách người dùng', 'error');
    }
}

async function loadStores() {
    try {
        console.log('🏪 Loading stores...');
        
        if (typeof getAllStores === 'function') {
            allStores = await getAllStores();
        } else if (typeof database !== 'undefined') {
            const storesRef = database.ref('stores');
            const snapshot = await storesRef.once('value');
            allStores = snapshot.val() || {};
        }
        
        console.log(`✅ Loaded ${Object.keys(allStores).length} stores`);
        
    } catch (error) {
        console.error('Error loading stores:', error);
        allStores = {};
    }
}

// ===== STATISTICS =====

function updateStatistics() {
    const users = Object.values(allUsers);
    
    // Total users
    document.getElementById('totalUsers').textContent = users.length;
    
    // Active users
    const activeUsers = users.filter(user => user.status === 'active').length;
    document.getElementById('activeUsers').textContent = activeUsers;
    
    // Admin users
    const adminUsers = users.filter(user => user.role === 'admin').length;
    document.getElementById('adminUsers').textContent = adminUsers;
    
    // Online users (simplified - just show current user)
    document.getElementById('onlineUsers').textContent = '1';
}

// ===== TABLE RENDERING =====

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    const users = Object.entries(filteredUsers);
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Không có người dùng nào</h3>
                    <p>Chưa có người dùng nào trong hệ thống hoặc không khớp với bộ lọc</p>
                </td>
            </tr>
        `;
        updatePagination(0);
        return;
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    let tableHTML = '';
    
    paginatedUsers.forEach(([userId, user]) => {
        const avatar = generateAvatar(user.fullName);
        const roleClass = user.role || 'viewer';
        const statusClass = user.status || 'active';
        const lastActivity = formatLastActivity(user.lastActivity);
        const storeAccess = formatStoreAccess(user.storeAccess);
        
        tableHTML += `
            <tr data-user-id="${userId}">
                <td>
                    <input type="checkbox" class="user-checkbox" value="${userId}">
                </td>
                <td>
                    <div class="user-avatar">${avatar}</div>
                </td>
                <td>
                    <div class="user-info-cell">
                        <div class="user-name">${user.fullName || 'N/A'}</div>
                        <div class="user-email">${user.email || 'N/A'}</div>
                        <div class="user-username">@${user.username || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${roleClass}">
                        <i class="fas ${getRoleIcon(user.role)}"></i>
                        ${getRoleDisplayName(user.role)}
                    </span>
                </td>
                <td>
                    <span class="store-access ${user.storeAccess && user.storeAccess.includes('all') ? 'all' : ''}">${storeAccess}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas fa-circle"></i>
                        ${statusClass === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}
                    </span>
                </td>
                <td>
                    <div class="last-activity ${isRecentActivity(user.lastActivity) ? 'recent' : ''}">${lastActivity}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewUser('${userId}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editUser('${userId}')" title="Chỉnh sửa" data-permission="user_update">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteUser('${userId}')" title="Xóa" data-permission="user_delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = tableHTML;
    updatePagination(users.length);
    updatePermissionBasedUI();
}

// ===== HELPER FUNCTIONS =====

function generateAvatar(fullName) {
    if (!fullName) return '?';
    const names = fullName.split(' ');
    if (names.length >= 2) {
        return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
    }
    return fullName[0].toUpperCase();
}

function getRoleIcon(role) {
    const icons = {
        admin: 'fa-crown',
        manager: 'fa-user-tie',
        employee: 'fa-user',
        viewer: 'fa-eye'
    };
    return icons[role] || 'fa-user';
}

function getRoleDisplayName(role) {
    const names = {
        admin: 'Quản trị viên',
        manager: 'Quản lý',
        employee: 'Nhân viên',
        viewer: 'Người xem'
    };
    return names[role] || 'Không xác định';
}

function formatStoreAccess(storeAccess) {
    if (!storeAccess || storeAccess.length === 0) return 'Không có';
    if (storeAccess.includes('all')) return 'Tất cả cửa hàng';
    
    const storeNames = storeAccess.map(storeId => {
        const store = allStores[storeId];
        return store ? store.name : storeId;
    });
    
    return storeNames.join(', ');
}

function formatLastActivity(lastActivity) {
    if (!lastActivity) return 'Chưa có';
    
    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
}

function isRecentActivity(lastActivity) {
    if (!lastActivity) return false;
    const date = new Date(lastActivity);
    const now = new Date();
    const diffHours = (now - date) / 3600000;
    return diffHours < 24;
}

// ===== FILTERING =====

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredUsers = {};
    
    Object.entries(allUsers).forEach(([userId, user]) => {
        let matches = true;
        
        // Search filter
        if (searchTerm) {
            const searchableText = `${user.fullName} ${user.email} ${user.username}`.toLowerCase();
            matches = matches && searchableText.includes(searchTerm);
        }
        
        // Role filter
        if (roleFilter) {
            matches = matches && user.role === roleFilter;
        }
        
        // Status filter
        if (statusFilter) {
            matches = matches && user.status === statusFilter;
        }
        
        if (matches) {
            filteredUsers[userId] = user;
        }
    });
    
    currentPage = 1;
    renderUsersTable();
}

function clearFilters() {
    document.getElementById('userSearch').value = '';
    document.getElementById('roleFilter').value = '';
    document.getElementById('statusFilter').value = '';
    
    filteredUsers = { ...allUsers };
    currentPage = 1;
    renderUsersTable();
}

// ===== PAGINATION =====

function updatePagination(totalUsers) {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage + 1;
    const endIndex = Math.min(currentPage * usersPerPage, totalUsers);
    
    // Update info
    document.getElementById('showingFrom').textContent = totalUsers > 0 ? startIndex : 0;
    document.getElementById('showingTo').textContent = endIndex;
    document.getElementById('totalCount').textContent = totalUsers;
    
    // Update pagination buttons
    const paginationContainer = document.getElementById('pagination');
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <button onclick="changePage(${i})" ${i === currentPage ? 'class="active"' : ''}>
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<span>...</span>';
        }
    }
    
    // Next button
    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(Object.keys(filteredUsers).length / usersPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderUsersTable();
}

// ===== MODAL FUNCTIONS =====

function showCreateUserModal() {
    if (!authSystem.hasPermission('user_create')) {
        showNotification('Bạn không có quyền tạo tài khoản mới', 'error');
        return;
    }
    
    editingUserId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Thêm Tài Khoản Mới';
    
    // Reset form
    document.getElementById('userForm').reset();
    document.getElementById('password').required = true;
    document.getElementById('confirmPassword').required = true;
    
    // Load stores for selection
    loadStoresForSelection();
    
    // Show modal
    document.getElementById('userModal').classList.remove('hidden');
}

function hideUserModal() {
    document.getElementById('userModal').classList.add('hidden');
    editingUserId = null;
}

// ===== UTILITY FUNCTIONS =====

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

function updatePermissionBasedUI() {
    if (typeof authSystem === 'undefined') return;
    
    // Hide/show elements based on permissions
    const permissionElements = document.querySelectorAll('[data-permission]');
    permissionElements.forEach(element => {
        const requiredPermission = element.getAttribute('data-permission');
        if (authSystem.hasPermission(requiredPermission)) {
            element.style.display = '';
            element.disabled = false;
        } else {
            element.style.display = 'none';
            element.disabled = true;
        }
    });
}

// Global functions
window.showCreateUserModal = showCreateUserModal;
window.hideUserModal = hideUserModal;
window.filterUsers = filterUsers;
window.clearFilters = clearFilters;
window.changePage = changePage;

console.log('🔧 User management system loaded');
