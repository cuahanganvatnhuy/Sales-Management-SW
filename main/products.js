// Products Management - Simple Version
let productsData = {};
// Expose to global scope for other pages to use
window.productsData = productsData;

// Format currency (135000 -> 135.000)
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Override formatCurrency for better large number handling
function formatCurrency(amount) {
    // Handle both string and number inputs
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    
    if (isNaN(numAmount)) {
        return '0';
    }
    
    return new Intl.NumberFormat('vi-VN').format(numAmount);
}

// Format price input as user types
function formatPriceInput(input) {
    // Remove all non-digit characters
    let value = input.value.replace(/\D/g, '');
    
    // Limit to reasonable number (max 15 digits)
    if (value.length > 15) {
        value = value.substring(0, 15);
    }
    
    // Format with thousand separators
    if (value) {
        // Use Number instead of parseInt to handle larger numbers
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            value = numValue.toLocaleString('vi-VN');
        }
    }
    
    input.value = value;
}

// Get numeric value from formatted price
function getNumericPrice(formattedPrice) {
    const cleanValue = formattedPrice.replace(/\D/g, '') || '0';
    return Number(cleanValue);
}

// Setup price input formatting
function setupPriceFormatting() {
    const priceInput = document.getElementById('productPrice');
    if (priceInput) {
        priceInput.addEventListener('input', function() {
            formatPriceInput(this);
        });
        
        priceInput.addEventListener('blur', function() {
            formatPriceInput(this);
        });
    }
}

// Load products when page loads
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing products page...');
    
    // Wait a bit for Firebase to be ready
    setTimeout(() => {
        console.log('Checking Firebase availability...');
        if (typeof database !== 'undefined' && database) {
            console.log('Firebase database is available');
            loadProducts();
        } else {
            console.error('Firebase database not available. Please check your internet connection and refresh the page.');
            showNotification('Không thể kết nối cơ sở dữ liệu. Vui lòng kiểm tra kết nối internet và tải lại trang.', 'error');
        }
        setupPriceFormatting();
    }, 500);
});

// Load products from Firebase
async function loadProducts() {
    // Check if Firebase is available first
    if (typeof database === 'undefined' || !database) {
        console.error('Firebase database not available for loadProducts');
        return;
    }
    
    if (typeof getAllProducts !== 'function') {
        console.error('getAllProducts function not available');
        return;
    }
    
    try {
        console.log('Loading products from Firebase...');
        productsData = await getAllProducts();
        // Update global reference
        window.productsData = productsData;
        console.log('Products loaded:', Object.keys(productsData).length, 'products');
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        // Silent fail - don't show notifications to avoid spam
        // User can check console for details
    }
}

