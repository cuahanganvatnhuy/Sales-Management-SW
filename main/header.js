// Header Store Selector Management
let allStores = {};
let currentSelectedStore = null;


// Initialize header functionality
function initializeHeader() {
    console.log('🏪 Initializing header functionality...');
    
    // Update user info if authenticated
    if (typeof authSystem !== 'undefined' && authSystem.isAuthenticated()) {
        updateUserInfo();
    }
    
    // Load stores with delay to ensure Firebase is ready
    setTimeout(() => {
        loadStoresForSelector();
    }, 1500);
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        const storeSelector = document.getElementById('storeSelectorContainer');
        const userDropdown = document.getElementById('userDropdown');
        
        if (storeSelector && !storeSelector.contains(event.target)) {
            closeStoreDropdown();
        }
        
        if (userDropdown && !userDropdown.parentElement.contains(event.target)) {
            closeUserDropdown();
        }
    });
}

// Load stores for selector
async function loadStoresForSelector() {
    try {
        console.log('=== LOADING STORES FOR SELECTOR ===');
        
        // Check if getAllStores function is available
        if (typeof getAllStores === 'undefined') {
            console.error('getAllStores function not loaded yet, retrying...');
            setTimeout(loadStoresForSelector, 1000);
            return;
        }
        
        // Use getAllStores function from firebase.js (same as Dashboard)
        allStores = await getAllStores();
        
        console.log('Stores loaded using getAllStores():', allStores);
        console.log('Number of stores:', Object.keys(allStores).length);
        
        // Log store count (no sample data creation)
        if (Object.keys(allStores).length === 0) {
            console.log('⚠️ No stores found in database');
        }
        
        displayStoresInSelector();
        
        // Set current store if on store detail page
        const urlParams = new URLSearchParams(window.location.search);
        const storeId = urlParams.get('storeId');
        if (storeId && allStores[storeId]) {
            setCurrentStore(storeId, allStores[storeId]);
        }
    } catch (error) {
        console.error('Error loading stores for selector:', error);
        console.error('Error details:', error.message);
        
        // Retry after delay
        setTimeout(loadStoresForSelector, 2000);
    }
}

// Display stores in selector dropdown
function displayStoresInSelector() {
    console.log('=== DISPLAYING STORES IN SELECTOR ===');
    
    const storeList = document.getElementById('storeList');
    console.log('Store list element:', storeList);
    
    if (!storeList) {
        console.log('Store list element not found!');
        return;
    }
    
    console.log('All stores data:', allStores);
    console.log('Store count:', Object.keys(allStores || {}).length);
    
    if (!allStores || Object.keys(allStores).length === 0) {
        console.log('No stores found, showing empty message');
        storeList.innerHTML = `
            <div class="store-item" style="text-align: center; color: var(--text-light);">
                <i class="fas fa-store"></i>
                <span>Chưa có cửa hàng nào</span>
            </div>
        `;
        return;
    }
    
    let storesHTML = '';
    
    // Sort stores by name
    const sortedStores = Object.entries(allStores).sort((a, b) => 
        a[1].name.localeCompare(b[1].name)
    );
    
    for (const [storeId, store] of sortedStores) {
        const isActive = currentSelectedStore === storeId ? 'active' : '';
        const statusIcon = store.status === 'active' ? 'fas fa-circle' : 'fas fa-pause-circle';
        
        console.log(`Adding store: ${store.name} (${storeId})`);
        
        storesHTML += `
            <div class="store-item ${isActive}" onclick="selectStore('${storeId}')">
                <div class="store-item-icon">
                    <i class="${statusIcon}"></i>
                </div>
                <div class="store-item-info">
                    <div class="store-item-name">${store.name}</div>
                    <div class="store-item-address">${store.address || 'Chưa có địa chỉ'}</div>
                </div>
            </div>
        `;
    }
    
    console.log('Final stores HTML:', storesHTML);
    storeList.innerHTML = storesHTML;
    console.log('✅ Store list updated successfully');
}

// Toggle store dropdown
function toggleStoreDropdown() {
    console.log('🏪 Toggle store dropdown clicked');
    
    const dropdown = document.getElementById('storeDropdown');
    const currentStore = document.querySelector('.current-store');
    
    if (!dropdown || !currentStore) {
        console.error('Dropdown or current store element not found');
        return;
    }
    
    if (dropdown.classList.contains('hidden')) {
        console.log('Opening dropdown...');
        dropdown.classList.remove('hidden');
        currentStore.classList.add('active');
        
        // Force reload stores when opening dropdown
        if (Object.keys(allStores).length === 0) {
            console.log('No stores loaded, forcing reload...');
            loadStoresForSelector();
        }
    } else {
        console.log('Closing dropdown...');
        dropdown.classList.add('hidden');
        currentStore.classList.remove('active');
    }
}

