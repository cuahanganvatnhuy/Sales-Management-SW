// Selling Products Management System
// Manages selling prices separate from import prices

// Global variables
let allProducts = [];
let sellingProducts = [];
let filteredSellingProducts = [];
let selectedProducts = new Set();
let selectedSellingProducts = new Set(); // For bulk delete functionality
let currentPage = 1;
const itemsPerPage = 10;
let currentSort = { field: null, direction: 'asc' }; // Sorting state

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    console.log('Initializing selling products page...');
    console.log('Database available:', !!database);
    
    setupEventListeners();
    initializeStoreSelector();
    
    // Wait for Firebase to be ready, then load data
    setTimeout(() => {
        console.log('Checking Firebase availability after delay...');
        if (typeof database !== 'undefined' && database) {
            console.log('Firebase database is available, loading data...');
            loadProducts();
            loadSellingProducts();
            updateStatistics();
        } else {
            console.error('Firebase database not available. Retrying in 2 seconds...');
            setTimeout(() => {
                loadProducts();
                loadSellingProducts();
                updateStatistics();
            }, 2000);
        }
    }, 500);
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Filter functionality
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilter);
    }

    // Modal close events
    setupModalCloseEvents();
}

function setupModalCloseEvents() {
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const productModal = document.getElementById('productSelectionModal');
        const priceModal = document.getElementById('sellingPriceModal');
        
        if (event.target === productModal) {
            closeProductSelectionModal();
        }
        if (event.target === priceModal) {
            closeSellingPriceModal();
        }
    });
}

// Load original products from Firebase
function loadProducts() {
    if (!database) {
        console.error('Firebase database not initialized');
        return;
    }

    console.log('Loading products from Firebase...');
    console.log('Firebase database URL:', database.app.options.databaseURL);
    
    const productsRef = database.ref('products');
    console.log('Products reference created:', productsRef.toString());
    
    productsRef.on('value', (snapshot) => {
        allProducts = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const product = {
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                };
                
                // Debug: Log product structure to see price fields
                console.log(`Product ${product.productName || product.name}:`, {
                    id: product.id,
                    price: product.price,
                    sellingPrice: product.sellingPrice,
                    costPrice: product.costPrice,
                    importPrice: product.importPrice,
                    allFields: Object.keys(product)
                });
                
                // Temporarily disable store filtering for debugging
                // TODO: Re-enable store filtering after fixing
                // if (!selectedStoreId || !product.storeId || product.storeId === selectedStoreId) {
                    allProducts.push(product);
                    const productName = product.productName || product.name || product.title || 'Không có tên';
                    console.log('Added product:', productName, 'ID:', product.id);
                // } else {
                //     console.log('Filtered out product:', product.productName, 'due to store mismatch');
                // }
            });
            console.log('Successfully loaded products after filtering:', allProducts.length);
            if (allProducts.length > 0) {
                console.log('Sample product:', allProducts[0]);
            }
        } else {
            console.log('No products found in Firebase database');
            console.log('Snapshot value:', snapshot.val());
        }
    }, (error) => {
        console.error('Error loading products:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    });
}

// Load selling products from Firebase
function loadSellingProducts() {
    return new Promise((resolve, reject) => {
        const storeId = getSelectedStoreId();
        if (!storeId) {
            console.error('No store selected');
            resolve([]);
            return;
        }

        const sellingProductsRef = database.ref(`sellingProducts/${storeId}`);
        sellingProductsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const products = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    products.push({
                        id: key,
                        ...data[key]
                    });
                });
            }
            console.log('=== LOADED SELLING PRODUCTS ===');
            console.log('Store ID:', storeId);
            console.log('Product count:', products.length);
            products.forEach((p, i) => {
                console.log(`Selling Product ${i + 1}:`, {
                    id: p.id,
                    productId: p.productId,
                    sellingPrice: p.sellingPrice,
                    status: p.status
                });
            });
            console.log('=== END SELLING PRODUCTS ===');
            
            // Update global variables
            sellingProducts = products;
            filteredSellingProducts = [...sellingProducts];
            displaySellingProducts();
            updateStatistics();
            
            resolve(products);
        }, (error) => {
            console.error('Error loading selling products:', error);
            reject(error);
        });
    });
}