// Format currency (135000 -> 135.000)
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Display products in table format
function displayProducts() {
    console.log('Displaying products...', productsData);
    const container = document.getElementById('productsContainer');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('productsTable');
    
    if (!productsData || Object.keys(productsData).length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (table) table.classList.add('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    
    let productsHTML = '';
    let index = 1;
    
    for (const [productId, product] of Object.entries(productsData)) {
        productsHTML += `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="product-checkbox" value="${productId}" onchange="updateBulkActions()">
                </td>
                <td class="text-center">${index}</td>
                <td>${product.name}</td>
                <td class="text-center">${product.sku || '<span class="text-muted">-</span>'}</td>
                <td class="text-right">${formatCurrency(product.price)}</td>
                <td class="text-center">
                    <button class="btn btn-warning btn-small" onclick="editProduct('${productId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
                <td class="text-center">
                    <button class="btn btn-danger btn-small" onclick="deleteProduct('${productId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        index++;
    }
    
    container.innerHTML = productsHTML;
    updateBulkActions();
}

// Thêm sản phẩm mới
async function addNewProduct(event) {
    if (event) {
        event.preventDefault();
    }
    
    console.log('Starting addNewProduct...');
    
    // Check if Firebase is available
    if (typeof database === 'undefined' || !database) {
        console.error('Firebase database not available');
        showNotification('Lỗi kết nối cơ sở dữ liệu!', 'error');
        return;
    }
    
    if (typeof addProduct !== 'function') {
        console.error('addProduct function not available');
        showNotification('Chức năng thêm sản phẩm chưa sẵn sàng!', 'error');
        return;
    }
    
    // Get form values
    const name = document.getElementById('productName').value.trim();
    const sku = document.getElementById('productSKU').value.trim();
    const priceStr = document.getElementById('productPrice').value.trim();
    
    console.log('Adding product:', { name, sku, priceStr });
    
    if (!name || !priceStr) {
        showNotification('Vui lòng nhập đầy đủ thông tin!', 'error');
        return;
    }
    
    // Get numeric value from formatted price
    const price = getNumericPrice(priceStr);
    
    if (price <= 0) {
        showNotification('Giá sản phẩm phải lớn hơn 0!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const productData = {
            name: name,
            sku: sku || null, // Nếu không nhập SKU thì để null
            price: price
        };
        
        console.log('Calling addProduct with:', productData);
        await addProduct(productData);
        
        // Clear form
        document.getElementById('productName').value = '';
        document.getElementById('productSKU').value = '';
        document.getElementById('productPrice').value = '';
        
        showNotification('Thêm sản phẩm thành công!', 'success');
        await loadProducts();
        
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Lỗi thêm sản phẩm: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Delete single product
async function deleteProduct(productId) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        return;
    }
    
    try {
        await deleteProductById(productId);
        showNotification('Xóa sản phẩm thành công!', 'success');
        await loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Lỗi xóa sản phẩm!', 'error');
    }
}

// Copy File function
function copyFile() {
    if (!productsData || Object.keys(productsData).length === 0) {
        showNotification('Không có dữ liệu để copy!', 'error');
        return;
    }
    
    const dataText = JSON.stringify(productsData, null, 2);
    navigator.clipboard.writeText(dataText).then(() => {
        showNotification('Đã copy dữ liệu vào clipboard!', 'success');
    }).catch(() => {
        showNotification('Lỗi copy dữ liệu!', 'error');
    });
}

// Sync File function
async function syncFile() {
    showNotification('Đang đồng bộ dữ liệu...', 'info');
    await loadProducts();
    showNotification('Đồng bộ thành công!', 'success');
}

// Export JSON function
function exportJSON() {
    if (!productsData || Object.keys(productsData).length === 0) {
        showNotification('Không có dữ liệu để xuất!', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(productsData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `products_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Xuất file JSON thành công!', 'success');
}

// Restore Data function
async function restoreData() {
    if (!confirm('Bạn có chắc muốn khôi phục dữ liệu mẫu? Điều này sẽ xóa tất cả dữ liệu hiện tại!')) {
        return;
    }
    
    try {
        await resetDatabase();
        await loadProducts();
        showNotification('Khôi phục dữ liệu thành công!', 'success');
        await loadProducts();
    } catch (error) {
        console.error('Error restoring data:', error);
        showNotification('Lỗi khôi phục dữ liệu!', 'error');
    }
}

// Toggle select all checkboxes
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkActions();
}

// Update bulk actions visibility
function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (checkboxes.length > 0) {
        bulkActions.classList.remove('hidden');
        selectedCount.textContent = checkboxes.length;
    } else {
        bulkActions.classList.add('hidden');
    }
    
    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.product-checkbox');
    const selectAll = document.getElementById('selectAll');
    
    if (checkboxes.length === allCheckboxes.length && allCheckboxes.length > 0) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
    } else if (checkboxes.length > 0) {
        selectAll.checked = false;
        selectAll.indeterminate = true;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    }
}

// Delete selected products
async function deleteSelectedProducts() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const productIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (productIds.length === 0) {
        showNotification('Vui lòng chọn sản phẩm cần xóa!', 'error');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${productIds.length} sản phẩm đã chọn?`)) {
        return;
    }
    
    try {
        for (const productId of productIds) {
            await deleteProductById(productId);
        }
        
        showNotification(`Đã xóa ${productIds.length} sản phẩm thành công!`, 'success');
        await loadProducts();
    } catch (error) {
        console.error('Error deleting products:', error);
        showNotification('Lỗi xóa sản phẩm!', 'error');
    }
}

// Edit product (placeholder function)
function editProduct(productId) {
    const product = productsData[productId];
    if (!product) {
        showNotification('Không tìm thấy sản phẩm!', 'error');
        return;
    }
    
    // Fill form with product data for editing
    document.getElementById('productName').value = product.name;
    document.getElementById('productSKU').value = product.sku || '';
    document.getElementById('productPrice').value = product.price;
    
    // You can add a modal or inline editing here
    showNotification('Chức năng sửa sản phẩm đang được phát triển!', 'info');
}

// Helper function to delete product by ID
function deleteProductById(productId) {
    return database.ref(`products/${productId}`).remove();
}

// Show loading state
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`Notification [${type}]: ${message}`);
    
    // Try to use existing notification system if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback: create simple notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#000';
            break;
        default:
            notification.style.backgroundColor = '#17a2b8';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}