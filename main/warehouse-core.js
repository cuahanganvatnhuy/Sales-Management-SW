// Warehouse Management Core Functions - Complete Implementation
console.log('=== Warehouse Management Core Loading ===');

// Global variables
let warehouseData = {};
let categoriesData = {};
let stockInCounter = 0;
let stockOutCounter = 0;
let warehouseTransactions = [];
let categoryChart = null;
let valueChart = null;

// Initialize warehouse management
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing warehouse management...');
    setTimeout(initializeWarehouseManagement, 500);
});

async function initializeWarehouseManagement() {
    try {
        console.log('=== Initializing Warehouse Management ===');
        
        // Check Firebase connection
        if (!window.database) {
            console.log('Initializing Firebase...');
            if (typeof firebase !== 'undefined') {
                window.database = firebase.database();
            } else {
                throw new Error('Firebase not loaded');
            }
        }
        
        // Initialize sample data if needed
        if (typeof window.initializeWarehouseData === 'function') {
            await window.initializeWarehouseData();
        }
        
        // Load data
        await loadWarehouseData();
        await loadCategories();
        await loadTransactionHistory();
        
        // Initialize UI
        updateDashboard();
        
        // Debug categories before populating filter
        console.log('=== CATEGORIES DEBUG ===');
        console.log('categoriesData:', categoriesData);
        console.log('categoriesData type:', typeof categoriesData);
        console.log('categoriesData keys:', Object.keys(categoriesData || {}));
        console.log('categoriesData values:', Object.values(categoriesData || {}));
        
        populateCategoryFilter();
        populateProductSelects();
        
        // Force display warehouse table with debug logging
        console.log('About to display warehouse table...');
        console.log('warehouseData:', warehouseData);
        console.log('warehouseData keys:', Object.keys(warehouseData || {}));
        console.log('warehouseData sample:', Object.values(warehouseData || {})[0]);
        
        // Force multiple attempts to display the table
        setTimeout(() => {
            console.log('First display attempt at 100ms');
            displayWarehouseTable();
        }, 100);
        setTimeout(() => {
            console.log('Second display attempt at 1000ms');
            displayWarehouseTable();
        }, 1000);
        setTimeout(() => {
            console.log('Final display attempt at 2000ms');
            const tbody = document.getElementById('warehouseTableBody');
            console.log('Final check - tbody exists:', !!tbody);
            console.log('Final check - tbody children:', tbody ? tbody.children.length : 'N/A');
            console.log('Final check - warehouseData keys:', Object.keys(warehouseData || {}).length);
            if (tbody && tbody.children.length === 0 && Object.keys(warehouseData).length > 0) {
                console.log('Forcing table display in final attempt');
                displayWarehouseTable();
            }
        }, 2000);
        
        // Add immediate call to displayWarehouseTable
        displayWarehouseTable();
        
        initializeCharts();
        checkLowStockAlerts();
        
        console.log('Warehouse management initialized successfully');
        showNotification('Hệ thống quản lý kho đã sẵn sàng!', 'success');
        
    } catch (error) {
        console.error('Error initializing warehouse management:', error);
        showNotification('Lỗi khởi tạo hệ thống: ' + error.message, 'error');
    }
}

// Load warehouse data
async function loadWarehouseData() {
    try {
        console.log('Loading warehouse data...');
        const snapshot = await database.ref('products').once('value');
        const products = snapshot.val() || {};
        
        warehouseData = {};
        for (const [id, product] of Object.entries(products)) {
            warehouseData[id] = {
                ...product,
                id: id,
                stock: product.stock || 0,
                unit: product.unit || 'cái',
                conversion: product.conversion || 1,
                costPrice: product.costPrice || product.price || 0,
                minStock: product.minStock || 10
            };
        }
        
        console.log(`Loaded ${Object.keys(warehouseData).length} products`);
        window.warehouseData = warehouseData;
        
    } catch (error) {
        console.error('Error loading warehouse data:', error);
        throw error;
    }
}

// Load categories
async function loadCategories() {
    try {
        console.log('Loading categories...');
        const snapshot = await database.ref('categories').once('value');
        categoriesData = snapshot.val() || {};
        console.log(`Loaded ${Object.keys(categoriesData).length} categories`, categoriesData);
        
        // Force reload categories if empty or insufficient
        if (Object.keys(categoriesData).length < 3) {
            console.log('Categories data insufficient, trying alternative paths...');
            
            // Try loading from productCategories path
            const altSnapshot = await database.ref('productCategories').once('value');
            const altData = altSnapshot.val() || {};
            console.log('Alternative categories data:', altData);
            
            if (Object.keys(altData).length > Object.keys(categoriesData).length) {
                categoriesData = altData;
                console.log('Using alternative categories data');
            }
        }
        
    } catch (error) {
        console.error('Error loading categories:', error);
        categoriesData = {};
    }
}

// Load transaction history
async function loadTransactionHistory() {
    try {
        console.log('Loading transaction history...');
        const snapshot = await database.ref('warehouseTransactions').orderByChild('timestamp').limitToLast(100).once('value');
        const transactions = snapshot.val() || {};
        warehouseTransactions = Object.values(transactions).reverse();
        console.log(`Loaded ${warehouseTransactions.length} transactions`);
        
    } catch (error) {
        console.error('Error loading transaction history:', error);
        warehouseTransactions = [];
    }
}

// Update dashboard
function updateDashboard() {
    const products = Object.values(warehouseData);
    const totalProducts = products.length;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    products.forEach(product => {
        const stock = product.stock || 0;
        const costPrice = product.costPrice || 0;
        totalValue += stock * costPrice;
        
        if (stock <= 0) {
            outOfStockCount++;
        } else if (stock <= (product.minStock || 10)) {
            lowStockCount++;
        }
    });
    
    // Update dashboard cards
    const totalProductsEl = document.getElementById('totalProducts');
    const totalValueEl = document.getElementById('totalValue');
    const lowStockCountEl = document.getElementById('lowStockCount');
    const outOfStockCountEl = document.getElementById('outOfStockCount');
    
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue) + ' VNĐ';
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
    if (outOfStockCountEl) outOfStockCountEl.textContent = outOfStockCount;
}