// Update statistics cards
function updateStatistics() {
    console.log('=== UPDATING STATISTICS ===');
    console.log('Selling products array:', sellingProducts);
    console.log('Selling products length:', sellingProducts.length);
    
    const totalProducts = sellingProducts.length;
    const activeProducts = sellingProducts.filter(p => p.status === 'active').length;
    const inactiveProducts = sellingProducts.filter(p => p.status === 'inactive').length;
    
    console.log('Statistics calculated:', {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts
    });
    
    // Calculate average selling price
    let totalSellingPrice = 0;
    let productsWithPrice = 0;
    
    sellingProducts.forEach(product => {
        if (product.sellingPrice && product.sellingPrice > 0) {
            totalSellingPrice += product.sellingPrice;
            productsWithPrice++;
        }
    });

    const averagePrice = productsWithPrice > 0 ? (totalSellingPrice / productsWithPrice) : 0;
    
    console.log('Price calculation:', {
        totalPrice: totalSellingPrice,
        productsWithPrice: productsWithPrice,
        averagePrice: averagePrice
    });

    // Update DOM elements with error checking
    const totalElement = document.getElementById('totalProducts');
    const activeElement = document.getElementById('activeProducts');
    const inactiveElement = document.getElementById('inactiveProducts');
    const averageElement = document.getElementById('averagePrice');
    
    if (totalElement) {
        totalElement.textContent = totalProducts;
        console.log('Updated totalProducts:', totalProducts);
    } else {
        console.error('totalProducts element not found');
    }
    
    if (activeElement) {
        activeElement.textContent = activeProducts;
        console.log('Updated activeProducts:', activeProducts);
    } else {
        console.error('activeProducts element not found');
    }
    
    if (inactiveElement) {
        inactiveElement.textContent = inactiveProducts;
        console.log('Updated inactiveProducts:', inactiveProducts);
    } else {
        console.error('inactiveProducts element not found');
    }
    
    if (averageElement) {
        averageElement.textContent = formatCurrency(averagePrice);
        console.log('Updated averagePrice:', formatCurrency(averagePrice));
    } else {
        console.error('averagePrice element not found');
    }
    
    console.log('=== STATISTICS UPDATE COMPLETE ===');
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Open product selection modal
function openProductSelectionModal() {
    console.log('=== Opening Product Selection Modal ===');
    const modal = document.getElementById('productSelectionModal');
    const productList = document.getElementById('productList');
    
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    
    if (!productList) {
        console.error('Product list element not found');
        return;
    }
    
    // Clear existing selections
    selectedProducts.clear();
    updateSelectedCount();
    
    // Clear existing list
    productList.innerHTML = '';
    
    // Debug logging
    console.log('All products:', allProducts.length);
    console.log('Selling products:', sellingProducts.length);
    
    // Force wait for data if not loaded yet
    if (allProducts.length === 0) {
        console.log('No products loaded yet, waiting...');
        productList.innerHTML = '<p class="no-products">Đang tải sản phẩm...</p>';
        setTimeout(() => {
            if (allProducts.length > 0) {
                openProductSelectionModal(); // Retry
            } else {
                productList.innerHTML = '<p class="no-products">Không thể tải sản phẩm. Vui lòng thử lại.</p>';
            }
        }, 2000);
        modal.style.display = 'block';
        return;
    }
    
    // Debug: Log detailed product information
    console.log('=== ALL PRODUCTS ===');
    allProducts.forEach((p, i) => {
        console.log(`Product ${i + 1}:`, {
            id: p.id,
            name: p.productName || p.name || 'No name',
            sku: p.sku || 'No SKU',
            status: p.status || 'No status',
            storeId: p.storeId || 'No store ID'
        });
    });
    
    // Get products not yet in selling products
    const availableProducts = allProducts.filter(product => {
        const isInSelling = sellingProducts.some(sp => sp.productId === product.id);
        console.log(`Product ${product.id} (${product.productName || product.name || 'no name'}) is ${isInSelling ? 'ALREADY IN' : 'NOT IN'} selling products`);
        return !isInSelling;
    });
    
    console.log('=== FILTERED PRODUCTS ===');
    console.log(`Showing ${availableProducts.length} of ${allProducts.length} products`);
    availableProducts.forEach((p, i) => {
        console.log(`Available ${i + 1}:`, {
            id: p.id,
            name: p.productName || p.name || 'No name',
            sku: p.sku || 'No SKU'
        });
    });
    console.log('=== END PRODUCT DEBUGGING ===');
    
    if (availableProducts.length === 0) {
        if (allProducts.length === 0) {
            productList.innerHTML = '<p class="no-products">Chưa có sản phẩm nào trong hệ thống. Vui lòng thêm sản phẩm trước.</p>';
        } else {
            productList.innerHTML = '<p class="no-products">Tất cả sản phẩm đã được thêm vào danh sách bán</p>';
        }
    } else {
        console.log('Creating product items for', availableProducts.length, 'products');
        availableProducts.forEach((product, index) => {
            console.log(`Creating item ${index + 1}:`, product.productName || product.name || product.title);
            const productItem = createProductListItemWithCheckbox(product, index);
            productList.appendChild(productItem);
        });
        console.log('Product items added to DOM');
    }
    
    modal.style.display = 'block';
}

// Create product list item with checkbox for selection modal
function createProductListItemWithCheckbox(product, index) {
    console.log('Creating product item:', product);
    
    const row = document.createElement('tr');
    row.className = 'product-item';
    row.dataset.id = product.id;
    
    try {
        // Get all product fields with fallbacks
        const productName = product.productName || product.name || product.title || 'Không có tên';
        const sku = product.sku || product.skuCode || 'N/A';
        const unit = product.unit || product.unitName || 'cái';
        
        // Handle inventory/stock - check multiple possible field names
        let inventory = 0;
        if (typeof product.inventory !== 'undefined') {
            inventory = product.inventory;
        } else if (typeof product.stock !== 'undefined') {
            inventory = product.stock;
        } else if (typeof product.quantity !== 'undefined') {
            inventory = product.quantity;
        }
        
        // Format numbers and prices
        const importPrice = formatCurrency(product.costPrice || product.importPrice || product.price || 0);
        const sellingPrice = formatCurrency(product.sellingPrice || product.price || 0);
        const status = (product.status || 'inactive').toLowerCase();
        
        console.log('Product data:', {
            name: productName,
            sku,
            unit,
            inventory,
            importPrice: importPrice,
            sellingPrice: sellingPrice,
            status
        });
        
        // Create cells individually to ensure proper DOM structure
        const createCell = (content, className = '', isHtml = false) => {
            const cell = document.createElement('td');
            if (className) cell.className = className;
            if (isHtml) {
                cell.innerHTML = content;
            } else {
                const div = document.createElement('div');
                div.className = 'truncate';
                div.textContent = content;
                cell.appendChild(div);
            }
            return cell;
        };

        // Create checkbox cell
        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'text-center checkbox-col';
        checkboxCell.innerHTML = `<input type="checkbox" id="product-${product.id}" value="${product.id}" onchange="toggleProductSelection('${product.id}')">`;
        
        // Create status badge
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge status-${status}`;
        statusBadge.textContent = status === 'active' ? 'Đang bán' : 'Tạm dừng';
        
        // Create status cell
        const statusCell = document.createElement('td');
        statusCell.className = 'text-center status-col';
        statusCell.appendChild(statusBadge);

        // Append all cells to the row
        row.appendChild(checkboxCell);
        row.appendChild(createCell(String(index + 1), 'text-center stt-col'));
        row.appendChild(createCell(productName, 'text-left name-col'));
        row.appendChild(createCell(sku, 'text-left sku-col'));
        row.appendChild(createCell(unit, 'text-center unit-col'));
        row.appendChild(createCell(String(inventory), 'text-center inventory-col'));
        row.appendChild(createCell(importPrice, 'text-right price-col'));
        row.appendChild(createCell(sellingPrice, 'text-right price-col'));
        row.appendChild(statusCell);
    } catch (error) {
        console.error('Error creating product row:', error, product);
        row.innerHTML = `<td colspan="9" class="text-center text-danger">Lỗi hiển thị sản phẩm</td>`;
    }
    return row;
}

// Toggle product selection
function toggleProductSelection(productId) {
    const checkbox = document.getElementById(`product-${productId}`);
    const productRow = document.querySelector(`.product-item[data-id="${productId}"]`);
    
    if (checkbox.checked) {
        selectedProducts.add(productId);
        productRow.classList.add('selected');
    } else {
        selectedProducts.delete(productId);
        productRow.classList.remove('selected');
    }
    
    updateSelectedCount();
}

// Update selected count display
function updateSelectedCount() {
    const count = selectedProducts.size;
    document.getElementById('selectedCount').textContent = `Đã chọn: ${count} sản phẩm`;
    
    // Enable/disable save button
    const saveBtn = document.getElementById('saveSelectedBtn');
    saveBtn.disabled = count === 0;
}

// Toggle select all checkbox
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.product-item input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked !== selectAllCheckbox.checked) {
            checkbox.checked = selectAllCheckbox.checked;
            toggleProductSelection(checkbox.value);
        }
    });
}

// Select all products
function selectAllProducts() {
    const checkboxes = document.querySelectorAll('.product-item input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            toggleProductSelection(checkbox.value);
        }
    });
}

// Clear all selections
function clearAllSelections() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('#productList input[type="checkbox"]');
    
    selectAllCheckbox.checked = false;
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
            toggleProductSelection(checkbox.value);
        }
    });
    
    selectedProducts.clear();
    updateSelectedCount();
}

// Create selected products
function createSelectedProducts() {
    if (selectedProducts.size === 0) {
        showNotification('Vui lòng chọn ít nhất một sản phẩm', 'warning');
        return;
    }
    
    const storeId = getSelectedStoreId();
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng trước', 'warning');
        return;
    }
    
    const batch = {};
    const selectedProductsArray = Array.from(selectedProducts);
    
    selectedProductsArray.forEach(productId => {
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            const key = database.ref(`sellingProducts/${storeId}`).push().key;
            
            // Get the correct product name field
            const productName = product.productName || product.name || product.title || 'Không có tên';
            
            // Debug: Log all price fields for this product
            console.log(`Creating selling product for ${productName}:`, {
                id: product.id,
                price: product.price,
                sellingPrice: product.sellingPrice,
                costPrice: product.costPrice,
                importPrice: product.importPrice,
                allFields: Object.keys(product)
            });
            
            // Try multiple price fields
            const importPrice = product.price || product.sellingPrice || product.costPrice || product.importPrice || 0;
            console.log(`Final import price for ${productName}: ${importPrice}`);
            
            batch[`sellingProducts/${storeId}/${key}`] = {
                productId: productId,
                productName: productName,
                sku: product.sku,
                importPrice: importPrice, // Giá nhập = giá bán của sản phẩm gốc
                sellingPrice: 0, // Giá bán sẽ được nhập sau
                inventory: product.inventory || product.stock || product.quantity || 0,
                unit: product.unit || product.unitName || 'lỗi ',
                purchaseCount: 0, // Số lượt mua
                status: 'inactive', // Default to inactive
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
    });
    
    // Save to Firebase
    database.ref().update(batch)
        .then(() => {
            closeProductSelectionModal();
            loadSellingProducts().then(products => {
                sellingProducts = products;
                filteredSellingProducts = [...sellingProducts];
                displaySellingProducts();
                updateStatistics();
            });
            showNotification(`Đã tạo ${selectedProductsArray.length} sản phẩm bán thành công. Bây giờ bạn có thể thiết lập giá bán cho từng sản phẩm.`, 'success');
        })
        .catch(error => {
            console.error('Error creating selling products:', error);
            showNotification('Có lỗi xảy ra khi tạo sản phẩm bán', 'error');
        });
}

// Close product selection modal
function closeProductSelectionModal() {
    document.getElementById('productSelectionModal').style.display = 'none';
}

// Open selling price modal
function openSellingPriceModal(product = null, sellingProduct = null) {
    const modal = document.getElementById('sellingPriceModal');
    const form = document.getElementById('sellingPriceForm');
    
    // Reset form
    form.reset();
    
    if (product) {
        // Adding new selling product
        document.getElementById('modalTitle').textContent = 'Thiết Lập Giá Bán';
        document.getElementById('productName').textContent = product.productName || 'Không có tên';
        document.getElementById('productSku').textContent = product.sku || 'N/A';
        document.getElementById('importPrice').textContent = formatCurrency(product.importPrice || 0);
        
        // Store product data
        form.dataset.productId = product.id;
        form.dataset.mode = 'add';
    } else if (sellingProduct) {
        // Editing existing selling product
        document.getElementById('modalTitle').textContent = 'Chỉnh Sửa Giá Bán';
        document.getElementById('productName').textContent = sellingProduct.productName || 'Không có tên';
        document.getElementById('productSku').textContent = sellingProduct.sku || 'N/A';
        document.getElementById('importPrice').textContent = formatCurrency(sellingProduct.importPrice || 0);
        
        // Fill existing data
        document.getElementById('sellingPrice').value = sellingProduct.sellingPrice || '';
        document.getElementById('productStatus').value = sellingProduct.status || 'active';
        
        // Store product data
        form.dataset.sellingProductId = sellingProduct.id;
        form.dataset.mode = 'edit';
        
        // Calculate initial profit
        calculateProfit();
    }
    
    modal.style.display = 'block';
}

// Close selling price modal
function closeSellingPriceModal() {
    document.getElementById('sellingPriceModal').style.display = 'none';
}

// Calculate profit and margin
function calculateProfit() {
    const sellingPriceInput = document.getElementById('sellingPrice');
    const importPriceText = document.getElementById('importPrice').textContent;
    const profitElement = document.getElementById('profitAmount');
    const marginElement = document.getElementById('profitMargin');
    
    const sellingPrice = parseFloat(sellingPriceInput.value) || 0;
    const importPrice = parseFloat(importPriceText.replace(/[^\d]/g, '')) || 0;
    
    const profit = sellingPrice - importPrice;
    const margin = importPrice > 0 ? ((profit / importPrice) * 100) : 0;
    
    profitElement.textContent = formatCurrency(profit);
    marginElement.textContent = margin.toFixed(2) + '%';
    
    // Update profit color
    if (profit > 0) {
        profitElement.style.color = '#28a745';
        marginElement.style.color = '#28a745';
    } else if (profit < 0) {
        profitElement.style.color = '#dc3545';
        marginElement.style.color = '#dc3545';
    } else {
        profitElement.style.color = '#6c757d';
        marginElement.style.color = '#6c757d';
    }
}

// Save selling product
function saveSellingProduct() {
    const form = document.getElementById('sellingPriceForm');
    const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
    const status = document.getElementById('productStatus').value;
    
    if (!sellingPrice || sellingPrice <= 0) {
        showNotification('Vui lòng nhập giá bán hợp lệ', 'warning');
        return;
    }
    
    const mode = form.dataset.mode;
    
    if (mode === 'add') {
        const productId = form.dataset.productId;
        const product = allProducts.find(p => p.id === productId);
        
        if (!product) {
            showNotification('Không tìm thấy sản phẩm', 'error');
            return;
        }
        
        const sellingProductData = {
            productId: productId,
            productName: product.productName,
            sku: product.sku,
            importPrice: product.price || 0, // Giá nhập = giá bán của sản phẩm gốc
            sellingPrice: sellingPrice,
            status: status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to Firebase
        database.ref('sellingProducts').push(sellingProductData)
            .then(() => {
                closeSellingPriceModal();
                showNotification('Đã thêm sản phẩm bán thành công', 'success');
            })
            .catch(error => {
                console.error('Error adding selling product:', error);
                showNotification('Có lỗi xảy ra khi thêm sản phẩm', 'error');
            });
            
    } else if (mode === 'edit') {
        const sellingProductId = form.dataset.sellingProductId;
        const sellingProduct = sellingProducts.find(sp => sp.id === sellingProductId);
        
        if (!sellingProduct) {
            showNotification('Không tìm thấy sản phẩm bán', 'error');
            return;
        }
        
        const updatedData = {
            sellingPrice: sellingPrice,
            status: status,
            updatedAt: new Date().toISOString()
        };
        
        // Update in Firebase
        database.ref(`sellingProducts/${sellingProductId}`).update(updatedData)
            .then(() => {
                closeSellingPriceModal();
                showNotification('Đã cập nhật sản phẩm bán thành công', 'success');
            })
            .catch(error => {
                console.error('Error updating selling product:', error);
                showNotification('Có lỗi xảy ra khi cập nhật sản phẩm', 'error');
            });
    }
}

// Sync all products (called from confirmSync)
function syncAllProducts() {
    console.log('=== SYNC ALL PRODUCTS START ===');
    console.log('All products loaded:', allProducts.length);
    console.log('Current selling products:', sellingProducts.length);
    
    // Debug: Log some sample products
    if (allProducts.length > 0) {
        console.log('Sample all product:', allProducts[0]);
    }
    if (sellingProducts.length > 0) {
        console.log('Sample selling product:', sellingProducts[0]);
    }
    
    const availableProducts = allProducts.filter(product => {
        // Validate product has required fields
        if (!product.id || (!product.productName && !product.name && !product.title)) {
            console.warn('Skipping invalid product:', product);
            return false;
        }
        
        const isAlreadyInSelling = sellingProducts.some(sp => sp.productId === product.id);
        console.log(`Product ${product.productName || product.name || product.title} (${product.id}) - Already in selling: ${isAlreadyInSelling}`);
        return !isAlreadyInSelling;
    });
    
    console.log('Available products to sync:', availableProducts.length);
    console.log('Available products:', availableProducts.map(p => p.productName));
    
    if (availableProducts.length === 0) {
        showNotification('Tất cả sản phẩm đã được đồng bộ', 'info');
        return;
    }
    
    const storeId = getSelectedStoreId();
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng trước', 'warning');
        return;
    }
    
    console.log('Starting sync for store:', storeId);
    
    const batch = {};
    availableProducts.forEach(product => {
        const key = database.ref(`sellingProducts/${storeId}`).push().key;
        console.log(`Creating selling product with key: ${key} for product: ${product.productName}`);
        
        // Try multiple price fields
        const importPrice = product.price || product.sellingPrice || product.costPrice || product.importPrice || 0;
        
        batch[`sellingProducts/${storeId}/${key}`] = {
            id: key,
            productId: product.id || '',
            productName: product.productName || product.name || product.title || 'Sản phẩm không tên',
            sku: product.sku || product.skuCode || 'N/A',
            importPrice: importPrice,
            sellingPrice: 0,
            inventory: product.inventory || product.stock || product.quantity || 0,
            unit: product.unit || product.unitName || 'cái',
            purchaseCount: 0, // Số lượt mua
            status: 'inactive',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    });
    
    console.log('Batch update data:', batch);
    
    database.ref().update(batch)
        .then(() => {
            console.log('Firebase batch update successful');
            showNotification(`Đã đồng bộ ${availableProducts.length} sản phẩm thành công`, 'success');
            
            // Force reload data from Firebase
            setTimeout(() => {
                loadSellingProducts().then(products => {
                    console.log('Reloaded selling products:', products.length);
                    sellingProducts = products;
                    filteredSellingProducts = [...sellingProducts];
                    displaySellingProducts();
                    updateStatistics();
                });
            }, 1000);
        })
        .catch(error => {
            console.error('Error syncing products:', error);
            showNotification('Có lỗi xảy ra khi đồng bộ sản phẩm', 'error');
        });
}

// Display selling products in table
function displaySellingProducts() {
    console.log('=== DISPLAY SELLING PRODUCTS DEBUG ===');
    console.log('Total selling products:', sellingProducts.length);
    console.log('Filtered selling products:', filteredSellingProducts.length);
    console.log('Current page:', currentPage);
    
    const tbody = document.getElementById('sellingProductsTableBody');
    if (!tbody) {
        console.error('Table body element not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredSellingProducts.slice(startIndex, endIndex);
    
    console.log('Paginated products:', paginatedProducts.length);
    
    if (paginatedProducts.length === 0) {
        console.log('No products to display');
        tbody.innerHTML = '<tr><td colspan="10" class="text-center" style="color: #6b7280; padding: 2rem;">Không có sản phẩm nào</td></tr>';
        updatePagination();
        return;
    }
    
    paginatedProducts.forEach((product, index) => {
        const row = document.createElement('tr');
        
        // Get original product data for inventory and unit
        const originalProduct = allProducts.find(p => p.id === product.productId);
        const inventory = originalProduct ? (originalProduct.inventory || originalProduct.stock || originalProduct.quantity || 0) : 0;
        const unit = originalProduct ? (originalProduct.unit || originalProduct.unitName || 'cái') : 'cái';
        
        // Debug: Log selling product vs original product
        console.log(`Displaying ${product.productName}:`, {
            sellingProduct: {
                importPrice: product.importPrice,
                sellingPrice: product.sellingPrice
            },
            originalProduct: originalProduct ? {
                price: originalProduct.price,
                sellingPrice: originalProduct.sellingPrice
            } : null
        });
        
        row.innerHTML = `
            <td class="text-center" style="color: #374151 !important;">
                <input type="checkbox" class="product-checkbox" 
                       value="${product.id}" 
                       onchange="toggleSellingProductSelection('${product.id}', this.checked)">
            </td>
            <td style="color: #374151 !important;">${startIndex + index + 1}</td>
            <td style="color: #374151 !important;">${product.productName || 'N/A'}</td>
            <td style="color: #374151 !important;">${product.sku || 'N/A'}</td>
            <td style="color: #374151 !important;">${formatCurrency(product.importPrice || (originalProduct ? originalProduct.price : 0) || 0)}</td>
            <td style="color: #374151 !important;">
                <input type="text" class="selling-price-input" 
                       value="${product.sellingPrice ? formatCurrency(product.sellingPrice) : ''}" 
                       placeholder="Nhập giá bán"
                       style="color: #374151 !important;"
                       oninput="formatPriceAsType(this)"
                       onchange="updateSellingPrice('${product.id}', getNumericValue(this.value))"
                       onblur="this.value = this.value ? formatCurrency(getNumericValue(this.value)) : ''">
            </td>
            <td class="text-center" style="color: #374151 !important;">${product.inventory || inventory}</td>
            <td class="text-center" style="color: #374151 !important;">${product.unit || unit}</td>
            <td class="text-center" style="color: #374151 !important;">
                <span class="purchase-count">${product.purchaseCount || 0}</span>
            </td>
            <td class="text-center" style="color: #374151 !important;">
                <span class="status-badge status-${product.status || 'inactive'}">
                    ${(product.status || 'inactive') === 'active' ? 'Đang bán' : 'Tạm dừng'}
                </span>
            </td>
            <td class="text-center" style="color: #374151 !important;">
                <button class="action-btn btn-edit" onclick="editSellingProduct('${product.id}')" title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteSellingProduct('${product.id}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('=== PRODUCTS DISPLAYED SUCCESSFULLY ===');
    updatePagination();
    updateSearchResults();
    
    // Force update statistics after display
    setTimeout(() => {
        updateStatistics();
    }, 100);
}

// Edit selling product
function editSellingProduct(sellingProductId) {
    const sellingProduct = sellingProducts.find(sp => sp.id === sellingProductId);
    if (sellingProduct) {
        openSellingPriceModal(null, sellingProduct);
    }
}

// Delete selling product
function deleteSellingProduct(sellingProductId) {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách bán?')) {
        return;
    }
    
    const storeId = getSelectedStoreId();
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng', 'warning');
        return;
    }
    
    database.ref(`sellingProducts/${storeId}/${sellingProductId}`).remove()
        .then(() => {
            // Remove from local array
            const index = sellingProducts.findIndex(p => p.id === sellingProductId);
            if (index !== -1) {
                sellingProducts.splice(index, 1);
                filteredSellingProducts = [...sellingProducts];
                displaySellingProducts();
                updateStatistics();
            }
            showNotification('Đã xóa sản phẩm thành công', 'success');
        })
        .catch(error => {
            console.error('Error deleting selling product:', error);
            showNotification('Có lỗi xảy ra khi xóa sản phẩm', 'error');
        });
}

// Handle search
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(searchTerm);
}

