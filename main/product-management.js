// Product Management JavaScript

// Global variables
let products = [];
let categories = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let editingProductId = null;
let productToDelete = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeProductManagement();
});

// Initialize the product management system
function initializeProductManagement() {
    console.log('Initializing Product Management...');
    
    // Load data from Firebase
    loadProducts();
    loadCategories();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Product Management initialized successfully');
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Filter functionality
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleFilter);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilter);
    }
    
    // Form submission
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProductChanges();
        });
    }
}

// Load products from Firebase
async function loadProducts() {
    try {
        showLoading();
        
        const productsRef = firebase.database().ref('products');
        
        productsRef.on('value', (snapshot) => {
            products = [];
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const product = {
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    };
                    products.push(product);
                });
            }
            
            console.log('Products loaded:', products);
            applyFilters();
            updateStats();
            hideLoading();
        });
        
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Lỗi khi tải sản phẩm: ' + error.message, 'error');
        hideLoading();
    }
}

// Load categories from Firebase
async function loadCategories() {
    try {
        const categoriesRef = firebase.database().ref('categories');
        
        categoriesRef.on('value', (snapshot) => {
            categories = [];
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const category = {
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    };
                    categories.push(category);
                });
            }
            
            console.log('Categories loaded:', categories);
            populateCategoryFilters();
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Populate category filters
function populateCategoryFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const editCategorySelect = document.getElementById('editProductCategory');
    
    if (categoryFilter) {
        // Clear existing options except first one
        categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    }
    
    if (editCategorySelect) {
        // Clear existing options except first one
        editCategorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            editCategorySelect.appendChild(option);
        });
    }
}

// Apply filters and search
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    let filtered = [...products];
    
    // Apply search filter
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply category filter
    if (categoryFilter && categoryFilter.value) {
        filtered = filtered.filter(product => product.categoryId === categoryFilter.value);
    }
    
    // Apply status filter
    if (statusFilter && statusFilter.value) {
        filtered = filtered.filter(product => product.status === statusFilter.value);
    }
    
    filteredProducts = filtered;
    currentPage = 1;
    renderProducts();
    renderPagination();
}

// Handle search input
function handleSearch() {
    applyFilters();
}

// Handle filter change
function handleFilter() {
    applyFilters();
}

// Update statistics
function updateStats() {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const inactiveProducts = products.filter(p => p.status === 'inactive').length;
    const outOfStockProducts = products.filter(p => p.status === 'out_of_stock' || (p.stock && p.stock <= 0)).length;
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('activeProducts').textContent = activeProducts;
    document.getElementById('inactiveProducts').textContent = inactiveProducts;
    document.getElementById('outOfStockProducts').textContent = outOfStockProducts;
}