// Close store dropdown
function closeStoreDropdown() {
    const dropdown = document.getElementById('storeDropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
}

// Show loading overlay when changing stores
function showStoreChangeLoadingOverlay(storeName) {
    // Remove existing overlay if any
    const existingOverlay = document.getElementById('storeChangeOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'storeChangeOverlay';
    overlay.innerHTML = `
        <div class="store-change-modal">
            <div class="store-change-content">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <div class="loading-text">
                    <h3><i class="fas fa-store"></i> Đang chuyển cửa hàng</h3>
                    <p>Đang tải dữ liệu cho <strong>${storeName}</strong>...</p>
                    <div class="loading-dots">
                        <span>.</span><span>.</span><span>.</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    // Add CSS for modal and animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        
        .store-change-modal {
            background: white;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .loading-spinner {
            margin-bottom: 24px;
        }
        
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4caf50;
            border-radius: 50%;
            margin: 0 auto;
            animation: spin 1s linear infinite;
        }
        
        .loading-text h3 {
            color: #333;
            margin: 0 0 12px 0;
            font-size: 20px;
            font-weight: 600;
        }
        
        .loading-text h3 i {
            color: #4caf50;
            margin-right: 8px;
        }
        
        .loading-text p {
            color: #666;
            margin: 0 0 16px 0;
            font-size: 16px;
        }
        
        .loading-text strong {
            color: #4caf50;
            font-weight: 600;
        }
        
        .loading-dots {
            display: flex;
            justify-content: center;
            gap: 4px;
        }
        
        .loading-dots span {
            font-size: 24px;
            color: #4caf50;
            animation: bounce 1.4s ease-in-out infinite;
        }
        
        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots span:nth-child(3) { animation-delay: 0s; }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    console.log('Store change loading overlay shown for:', storeName);
}

// Select store from dropdown
async function selectStore(storeId) {
    const store = allStores[storeId];
    if (!store) {
        console.error('Store not found:', storeId);
        return;
    }
    
    try {
        console.log('=== Header store selection ===');
        console.log('Store ID:', storeId);
        console.log('Store data:', store);
        
        // Manual store context setting (same as dashboard)
        localStorage.setItem('selectedStoreId', storeId);
        localStorage.setItem('selectedStoreData', JSON.stringify(store));
        
        // Update header display
        setCurrentStoreInHeader(storeId, store);
        closeStoreDropdown();
        
        // Show success notification
        console.log('Store selected successfully from header');
        
        // Create simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 500;
        `;
        toast.innerHTML = `<i class="fas fa-check-circle"></i> Đã chọn: ${store.name}`;
        document.body.appendChild(toast);
        
        // Auto remove toast
        setTimeout(() => toast.remove(), 3000);
        
        // Show loading overlay for ALL pages (including dashboard)
        console.log('Showing loading overlay for store change...');
        showStoreChangeLoadingOverlay(store.name);
        
        // Check current page and decide whether to reload or just trigger event
        const currentPage = window.location.pathname;
        const isDashboard = currentPage.includes('index.html') || currentPage.endsWith('/');
        
        if (isDashboard) {
            // Dashboard: Show overlay + trigger event to reload data (no page reload)
            setTimeout(() => {
                const event = new CustomEvent('storeContextChanged', {
                    detail: { storeId, storeData: store, isStoreSelected: true }
                });
                document.dispatchEvent(event);
                console.log('Dashboard: Store change event dispatched with data:', { storeId, storeName: store.name });
            }, 400); // Small delay to show loading
        } else {
            // Other pages: Show overlay + reload page
            console.log('Non-dashboard page: Reloading page...');
            setTimeout(() => {
                window.location.reload();
            }, 1200); // Longer delay for page reload
        }
        
    } catch (error) {
        console.error('Error selecting store from header:', error);
        
        // Error toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 10000;
        `;
        toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> Lỗi chọn cửa hàng!`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Set current store in header (legacy function)
function setCurrentStore(storeId, store) {
    setCurrentStoreInHeader(storeId, store);
}

// Set current store in header
function setCurrentStoreInHeader(storeId, store) {
    currentSelectedStore = storeId;
    
    const currentStoreName = document.getElementById('currentStoreName');
    if (currentStoreName) {
        currentStoreName.textContent = store.name;
    }
    
    // Update store list to show active state
    displayStoresInSelector();
}

// Update current store name (called from other pages)
function updateCurrentStoreName(storeName) {
    const currentStoreName = document.getElementById('currentStoreName');
    if (currentStoreName) {
        currentStoreName.textContent = storeName;
    }
}

// ===== USER DROPDOWN FUNCTIONS =====

// Update user info in header
function updateUserInfo() {
    if (typeof authSystem === 'undefined' || !authSystem.isAuthenticated()) {
        return;
    }
    
    const currentUser = authSystem.getCurrentUser();
    if (!currentUser) return;
    
    // Update user name elements
    const userNameElements = document.querySelectorAll('.current-user-name');
    userNameElements.forEach(el => {
        el.textContent = currentUser.fullName;
    });
    
    // Update user role elements
    const userRoleElements = document.querySelectorAll('.current-user-role');
    userRoleElements.forEach(el => {
        el.textContent = authSystem.getRoleDisplayName(currentUser.role);
    });
    
    console.log('✅ User info updated in header:', currentUser.fullName);
}

// Toggle user dropdown
function toggleUserDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.toggle('hidden');
    }
}

// Close user dropdown
function closeUserDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.add('hidden');
    }
}

// Show profile modal
function showProfile() {
    closeUserDropdown();
    alert('Chức năng thông tin cá nhân đang được phát triển');
}

// Change password
function changePassword() {
    closeUserDropdown();
    alert('Chức năng đổi mật khẩu đang được phát triển');
}

// Logout function
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        if (typeof authSystem !== 'undefined') {
            authSystem.logout();
        } else {
            // Fallback logout
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
            window.location.href = '/login.html';
        }
    }
}

// Global functions for onclick handlers
window.toggleUserDropdown = toggleUserDropdown;
window.showProfile = showProfile;
window.changePassword = changePassword;
window.logout = logout;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for header to be loaded
    setTimeout(() => {
        if (typeof database !== 'undefined') {
            initializeHeader();
        }
    }, 500);
});

// Make functions globally available
window.toggleStoreDropdown = toggleStoreDropdown;
window.selectStore = selectStore;
window.initializeHeader = initializeHeader;
window.updateCurrentStoreName = updateCurrentStoreName;