// Handle filter
function handleFilter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(searchTerm);
}

// Apply filters
function applyFilters(searchTerm = '') {
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredSellingProducts = sellingProducts.filter(product => {
        const matchesSearch = !searchTerm || 
            (product.productName && product.productName.toLowerCase().includes(searchTerm)) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm));
        
        const matchesStatus = !statusFilter || product.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    currentPage = 1; // Reset to first page
    displaySellingProducts();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredSellingProducts.length / itemsPerPage);
    const paginationContainer = document.getElementById('pagination');
    
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = '‹';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePage(currentPage - 1);
    paginationContainer.appendChild(prevButton);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageButton.onclick = () => changePage(i);
            paginationContainer.appendChild(pageButton);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationContainer.appendChild(ellipsis);
        }
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = '›';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePage(currentPage + 1);
    paginationContainer.appendChild(nextButton);
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredSellingProducts.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displaySellingProducts();
    }
}

// Export to Excel
function exportToExcel() {
    if (filteredSellingProducts.length === 0) {
        showNotification('Không có dữ liệu để xuất', 'warning');
        return;
    }
    
    // Get store information
    const selectedStoreData = localStorage.getItem('selectedStoreData');
    let storeName = 'Tất cả cửa hàng';
    try {
        if (selectedStoreData) {
            const storeData = JSON.parse(selectedStoreData);
            storeName = storeData.name || 'Cửa hàng không xác định';
        }
    } catch (error) {
        console.error('Error parsing store data:', error);
    }
    
    // Prepare data for export with enhanced information
    const exportData = filteredSellingProducts.map((product, index) => {
        // Get original product data for additional info
        const originalProduct = allProducts.find(p => p.id === product.productId);
        const inventory = originalProduct ? (originalProduct.inventory || originalProduct.stock || originalProduct.quantity || 0) : 0;
        const unit = originalProduct ? (originalProduct.unit || originalProduct.unitName || 'cái') : 'cái';
        
        // Calculate profit
        const importPrice = product.importPrice || 0;
        const sellingPrice = product.sellingPrice || 0;
        const profit = sellingPrice - importPrice;
        const profitMargin = importPrice > 0 ? ((profit / importPrice) * 100) : 0;
        
        return {
            'STT': index + 1,
            'Tên Sản Phẩm': product.productName || 'N/A',
            'SKU': product.sku || 'N/A',
            'Đơn Vị': unit,
            'Tồn Kho': inventory,
            'Giá Nhập (VNĐ)': importPrice,
            'Giá Bán (VNĐ)': sellingPrice,
            'Lượt Mua': product.purchaseCount || 0,
            'Lợi Nhuận (VNĐ)': profit,
            'Tỷ Lệ Lợi Nhuận (%)': profitMargin.toFixed(2),
            'Trạng Thái': product.status === 'active' ? 'Đang bán' : 'Tạm dừng',
            'Ngày Tạo': product.createdAt ? new Date(product.createdAt).toLocaleDateString('vi-VN') : 'N/A',
            'Ngày Cập Nhật': product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('vi-VN') : 'N/A'
        };
    });
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Main data sheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths for better formatting
    const colWidths = [
        { wch: 5 },   // STT
        { wch: 25 },  // Tên Sản Phẩm
        { wch: 15 },  // SKU
        { wch: 10 },  // Đơn Vị
        { wch: 10 },  // Tồn Kho
        { wch: 15 },  // Giá Nhập
        { wch: 15 },  // Giá Bán
        { wch: 10 },  // Lượt Mua
        { wch: 15 },  // Lợi Nhuận
        { wch: 18 },  // Tỷ Lệ Lợi Nhuận
        { wch: 12 },  // Trạng Thái
        { wch: 12 },  // Ngày Tạo
        { wch: 12 }   // Ngày Cập Nhật
    ];
    ws['!cols'] = colWidths;
    
    // Add summary sheet
    const summaryData = [
        { 'Thông Tin': 'Cửa Hàng', 'Giá Trị': storeName },
        { 'Thông Tin': 'Ngày Xuất', 'Giá Trị': new Date().toLocaleDateString('vi-VN') },
        { 'Thông Tin': 'Tổng Số Sản Phẩm', 'Giá Trị': exportData.length },
        { 'Thông Tin': 'Sản Phẩm Đang Bán', 'Giá Trị': exportData.filter(p => p['Trạng Thái'] === 'Đang bán').length },
        { 'Thông Tin': 'Sản Phẩm Tạm Dừng', 'Giá Trị': exportData.filter(p => p['Trạng Thái'] === 'Tạm dừng').length },
        { 'Thông Tin': 'Tổng Giá Trị Tồn Kho (VNĐ)', 'Giá Trị': exportData.reduce((sum, p) => sum + (p['Giá Nhập (VNĐ)'] * p['Tồn Kho']), 0) },
        { 'Thông Tin': 'Tổng Giá Trị Bán (VNĐ)', 'Giá Trị': exportData.reduce((sum, p) => sum + (p['Giá Bán (VNĐ)'] * p['Tồn Kho']), 0) },
        { 'Thông Tin': 'Lợi Nhuận Dự Kiến (VNĐ)', 'Giá Trị': exportData.reduce((sum, p) => sum + (p['Lợi Nhuận (VNĐ)'] * p['Tồn Kho']), 0) }
    ];
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
    
    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng Quan');
    XLSX.utils.book_append_sheet(wb, ws, 'Chi Tiết Sản Phẩm');
    
    // Generate filename with current date and store name
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
    const storeNameForFile = storeName.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `san-pham-ban-${storeNameForFile}-${dateStr}-${timeStr}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    showNotification(`Đã xuất file Excel thành công: ${filename}`, 'success');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Store management functions
function initializeStoreSelector() {
    loadCurrentStore();
    loadStoreList();
}

function loadCurrentStore() {
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    const selectedStoreData = localStorage.getItem('selectedStoreData');
    const currentStoreElement = document.getElementById('currentStoreName');
    
    // Check if element exists (may not exist in this page)
    if (!currentStoreElement) {
        console.log('Store selector element not found in this page');
        return;
    }
    
    if (selectedStoreId && selectedStoreData) {
        try {
            const storeData = JSON.parse(selectedStoreData);
            currentStoreElement.textContent = storeData.name || 'Cửa hàng không xác định';
        } catch (error) {
            console.error('Error parsing store data:', error);
            currentStoreElement.textContent = 'Chọn Cửa Hàng';
        }
    } else {
        currentStoreElement.textContent = 'Chọn Cửa Hàng';
    }
}

function loadStoreList() {
    if (!database) {
        console.error('Firebase database not initialized');
        return;
    }

    const storeListElement = document.getElementById('storeList');
    if (!storeListElement) {
        console.log('Store list element not found in this page');
        return;
    }

    const storesRef = database.ref('stores');
    storesRef.on('value', (snapshot) => {
        const storeList = document.getElementById('storeList');
        if (!storeList) return;
        
        storeList.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const store = childSnapshot.val();
                const storeId = childSnapshot.key;
                
                const storeItem = document.createElement('div');
                storeItem.className = 'store-item';
                storeItem.innerHTML = `
                    <div class="store-info">
                        <i class="fas fa-store"></i>
                        <div class="store-details">
                            <div class="store-name">${store.name || 'Không có tên'}</div>
                            <div class="store-address">${store.address || 'Không có địa chỉ'}</div>
                        </div>
                    </div>
                `;
                
                storeItem.onclick = () => selectStore(storeId, store);
                storeList.appendChild(storeItem);
            });
        } else {
            storeList.innerHTML = '<div class="no-stores">Chưa có cửa hàng nào</div>';
        }
    });
}

function toggleStoreDropdown() {
    const dropdown = document.getElementById('storeDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function selectStore(storeId, storeData) {
    // Save to localStorage
    localStorage.setItem('selectedStoreId', storeId);
    localStorage.setItem('selectedStoreData', JSON.stringify(storeData));
    
    // Update UI
    document.getElementById('currentStoreName').textContent = storeData.name || 'Cửa hàng không xác định';
    
    // Close dropdown
    document.getElementById('storeDropdown').classList.add('hidden');
    
    // Reload data for the new store
    loadProducts();
    loadSellingProducts();
    
    showNotification(`Đã chọn cửa hàng: ${storeData.name}`, 'success');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const storeSelectorContainer = document.getElementById('storeSelectorContainer');
    const dropdown = document.getElementById('storeDropdown');
    
    if (storeSelectorContainer && dropdown && !storeSelectorContainer.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// Get selected store ID
function getSelectedStoreId() {
    const storeId = localStorage.getItem('selectedStoreId');
    console.log('Getting selected store ID:', storeId);
    return storeId;
}

// Update selling price directly from table
function updateSellingPrice(sellingProductId, newPrice) {
    const price = parseFloat(newPrice) || 0;
    const storeId = getSelectedStoreId();
    
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng', 'warning');
        return;
    }
    
    database.ref(`sellingProducts/${storeId}/${sellingProductId}`).update({
        sellingPrice: price,
        updatedAt: new Date().toISOString()
    }).then(() => {
        console.log('Updated selling price:', price);
        // Update local data
        const product = sellingProducts.find(p => p.id === sellingProductId);
        if (product) {
            product.sellingPrice = price;
            updateStatistics();
        }
        // Show success notification
        showNotification('Đã lưu giá bán thành công', 'success');
    }).catch(error => {
        console.error('Error updating selling price:', error);
        showNotification('Có lỗi khi cập nhật giá bán', 'error');
    });
}

// Update product status directly from table
function updateProductStatus(sellingProductId, newStatus) {
    const storeId = getSelectedStoreId();
    
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng', 'warning');
        return;
    }
    
    database.ref(`sellingProducts/${storeId}/${sellingProductId}`).update({
        status: newStatus,
        updatedAt: new Date().toISOString()
    }).then(() => {
        console.log('Updated product status:', newStatus);
        // Update local data
        const product = sellingProducts.find(p => p.id === sellingProductId);
        if (product) {
            product.status = newStatus;
            updateStatistics();
        }
        // Show success notification
        const statusText = newStatus === 'active' ? 'Đang bán' : 'Tạm dừng';
        showNotification(`Đã lưu trạng thái: ${statusText}`, 'success');
    }).catch(error => {
        console.error('Error updating product status:', error);
        showNotification('Có lỗi khi cập nhật trạng thái', 'error');
    });
}

// Format number for display
function formatNumber(value) {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('vi-VN');
}

// Format price as user types (real-time formatting)
function formatPriceAsType(input) {
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value) {
        // Format with thousand separators
        const numValue = parseInt(value);
        input.value = numValue.toLocaleString('vi-VN');
    }
}

// Get numeric value from formatted string
function getNumericValue(formattedValue) {
    return parseInt(formattedValue.replace(/\D/g, '')) || 0;
}

// Switch active button
function switchActiveButton(activeButtonId) {
    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    document.getElementById(activeButtonId).classList.add('active');
}

// Show sync confirmation modal
function showSyncConfirmModal() {
    const modal = document.createElement('div');
    modal.className = 'sync-confirm-modal';
    modal.innerHTML = `
        <div class="sync-confirm-overlay">
            <div class="sync-confirm-content">
                <div class="sync-confirm-header">
                    <i class="fas fa-sync-alt"></i>
                    <h3>Xác nhận đồng bộ</h3>
                </div>
                <div class="sync-confirm-body">
                    <p>Bạn có chắc chắn muốn đồng bộ tất cả sản phẩm?</p>
                    <p class="text-muted">Điều này sẽ thêm tất cả sản phẩm chưa có trong danh sách bán.</p>
                </div>
                <div class="sync-confirm-footer">
                    <button class="btn btn-secondary" onclick="closeSyncConfirmModal()">Hủy</button>
                    <button class="btn btn-success" onclick="confirmSync()">
                        <i class="fas fa-check"></i>
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// Close sync confirmation modal
function closeSyncConfirmModal() {
    const modal = document.querySelector('.sync-confirm-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// Confirm sync with loading effect
function confirmSync() {
    closeSyncConfirmModal();
    
    // Show loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'sync-loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="sync-loading-content">
            <div class="sync-loading-spinner">
                <i class="fas fa-sync-alt fa-spin"></i>
            </div>
            <h3>Đang đồng bộ sản phẩm...</h3>
            <p>Vui lòng chờ trong giây lát</p>
        </div>
    `;
    
    document.body.appendChild(loadingOverlay);
    setTimeout(() => loadingOverlay.classList.add('show'), 10);
    
    // Execute sync immediately after short delay
    setTimeout(() => {
        try {
            syncAllProducts();
            
            // Hide loading after sync completes
            setTimeout(() => {
                loadingOverlay.classList.remove('show');
                setTimeout(() => loadingOverlay.remove(), 300);
            }, 500);
        } catch (error) {
            console.error('Error in confirmSync:', error);
            loadingOverlay.classList.remove('show');
            setTimeout(() => loadingOverlay.remove(), 300);
            showNotification('Có lỗi xảy ra khi đồng bộ', 'error');
        }
    }, 500);
}

// Toggle selling product selection for bulk actions
function toggleSellingProductSelection(productId, isChecked) {
    if (isChecked) {
        selectedSellingProducts.add(productId);
    } else {
        selectedSellingProducts.delete(productId);
    }
    updateBulkActionsVisibility();
}

// Toggle select all selling products
function toggleSelectAllSellingProducts() {
    const selectAllCheckbox = document.getElementById('selectAllSellingProducts');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        toggleSellingProductSelection(checkbox.value, checkbox.checked);
    });
}

// Update bulk actions visibility and count
function updateBulkActionsVisibility() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedSellingCount');
    const count = selectedSellingProducts.size;
    
    if (count > 0) {
        bulkActions.classList.remove('hidden');
        selectedCount.textContent = `Đã chọn: ${count} sản phẩm`;
    } else {
        bulkActions.classList.add('hidden');
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAllSellingProducts');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const checkedCount = document.querySelectorAll('.product-checkbox:checked').length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
}

// Delete selected products
function deleteSelectedProducts() {
    if (selectedSellingProducts.size === 0) {
        showNotification('Vui lòng chọn ít nhất một sản phẩm để xóa', 'warning');
        return;
    }
    
    const count = selectedSellingProducts.size;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${count} sản phẩm đã chọn?`)) {
        return;
    }
    
    const storeId = getSelectedStoreId();
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng', 'warning');
        return;
    }
    
    const batch = {};
    selectedSellingProducts.forEach(productId => {
        batch[`sellingProducts/${storeId}/${productId}`] = null;
    });
    
    database.ref().update(batch)
        .then(() => {
            // Remove from local arrays
            selectedSellingProducts.forEach(productId => {
                const index = sellingProducts.findIndex(p => p.id === productId);
                if (index !== -1) {
                    sellingProducts.splice(index, 1);
                }
            });
            
            filteredSellingProducts = [...sellingProducts];
            selectedSellingProducts.clear();
            displaySellingProducts();
            updateStatistics();
            updateBulkActionsVisibility();
            
            showNotification(`Đã xóa ${count} sản phẩm thành công`, 'success');
        })
        .catch(error => {
            console.error('Error deleting selected products:', error);
            showNotification('Có lỗi xảy ra khi xóa sản phẩm', 'error');
        });
}

