// Products Management - Simple Version
let productsData = {};
// Expose to global scope for other pages to use
window.productsData = productsData;

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Format currency for better large number handling (135000 -> 135.000)
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
    setTimeout(async () => {
        console.log('Checking Firebase availability...');
        if (typeof database !== 'undefined' && database) {
            console.log('Firebase database is available');
            // Load categories first, then products
            await loadProductCategories(); // Load categories for dropdown
            await loadProducts(); // Load products after categories are ready
            
            // Debug data after loading
            debugCategoriesAndProducts();
        } else {
            console.error('Firebase database not available. Please check your internet connection and refresh the page.');
            showNotification('Không thể kết nối cơ sở dữ liệu. Vui lòng kiểm tra kết nối internet và tải lại trang.', 'error');
        }
        setupPriceFormatting();
    }, 500);
});

// Load products from Firebase
async function loadProducts(forceReload = false) {
    console.log('=== Starting loadProducts ===', forceReload ? '(Force Reload)' : '');
    
    // Prevent multiple load operations (unless force reload)
    if (isLoadingProducts && !forceReload) {
        console.log('Load operation already in progress, skipping...');
        return;
    }
    
    // Check if Firebase is available first
    if (typeof database === 'undefined' || !database) {
        console.error('Firebase database not available for loadProducts');
        return;
    }
    
    // Set loading flag
    isLoadingProducts = true;
    
    if (typeof getAllProducts !== 'function') {
        console.error('getAllProducts function not available');
        return;
    }
    
    try {
        console.log('Loading products from Firebase...');
        
        // If force reload, clear cache first
        if (forceReload) {
            productsData = {};
            window.productsData = {};
        }
        
        const freshProductsData = await getAllProducts();
        
        // Update both local and global references
        productsData = freshProductsData || {};
        window.productsData = productsData;
        
        console.log('Products loaded successfully:', Object.keys(productsData).length, 'products');
        console.log('Sample product data:', Object.values(productsData)[0]);
        
        // Force refresh the display
        displayProducts();
        
        console.log('=== End loadProducts ===');
        
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Lỗi tải dữ liệu sản phẩm: ' + error.message, 'error');
    } finally {
        // Always reset loading flag
        isLoadingProducts = false;
    }
}

// Global variable to store categories data
let categoriesData = {};

// Helper function to get product type name
function getProductTypeName(productType) {
    const productTypes = {
        'cold': 'Hàng lạnh',
        'dry': 'Hàng khô', 
        'liquid': 'Hàng nước'
    };
    
    return productTypes[productType] || 'Chưa phân loại';
}

// Helper function to get category name from categoryId or direct category name
function getCategoryName(categoryId) {
    console.log('getCategoryName called with:', categoryId);
    console.log('Available categories:', window.categoriesData);
    
    // If no categoryId provided
    if (!categoryId) {
        return 'Chưa phân loại';
    }
    
    // Get categories data
    const categories = window.categoriesData || {};
    console.log('Categories object keys:', Object.keys(categories));
    
    // If categories data is available and categoryId exists in it
    if (categories[categoryId] && categories[categoryId].name) {
        console.log('Found category:', categories[categoryId]);
        return categories[categoryId].name;
    }
    
    // If categoryId looks like an ID but not found in categories
    if (typeof categoryId === 'string' && categoryId.startsWith('cat_')) {
        console.warn('Category ID not found in categories:', categoryId);
        console.warn('Available category IDs:', Object.keys(categories));
        return 'Chưa phân loại';
    }
    
    // If categoryId is actually a category name (string), return it directly
    if (typeof categoryId === 'string' && !categoryId.startsWith('cat_')) {
        return categoryId;
    }
    
    return 'Chưa phân loại';
}

// Debug function to check data
function debugCategoriesAndProducts() {
    console.log('=== DEBUG DATA ===');
    console.log('Categories data:', window.categoriesData);
    console.log('Products data:', window.productsData);
    
    if (window.categoriesData) {
        console.log('Available category IDs:', Object.keys(window.categoriesData));
        Object.entries(window.categoriesData).forEach(([id, cat]) => {
            console.log(`Category ${id}:`, cat);
        });
    }
    
    if (window.productsData) {
        console.log('Available product IDs:', Object.keys(window.productsData));
        Object.entries(window.productsData).forEach(([id, prod]) => {
            console.log(`Product ${id} categoryId:`, prod.categoryId);
        });
    }
    console.log('=== END DEBUG ===');
}

