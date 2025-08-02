// Stores Management
let storesData = {};
let currentEditingStoreId = null;

// Load stores when page loads
window.addEventListener('DOMContentLoaded', function() {
    loadStores();
});

// Load stores from Firebase
async function loadStores() {
    try {
        showLoading(true);
        const snapshot = await database.ref('stores').once('value');
        storesData = snapshot.val() || {};
        
        displayStores();
        updateStats();
        showLoading(false);
    } catch (error) {
        console.error('Error loading stores:', error);
        showNotification('Lỗi tải danh sách cửa hàng!', 'error');
        showLoading(false);
    }
}

// Display stores in table
function displayStores() {
    const container = document.getElementById('storesContainer');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('storesTable');
    
    if (!storesData || Object.keys(storesData).length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        table.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    table.classList.remove('hidden');
    
    let storesHTML = '';
    let index = 1;
    
    // Sort stores by creation date (newest first)
    const sortedStores = Object.entries(storesData).sort((a, b) => 
        new Date(b[1].createdAt || 0) - new Date(a[1].createdAt || 0)
    );
    
    for (const [storeId, store] of sortedStores) {
        const statusBadge = store.status === 'active' 
            ? '<span class="badge badge-success">Hoạt Động</span>'
            : '<span class="badge badge-warning">Tạm Dừng</span>';
            
        const stats = getStoreStats(storeId);
        
        storesHTML += `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="store-checkbox" value="${storeId}" onchange="updateBulkActions()">
                </td>
                <td class="text-center">${index}</td>
                <td>
                    <div class="store-info">
                        <div class="store-name">
                            <i class="fas fa-store"></i>
                            <strong>${store.name}</strong>
                        </div>
                        <div class="store-address">
                            <i class="fas fa-map-marker-alt"></i>
                            ${store.address}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="owner-info">
                        <div class="owner-name">
                            <i class="fas fa-user"></i>
                            ${store.owner}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="contact-info">
                        <div class="phone">
                            <i class="fas fa-phone"></i>
                            ${store.phone}
                        </div>
                        ${store.email ? `
                            <div class="email">
                                <i class="fas fa-envelope"></i>
                                ${store.email}
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">
                    <div class="stats-info">
                        <div class="stat-item">
                            <i class="fas fa-box"></i>
                            ${stats.products} SP
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-shopping-cart"></i>
                            ${stats.orders} ĐH
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <div class="action-buttons">
                        <button class="btn btn-info btn-small" onclick="viewStoreDetail('${storeId}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-small" onclick="editStore('${storeId}')" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteStore('${storeId}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        index++;
    }
    
    container.innerHTML = storesHTML;
}

// Get store statistics
function getStoreStats(storeId) {
    // This would normally fetch from Firebase, for now return mock data
    return {
        products: Math.floor(Math.random() * 50) + 1,
        orders: Math.floor(Math.random() * 100) + 1
    };
}

// Update header statistics
function updateStats() {
    const totalStores = Object.keys(storesData).length;
    const activeStores = Object.values(storesData).filter(store => store.status === 'active').length;
    
    document.getElementById('totalStores').textContent = totalStores;
    document.getElementById('activeStores').textContent = activeStores;
}

// Handle form submission
document.getElementById('storeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const storeData = {
        name: formData.get('storeName'),
        owner: formData.get('storeOwner'),
        address: formData.get('storeAddress'),
        phone: formData.get('storePhone'),
        email: formData.get('storeEmail'),
        status: formData.get('storeStatus'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        showLoading(true);
        
        if (currentEditingStoreId) {
            // Update existing store
            storeData.updatedAt = new Date().toISOString();
            await database.ref(`stores/${currentEditingStoreId}`).update(storeData);
            showNotification('Cập nhật cửa hàng thành công!', 'success');
            currentEditingStoreId = null;
        } else {
            // Add new store
            const newStoreRef = database.ref('stores').push();
            await newStoreRef.set(storeData);
            showNotification('Thêm cửa hàng thành công!', 'success');
        }
        
        clearForm();
        loadStores();
        showLoading(false);
    } catch (error) {
        console.error('Error saving store:', error);
        showNotification('Lỗi lưu cửa hàng!', 'error');
        showLoading(false);
    }
});

// Clear form
function clearForm() {
    document.getElementById('storeForm').reset();
    currentEditingStoreId = null;
    
    // Update button text
    const submitBtn = document.querySelector('#storeForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Lưu Cửa Hàng';
}

// Edit store
function editStore(storeId) {
    const store = storesData[storeId];
    if (!store) return;
    
    // Fill form with store data
    document.getElementById('storeName').value = store.name;
    document.getElementById('storeOwner').value = store.owner;
    document.getElementById('storeAddress').value = store.address;
    document.getElementById('storePhone').value = store.phone;
    document.getElementById('storeEmail').value = store.email || '';
    document.getElementById('storeStatus').value = store.status;
    
    currentEditingStoreId = storeId;
    
    // Update button text
    const submitBtn = document.querySelector('#storeForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Cập Nhật Cửa Hàng';
    
    // Scroll to form
    document.getElementById('storeForm').scrollIntoView({ behavior: 'smooth' });
}

// Delete store
async function deleteStore(storeId) {
    const store = storesData[storeId];
    if (!store) return;
    
    if (!confirm(`Bạn có chắc muốn xóa cửa hàng "${store.name}"?\nLưu ý: Tất cả dữ liệu sản phẩm và đơn hàng của cửa hàng này sẽ bị xóa!`)) {
        return;
    }
    
    try {
        showLoading(true);
        await database.ref(`stores/${storeId}`).remove();
        showNotification('Xóa cửa hàng thành công!', 'success');
        loadStores();
        showLoading(false);
    } catch (error) {
        console.error('Error deleting store:', error);
        showNotification('Lỗi xóa cửa hàng!', 'error');
        showLoading(false);
    }
}

// View store detail
function viewStoreDetail(storeId) {
    // Redirect to store detail page with store ID
    window.location.href = `store-detail.html?storeId=${storeId}`;
}

// Search stores
function searchStores() {
    const searchTerm = document.getElementById('searchStores').value.toLowerCase();
    const rows = document.querySelectorAll('#storesContainer tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Bulk actions
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.store-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkActions();
}

function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.store-checkbox:checked');
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (checkboxes.length > 0) {
        bulkActions.classList.remove('hidden');
        selectedCount.textContent = checkboxes.length;
    } else {
        bulkActions.classList.add('hidden');
    }
}

async function deleteSelectedStores() {
    const checkboxes = document.querySelectorAll('.store-checkbox:checked');
    const storeIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (storeIds.length === 0) {
        showNotification('Vui lòng chọn cửa hàng để xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${storeIds.length} cửa hàng đã chọn?\nLưu ý: Tất cả dữ liệu sản phẩm và đơn hàng của các cửa hàng này sẽ bị xóa!`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        for (const storeId of storeIds) {
            await database.ref(`stores/${storeId}`).remove();
        }
        
        showNotification(`Đã xóa ${storeIds.length} cửa hàng thành công!`, 'success');
        loadStores();
        showLoading(false);
        
        // Reset bulk actions
        document.getElementById('selectAll').checked = false;
        updateBulkActions();
    } catch (error) {
        console.error('Error deleting stores:', error);
        showNotification('Lỗi xóa cửa hàng!', 'error');
        showLoading(false);
    }
}

// Utility functions
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
