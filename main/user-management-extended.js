// ===== USER MANAGEMENT EXTENDED FUNCTIONS =====

// ===== MODAL FUNCTIONS (CONTINUED) =====

function editUser(userId) {
    if (!authSystem.hasPermission('user_update')) {
        showNotification('Bạn không có quyền chỉnh sửa tài khoản', 'error');
        return;
    }
    
    const user = allUsers[userId];
    if (!user) {
        showNotification('Không tìm thấy thông tin người dùng', 'error');
        return;
    }
    
    editingUserId = userId;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Chỉnh Sửa Tài Khoản';
    
    // Fill form with user data
    document.getElementById('username').value = user.username || '';
    document.getElementById('fullName').value = user.fullName || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('role').value = user.role || '';
    document.getElementById('status').value = user.status || 'active';
    
    // Password not required for editing
    document.getElementById('password').required = false;
    document.getElementById('confirmPassword').required = false;
    document.getElementById('password').placeholder = 'Để trống nếu không đổi mật khẩu';
    document.getElementById('confirmPassword').placeholder = 'Để trống nếu không đổi mật khẩu';
    
    // Set store access
    if (user.storeAccess && user.storeAccess.includes('all')) {
        document.getElementById('allStores').checked = true;
        document.getElementById('storesList').classList.add('hidden');
    } else {
        document.getElementById('specificStores').checked = true;
        document.getElementById('storesList').classList.remove('hidden');
        loadStoresForSelection(user.storeAccess);
    }
    
    // Update permissions display
    updatePermissions();
    
    // Load user's existing permissions after a short delay
    setTimeout(() => {
        loadUserPermissions(user);
    }, 100);
    
    // Show modal
    document.getElementById('userModal').classList.remove('hidden');
}

function viewUser(userId) {
    const user = allUsers[userId];
    if (!user) {
        showNotification('Không tìm thấy thông tin người dùng', 'error');
        return;
    }
    
    const userDetailContent = document.getElementById('userDetailContent');
    userDetailContent.innerHTML = generateUserDetailHTML(user, userId);
    
    document.getElementById('userDetailModal').classList.remove('hidden');
}

function hideUserDetailModal() {
    document.getElementById('userDetailModal').classList.add('hidden');
}

// ===== USER DETAIL HTML =====

function generateUserDetailHTML(user, userId) {
    const permissions = window.ROLE_PERMISSIONS && window.ROLE_PERMISSIONS[user.role] ? window.ROLE_PERMISSIONS[user.role] : [];
    const storeAccess = formatStoreAccess(user.storeAccess);
    
    return `
        <div class="user-detail-grid">
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Thông Tin Cá Nhân</h4>
                <div class="detail-item">
                    <span class="detail-label">Họ và tên:</span>
                    <span class="detail-value">${user.fullName || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tên đăng nhập:</span>
                    <span class="detail-value">${user.username || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${user.email || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Số điện thoại:</span>
                    <span class="detail-value">${user.phone || 'N/A'}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-shield-alt"></i> Vai Trò & Quyền Hạn</h4>
                <div class="detail-item">
                    <span class="detail-label">Vai trò:</span>
                    <span class="detail-value">${getRoleDisplayName(user.role)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Trạng thái:</span>
                    <span class="detail-value">${user.status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Cửa hàng:</span>
                    <span class="detail-value">${storeAccess}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Số quyền:</span>
                    <span class="detail-value">${permissions.length} quyền</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-clock"></i> Thông Tin Hệ Thống</h4>
                <div class="detail-item">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value">${userId}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tạo lúc:</span>
                    <span class="detail-value">${user.createdAt ? new Date(user.createdAt).toLocaleString('vi-VN') : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Đăng nhập cuối:</span>
                    <span class="detail-value">${user.lastLogin ? new Date(user.lastLogin).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Hoạt động cuối:</span>
                    <span class="detail-value">${formatLastActivity(user.lastActivity)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-key"></i> Quyền Hạn Chi Tiết</h4>
                <div class="permissions-grid">
                    ${permissions.map(permission => `
                        <div class="permission-item">
                            <i class="fas fa-check"></i>
                            ${permission}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// ===== STORE SELECTION =====

function loadStoresForSelection(selectedStores = []) {
    const storesList = document.getElementById('storesList');
    let storesHTML = '';
    
    Object.entries(allStores).forEach(([storeId, store]) => {
        const isChecked = selectedStores.includes(storeId) ? 'checked' : '';
        storesHTML += `
            <div class="store-item">
                <input type="checkbox" id="store_${storeId}" value="${storeId}" ${isChecked}>
                <label for="store_${storeId}">${store.name}</label>
            </div>
        `;
    });
    
    if (storesHTML === '') {
        storesHTML = '<p>Không có cửa hàng nào</p>';
    }
    
    storesList.innerHTML = storesHTML;
    
    // Handle store access radio buttons
    document.querySelectorAll('input[name="storeAccess"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'all') {
                storesList.classList.add('hidden');
            } else {
                storesList.classList.remove('hidden');
            }
        });
    });
}