// Load product categories from Firebase
async function loadProductCategories() {
    console.log('=== DEBUG: Starting loadProductCategories ===');
    
    // Check if Firebase is available first
    if (typeof database === 'undefined' || !database) {
        console.error('Firebase database not available for loadProductCategories');
        return;
    }
    
    console.log('Firebase database is available');
    
    try {
        console.log('Loading product categories from Firebase...');
        console.log('Database reference path: categories');
        
        const categoriesRef = database.ref('categories');
        console.log('Categories reference created:', categoriesRef);
        
        const snapshot = await categoriesRef.once('value');
        console.log('Snapshot received:', snapshot);
        
        const categoriesData = snapshot.val();
        console.log('Categories data from Firebase:', categoriesData);
        console.log('Type of categoriesData:', typeof categoriesData);
        
        const categorySelect = document.getElementById('productCategory');
        if (!categorySelect) {
            console.error('Category select element not found');
            return;
        }
        
        console.log('Category select element found:', categorySelect);
        
        // Clear existing options except the default one
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục sản phẩm --</option>';
        
        if (categoriesData && typeof categoriesData === 'object') {
            // Store categories data globally for use in displayProducts
            window.categoriesData = categoriesData;
            
            const categoryKeys = Object.keys(categoriesData);
            console.log('Categories found:', categoryKeys.length, 'categories');
            console.log('Category keys:', categoryKeys);
            
            // Add categories to dropdown
            categoryKeys.forEach(categoryId => {
                const category = categoriesData[categoryId];
                console.log(`Processing category ${categoryId}:`, category);
                
                if (category && category.name) {
                    const option = document.createElement('option');
                    option.value = categoryId;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                    console.log(`Added category: ${category.name} (ID: ${categoryId})`);
                } else {
                    console.warn(`Invalid category data for ${categoryId}:`, category);
                }
            });
            
            console.log('Final dropdown options count:', categorySelect.options.length);
        } else {
            console.log('No categories found in database or data is not an object');
            // Add a message option when no categories exist
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Chưa có danh mục nào - Vui lòng tạo danh mục trước';
            option.disabled = true;
            categorySelect.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading product categories:', error);
        console.error('Error stack:', error.stack);
        showNotification('Lỗi tải danh mục sản phẩm!', 'error');
    }
    
    console.log('=== DEBUG: End loadProductCategories ===');
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
    console.log('=== Starting displayProducts ===');
    console.log('Products data to display:', productsData);
    console.log('Number of products:', productsData ? Object.keys(productsData).length : 0);
    
    const container = document.getElementById('productsContainer');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('productsTable');
    
    if (!container) {
        console.error('Products container not found!');
        return;
    }
    
    // Clear existing content first
    container.innerHTML = '';
    
    if (!productsData || Object.keys(productsData).length === 0) {
        console.log('No products to display');
        if (emptyState) emptyState.classList.remove('hidden');
        if (table) table.classList.add('hidden');
        return;
    }
    
    console.log('Displaying', Object.keys(productsData).length, 'products');
    if (emptyState) emptyState.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    
    let productsHTML = '';
    let index = 1;
    
    for (const [productId, product] of Object.entries(productsData)) {
        productsHTML += `
            <tr data-product-id="${productId}">
                <td class="text-center">
                    <input type="checkbox" class="product-checkbox" value="${productId}" onchange="updateBulkActions()">
                </td>
                <td class="text-center">${index}</td>
                <td>${product.name}</td>
                <td class="text-center">${product.sku || '<span class="text-muted">-</span>'}</td>
                <td class="text-center category-col">${getCategoryName(product.categoryId || product.category)}</td>
                <td class="text-right">${formatCurrency(product.price)}</td>
                <td class="text-center">${product.stock !== undefined ? product.stock : 0}</td>
                <td class="text-center">${product.unit || 'cái'}</td>
                <td class="text-center">${product.conversion !== undefined ? product.conversion : 1}</td>
                <td class="text-center">${getProductTypeName(product.productType)}</td>
                <td class="text-center">${product.weight ? product.weight + ' kg' : '-'}</td>
                <td class="text-center">
                    <button class="btn btn-warning btn-small product-edit-btn" 
                            data-product-id="${productId}" data-action="edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
                <td class="text-center">
                    <button class="btn btn-danger btn-small product-delete-btn" 
                            data-product-id="${productId}" data-action="delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        index++;
    }
    
    container.innerHTML = productsHTML;
    console.log('Products HTML updated in container');
    
    // Setup event delegation for product actions
    setupProductEventListeners();
    
    updateBulkActions();
    console.log('=== End displayProducts ===');
}

// Flag to prevent multiple submissions
let isAddingProduct = false;

// Setup event listeners for product actions using event delegation
function setupProductEventListeners() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    // Remove existing event listeners to prevent duplicates
    const existingListener = container._productEventListener;
    if (existingListener) {
        container.removeEventListener('click', existingListener);
    }
    
    // Create new event listener
    const eventListener = function(event) {
        const target = event.target;
        const button = target.closest('button[data-product-id]');
        
        if (!button) return;
        
        const productId = button.getAttribute('data-product-id');
        const action = button.getAttribute('data-action');
        
        if (action === 'delete') {
            event.preventDefault();
            deleteProduct(productId, button);
        } else if (action === 'edit') {
            event.preventDefault();
            editProduct(productId);
        }
    };
    
    // Add event listener and store reference
    container.addEventListener('click', eventListener);
    container._productEventListener = eventListener;
}

// Thêm sản phẩm mới
async function addNewProduct(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Prevent multiple submissions
    if (isAddingProduct) {
        console.log('Already adding product, ignoring duplicate call');
        return;
    }
    
    isAddingProduct = true;
    console.log('Starting addNewProduct...');
    
    // Disable submit button to prevent multiple clicks
    const submitBtn = document.querySelector('button[type="submit"]') || document.querySelector('input[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang thêm...';
    }
    
    // Check if Firebase is available
    if (typeof database === 'undefined' || !database) {
        console.error('Firebase database not available');
        showNotification('Lỗi kết nối cơ sở dữ liệu!', 'error');
        isAddingProduct = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Thêm Sản Phẩm';
        }
        return;
    }
    
    if (typeof addProduct !== 'function') {
        console.error('addProduct function not available');
        showNotification('Chức năng thêm sản phẩm chưa sẵn sàng!', 'error');
        isAddingProduct = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Thêm Sản Phẩm';
        }
        return;
    }
    
    // Get form values
    const name = document.getElementById('productName').value.trim();
    const sku = document.getElementById('productSKU').value.trim();
    const priceStr = document.getElementById('productPrice').value.trim();
    const categoryId = document.getElementById('productCategory').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const stockStr = document.getElementById('productStock').value.trim();
    const unit = document.getElementById('productUnit').value.trim();
    const conversion = document.getElementById('productConversion').value.trim();
    const productType = document.getElementById('productType').value.trim();
    const weightStr = document.getElementById('productWeight').value.trim();
    
    console.log('Adding product:', { name, sku, priceStr, categoryId, description, stockStr, unit, conversion, productType, weightStr });
    
    if (!name || !priceStr || !categoryId) {
        showNotification('Vui lòng nhập đầy đủ thông tin (tên, giá, danh mục)!', 'error');
        isAddingProduct = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Thêm Sản Phẩm';
        }
        return;
    }
    
    // Get numeric value from formatted price
    const price = getNumericPrice(priceStr);
    
    if (price <= 0) {
        showNotification('Giá sản phẩm phải lớn hơn 0!', 'error');
        isAddingProduct = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Thêm Sản Phẩm';
        }
        return;
    }
    
    // Parse and validate stock
    let stock = 0;
    if (stockStr) {
        const parsedStock = parseInt(stockStr);
        if (!isNaN(parsedStock) && parsedStock >= 0) {
            stock = parsedStock;
        }
    }
    
    // Parse and validate conversion
    let conversionValue = 1;
    if (conversion) {
        const parsedConversion = parseFloat(conversion);
        if (!isNaN(parsedConversion) && parsedConversion > 0) {
            conversionValue = parsedConversion;
        }
    }
    
    // Parse and validate weight
    let weight = null;
    if (weightStr) {
        const parsedWeight = parseFloat(weightStr);
        if (!isNaN(parsedWeight) && parsedWeight > 0) {
            weight = parsedWeight;
        }
    }
    
    const productData = {
        name: name,
        sku: sku,
        price: price,
        categoryId: categoryId,
        description: description,
        stock: stock,
        unit: unit || 'cái',
        conversion: conversionValue,
        productType: productType || null,
        weight: weight,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        showLoading(true);
        
        console.log('Calling addProduct with:', productData);
        const result = await addProduct(productData);
        console.log('Product added to Firebase:', result);
        
        // Clear form first
        document.getElementById('productName').value = '';
        document.getElementById('productSKU').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productDescription').value = '';
        document.getElementById('productStock').value = '0';
        document.getElementById('productUnit').value = '';
        document.getElementById('productConversion').value = '';
        document.getElementById('productType').value = '';
        document.getElementById('productWeight').value = '';
        
        // Show success message
        showNotification('Thêm sản phẩm thành công!', 'success');
        
        // Force reload products from Firebase to ensure consistency
        setTimeout(async () => {
            await loadProducts(true); // Force reload from Firebase
            console.log('Products reloaded from Firebase after add');
            
            // Sync new product data to sellingProducts
            await syncProductToSellingProducts(result.productId, productData);
        }, 300);
        
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Lỗi thêm sản phẩm: ' + error.message, 'error');
    } finally {
        // Always reset flag and re-enable button
        isAddingProduct = false;
        showLoading(false);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Thêm Sản Phẩm';
        }
        
        console.log('addNewProduct completed, flag reset');
    }
}

// Flag to prevent multiple delete operations
let isDeletingProduct = false;

// Flag to prevent multiple load operations
let isLoadingProducts = false;

// Delete single product
async function deleteProduct(productId, buttonElement) {
    // Prevent multiple delete operations
    if (isDeletingProduct) {
        console.log('Delete operation already in progress, ignoring...');
        return;
    }
    
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        return;
    }
    
    // Set flag to prevent multiple operations
    isDeletingProduct = true;
    
    // Get button element (either passed directly or find it)
    let deleteButton = buttonElement;
    if (!deleteButton) {
        // Fallback: find button by data attribute (more reliable than onclick)
        deleteButton = document.querySelector(`button[data-product-id="${productId}"][data-action="delete"]`);
    }
    
    // Disable button and show loading
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    try {
        console.log('Deleting product:', productId);
        
        // Check if Firebase is available
        if (typeof database === 'undefined' || !database) {
            throw new Error('Firebase database not available');
        }
        
        // Delete from Firebase
        await database.ref(`products/${productId}`).remove();
        console.log('Product deleted from Firebase successfully');
        
        // Remove from local data immediately
        if (window.productsData && window.productsData[productId]) {
            delete window.productsData[productId];
            delete productsData[productId];
        }
        
        // Show success message first
        showNotification('Xóa sản phẩm thành công!', 'success');
        
        // Force reload data from Firebase to ensure consistency
        setTimeout(async () => {
            await loadProducts(true); // Force reload from Firebase
            console.log('Products reloaded from Firebase after delete');
        }, 200);
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Lỗi xóa sản phẩm: ' + error.message, 'error');
        
        // Re-enable button on error
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        }
    } finally {
        // Always reset the flag after operation completes
        setTimeout(() => {
            isDeletingProduct = false;
        }, 500);
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
    
    // Disable bulk delete button to prevent multiple clicks
    const bulkDeleteBtn = document.querySelector('button[onclick="deleteSelectedProducts()"]');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = true;
        bulkDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xóa...';
    }
    
    try {
        console.log('Deleting selected products:', productIds);
        
        // Check if Firebase is available
        if (typeof database === 'undefined' || !database) {
            throw new Error('Firebase database not available');
        }
        
        // Delete each product from Firebase
        for (const productId of productIds) {
            await database.ref(`products/${productId}`).remove();
            console.log(`Deleted product ${productId} from Firebase`);
            
            // Remove from local data immediately
            if (window.productsData && window.productsData[productId]) {
                delete window.productsData[productId];
                delete productsData[productId];
            }
        }
        
        // Refresh UI immediately
        displayProducts();
        
        showNotification(`Đã xóa ${productIds.length} sản phẩm thành công!`, 'success');
        
    } catch (error) {
        console.error('Error deleting products:', error);
        showNotification('Lỗi xóa sản phẩm: ' + error.message, 'error');
    } finally {
        // Re-enable bulk delete button
        if (bulkDeleteBtn) {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Xóa đã chọn';
        }
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

// Notification debounce to prevent duplicates
let lastNotification = { message: '', type: '', time: 0 };

// Show notification
function showNotification(message, type = 'info') {
    console.log(`Notification [${type}]: ${message}`);
    
    // Debounce: prevent duplicate notifications within 1 second
    const now = Date.now();
    if (lastNotification.message === message && 
        lastNotification.type === type && 
        (now - lastNotification.time) < 1000) {
        console.log('Duplicate notification prevented:', message);
        return;
    }
    
    // Update last notification info
    lastNotification = { message, type, time: now };
    
    // Check if there's a global notification system (but not this function itself)
    if (typeof window.globalShowNotification === 'function') {
        window.globalShowNotification(message, type);
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

// Sync product data to sellingProducts table
async function syncProductToSellingProducts(productId, productData) {
    try {
        console.log('Syncing product to sellingProducts:', productId, productData);
        
        if (!database) {
            console.error('Firebase database not available for sync');
            return;
        }
        
        // Check if product already exists in sellingProducts
        const sellingProductRef = database.ref(`sellingProducts/${productId}`);
        const snapshot = await sellingProductRef.once('value');
        
        if (snapshot.exists()) {
            // Update existing sellingProduct with new fields
            const existingData = snapshot.val();
            const updateData = {
                productType: productData.productType,
                weight: productData.weight,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await sellingProductRef.update(updateData);
            console.log('Updated existing sellingProduct with new fields:', productId);
        } else {
            // Create new sellingProduct entry
            const sellingProductData = {
                productId: productId,
                productName: productData.name,
                sku: productData.sku,
                categoryId: productData.categoryId,
                importPrice: productData.price, // Use product price as import price
                sellingPrice: productData.price, // Default selling price same as import price
                productType: productData.productType,
                weight: productData.weight,
                unit: productData.unit,
                conversion: productData.conversion,
                stock: productData.stock,
                status: 'active',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await sellingProductRef.set(sellingProductData);
            console.log('Created new sellingProduct entry:', productId);
        }
        
    } catch (error) {
        console.error('Error syncing product to sellingProducts:', error);
    }
}

// Sync all existing products to sellingProducts (migration function)
async function syncAllProductsToSellingProducts() {
    try {
        console.log('Starting bulk sync of products to sellingProducts...');
        
        if (!database) {
            console.error('Firebase database not available for bulk sync');
            return;
        }
        
        // Get all products
        const productsRef = database.ref('products');
        const productsSnapshot = await productsRef.once('value');
        
        if (!productsSnapshot.exists()) {
            console.log('No products found to sync');
            return;
        }
        
        const products = productsSnapshot.val();
        const productIds = Object.keys(products);
        
        console.log(`Found ${productIds.length} products to sync`);
        
        // Sync each product
        for (const productId of productIds) {
            const productData = products[productId];
            await syncProductToSellingProducts(productId, productData);
        }
        
        console.log('Bulk sync completed successfully');
        showNotification('Đồng bộ tất cả sản phẩm thành công!', 'success');
        
    } catch (error) {
        console.error('Error in bulk sync:', error);
        showNotification('Lỗi đồng bộ sản phẩm: ' + error.message, 'error');
    }
}