// Format currency
function formatCurrency(amount) {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return '0';
    return new Intl.NumberFormat('vi-VN').format(numAmount);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const icon = notification.querySelector('.notification-icon');
    const messageSpan = notification.querySelector('.notification-message');
    
    // Set icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    if (icon) icon.className = `notification-icon ${iconClass}`;
    if (messageSpan) messageSpan.textContent = message;
    
    // Set notification type class
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

// Populate category filter
function populateCategoryFilter() {
    console.log('Populating category filter...');
    const categoryFilter = document.getElementById('categoryFilter');
    console.log('Category filter element:', categoryFilter);
    
    if (!categoryFilter) {
        console.log('Category filter not found!');
        return;
    }
    
    // Clear existing options except "All"
    categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
    
    console.log('Categories data available:', categoriesData);
    console.log('Number of categories to populate:', Object.values(categoriesData).length);
    console.log('Categories keys:', Object.keys(categoriesData));
    
    // Add category options - check both Object.values and Object.entries
    if (categoriesData && typeof categoriesData === 'object') {
        Object.entries(categoriesData).forEach(([key, category]) => {
            console.log('Processing category entry:', key, category);
            
            // Handle different data structures
            let categoryId, categoryName;
            if (category && typeof category === 'object') {
                categoryId = category.id || key;
                categoryName = category.name || category.categoryName || key;
            } else if (typeof category === 'string') {
                categoryId = key;
                categoryName = category;
            } else {
                console.log('Skipping invalid category:', category);
                return;
            }
            
            console.log('Adding category:', categoryName, 'with ID:', categoryId);
            const option = document.createElement('option');
            option.value = categoryId;
            option.textContent = categoryName;
            categoryFilter.appendChild(option);
        });
    }
    
    console.log('Category filter populated. Total options:', categoryFilter.options.length);
}

// Populate product selects in modals
function populateProductSelects() {
    const selects = ['stockInProduct', 'stockOutProduct', 'adjustmentProduct'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '<option value="">Chọn sản phẩm</option>';
        
        // Add product options
        Object.values(warehouseData).forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.unit})`;
            option.setAttribute('data-unit', product.unit);
            option.setAttribute('data-stock', product.stock || 0);
            select.appendChild(option);
        });
    });
    
    // Populate category dropdown for new products
    populateNewProductCategories();
}

// Populate category dropdown for new products
function populateNewProductCategories() {
    const categorySelect = document.getElementById('newProductCategory');
    if (!categorySelect) return;
    
    // Clear existing options
    categorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
    
    // Add category options
    Object.values(categoriesData).forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// Toggle stock in mode
function toggleStockInMode() {
    const existingMode = document.getElementById('existingProductMode');
    const newMode = document.getElementById('newProductMode');
    const existingSection = document.getElementById('existingProductSection');
    const newSection = document.getElementById('newProductSection');
    
    if (!existingMode || !newMode || !existingSection || !newSection) return;
    
    if (existingMode.checked) {
        existingSection.style.display = 'block';
        newSection.style.display = 'none';
        
        // Set required fields for existing product mode
        document.getElementById('stockInProduct').required = true;
        document.getElementById('newProductName').required = false;
    } else if (newMode.checked) {
        existingSection.style.display = 'none';
        newSection.style.display = 'block';
        
        // Set required fields for new product mode
        document.getElementById('stockInProduct').required = false;
        document.getElementById('newProductName').required = true;
    }
}

// Display warehouse table
function displayWarehouseTable() {
    console.log('=== displayWarehouseTable called ===');
    console.log('warehouseData available:', !!warehouseData);
    console.log('warehouseData length:', Object.keys(warehouseData || {}).length);
    console.log('warehouseData sample:', Object.values(warehouseData || {})[0]);
    
    const tbody = document.getElementById('warehouseTableBody');
    console.log('tbody element found:', !!tbody);
    
    if (!tbody) {
        console.error('warehouseTableBody element not found!');
        // Try to find it with a different approach
        const allTbodies = document.querySelectorAll('tbody');
        console.log('All tbody elements found:', allTbodies.length);
        allTbodies.forEach((tb, index) => {
            console.log(`tbody ${index} id:`, tb.id);
        });
        return;
    }
    
    tbody.innerHTML = '';
    console.log('tbody cleared');
    
    // Force table to be visible
    const table = tbody.closest('table');
    if (table) {
        table.style.display = 'table';
        table.style.visibility = 'visible';
    }
    tbody.style.display = 'table-row-group';
    tbody.style.visibility = 'visible';
    
    // Check if we have data
    if (!warehouseData || Object.keys(warehouseData).length === 0) {
        console.log('No warehouse data available');
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">Không có dữ liệu sản phẩm</td></tr>';
        return;
    }
    
    console.log('About to process', Object.keys(warehouseData).length, 'products');
    
    // Debug: Log the actual structure of the first product
    const firstProduct = Object.values(warehouseData)[0];
    console.log('First product structure:', firstProduct);
    console.log('First product keys:', Object.keys(firstProduct || {}));
    
    // Get filter values
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const stockStatusFilter = document.getElementById('stockStatusFilter')?.value || '';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // Debug filter values
    console.log('Filter values:', {
        categoryFilter,
        stockStatusFilter,
        searchTerm
    });
    
    // Filter products
    let filteredProducts = Object.values(warehouseData).filter(product => {
        console.log('Filtering product:', product.name, {
            categoryId: product.categoryId,
            category: product.category,
            stock: product.stock,
            currentStock: product.currentStock
        });
        
        // Category filter - use both categoryId and category fields
        if (categoryFilter && product.categoryId !== categoryFilter && product.category !== categoryFilter) {
            console.log('Product filtered out by category:', product.name);
            return false;
        }
        
        // Stock status filter - use currentStock or stock
        if (stockStatusFilter) {
            const stock = product.currentStock || product.stock || 0;
            const minStock = product.minStock || 10;
            
            if (stockStatusFilter === 'in_stock' && stock <= minStock) {
                console.log('Product filtered out by in_stock filter:', product.name);
                return false;
            }
            if (stockStatusFilter === 'low_stock' && (stock <= 0 || stock > minStock)) {
                console.log('Product filtered out by low_stock filter:', product.name);
                return false;
            }
            if (stockStatusFilter === 'out_of_stock' && stock > 0) {
                console.log('Product filtered out by out_of_stock filter:', product.name);
                return false;
            }
        }
        
        // Search filter
        if (searchTerm) {
            const searchableText = (
                (product.name || '') + ' ' +
                (product.sku || '') + ' ' +
                (categoriesData[product.categoryId]?.name || product.category || '')
            ).toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                console.log('Product filtered out by search:', product.name);
                return false;
            }
        }
        
        console.log('Product passed all filters:', product.name);
        return true;
    });
    
    // Sort by name
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    
    // Display products
    console.log('Filtered products count:', filteredProducts.length);
    filteredProducts.forEach((product, index) => {
        console.log(`Processing product ${index + 1}:`, product.name);
        
        const row = document.createElement('tr');
        const stock = product.currentStock || product.endingStock || product.stock || 0;
        const minStock = product.minStock || 10;
        
        // Determine status
        let status = 'Còn hàng';
        let statusClass = 'status-in-stock';
        if (stock <= 0) {
            status = 'Hết hàng';
            statusClass = 'status-out-of-stock';
        } else if (stock <= minStock) {
            status = 'Sắp hết';
            statusClass = 'status-low-stock';
        }
        
        const categoryName = product.category || categoriesData[product.categoryId]?.name || 'Chưa phân loại';
        const totalValue = (stock * (product.costPrice || product.price || 0));
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="product-checkbox" value="${product.id}" onchange="updateSelectedCount()">
            </td>
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${product.sku || 'N/A'}</td>
            <td>${categoryName}</td>
            <td>${product.unit || 'cái'}</td>
            <td>${stock}</td>
            <td>${formatCurrency(product.costPrice || product.price || 0)}</td>
            <td>${formatCurrency(totalValue)}</td>
            <td><span class="status ${statusClass}">${status}</span></td>
            <td>
                <button type="button" class="btn btn-sm btn-success" onclick="openStockInModal('${product.id}')">
                    <i class="fas fa-plus"></i>
                </button>
                <button type="button" class="btn btn-sm btn-warning" onclick="openStockOutModal('${product.id}')">
                    <i class="fas fa-minus"></i>
                </button>
                <button type="button" class="btn btn-sm btn-info" onclick="openAdjustmentModal('${product.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-danger" onclick="showDeleteConfirmModal('${product.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        console.log('Adding row to tbody for product:', product.name);
        tbody.appendChild(row);
    });
    
    console.log(`Displayed ${filteredProducts.length} products in table`);
    
    // Show empty state if no products
    if (filteredProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Không tìm thấy sản phẩm nào</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Modal functions - Stock In
function openStockInModal(productId = null) {
    const modal = document.getElementById('stockInModal');
    const form = document.getElementById('stockInForm');
    const productSelect = document.getElementById('stockInProduct');
    const existingMode = document.getElementById('existingProductMode');
    const newMode = document.getElementById('newProductMode');
    
    if (!modal || !form) return;
    
    form.reset();
    
    // Set default mode to existing product
    if (existingMode) {
        existingMode.checked = true;
    }
    if (newMode) {
        newMode.checked = false;
    }
    
    // Initialize toggle state
    toggleStockInMode();
    
    if (productId && productSelect) {
        productSelect.value = productId;
        updateStockInProductInfo();
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeStockInModal() {
    const modal = document.getElementById('stockInModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function updateStockInProductInfo() {
    const productSelect = document.getElementById('stockInProduct');
    const currentStockEl = document.getElementById('stockInCurrentStock');
    
    if (!productSelect || !currentStockEl) return;
    
    const productId = productSelect.value;
    if (!productId || !warehouseData[productId]) {
        currentStockEl.value = '';
        return;
    }
    
    const product = warehouseData[productId];
    currentStockEl.value = `${formatCurrency(product.stock || 0)} ${product.unit}`;
}

async function processStockIn(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Get form data - Stock In modal now only creates new products
    const newProductName = formData.get('newProductName')?.trim();
    const newProductSku = formData.get('newProductSku')?.trim() || '';
    const newProductDescription = formData.get('newProductDescription')?.trim() || '';
    const newProductCategory = formData.get('newProductCategory');
    const newProductUnit = formData.get('newProductUnit')?.trim();
    const newProductConversion = formData.get('newProductConversion')?.trim() || '';
    // Get values - only price field is formatted, quantity is normal input
    const quantity = parseFloat(formData.get('stockInQuantity'));
    const priceInput = document.getElementById('stockInUnitPrice');
    const unitPrice = parseFloat(priceInput.getAttribute('data-numeric-value') || priceInput.value.replace(/\./g, '')) || 0;
    const supplier = formData.get('stockInSupplier')?.trim() || '';
    const note = formData.get('stockInNote')?.trim() || '';
    
    // Validate required fields
    if (!newProductName) {
        showNotification('Vui lòng nhập tên sản phẩm!', 'error');
        return;
    }
    
    if (!newProductCategory) {
        showNotification('Vui lòng chọn danh mục sản phẩm!', 'error');
        return;
    }
    
    if (!newProductUnit) {
        showNotification('Vui lòng chọn đơn vị tính!', 'error');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        showNotification('Vui lòng nhập số lượng tồn kho hợp lệ!', 'error');
        return;
    }
    
    if (!unitPrice || unitPrice <= 0) {
        showNotification('Vui lòng nhập giá sản phẩm hợp lệ!', 'error');
        return;
    }
    
    // Generate new product ID
    const productId = 'product_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create new product object
    const product = {
        id: productId,
        name: newProductName,
        sku: newProductSku,
        description: newProductDescription,
        categoryId: newProductCategory,
        unit: newProductUnit,
        conversion: newProductConversion,
        price: unitPrice, // Product price
        costPrice: unitPrice, // Cost price (same as product price for new products)
        minStock: 10, // Default minimum stock
        stock: quantity, // Initial stock quantity
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        showLoading(true);
        
        // Save the new product to Firebase
        await database.ref(`products/${productId}`).set(product);
        
        // Add to local warehouseData
        warehouseData[productId] = product;
        
        const transactionId = database.ref('warehouseTransactions').push().key;
        const transaction = {
            id: transactionId,
            type: 'in',
            productId: productId,
            productName: product.name,
            productSku: product.sku,
            productCategory: categoriesData[product.categoryId]?.name || 'Khác',
            quantity: quantity,
            unitPrice: unitPrice,
            totalValue: quantity * unitPrice,
            supplier: supplier,
            note: note,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            userId: 'admin'
        };
        
        await database.ref(`warehouseTransactions/${transactionId}`).set(transaction);
        
        // Update local data
        warehouseTransactions.unshift(transaction);
        
        // Refresh UI components
        updateDashboard();
        populateProductSelects(); // Refresh product selects in case new product was added
        displayWarehouseTable();
        
        showNotification(`Đã tạo sản phẩm mới "${product.name}" và nhập ${quantity} ${product.unit} vào kho!`, 'success');
        closeStockInModal();
        
    } catch (error) {
        console.error('Error processing stock in:', error);
        showNotification('Lỗi nhập kho: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Modal functions - Stock Out
function openStockOutModal(productId = null) {
    const modal = document.getElementById('stockOutModal');
    const form = document.getElementById('stockOutForm');
    const productSelect = document.getElementById('stockOutProduct');
    
    if (!modal || !form) return;
    
    form.reset();
    
    if (productId && productSelect) {
        productSelect.value = productId;
        updateStockOutProductInfo();
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeStockOutModal() {
    const modal = document.getElementById('stockOutModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function updateStockOutProductInfo() {
    const productSelect = document.getElementById('stockOutProduct');
    const currentStockEl = document.getElementById('stockOutCurrentStock');
    const maxQuantityEl = document.getElementById('stockOutQuantity');
    
    if (!productSelect || !currentStockEl) return;
    
    const productId = productSelect.value;
    if (!productId || !warehouseData[productId]) {
        currentStockEl.value = '';
        if (maxQuantityEl) maxQuantityEl.max = '';
        return;
    }
    
    const product = warehouseData[productId];
    const currentStock = product.stock || 0;
    currentStockEl.value = `${formatCurrency(currentStock)} ${product.unit}`;
    
    if (maxQuantityEl) {
        maxQuantityEl.max = currentStock;
        maxQuantityEl.placeholder = `Tối đa: ${formatCurrency(currentStock)}`;
    }
}

async function processStockOut(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const productId = formData.get('stockOutProduct');
    const quantity = parseFloat(formData.get('stockOutQuantity'));
    const reason = formData.get('stockOutReason') || '';
    const customReason = formData.get('stockOutCustomReason') || '';
    const note = formData.get('stockOutNote') || '';
    
    if (!productId || !quantity || quantity <= 0) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const product = warehouseData[productId];
        if (!product) {
            throw new Error('Sản phẩm không tồn tại');
        }
        
        const currentStock = product.stock || 0;
        if (quantity > currentStock) {
            throw new Error(`Không đủ hàng trong kho. Tồn kho hiện tại: ${formatCurrency(currentStock)} ${product.unit}`);
        }
        
        const newStock = currentStock - quantity;
        
        await database.ref(`products/${productId}/stock`).set(newStock);
        
        const transactionId = database.ref('warehouseTransactions').push().key;
        const transaction = {
            id: transactionId,
            type: 'out',
            productId: productId,
            productName: product.name,
            productSku: product.sku,
            productCategory: categoriesData[product.categoryId]?.name || 'Khác',
            quantity: quantity,
            unitPrice: product.costPrice || 0,
            totalValue: quantity * (product.costPrice || 0),
            reason: reason,
            customReason: customReason,
            note: note,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            userId: 'admin'
        };
        
        await database.ref(`warehouseTransactions/${transactionId}`).set(transaction);
        
        warehouseData[productId].stock = newStock;
        warehouseTransactions.unshift(transaction);
        
        updateDashboard();
        displayWarehouseTable();
        
        showNotification(`Đã xuất ${formatCurrency(quantity)} ${product.unit} ${product.name}`, 'success');
        
        // Show print confirmation modal
        showPrintConfirmModal(transaction, product);
        
        closeStockOutModal();
        
        if (newStock <= product.minStock) {
            setTimeout(() => {
                showNotification(`Cảnh báo: ${product.name} sắp hết hàng (còn ${formatCurrency(newStock)} ${product.unit})`, 'warning');
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error processing stock out:', error);
        showNotification('Lỗi xuất kho: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Helper functions for loading data into select elements
function loadProductsIntoSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Chọn sản phẩm</option>';
    
    Object.keys(warehouseData).forEach(productId => {
        const product = warehouseData[productId];
        const option = document.createElement('option');
        option.value = productId;
        option.textContent = `${product.name} (${product.sku || 'N/A'})`;
        select.appendChild(option);
    });
}

function loadCategoriesIntoSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error('Select element not found:', selectId);
        return;
    }
    
    select.innerHTML = '<option value="">Chọn danh mục</option>';
    
    // Debug: Check categoriesData from database
    console.log('Loading categories from database, categoriesData:', Object.keys(categoriesData).length, 'categories');
    
    // Load categories from Firebase database
    if (categoriesData && Object.keys(categoriesData).length > 0) {
        Object.entries(categoriesData).forEach(([categoryId, category]) => {
            if (category && category.name) {
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = category.name;
                select.appendChild(option);
            }
        });
        console.log('Categories loaded from database:', Object.keys(categoriesData).length, 'categories');
    } else {
        console.log('No categories found in database, categoriesData might not be loaded yet');
        // Try to reload categories if not available
        if (typeof loadWarehouseData === 'function') {
            console.log('Attempting to reload warehouse data including categories...');
            // Don't call loadWarehouseData here to avoid infinite loop
        }
    }
    
    console.log('Categories loaded into select:', select.options.length - 1, 'options');
}

// Modal functions - Adjustment
function openAdjustmentModal(productId = null) {
    const modal = document.getElementById('adjustmentModal');
    const form = document.getElementById('adjustmentForm');
    const productSelect = document.getElementById('adjustmentProduct');
    
    if (!modal || !form) return;
    
    // Reset form first
    form.reset();
    
    // Load products into select
    loadProductsIntoSelect('adjustmentProduct');
    
    // Load categories
    loadCategoriesIntoSelect('adjustProductCategory');
    
    // Set selected product and load its data after a short delay to ensure options are loaded
    if (productId && productSelect) {
        setTimeout(() => {
            productSelect.value = productId;
            loadProductForAdjustment();
        }, 100);
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function loadProductForAdjustment() {
    const productSelect = document.getElementById('adjustmentProduct');
    const productId = productSelect.value;
    
    if (!productId || !warehouseData[productId]) {
        // Clear all fields if no product selected
        document.getElementById('adjustProductName').value = '';
        document.getElementById('adjustProductSku').value = '';
        document.getElementById('adjustUnitPrice').value = '';
        document.getElementById('adjustProductCategory').value = '';
        document.getElementById('adjustProductUnit').value = '';
        document.getElementById('currentStock').value = '';
        document.getElementById('adjustQuantity').value = '';
        document.getElementById('adjustProductConversion').value = '';
        document.getElementById('adjustProductDescription').value = '';
        document.getElementById('adjustSupplier').value = '';
        return;
    }
    
    const product = warehouseData[productId];
    
    // Fill form with current product data
    document.getElementById('adjustProductName').value = product.name || '';
    document.getElementById('adjustProductSku').value = product.sku || '';
    document.getElementById('adjustUnitPrice').value = product.costPrice || '';
    
    // Set category - need to find the correct categoryId
    let categoryToSelect = '';
    if (product.categoryId) {
        // If product has categoryId, use it directly
        categoryToSelect = product.categoryId;
    } else if (product.category) {
        // If product has category name, find the matching categoryId
        const categoryEntry = Object.entries(categoriesData).find(([id, cat]) => 
            cat.name === product.category
        );
        if (categoryEntry) {
            categoryToSelect = categoryEntry[0]; // categoryId
        }
    }
    document.getElementById('adjustProductCategory').value = categoryToSelect;
    
    document.getElementById('adjustProductUnit').value = product.unit || '';
    document.getElementById('currentStock').value = formatCurrency(product.stock || 0) + ' ' + (product.unit || '');
    document.getElementById('adjustQuantity').value = product.stock || 0;
    document.getElementById('adjustProductConversion').value = product.conversion || '';
    document.getElementById('adjustProductDescription').value = product.description || '';
    document.getElementById('adjustSupplier').value = product.supplier || '';
    
    console.log('Product loaded for adjustment:', {
        productId,
        productName: product.name,
        originalCategory: product.category,
        originalCategoryId: product.categoryId,
        selectedCategoryId: categoryToSelect
    });
}

function closeAdjustmentModal() {
    const modal = document.getElementById('adjustmentModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function loadCurrentStock() {
    const productSelect = document.getElementById('adjustmentProduct');
    const currentStockEl = document.getElementById('currentStock');
    const actualStockEl = document.getElementById('actualStock');
    
    if (!productSelect || !currentStockEl) return;
    
    const productId = productSelect.value;
    if (!productId || !warehouseData[productId]) {
        currentStockEl.value = '';
        if (actualStockEl) actualStockEl.value = '';
        return;
    }
    
    const product = warehouseData[productId];
    const currentStock = product.stock || 0;
    currentStockEl.value = `${formatCurrency(currentStock)} ${product.unit}`;
    
    if (actualStockEl) {
        actualStockEl.value = currentStock;
        actualStockEl.focus();
    }
}

async function processAdjustment(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Debug: Log all form data
    console.log('=== Processing Adjustment ===');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }
    
    const productId = document.getElementById('adjustmentProduct').value;
    const productName = formData.get('adjustProductName');
    const sku = formData.get('adjustProductSku') || '';
    const unitPrice = parseFloat(formData.get('adjustUnitPrice'));
    const categoryId = formData.get('adjustProductCategory'); // This is categoryId, not category name
    const unit = formData.get('adjustProductUnit');
    const newStock = parseFloat(formData.get('adjustQuantity'));
    const conversion = formData.get('adjustProductConversion') || '';
    const description = formData.get('adjustProductDescription') || '';
    const supplier = formData.get('adjustSupplier') || '';
    const reason = formData.get('adjustmentReason') || '';
    const note = formData.get('adjustmentNote') || '';
    
    console.log('Parsed data:', {
        productId, productName, sku, unitPrice, categoryId, unit, newStock, conversion, description, supplier, reason, note
    });
    
    // Validation - make some fields optional
    if (!productId || !productName || !categoryId || !unit || isNaN(unitPrice) || isNaN(newStock) || newStock < 0) {
        console.error('Validation failed:', {
            productId: !!productId,
            productName: !!productName,
            categoryId: !!categoryId,
            unit: !!unit,
            unitPriceValid: !isNaN(unitPrice),
            newStockValid: !isNaN(newStock) && newStock >= 0
        });
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const product = warehouseData[productId];
        if (!product) {
            throw new Error('Sản phẩm không tồn tại');
        }
        
        const currentStock = product.stock || 0;
        const stockDifference = newStock - currentStock;
        
        // Get category name from categoryId for backward compatibility
        const categoryName = categoriesData[categoryId]?.name || '';
        
        // Prepare updated product data
        const updatedProduct = {
            ...product,
            name: productName,
            sku: sku,
            costPrice: unitPrice,
            category: categoryName, // Store category name for backward compatibility
            categoryId: categoryId, // Store categoryId for new system
            unit: unit,
            stock: newStock,
            conversion: conversion,
            description: description,
            supplier: supplier,
            lastUpdated: Date.now()
        };
        
        console.log('Updated product data:', updatedProduct);
        
        // Update product in Firebase
        await database.ref(`products/${productId}`).set(updatedProduct);
        
        // Create adjustment transaction
        const transactionId = database.ref('warehouse_transactions').push().key;
        const transaction = {
            id: transactionId,
            type: 'adjustment',
            productId: productId,
            productName: productName,
            oldStock: currentStock,
            newStock: newStock,
            stockDifference: stockDifference,
            changes: {
                name: { old: product.name, new: productName },
                sku: { old: product.sku || '', new: sku },
                price: { old: product.costPrice || 0, new: unitPrice },
                category: { old: product.category || '', new: categoryName },
                unit: { old: product.unit || '', new: unit },
                stock: { old: currentStock, new: newStock }
            },
            reason: reason,
            note: note,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            userId: 'admin'
        };
        
        await database.ref(`warehouse_transactions/${transactionId}`).set(transaction);
        
        // Update local data
        warehouseData[productId] = updatedProduct;
        warehouseTransactions.unshift(transaction);
        
        updateDashboard();
        displayWarehouseTable();
        
        let message = `Đã cập nhật sản phẩm "${productName}" thành công!`;
        if (stockDifference !== 0) {
            const adjustmentType = stockDifference > 0 ? 'tăng' : 'giảm';
            message += ` Tồn kho ${adjustmentType} ${formatCurrency(Math.abs(stockDifference))} ${unit}.`;
        }
        
        showNotification(message, 'success');
        closeAdjustmentModal();
        
    } catch (error) {
        console.error('Error processing adjustment:', error);
        showNotification('Lỗi cập nhật sản phẩm: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Show loading
function showLoading(show = true) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Filter functions
function applyFilters() {
    filterWarehouse();
    displayWarehouseTable();
    // Show warehouse report button when a category is selected
    const categoryFilter = document.getElementById('categoryFilter');
    const warehouseReportBtn = document.getElementById('warehouseReportBtn');
    if (categoryFilter && warehouseReportBtn) {
        if (categoryFilter.value) {
            warehouseReportBtn.style.display = 'block';
        } else {
            warehouseReportBtn.style.display = 'none';
        }
    }
}

function filterWarehouse() {
    displayWarehouseTable();
}

function searchWarehouse() {
    displayWarehouseTable();
}

// Charts functions
function initializeCharts() {
    setTimeout(() => {
        initializeCategoryChart();
        initializeValueChart();
    }, 1000);
}

function initializeCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (categoryChart) {
        categoryChart.destroy();
    }

    const categoryStats = {};
    Object.values(warehouseData).forEach(product => {
        const categoryId = product.categoryId || 'uncategorized';
        const categoryName = categoriesData[categoryId]?.name || 'Chưa phân loại';

        if (!categoryStats[categoryName]) {
            categoryStats[categoryName] = 0;
        }
        categoryStats[categoryName] += product.stock || 0;
    });

    const labels = Object.keys(categoryStats);
    const data = Object.values(categoryStats);
    const colors = generateColors(labels.length);

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            return `${label}: ${value} sản phẩm`;
                        }
                    }
                }
            }
        }
    });
}

function initializeValueChart() {
    const ctx = document.getElementById('valueChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (valueChart) {
        valueChart.destroy();
    }

    const productValues = Object.values(warehouseData)
        .map(product => ({
            name: product.name,
            value: (product.stock || 0) * (product.costPrice || 0)
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    const labels = productValues.map(p => p.name);
    const data = productValues.map(p => p.value);

    valueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Giá trị (VNĐ)',
                data: data,
                backgroundColor: 'rgba(40, 167, 69, 0.8)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value) + ' VNĐ';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Giá trị: ${formatCurrency(context.parsed.y)} VNĐ`;
                        }
                    }
                }
            }
        }
    });
}