// Render products table
function renderProducts() {
    const tableBody = document.getElementById('productsTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.querySelector('.table-container');
    
    if (!tableBody || !emptyState || !tableContainer) return;
    
    if (filteredProducts.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    tableContainer.style.display = 'block';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);
    
    tableBody.innerHTML = pageProducts.map((product, index) => {
        const category = categories.find(c => c.id === product.categoryId);
        const categoryName = category ? category.name : 'Chưa phân loại';
        
        const stockClass = product.stock <= 0 ? 'out' : product.stock <= 10 ? 'low' : '';
        
        return `
            <tr>
                <td>${startIndex + index + 1}</td>
                
                <td>
                    <div class="product-name">${product.name}</div>
                </td>
                <td>
                    <span class="product-sku">${product.sku || 'N/A'}</span>
                </td>
                <td>
                    <span class="product-category">${categoryName}</span>
                </td>
                <td>
                    <span class="product-price">${formatCurrency(product.price || 0)}</span>
                </td>
                <td>
                    <span class="product-stock ${stockClass}">${product.stock || 0}</span>
                </td>
                <td>
                    <span class="product-status ${product.status || 'active'}">
                        <i class="fas fa-circle"></i>
                        ${getStatusText(product.status)}
                    </span>
                </td>
                <td>
                    <div class="product-actions">
                        <button class="action-btn edit" onclick="editProduct('${product.id}')" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteProduct('${product.id}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render pagination
function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!paginationContainer || !paginationInfo || !paginationNumbers) return;
    
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Update pagination info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    paginationInfo.textContent = `Hiển thị ${startItem}-${endItem} của ${totalItems} sản phẩm`;
    
    // Update prev/next buttons
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
    
    // Generate page numbers
    paginationNumbers.innerHTML = '';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        paginationNumbers.appendChild(pageBtn);
    }
}

// Go to specific page
function goToPage(page) {
    currentPage = page;
    renderProducts();
    renderPagination();
}

// Change page (prev/next)
function changePage(direction) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        goToPage(newPage);
    }
}

// Edit product
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    editingProductId = productId;
    
    // Fill form with product data
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductSKU').value = product.sku || '';
    document.getElementById('editProductCategory').value = product.categoryId || '';
    document.getElementById('editProductPrice').value = product.price || '';
    document.getElementById('editProductStock').value = product.stock || 0;
    document.getElementById('editProductStatus').value = product.status || 'active';
    document.getElementById('editProductDescription').value = product.description || '';
    
    // Show modal
    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    editingProductId = null;
}

// Save product changes
async function saveProductChanges() {
    try {
        const form = document.getElementById('editProductForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        showLoading();
        
        const productData = {
            name: document.getElementById('editProductName').value.trim(),
            sku: document.getElementById('editProductSKU').value.trim(),
            categoryId: document.getElementById('editProductCategory').value,
            price: parseFloat(document.getElementById('editProductPrice').value) || 0,
            stock: parseInt(document.getElementById('editProductStock').value) || 0,
            status: document.getElementById('editProductStatus').value,
            description: document.getElementById('editProductDescription').value.trim(),
            updatedAt: new Date().toISOString()
        };
        
        await firebase.database().ref(`products/${editingProductId}`).update(productData);
        
        showNotification('Cập nhật sản phẩm thành công!', 'success');
        closeEditModal();
        hideLoading();
        
    } catch (error) {
        console.error('Error updating product:', error);
        showNotification('Lỗi khi cập nhật sản phẩm: ' + error.message, 'error');
        hideLoading();
    }
}

// Delete product
function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    productToDelete = productId;
    
    // Show delete confirmation modal
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    productToDelete = null;
}

// Confirm delete product
async function confirmDeleteProduct() {
    if (!productToDelete) return;
    
    try {
        showLoading();
        
        await firebase.database().ref(`products/${productToDelete}`).remove();
        
        showNotification('Xóa sản phẩm thành công!', 'success');
        closeDeleteModal();
        hideLoading();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Lỗi khi xóa sản phẩm: ' + error.message, 'error');
        hideLoading();
    }
}

// Export products to Excel
function exportProducts() {
    try {
        // Create CSV content
        const headers = ['STT', 'Tên sản phẩm', 'SKU', 'Danh mục', 'Giá bán', 'Tồn kho', 'Trạng thái', 'Mô tả'];
        const csvContent = [
            headers.join(','),
            ...filteredProducts.map((product, index) => {
                const category = categories.find(c => c.id === product.categoryId);
                const categoryName = category ? category.name : 'Chưa phân loại';
                
                return [
                    index + 1,
                    `"${product.name || ''}"`,
                    `"${product.sku || ''}"`,
                    `"${categoryName}"`,
                    product.price || 0,
                    product.stock || 0,
                    `"${getStatusText(product.status)}"`,
                    `"${product.description || ''}"`
                ].join(',');
            })
        ].join('\n');
        
        // Create and download file
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `danh-sach-san-pham-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Xuất file thành công!', 'success');
        
    } catch (error) {
        console.error('Error exporting products:', error);
        showNotification('Lỗi khi xuất file: ' + error.message, 'error');
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function getStatusText(status) {
    const statusMap = {
        'active': 'Đang bán',
        'inactive': 'Ngừng bán',
        'out_of_stock': 'Hết hàng'
    };
    return statusMap[status] || 'Đang bán';
}



// Show loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

// Hide loading overlay
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.querySelector('.notification-message');
    const notificationIcon = document.querySelector('.notification-icon');
    
    if (!notification || !notificationMessage || !notificationIcon) return;
    
    // Set message
    notificationMessage.textContent = message;
    
    // Set icon based on type
    let iconClass = 'fas fa-check-circle';
    if (type === 'error') {
        iconClass = 'fas fa-exclamation-circle';
    } else if (type === 'warning') {
        iconClass = 'fas fa-exclamation-triangle';
    }
    notificationIcon.className = `notification-icon ${iconClass}`;
    
    // Set type class
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

// Export functions for global access
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeEditModal = closeEditModal;
window.closeDeleteModal = closeDeleteModal;
window.saveProductChanges = saveProductChanges;
window.confirmDeleteProduct = confirmDeleteProduct;
window.exportProducts = exportProducts;
window.changePage = changePage;
window.goToPage = goToPage;