// ===== PERMISSIONS =====

function updatePermissions() {
    const role = document.getElementById('role').value;
    const customRoleGroup = document.getElementById('customRoleGroup');
    const permissionsCheckboxes = document.getElementById('permissionsCheckboxes');
    
    // Show/hide custom role input
    if (role === 'custom') {
        customRoleGroup.style.display = 'block';
        document.getElementById('customRoleName').required = true;
    } else {
        customRoleGroup.style.display = 'none';
        document.getElementById('customRoleName').required = false;
    }
    
    // Generate all available permissions as checkboxes
    generatePermissionCheckboxes();
    
    // If predefined role selected, auto-check permissions
    if (role && role !== 'custom' && window.ROLE_PERMISSIONS) {
        const rolePermissions = window.ROLE_PERMISSIONS[role] || [];
        autoSelectPermissions(rolePermissions);
    }
}

function generatePermissionCheckboxes() {
    const permissionsCheckboxes = document.getElementById('permissionsCheckboxes');
    
    if (!window.ROLE_PERMISSIONS) {
        permissionsCheckboxes.innerHTML = '<p>Đang tải quyền hạn...</p>';
        return;
    }
    
    // Get all unique permissions from all roles
    const allPermissions = new Set();
    Object.values(window.ROLE_PERMISSIONS).forEach(rolePerms => {
        rolePerms.forEach(perm => allPermissions.add(perm));
    });
    
    const permissionsArray = Array.from(allPermissions).sort();
    
    const checkboxesHTML = permissionsArray.map((permission, index) => {
        // Get display name from PERMISSION_DISPLAY or use permission key as fallback
        const displayName = window.PERMISSION_DISPLAY && window.PERMISSION_DISPLAY[permission] 
            ? window.PERMISSION_DISPLAY[permission] 
            : permission;
            
        return `
            <div class="permission-checkbox-item">
                <label class="permission-checkbox">
                    <input type="checkbox" name="permissions" value="${permission}" id="perm_${index}" onchange="updateSelectAllCheckbox()">
                    <span class="checkmark"></span>
                    ${displayName}
                </label>
            </div>
        `;
    }).join('');
    
    permissionsCheckboxes.innerHTML = checkboxesHTML;
}