function updateCharts() {
    if (categoryChart || valueChart) {
        setTimeout(() => {
            initializeCharts();
        }, 100);
    }
}

function generateColors(count) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
        '#4BC0C0', '#FF6384'
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    return result;
}

// Export functions
async function exportWarehouseReport() {
    try {
        showLoading(true);

        const products = Object.values(warehouseData);
        const currentDate = new Date();
        const dateStr = currentDate.toLocaleDateString('vi-VN');
        const timeStr = currentDate.toLocaleTimeString('vi-VN');

        // Calculate summary statistics
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, product) => sum + ((product.stock || 0) * (product.costPrice || 0)), 0);
        const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.minStock || 10)).length;
        const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length;

        // Create beautiful HTML report
        const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Cáo Tồn Kho - ${dateStr}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; padding: 30px; background: #f8f9fa; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .summary-card h3 { color: #333; margin-bottom: 10px; }
        .summary-card .value { font-size: 2rem; font-weight: bold; color: #007bff; }
        .table-container { padding: 30px; }
        .table-title { font-size: 1.5rem; color: #333; margin-bottom: 20px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: linear-gradient(135deg, #f8f9fa, #e9ecef); font-weight: 600; color: #333; }
        tbody tr:hover { background-color: #f8f9fa; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
        .status-in-stock { background: #d4edda; color: #155724; }
        .status-low-stock { background: #fff3cd; color: #856404; }
        .status-out-of-stock { background: #f8d7da; color: #721c24; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #dee2e6; }
        @media print { body { padding: 0; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 BÁO CÁO TỒN KHO</h1>
            <p>Ngày xuất: ${dateStr} - ${timeStr}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Tổng Sản Phẩm</h3>
                <div class="value">${totalProducts}</div>
            </div>
            <div class="summary-card">
                <h3>Tổng Giá Trị Kho</h3>
                <div class="value">${formatCurrency(totalValue)} VNĐ</div>
            </div>
            <div class="summary-card">
                <h3>Sắp Hết Hàng</h3>
                <div class="value" style="color: #ffc107;">${lowStockCount}</div>
            </div>
            <div class="summary-card">
                <h3>Hết Hàng</h3>
                <div class="value" style="color: #dc3545;">${outOfStockCount}</div>
            </div>
        </div>

        <div class="table-container">
            <h2 class="table-title">Chi Tiết Tồn Kho</h2>
            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Tên Sản Phẩm</th>
                        <th>SKU</th>
                        <th>Danh Mục</th>
                        <th>Tồn Kho</th>
                        <th>Đơn Vị</th>
                        <th>Giá Vốn</th>
                        <th>Giá Trị</th>
                        <th>Trạng Thái</th>
                    </tr>
                </thead>
                <tbody>
${products.map((product, index) => {
    const stock = product.stock || 0;
    const costPrice = product.costPrice || 0;
    const value = stock * costPrice;
    const status = getStockStatus(product);
    let statusClass = 'status-in-stock';
    if (status === 'Sắp hết') statusClass = 'status-low-stock';
    if (status === 'Hết hàng') statusClass = 'status-out-of-stock';

    return `                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${product.name}</strong></td>
                        <td>${product.sku || 'N/A'}</td>
                        <td>${categoriesData[product.categoryId]?.name || 'Chưa phân loại'}</td>
                        <td><strong>${formatCurrency(stock)}</strong></td>
                        <td>${product.unit || 'cái'}</td>
                        <td>${formatCurrency(costPrice)} VNĐ</td>
                        <td><strong>${formatCurrency(value)} VNĐ</strong></td>
                        <td><span class="status ${statusClass}">${status}</span></td>
                    </tr>`;
}).join('\n')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Báo cáo được tạo tự động bởi Hệ Thống Quản Lý Kho</p>
            <p>© ${currentDate.getFullYear()} - Phúc Hoàng Technology</p>
        </div>
    </div>
</body>
</html>`;
        // Create and download the HTML file
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bao-cao-kho-${new Date().toISOString().split('T')[0]}.html`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('Đã xuất báo cáo HTML thành công!', 'success');

    } catch (error) {
        console.error('Error exporting report:', error);
        showNotification('Lỗi xuất báo cáo: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function getStockStatus(product) {
    const stock = product.stock || 0;
    const minStock = product.minStock || 10;

    if (stock <= 0) {
        return 'Hết hàng';
    } else if (stock <= minStock) {
        return 'Sắp hết';
    } else {
        return 'Còn hàng';
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(',')
        )
    ].join('\n');

    return csvContent;
}

// Low stock alerts
function checkLowStockAlerts() {
    const lowStockProducts = Object.values(warehouseData).filter(product => {
        const stock = product.stock || 0;
        const minStock = product.minStock || 10;
        return stock > 0 && stock <= minStock;
    });

    const outOfStockProducts = Object.values(warehouseData).filter(product => {
        const stock = product.stock || 0;
        return stock <= 0;
    });

    if (lowStockProducts.length > 0) {
        setTimeout(() => {
            showNotification(`Có ${lowStockProducts.length} sản phẩm sắp hết hàng!`, 'warning');
        }, 2000);
    }

    if (outOfStockProducts.length > 0) {
        setTimeout(() => {
            showNotification(`Có ${outOfStockProducts.length} sản phẩm đã hết hàng!`, 'error');
        }, 3000);
    }
}

// Function to export warehouse report for selected category
async function exportWarehouseReportByCategory() {
    try {
        showLoading(true);
        
        const categoryFilter = document.getElementById('categoryFilter');
        const selectedCategoryId = categoryFilter.value;
        const selectedCategoryName = categoryFilter.options[categoryFilter.selectedIndex].text;
        
        // Filter products by selected category
        const products = Object.values(warehouseData).filter(product => 
            product.categoryId === selectedCategoryId
        );
        
        const currentDate = new Date();
        const dateStr = currentDate.toLocaleDateString('vi-VN');
        const timeStr = currentDate.toLocaleTimeString('vi-VN');
        
        // Calculate summary statistics for selected category
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, product) => sum + ((product.stock || 0) * (product.costPrice || 0)), 0);
        const lowStockCount = products.filter(p => {
            const stock = p.stock || 0;
            const minStock = p.minStock || 10;
            return stock > 0 && stock <= minStock;
        }).length;
        const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length;
        
        // Create beautiful HTML report
        const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Cáo Kho Theo Danh Mục</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .report-header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .report-header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .report-header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .summary-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .summary-card:hover {
            transform: translateY(-5px);
        }
        
        .summary-card h3 {
            color: #28a745;
            margin-bottom: 15px;
            font-size: 1.2rem;
        }
        
        .summary-card .value {
            font-size: 2rem;
            font-weight: bold;
        }
        
        .summary-card.total .value {
            color: #007bff;
        }
        
        .summary-card.value .value {
            color: #28a745;
        }
        
        .summary-card.low .value {
            color: #ffc107;
        }
        
        .summary-card.out .value {
            color: #dc3545;
        }
        
        .table-container {
            padding: 30px;
        }
        
        .table-title {
            color: #28a745;
            font-size: 1.8rem;
            margin-bottom: 20px;
            text-align: center;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
        
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        th {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            font-weight: 600;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        tr:hover {
            background-color: #e9ecef;
        }
        
        .status-in-stock {
            color: #28a745;
            font-weight: bold;
        }
        
        .status-low-stock {
            color: #ffc107;
            font-weight: bold;
        }
        
        .status-out-of-stock {
            color: #dc3545;
            font-weight: bold;
        }
        
        .footer {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 20px;
            text-align: center;
            border-top: 3px solid #28a745;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .report-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
        
        @media (max-width: 768px) {
            .summary {
                grid-template-columns: 1fr;
            }
            
            .report-header h1 {
                font-size: 2rem;
            }
            
            th, td {
                padding: 10px;
                font-size: 0.9rem;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>📦 BÁO CÁO TỒN KHO THEO DANH MỤC</h1>
            <p>Danh mục: ${selectedCategoryName} - Ngày xuất: ${dateStr} - ${timeStr}</p>
        </div>

        <div class="summary">
            <div class="summary-card total">
                <h3>Tổng Sản Phẩm</h3>
                <div class="value">${totalProducts}</div>
            </div>
            <div class="summary-card value">
                <h3>Giá Trị Kho</h3>
                <div class="value">${formatCurrency(totalValue)} VNĐ</div>
            </div>
            <div class="summary-card low">
                <h3>Sắp Hết Hàng</h3>
                <div class="value">${lowStockCount}</div>
            </div>
            <div class="summary-card out">
                <h3>Hết Hàng</h3>
                <div class="value">${outOfStockCount}</div>
            </div>
        </div>

        <div class="table-container">
            <h2 class="table-title">Chi Tiết Tồn Kho</h2>
            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Tên Sản Phẩm</th>
                        <th>Mã SKU</th>
                        <th>Danh Mục</th>
                        <th>Số Lượng</th>
                        <th>Đơn Vị</th>
                        <th>Giá Vốn</th>
                        <th>Giá Trị Tồn</th>
                        <th>Trạng Thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map((product, index) => {
                        const status = getStockStatus(product);
                        let statusClass = 'status-in-stock';
                        if (status === 'Sắp hết') statusClass = 'status-low-stock';
                        if (status === 'Hết hàng') statusClass = 'status-out-of-stock';
                        
                        return `                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${product.name}</strong></td>
                        <td>${product.sku || 'N/A'}</td>
                        <td>${categoriesData[product.categoryId]?.name || 'Không phân loại'}</td>
                        <td>${formatCurrency(product.stock || 0)}</td>
                        <td>${product.unit || 'cái'}</td>
                        <td>${formatCurrency(product.costPrice || 0)} VNĐ</td>
                        <td>${formatCurrency((product.stock || 0) * (product.costPrice || 0))} VNĐ</td>
                        <td class="${statusClass}">${status}</td>
                    </tr>`;
                    }).join('\n')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Báo cáo được tạo tự động bởi Hệ Thống Quản Lý Kho</p>
            <p>© ${currentDate.getFullYear()} - Phúc Hoàng Technology</p>
        </div>
    </div>
</body>
</html>`;
        
        // Create and download the HTML file
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        const fileName = `bao-cao-kho-${selectedCategoryName}-${dateStr}.html`;
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        link.dataset.downloadurl = ['text/html', link.download, link.href].join(':');
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Đã xuất báo cáo HTML theo danh mục thành công!', 'success');
        
    } catch (error) {
        console.error('Error exporting category report:', error);
        showNotification('Lỗi xuất báo cáo theo danh mục: ' + error.message, 'error');
    }
}

// Export functions to global scope
window.loadWarehouseData = loadWarehouseData;
window.displayWarehouseTable = displayWarehouseTable;
window.applyFilters = displayWarehouseTable;
window.openStockInModal = openStockInModal;
window.openStockOutModal = openStockOutModal;
window.openAdjustmentModal = openAdjustmentModal;
window.showNotification = showNotification;
window.applyFilters = applyFilters;
window.exportWarehouseReport = exportWarehouseReport;
window.exportWarehouseReportByCategory = exportWarehouseReportByCategory;
window.deleteProduct = deleteProduct;
window.deleteSelectedProducts = deleteSelectedProducts;
// Print Confirmation Modal Functions
function showPrintConfirmModal(transaction, product) {
    const modal = document.getElementById('printConfirmModal');
    const transactionInfo = document.getElementById('transactionInfo');
    
    if (modal && transactionInfo) {
        // Populate transaction info
        transactionInfo.innerHTML = `
            <div class="info-row">
                <span class="info-label">Mã giao dịch:</span>
                <span class="info-value">${transaction.id || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Sản phẩm:</span>
                <span class="info-value">${product.name || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Số lượng xuất:</span>
                <span class="info-value">${formatCurrency(transaction.quantity) || '0'} ${product.unit || ''}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Thời gian:</span>
                <span class="info-value">${new Date(transaction.timestamp).toLocaleString('vi-VN') || 'N/A'}</span>
            </div>
        `;
        
        // Show modal
        modal.style.display = 'block';
    }
}

function closePrintConfirmModal() {
    const modal = document.getElementById('printConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function confirmPrintReceipt() {
    // Close the modal first
    closePrintConfirmModal();
    
    // Print the receipt
    printStockOutReceipt();
}

function printStockOutReceipt() {
    // Get the last transaction for printing
    const lastTransaction = warehouseTransactions[0];
    if (!lastTransaction) {
        showNotification('Không tìm thấy giao dịch để in!', 'error');
        return;
    }
    
    const product = warehouseData[lastTransaction.productId];
    if (!product) {
        showNotification('Không tìm thấy thông tin sản phẩm!', 'error');
        return;
    }
    
    const storeData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
    
    // Create print content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Phiếu Xuất Kho</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                }
                .store-name {
                    font-size: 24px;
                    font-weight: bold;
                    color: #28a745;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                }
                .store-info {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 5px;
                }
                .title {
                    font-size: 20px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-transform: uppercase;
                }
                .info-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                }
                .info-block {
                    flex: 1;
                }
                .info-block h4 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    font-weight: bold;
                    color: #333;
                }
                .info-row {
                    margin-bottom: 5px;
                    display: flex;
                }
                .info-label {
                    font-weight: bold;
                    min-width: 120px;
                }
                .info-value {
                    flex: 1;
                }
                .product-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                .product-table th,
                .product-table td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }
                .product-table th {
                    background-color: #28a745;
                    color: white;
                    font-weight: bold;
                }
                .product-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 50px;
                }
                .signature-block {
                    text-align: center;
                    flex: 1;
                }
                .signature-line {
                    border-top: 1px solid #333;
                    margin-top: 60px;
                    padding-top: 5px;
                    font-weight: bold;
                }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="store-name">${storeData.name || 'Cửa Hàng'}</div>
                <div class="store-info">Địa chỉ: ${storeData.address || 'N/A'}</div>
                <div class="store-info">Điện thoại: ${storeData.phone || 'N/A'}</div>
                <div class="store-info">Email: ${storeData.email || 'N/A'}</div>
                <div class="title">PHIẾU XUẤT KHO</div>
            </div>
            
            <div class="info-section">
                <div class="info-block">
                    <h4>Thông tin xuất kho:</h4>
                    <div class="info-row">
                        <span class="info-label">Mã phiếu:</span>
                        <span class="info-value">${lastTransaction.id}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Ngày xuất:</span>
                        <span class="info-value">${new Date(lastTransaction.timestamp).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Thời gian:</span>
                        <span class="info-value">${new Date(lastTransaction.timestamp).toLocaleTimeString('vi-VN')}</span>
                    </div>
                </div>
                <div class="info-block">
                    <h4>Lý do xuất kho:</h4>
                    <div class="info-row">
                        <span class="info-label">Lý do:</span>
                        <span class="info-value">${lastTransaction.reason || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Ghi chú:</span>
                        <span class="info-value">${lastTransaction.notes || 'Không có'}</span>
                    </div>
                </div>
            </div>
            
            <table class="product-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Tên sản phẩm</th>
                        <th>SKU</th>
                        <th>Số lượng xuất</th>
                        <th>Đơn vị</th>
                        <th>Tồn kho còn lại</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>${product.name}</td>
                        <td>${product.sku || 'N/A'}</td>
                        <td>${formatCurrency(lastTransaction.quantity)}</td>
                        <td>${product.unit}</td>
                        <td>${formatCurrency(product.stock)}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="signature-section">
                <div class="signature-block">
                    <div>Người lập phiếu</div>
                    <div class="signature-line">Ký tên</div>
                </div>
                <div class="signature-block">
                    <div>Thủ kho</div>
                    <div class="signature-line">Ký tên</div>
                </div>
                <div class="signature-block">
                    <div>Người nhận</div>
                    <div class="signature-line">Ký tên</div>
                </div>
            </div>
            
            <div class="footer">
                <p>Phiếu xuất kho được tạo tự động bởi hệ thống quản lý ${storeData.name || 'Cửa Hàng'}</p>
                <p>Ngày in: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
    
    showNotification('Đang mở phiếu xuất kho để in...', 'success');
}

// Delete Product Function
async function deleteProduct(productId) {
    if (!productId) {
        showNotification('Không tìm thấy sản phẩm để xóa!', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Delete product from Firebase
        await firebase.database().ref(`products/${productId}`).remove();
        
        // Delete related warehouse data
        await firebase.database().ref(`warehouse/${productId}`).remove();
        
        // Remove from local data
        delete warehouseData[productId];
        
        showNotification('Xóa sản phẩm thành công!', 'success');
        
        // Reload data from Firebase and refresh the table
        await loadWarehouseData();
        displayWarehouseTable();
        updateDashboard();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Lỗi khi xóa sản phẩm: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Store the product ID to be deleted
let productToDelete = null;

// Toggle select all checkboxes
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const productCheckboxes = document.querySelectorAll('.product-checkbox');
    
    if (selectAllCheckbox && productCheckboxes) {
        productCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        updateSelectedCount();
    }
}

// Update selected product count display
function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
    const selectedCount = selectedCheckboxes.length;
    const totalCheckboxes = document.querySelectorAll('.product-checkbox').length;
    
    // Update the count display
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selectedCount;
    }
    
    // Enable/disable the delete selected button
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = selectedCount === 0;
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        if (selectedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedCount === totalCheckboxes) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

// Show single product delete confirmation modal
function showDeleteConfirmModal(productId) {
    if (!productId) return;
    
    productToDelete = productId;
    
    // Populate product info in the modal
    const product = warehouseData[productId];
    if (product) {
        const productInfo = document.getElementById('deleteProductInfo');
        if (productInfo) {
            productInfo.innerHTML = `
                <div class="product-details">
                    <p><strong>Tên sản phẩm:</strong> ${product.name}</p>
                    <p><strong>Mã SKU:</strong> ${product.sku || 'N/A'}</p>
                    <p><strong>Số lượng tồn kho:</strong> ${product.stock || 0}</p>
                </div>
            `;
        }
    }
    
    // Show the modal
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close single product delete confirmation modal
function closeDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
    productToDelete = null;
}

// Confirm single product deletion
function confirmDeleteProduct() {
    if (productToDelete) {
        deleteProduct(productToDelete);
        closeDeleteConfirmModal();
    }
}

// Show bulk delete confirmation modal
function showBulkDeleteConfirmModal() {
    const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
    const selectedCount = selectedCheckboxes.length;
    
    if (selectedCount === 0) {
        showNotification('Vui lòng chọn ít nhất một sản phẩm để xóa', 'warning');
        return;
    }
    
    // Update selected count in modal
    const countElement = document.getElementById('bulkDeleteSelectedCount');
    if (countElement) {
        countElement.textContent = selectedCount;
    }
    
    // Populate product list in modal
    const productList = document.getElementById('bulkDeleteProductList');
    if (productList) {
        let listHtml = '<ul class="selected-products-list">';
        selectedCheckboxes.forEach(checkbox => {
            const productId = checkbox.value;
            const product = warehouseData[productId];
            if (product) {
                listHtml += `<li>${product.name} (${product.sku || 'N/A'})</li>`;
            }
        });
        listHtml += '</ul>';
        productList.innerHTML = listHtml;
    }
    
    // Show the modal
    const modal = document.getElementById('bulkDeleteConfirmModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close bulk delete confirmation modal
function closeBulkDeleteConfirmModal() {
    const modal = document.getElementById('bulkDeleteConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Confirm bulk product deletion
async function confirmBulkDeleteProducts() {
    const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
    const selectedProducts = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    
    if (selectedProducts.length === 0) {
        showNotification('Không có sản phẩm nào được chọn để xóa', 'warning');
        closeBulkDeleteConfirmModal();
        return;
    }
    
    try {
        showLoading();
        
        // Delete each selected product
        for (const productId of selectedProducts) {
            await firebase.database().ref(`products/${productId}`).remove();
            await firebase.database().ref(`warehouse/${productId}`).remove();
            
            // Remove from local data
            delete warehouseData[productId];
        }
        
        showNotification(`Xóa ${selectedProducts.length} sản phẩm thành công!`, 'success');
        
        // Reload data from Firebase and refresh the table
        await loadWarehouseData();
        displayWarehouseTable();
        updateDashboard();
        
        closeBulkDeleteConfirmModal();
        
    } catch (error) {
        console.error('Error deleting products:', error);
        showNotification('Lỗi khi xóa sản phẩm: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Delete selected products function
function deleteSelectedProducts() {
    showBulkDeleteConfirmModal();
}

// ===== ADD STOCK FUNCTIONS (Nhập Kho Thêm) =====

// Open Add Stock Modal
function openAddStockModal() {
    console.log('Opening Add Stock Modal...');
    
    // Populate product dropdown
    populateAddStockProductSelect();
    
    // Reset form
    document.getElementById('addStockForm').reset();
    document.getElementById('addStockInfoDisplay').classList.add('hidden');
    
    // Show modal
    const modal = document.getElementById('addStockModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Close Add Stock Modal
function closeAddStockModal() {
    const modal = document.getElementById('addStockModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Reset form
    document.getElementById('addStockForm').reset();
    document.getElementById('addStockInfoDisplay').classList.add('hidden');
}

// Populate product select dropdown for Add Stock
function populateAddStockProductSelect() {
    const select = document.getElementById('addStockProduct');
    if (!select) return;
    
    // Clear existing options except first one
    select.innerHTML = '<option value="">🔍 Chọn sản phẩm từ kho...</option>';
    
    // Add products from warehouse data
    Object.entries(warehouseData).forEach(([id, product]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${product.name} (${product.sku || 'N/A'}) - Tồn: ${product.stock || 0} ${product.unit || 'cái'}`;
        select.appendChild(option);
    });
}

// Update product info when product is selected
function updateAddStockProductInfo() {
    const select = document.getElementById('addStockProduct');
    const productId = select.value;
    const infoDisplay = document.getElementById('addStockInfoDisplay');
    
    if (!productId || !warehouseData[productId]) {
        infoDisplay.classList.add('hidden');
        return;
    }
    
    const product = warehouseData[productId];
    
    // Update info display
    document.getElementById('addStockCurrentStock').textContent = `${product.stock || 0} ${product.unit || 'cái'}`;
    document.getElementById('addStockCurrentPrice').textContent = formatCurrency(product.costPrice || product.price || 0);
    document.getElementById('addStockCurrentUnit').textContent = product.unit || 'cái';
    
    // Pre-fill unit price with current price
    document.getElementById('addStockUnitPrice').value = product.costPrice || product.price || 0;
    
    // Show info display
    infoDisplay.classList.remove('hidden');
}

// Process Add Stock form submission
async function processAddStock(event) {
    event.preventDefault();
    
    try {
        showLoading();
        
        const formData = new FormData(event.target);
        const productId = formData.get('addStockProduct');
        const quantity = parseFloat(formData.get('addStockQuantity'));
        const unitPrice = parseFloat(formData.get('addStockUnitPrice'));
        const supplier = formData.get('addStockSupplier') || '';
        const note = formData.get('addStockNote') || '';
        
        // Validation
        if (!productId) {
            throw new Error('Vui lòng chọn sản phẩm');
        }
        
        if (!quantity || quantity <= 0) {
            throw new Error('Số lượng phải lớn hơn 0');
        }
        
        if (!unitPrice || unitPrice < 0) {
            throw new Error('Giá nhập không hợp lệ');
        }
        
        const product = warehouseData[productId];
        if (!product) {
            throw new Error('Sản phẩm không tồn tại');
        }
        
        // Calculate new stock
        const currentStock = product.stock || 0;
        const newStock = currentStock + quantity;
        
        // Update product in Firebase
        const updateData = {
            stock: newStock,
            costPrice: unitPrice, // Update cost price with new import price
            lastUpdated: new Date().toISOString()
        };
        
        await database.ref(`products/${productId}`).update(updateData);
        
        // Create transaction record
        const transactionId = `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const transaction = {
            id: transactionId,
            type: 'in',
            subType: 'add_stock',
            productId: productId,
            productName: product.name,
            productSku: product.sku || '',
            quantity: quantity,
            unitPrice: unitPrice,
            totalValue: quantity * unitPrice,
            supplier: supplier,
            note: note,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN'),
            user: 'Admin' // You can get this from current user session
        };
        
        await database.ref(`warehouseTransactions/${transactionId}`).set(transaction);
        
        // Update local data
        warehouseData[productId].stock = newStock;
        warehouseData[productId].costPrice = unitPrice;
        
        // Refresh UI
        displayWarehouseTable();
        updateDashboard();
        populateProductSelects(); // Update all product selects
        
        // Close modal and show success
        closeAddStockModal();
        showNotification(`Nhập kho thành công! Đã thêm ${quantity} ${product.unit || 'cái'} ${product.name}`, 'success');
        
    } catch (error) {
        console.error('Error processing add stock:', error);
        showNotification('Lỗi nhập kho: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

window.processStockIn = processStockIn;
window.processStockOut = processStockOut;
window.processAdjustment = processAdjustment;
window.updateStockDisplay = updateStockDisplay;
window.formatCurrency = formatCurrency;
window.showPrintConfirmModal = showPrintConfirmModal;
window.closePrintConfirmModal = closePrintConfirmModal;
window.confirmPrintReceipt = confirmPrintReceipt;
window.printStockOutReceipt = printStockOutReceipt;
window.filterWarehouse = filterWarehouse;
window.searchWarehouse = searchWarehouse;
window.initializeCharts = initializeCharts;
window.updateCharts = updateCharts;
window.exportWarehouseReport = exportWarehouseReport;
window.checkLowStockAlerts = checkLowStockAlerts;
window.deleteProduct = deleteProduct;
window.deleteSelectedProducts = deleteSelectedProducts;
window.toggleSelectAll = toggleSelectAll;
window.updateSelectedCount = updateSelectedCount;
window.showDeleteConfirmModal = showDeleteConfirmModal;
window.closeDeleteConfirmModal = closeDeleteConfirmModal;
window.confirmDeleteProduct = confirmDeleteProduct;
window.showBulkDeleteConfirmModal = showBulkDeleteConfirmModal;
window.closeBulkDeleteConfirmModal = closeBulkDeleteConfirmModal;
window.confirmBulkDeleteProducts = confirmBulkDeleteProducts;

// Export Add Stock functions
window.openAddStockModal = openAddStockModal;
window.closeAddStockModal = closeAddStockModal;
window.updateAddStockProductInfo = updateAddStockProductInfo;
window.processAddStock = processAddStock;
