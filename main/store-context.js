// Store Context Management
// Quản lý cửa hàng hiện tại cho toàn bộ hệ thống

let currentStoreContext = {
    storeId: null,
    storeData: null,
    isStoreSelected: false
};

// Initialize store context
function initializeStoreContext() {
    // Check if there's a selected store in localStorage
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (savedStoreId) {
        loadStoreContext(savedStoreId);
    }
    
    // Check URL parameters for store ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlStoreId = urlParams.get('storeId');
    if (urlStoreId) {
        setCurrentStore(urlStoreId);
    }
}

// Set current store
async function setCurrentStore(storeId) {
    try {
        if (!storeId) {
            clearStoreContext();
            return;
        }
        
        // Load store data from Firebase
        const snapshot = await database.ref(`stores/${storeId}`).once('value');
        const storeData = snapshot.val();
        
        if (!storeData) {
            console.error('Store not found:', storeId);
            clearStoreContext();
            return;
        }
        
        // Update context
        currentStoreContext = {
            storeId: storeId,
            storeData: storeData,
            isStoreSelected: true
        };
        
        // Save to localStorage
        localStorage.setItem('selectedStoreId', storeId);
        localStorage.setItem('selectedStoreData', JSON.stringify(storeData));
        
        // Update header
        updateHeaderWithStoreContext();
        
        // Trigger store change event
        triggerStoreChangeEvent();
        
        console.log('Store context updated:', storeData.name);
        
    } catch (error) {
        console.error('Error setting current store:', error);
        clearStoreContext();
    }
}

// Load store context from localStorage
async function loadStoreContext(storeId) {
    try {
        const savedStoreData = localStorage.getItem('selectedStoreData');
        if (savedStoreData) {
            const storeData = JSON.parse(savedStoreData);
            currentStoreContext = {
                storeId: storeId,
                storeData: storeData,
                isStoreSelected: true
            };
            
            // Verify store still exists in database
            const snapshot = await database.ref(`stores/${storeId}`).once('value');
            if (!snapshot.exists()) {
                clearStoreContext();
                return;
            }
            
            updateHeaderWithStoreContext();
            triggerStoreChangeEvent();
        }
    } catch (error) {
        console.error('Error loading store context:', error);
        clearStoreContext();
    }
}

// Clear store context
function clearStoreContext() {
    currentStoreContext = {
        storeId: null,
        storeData: null,
        isStoreSelected: false
    };
    
    localStorage.removeItem('selectedStoreId');
    localStorage.removeItem('selectedStoreData');
    
    updateHeaderWithStoreContext();
    triggerStoreChangeEvent();
}

// Get current store context
function getCurrentStoreContext() {
    return currentStoreContext;
}

// Check if store is selected
function isStoreSelected() {
    return currentStoreContext.isStoreSelected && currentStoreContext.storeId;
}

// Get current store ID
function getCurrentStoreId() {
    return currentStoreContext.storeId;
}

// Get current store data
function getCurrentStoreData() {
    return currentStoreContext.storeData;
}

// Update header with store context
function updateHeaderWithStoreContext() {
    const currentStoreName = document.getElementById('currentStoreName');
    if (currentStoreName) {
        if (currentStoreContext.isStoreSelected) {
            currentStoreName.textContent = currentStoreContext.storeData.name;
        } else {
            currentStoreName.textContent = 'Chọn Cửa Hàng';
        }
    }
}

// Trigger store change event
function triggerStoreChangeEvent() {
    const event = new CustomEvent('storeContextChanged', {
        detail: currentStoreContext
    });
    document.dispatchEvent(event);
}

// Check if current page should reload when store changes
function shouldReloadOnStoreChange() {
    const currentPage = window.location.pathname;
    const isDashboard = currentPage.includes('index.html') || currentPage.endsWith('/');
    return !isDashboard; // Reload all pages except dashboard
}

// Set current store with optional page reload
async function setCurrentStoreWithReload(storeId, forceReload = false) {
    try {
        // Set store context first
        await setCurrentStore(storeId);
        
        // Get store name for loading overlay
        const storeData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
        const storeName = storeData.name || 'cửa hàng';
        
        // Show loading overlay for ALL pages
        console.log('🔄 Showing loading overlay for all pages...');
        showStoreChangeLoadingOverlay(storeName);
        
        // Check current page type
        const currentPage = window.location.pathname;
        const isDashboard = currentPage.includes('index.html') || currentPage.endsWith('/');
        
        if (isDashboard) {
            // Dashboard: Trigger event to reload data (overlay will be hidden by event listener)
            setTimeout(() => {
                const event = new CustomEvent('storeContextChanged', {
                    detail: { storeId, storeData, isStoreSelected: true }
                });
                document.dispatchEvent(event);
                console.log('Dashboard: Store change event dispatched');
            }, 400);
        } else if (forceReload || shouldReloadOnStoreChange()) {
            // Other pages: Reload page
            setTimeout(() => {
                window.location.reload();
            }, 1200);
        }
    } catch (error) {
        console.error('Error setting store with reload:', error);
        
        // Hide overlay on error
        const overlay = document.getElementById('storeChangeOverlay');
        if (overlay) overlay.remove();
    }
}

// Show loading overlay when changing stores (shared function)
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
    
    // Add CSS for modal and animations (only if not already added)
    if (!document.getElementById('storeChangeStyles')) {
        const style = document.createElement('style');
        style.id = 'storeChangeStyles';
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
    }
    
    document.body.appendChild(overlay);
    console.log('Store change loading overlay shown for:', storeName);
}

// Get database path for current store
function getStoreDataPath(dataType) {
    if (!isStoreSelected()) {
        console.warn('No store selected, cannot get data path');
        return null;
    }
    
    // Use new unified structure: stores/{storeId}/{dataType}
    const path = `stores/${currentStoreContext.storeId}/${dataType}`;
    console.log(`📁 Store data path for ${dataType}:`, path);
    return path;
}

// Show store selection required message
function showStoreSelectionRequired() {
    const message = `
        <div class="store-selection-required">
            <div class="store-selection-icon">
                <i class="fas fa-store"></i>
            </div>
            <h3>Vui lòng chọn cửa hàng</h3>
            <p>Bạn cần chọn cửa hàng trước khi sử dụng tính năng này.</p>
            <button type="button" class="btn btn-primary" onclick="openStoreSelector()">
                <i class="fas fa-store"></i> Chọn Cửa Hàng
            </button>
        </div>
    `;
    
    return message;
}

// Open store selector
function openStoreSelector() {
    const storeSelector = document.querySelector('.current-store');
    if (storeSelector) {
        storeSelector.click();
    }
}

// Redirect with store context
function redirectWithStoreContext(page) {
    if (isStoreSelected()) {
        window.location.href = `${page}?storeId=${getCurrentStoreId()}`;
    } else {
        window.location.href = page;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be ready
    setTimeout(() => {
        if (typeof database !== 'undefined') {
            initializeStoreContext();
        }
    }, 100);
});

// Listen for storage changes (when store is selected in another tab)
window.addEventListener('storage', function(e) {
    if (e.key === 'selectedStoreId') {
        if (e.newValue) {
            loadStoreContext(e.newValue);
        } else {
            clearStoreContext();
        }
    }
});