function autoSelectPermissions(rolePermissions) {
    // Uncheck all first
    const checkboxes = document.querySelectorAll('input[name="permissions"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Check permissions for selected role
    rolePermissions.forEach(permission => {
        const checkbox = document.querySelector(`input[name="permissions"][value="${permission}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    updateSelectAllCheckbox();
}

function toggleAllPermissions() {
    const selectAll = document.getElementById('selectAllPermissions');
    const checkboxes = document.querySelectorAll('input[name="permissions"]');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });
}

function updateSelectAllCheckbox() {
    const selectAll = document.getElementById('selectAllPermissions');
    const checkboxes = document.querySelectorAll('input[name="permissions"]');
    const checkedBoxes = document.querySelectorAll('input[name="permissions"]:checked');
    
    selectAll.checked = checkboxes.length > 0 && checkedBoxes.length === checkboxes.length;
}

function getSelectedPermissions() {
    const checkedBoxes = document.querySelectorAll('input[name="permissions"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
}

function loadUserPermissions(user) {
    console.log('🔄 Loading user permissions:', user.username);
    console.log('User permissions data:', user.permissions);
    
    // First uncheck all permissions
    const checkboxes = document.querySelectorAll('input[name="permissions"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // If user has saved permissions, check them
    if (user.permissions && Array.isArray(user.permissions)) {
        user.permissions.forEach(permission => {
            const checkbox = document.querySelector(`input[name="permissions"][value="${permission}"]`);
            if (checkbox) {
                checkbox.checked = true;
                console.log('✅ Checked permission:', permission);
            } else {
                console.log('❌ Permission checkbox not found:', permission);
            }
        });
    } else {
        console.log('⚠️ No saved permissions found, loading default role permissions');
        // If no saved permissions, load default role permissions
        if (user.role && window.ROLE_PERMISSIONS && window.ROLE_PERMISSIONS[user.role]) {
            autoSelectPermissions(window.ROLE_PERMISSIONS[user.role]);
        }
    }
    
    // Update select all checkbox
    updateSelectAllCheckbox();
}

// ===== SAVE USER =====

async function saveUser() {
    try {
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        
        // Validate form
        if (!validateUserForm()) {
            return;
        }
        
        // Get selected permissions
        const selectedPermissions = getSelectedPermissions();
        console.log('💾 Selected permissions to save:', selectedPermissions);
        
        // Prepare user data
        const userData = {
            username: formData.get('username'),
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: formData.get('role') === 'custom' ? formData.get('customRoleName') : formData.get('role'),
            customRole: formData.get('role') === 'custom',
            status: formData.get('status'),
            storeAccess: getSelectedStoreAccess(),
            permissions: selectedPermissions
        };
        
        console.log('💾 User data to save:', userData);
        
        // Handle password
        const password = formData.get('password');
        if (password) {
            userData.password = password;
        }
        
        // Set timestamps
        if (editingUserId) {
            userData.updatedAt = new Date().toISOString();
            userData.updatedBy = authSystem.getCurrentUser().username;
        } else {
            userData.createdAt = new Date().toISOString();
            userData.createdBy = authSystem.getCurrentUser().username;
        }
        
        // Save to Firebase
        if (typeof database !== 'undefined') {
            if (editingUserId) {
                await database.ref(`users/${editingUserId}`).update(userData);
                showNotification('Cập nhật tài khoản thành công!', 'success');
            } else {
                await database.ref('users').push(userData);
                showNotification('Tạo tài khoản mới thành công!', 'success');
            }
        }
        
        // Refresh data and close modal
        await loadUsers();
        updateStatistics();
        renderUsersTable();
        hideUserModal();
        
    } catch (error) {
        console.error('Error saving user:', error);
        showNotification('Lỗi lưu thông tin tài khoản: ' + error.message, 'error');
    }
}

function validateUserForm() {
    const username = document.getElementById('username').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('role').value;
    
    // Required fields
    if (!username || !fullName || !email || !role) {
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
        return false;
    }
    
    // Username validation
    if (username.length < 3) {
        showNotification('Tên đăng nhập phải có ít nhất 3 ký tự', 'error');
        return false;
    }
    
    // Check username uniqueness
    if (!editingUserId || allUsers[editingUserId].username !== username) {
        const existingUser = Object.values(allUsers).find(user => user.username === username);
        if (existingUser) {
            showNotification('Tên đăng nhập đã tồn tại', 'error');
            return false;
        }
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Email không hợp lệ', 'error');
        return false;
    }
    
    // Password validation (only for new users or when password is provided)
    if (!editingUserId || password) {
        if (!password) {
            showNotification('Vui lòng nhập mật khẩu', 'error');
            return false;
        }
        
        if (password.length < 6) {
            showNotification('Mật khẩu phải có ít nhất 6 ký tự', 'error');
            return false;
        }
        
        if (password !== confirmPassword) {
            showNotification('Mật khẩu xác nhận không khớp', 'error');
            return false;
        }
    }
    
    return true;
}

function getSelectedStoreAccess() {
    const storeAccessType = document.querySelector('input[name="storeAccess"]:checked').value;
    
    if (storeAccessType === 'all') {
        return ['all'];
    }
    
    const selectedStores = [];
    document.querySelectorAll('#storesList input[type="checkbox"]:checked').forEach(checkbox => {
        selectedStores.push(checkbox.value);
    });
    
    return selectedStores;
}

// ===== DELETE USER =====

async function deleteUser(userId) {
    if (!authSystem.hasPermission('user_delete')) {
        showNotification('Bạn không có quyền xóa tài khoản', 'error');
        return;
    }
    
    const user = allUsers[userId];
    if (!user) {
        showNotification('Không tìm thấy thông tin người dùng', 'error');
        return;
    }
    
    // Prevent deleting current user
    const currentUser = authSystem.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        showNotification('Không thể xóa tài khoản hiện tại', 'error');
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.fullName}"?\nHành động này không thể hoàn tác.`)) {
        return;
    }
    
    try {
        if (typeof database !== 'undefined') {
            await database.ref(`users/${userId}`).remove();
            showNotification('Xóa tài khoản thành công!', 'success');
            
            // Refresh data
            await loadUsers();
            updateStatistics();
            renderUsersTable();
        }
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Lỗi xóa tài khoản: ' + error.message, 'error');
    }
}

// ===== UTILITY FUNCTIONS =====

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

function refreshUsers() {
    loadUsers().then(() => {
        updateStatistics();
        renderUsersTable();
        showNotification('Đã làm mới danh sách người dùng', 'success');
    });
}

function exportUsers() {
    // TODO: Implement Excel export
    showNotification('Chức năng xuất Excel đang được phát triển', 'info');
}

// Global functions
window.editUser = editUser;
window.viewUser = viewUser;
window.hideUserDetailModal = hideUserDetailModal;
window.updatePermissions = updatePermissions;
window.generatePermissionCheckboxes = generatePermissionCheckboxes;
window.autoSelectPermissions = autoSelectPermissions;
window.toggleAllPermissions = toggleAllPermissions;
window.updateSelectAllCheckbox = updateSelectAllCheckbox;
window.getSelectedPermissions = getSelectedPermissions;
window.loadUserPermissions = loadUserPermissions;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleSelectAll = toggleSelectAll;
window.refreshUsers = refreshUsers;
window.exportUsers = exportUsers;

console.log('🔧 User management extended functions loaded');