// Delete all products
function deleteAllProducts() {
    if (sellingProducts.length === 0) {
        showNotification('Không có sản phẩm nào để xóa', 'warning');
        return;
    }
    
    const count = sellingProducts.length;
    if (!confirm(`Bạn có chắc chắn muốn xóa TẤT CẢ ${count} sản phẩm?`)) {
        return;
    }
    
    const storeId = getSelectedStoreId();
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng', 'warning');
        return;
    }
    
    database.ref(`sellingProducts/${storeId}`).remove()
        .then(() => {
            sellingProducts = [];
            filteredSellingProducts = [];
            selectedSellingProducts.clear();
            displaySellingProducts();
            updateStatistics();
            updateBulkActionsVisibility();
            
            showNotification(`Đã xóa tất cả ${count} sản phẩm thành công`, 'success');
        })
        .catch(error => {
            console.error('Error deleting all products:', error);
            showNotification('Có lỗi xảy ra khi xóa tất cả sản phẩm', 'error');
        });
}

// Filter products function (called from HTML)
function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredSellingProducts = sellingProducts.filter(product => {
        const matchesSearch = !searchTerm || 
            (product.productName && product.productName.toLowerCase().includes(searchTerm)) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm));
        
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    currentPage = 1; // Reset to first page
    displaySellingProducts();
}

// Update search results display
function updateSearchResults() {
    const totalProducts = sellingProducts.length;
    const filteredProducts = filteredSellingProducts.length;
    
    // Update pagination info
    const totalPages = Math.ceil(filteredProducts / itemsPerPage);
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        if (filteredProducts === 0) {
            paginationInfo.textContent = 'Không có sản phẩm';
        } else {
            paginationInfo.textContent = `Trang ${currentPage} / ${totalPages} (${filteredProducts} sản phẩm)`;
        }
    }
    
    // Update pagination buttons
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
    
    // Generate page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    if (pageNumbers && totalPages > 1) {
        pageNumbers.innerHTML = '';
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`;
                pageBtn.textContent = i;
                pageBtn.onclick = () => changePage(i);
                pageNumbers.appendChild(pageBtn);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pageNumbers.appendChild(ellipsis);
            }
        }
    }
}

// Sort table by field
function sortTable(field) {
    // Toggle sort direction if same field, otherwise start with ascending
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    // Update sort icons
    updateSortIcons(field, currentSort.direction);
    
    // Sort the filtered products
    filteredSellingProducts.sort((a, b) => {
        let aValue, bValue;
        
        // Get original product data for inventory if needed
        const aOriginal = allProducts.find(p => p.id === a.productId);
        const bOriginal = allProducts.find(p => p.id === b.productId);
        
        switch (field) {
            case 'sellingPrice':
                aValue = parseFloat(a.sellingPrice) || 0;
                bValue = parseFloat(b.sellingPrice) || 0;
                break;
            case 'inventory':
                aValue = parseFloat(a.inventory || (aOriginal ? aOriginal.inventory || aOriginal.stock || aOriginal.quantity : 0) || 0);
                bValue = parseFloat(b.inventory || (bOriginal ? bOriginal.inventory || bOriginal.stock || bOriginal.quantity : 0) || 0);
                break;
            case 'purchaseCount':
                aValue = parseFloat(a.purchaseCount) || 0;
                bValue = parseFloat(b.purchaseCount) || 0;
                break;
            case 'unit':
                aValue = (a.unit || (aOriginal ? aOriginal.unit || aOriginal.unitName : '') || 'cái').toLowerCase();
                bValue = (b.unit || (bOriginal ? bOriginal.unit || bOriginal.unitName : '') || 'cái').toLowerCase();
                break;
            default:
                return 0;
        }
        
        // Compare values
        if (field === 'unit') {
            // String comparison for unit
            if (currentSort.direction === 'asc') {
                return aValue.localeCompare(bValue, 'vi', { sensitivity: 'base' });
            } else {
                return bValue.localeCompare(aValue, 'vi', { sensitivity: 'base' });
            }
        } else {
            // Numeric comparison
            if (currentSort.direction === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        }
    });
    
    // Reset to first page and redisplay
    currentPage = 1;
    displaySellingProducts();
}

// Update sort icons
function updateSortIcons(activeField, direction) {
    // Reset all sort icons
    const sortIcons = ['sort-sellingPrice', 'sort-inventory', 'sort-unit', 'sort-purchaseCount'];
    sortIcons.forEach(iconId => {
        const icon = document.getElementById(iconId);
        if (icon) {
            icon.className = 'fas fa-sort';
        }
    });
    
    // Set active sort icon
    const activeIcon = document.getElementById(`sort-${activeField}`);
    if (activeIcon) {
        activeIcon.className = direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
}

// Search original products in modal
function searchOriginalProducts() {
    const searchTerm = document.getElementById('modalSearchInput').value.toLowerCase();
    const productList = document.getElementById('productList');
    
    if (!productList) return;
    
    // Clear existing list
    productList.innerHTML = '';
    
    // Get available products (not in selling products)
    const availableProducts = allProducts.filter(product => {
        const isInSelling = sellingProducts.some(sp => sp.productId === product.id);
        const matchesSearch = !searchTerm || 
            (product.productName && product.productName.toLowerCase().includes(searchTerm)) ||
            (product.name && product.name.toLowerCase().includes(searchTerm)) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm));
        
        return !isInSelling && matchesSearch;
    });
    
    if (availableProducts.length === 0) {
        productList.innerHTML = '<tr><td colspan="9" class="text-center">Không tìm thấy sản phẩm nào</td></tr>';
    } else {
        availableProducts.forEach((product, index) => {
            const productItem = createProductListItemWithCheckbox(product, index);
            productList.appendChild(productItem);
        });
    }
}

// Global functions for HTML onclick events
window.openProductSelectionModal = openProductSelectionModal;
window.closeProductSelectionModal = closeProductSelectionModal;
window.toggleProductSelection = toggleProductSelection;
window.selectAllProducts = selectAllProducts;
window.clearAllSelections = clearAllSelections;
window.createSelectedProducts = createSelectedProducts;
window.switchActiveButton = switchActiveButton;
window.showSyncConfirmModal = showSyncConfirmModal;
window.closeSyncConfirmModal = closeSyncConfirmModal;
window.confirmSync = confirmSync;
window.openSellingPriceModal = openSellingPriceModal;
window.closeSellingPriceModal = closeSellingPriceModal;
window.calculateProfit = calculateProfit;
window.saveSellingProduct = saveSellingProduct;
window.syncAllProducts = syncAllProducts;
window.editSellingProduct = editSellingProduct;
window.deleteSellingProduct = deleteSellingProduct;
window.exportToExcel = exportToExcel;
window.changePage = changePage;
window.toggleStoreDropdown = toggleStoreDropdown;
window.formatPriceAsType = formatPriceAsType;
window.getNumericValue = getNumericValue;
window.selectStore = selectStore;
window.updateSellingPrice = updateSellingPrice;
window.updateProductStatus = updateProductStatus;
window.formatNumber = formatNumber;
window.toggleSellingProductSelection = toggleSellingProductSelection;
window.toggleSelectAllSellingProducts = toggleSelectAllSellingProducts;
window.deleteSelectedProducts = deleteSelectedProducts;
window.deleteAllProducts = deleteAllProducts;
window.filterProducts = filterProducts;
window.searchOriginalProducts = searchOriginalProducts;
window.sortTable = sortTable;