// Global variables
let selectedStoreId = localStorage.getItem('selectedStoreId');
let selectedStoreData = null;
let wholesaleOrdersData = [];
window.wholesaleOrdersData = [];
let isSubmitting = false;

let lastOrderId = null;
let customersData = [];

// Initialize wholesale orders
function initWholesaleOrders() {
    console.log('=== Initializing wholesale orders system ===');
    
    // Load existing wholesale orders from Firebase first
    loadWholesaleOrders();
    
    // Check if DOM is ready
    const container = document.getElementById('wholesaleItemsContainer');
    const dateInput = document.getElementById('wholesaleOrderDate');
    
    console.log('DOM elements check:');
    console.log('- wholesaleItemsContainer:', !!container);
    console.log('- wholesaleOrderDate:', !!dateInput);
    
    if (!container || !dateInput) {
        console.error('Required DOM elements not found! Retrying in 1 second...');
        setTimeout(initWholesaleOrders, 1000);
        return;
    }
    
    // Check Firebase database
    console.log('Firebase check:');
    console.log('- window.database:', !!window.database);
    console.log('- firebase:', typeof firebase !== 'undefined');
    
    if (!window.database && typeof firebase !== 'undefined') {
        console.log('Initializing Firebase database...');
        window.database = firebase.database();
    }
    
    // Get selected store info
    selectedStoreId = localStorage.getItem('selectedStoreId');
    selectedStoreData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
    
    console.log('Store info:');
    console.log('- selectedStoreId:', selectedStoreId);
    console.log('- selectedStoreData:', selectedStoreData);
    
    if (!selectedStoreId) {
        showNotification('Vui lòng chọn cửa hàng trước khi tạo đơn hàng', 'warning');
        return;
    }
    
    // Set current date
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];
    dateInput.value = todayString;
    console.log('Set wholesale order date to:', todayString);
    
    // Check products data
    console.log('Products data check:');
    console.log('- window.productsData exists:', !!window.productsData);
    console.log('- products count:', window.productsData ? Object.keys(window.productsData).length : 0);
    
    // Try to load products if not available
    if (!window.productsData || Object.keys(window.productsData).length === 0) {
        console.log('Products not loaded, attempting to load from Firebase...');
        
        if (window.database) {
            window.database.ref('products').once('value')
                .then(snapshot => {
                    const products = snapshot.val() || {};
                    console.log('Products loaded from Firebase:', Object.keys(products).length, 'items');
                    
                    // Update global reference
                    window.productsData = products;
                    
                    // Refresh any existing product dropdowns
                    refreshProductOptions();
                    
                    if (Object.keys(products).length > 0) {
                        console.log('Products loaded successfully, adding first item');
                        addWholesaleItem();
                        showNotification(`Đã tải ${Object.keys(products).length} sản phẩm thành công`, 'success');
                    } else {
                        console.warn('No products found in database');
                        showNotification('Không có sản phẩm nào trong cơ sở dữ liệu', 'warning');
                        addWholesaleItem(); // Add form anyway
                    }
                })
                .catch(error => {
                    console.error('Error loading products from Firebase:', error);
                    showNotification('Lỗi tải sản phẩm: ' + error.message, 'error');
                    addWholesaleItem(); // Add form anyway
                });
        } else {
            console.error('Firebase database not available');
            showNotification('Lỗi: Không thể kết nối cơ sở dữ liệu', 'error');
            addWholesaleItem(); // Add form anyway
        }
    } else {
        console.log('Products already loaded, adding first item');
        addWholesaleItem();
    }
    
    // Add form submit event listener to prevent double submit
    const form = document.getElementById('wholesaleOrderForm');
    if (form) {
        form.addEventListener('submit', createWholesaleOrder);
    }
    
    // Add format event listeners for discount and shipping
    const discountInput = document.getElementById('wholesaleDiscount');
    const shippingInput = document.getElementById('wholesaleShipping');
    
    if (discountInput) {
        discountInput.addEventListener('input', function() {
            formatNumberInput(this);
            updateWholesaleSummary();
        });
    }
    
    if (shippingInput) {
        shippingInput.addEventListener('input', function() {
            formatNumberInput(this);
            updateWholesaleSummary();
        });
    }
    
    console.log('=== Wholesale orders system initialized successfully ===');
}

// Load wholesale orders from Firebase
function loadWholesaleOrders() {
    console.log('=== Loading wholesale orders from Firebase ===');
    
    if (!selectedStoreId) {
        console.error('No store selected');
        return;
    }
    
    if (!window.database) {
        console.error('Firebase database not available');
        return;
    }
    
    const ordersRef = window.database.ref(`stores/${selectedStoreId}/orders`);
    
    ordersRef.once('value')
        .then(snapshot => {
            const allOrders = snapshot.val() || {};
            console.log('All orders loaded:', Object.keys(allOrders).length);
            
            // Filter for wholesale orders only
            wholesaleOrdersData = Object.keys(allOrders)
                .map(orderId => ({
                    id: orderId,
                    ...allOrders[orderId]
                }))
                .filter(order => order.type === 'wholesale')
                .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            
            // Update global reference
            window.wholesaleOrdersData = wholesaleOrdersData;
            
            console.log('Filtered wholesale orders:', wholesaleOrdersData.length, 'out of', Object.keys(allOrders).length, 'total orders');
            
            displayWholesaleOrders();
        })
        .catch(error => {
            console.error('Error loading wholesale orders:', error);
            showNotification('Lỗi tải danh sách đơn hàng: ' + error.message, 'error');
        });
}

// Display wholesale orders in table (old version without pagination)
function displayWholesaleOrders(searchTerm = '') {
    console.log('=== displayWholesaleOrders called ===');
    
    const tbody = document.getElementById('wholesaleOrdersBody');
    const emptyState = document.getElementById('wholesaleEmptyState');
    
    if (!tbody) {
        console.error('wholesaleOrdersBody not found');
        return;
    }
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Filter orders by search term if provided
    let filteredOrders = wholesaleOrdersData;
    if (searchTerm) {
        filteredOrders = wholesaleOrdersData.filter(order => 
            order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    if (!filteredOrders || filteredOrders.length === 0) {
        console.log('No wholesale orders to display');
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    console.log(`Displaying ${filteredOrders.length} wholesale orders`);
    
    // Display all orders (no pagination)
    filteredOrders.forEach((order, index) => {
        const row = document.createElement('tr');
        
        // Format items for display
        const itemsText = order.items.map(item => {
            const unit = item.unit || 'cái';
            return `${item.productName} (${item.quantity}${unit})`;
        }).join(', ');
        const shortItems = itemsText.length > 50 ? itemsText.substring(0, 50) + '...' : itemsText;
        
        // Calculate remaining amount
        const remaining = order.total - (order.deposit || 0);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="order-checkbox" value="${order.id}" onchange="toggleOrderSelection()">
            </td>
            <td>${index + 1}</td>
            <td>${order.customerName || 'N/A'}</td>
            <td>${order.customerPhone || 'N/A'}</td>
            <td>${order.orderDate || 'N/A'}</td>
            <td title="${itemsText}">${shortItems}</td>
            <td>${formatCurrency(order.total)} VNĐ</td>
            <td>${formatCurrency(order.deposit || 0)} VNĐ</td>
            <td>${formatCurrency(remaining)} VNĐ</td>
            <td><span class="payment-status-badge payment-${order.paymentStatus || 'pending'}">${getPaymentStatusText(order.paymentStatus)}</span></td>
            <td>
                <div class="action-buttons">
                    <select class="payment-status-select" onchange="updatePaymentStatus('${order.id}', this.value)" title="Cập nhật trạng thái thanh toán">
                        <option value="pending" ${(order.paymentStatus || 'pending') === 'pending' ? 'selected' : ''}>Chưa thanh toán</option>
                        <option value="partial" ${order.paymentStatus === 'partial' ? 'selected' : ''}>Thanh toán 1 phần</option>
                        <option value="paid" ${order.paymentStatus === 'paid' ? 'selected' : ''}>Đã thanh toán</option>
                    </select>
                    <button onclick="viewWholesaleOrderDetails('${order.id}')" class="btn-action btn-view" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="printWholesaleInvoice('${order.id}')" class="btn-action btn-print" title="In hóa đơn">
                        <i class="fas fa-print"></i>
                    </button>
                    <button onclick="deleteWholesaleOrder('${order.id}')" class="btn-action btn-delete" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('Wholesale orders displayed successfully');
}

// Get payment status text
function getPaymentStatusText(status) {
    const statusMap = {
        'pending': 'Chưa thanh toán',
        'partial': 'Thanh toán 1 phần', 
        'paid': 'Đã thanh toán'
    };
    return statusMap[status] || 'Chưa thanh toán';
}

// Update payment status
async function updatePaymentStatus(orderId, newStatus) {
    try {
        console.log(`Updating payment status for order ${orderId} to ${newStatus}`);
        
        if (!selectedStoreId || !window.database) {
            throw new Error('Store not selected or database not available');
        }
        
        // Update in Firebase
        await window.database.ref(`stores/${selectedStoreId}/orders/${orderId}/paymentStatus`).set(newStatus);
        
        // Update local data
        const orderIndex = wholesaleOrdersData.findIndex(order => order.id === orderId);
        if (orderIndex !== -1) {
            wholesaleOrdersData[orderIndex].paymentStatus = newStatus;
            window.wholesaleOrdersData = wholesaleOrdersData;
        }
        
        // Refresh display
        displayWholesaleOrders();
        
        showNotification('Cập nhật trạng thái thanh toán thành công', 'success');
        console.log('Payment status updated successfully');
        
    } catch (error) {
        console.error('Error updating payment status:', error);
        showNotification('Lỗi cập nhật trạng thái thanh toán: ' + error.message, 'error');
    }
}

// Additional variables for wholesale item management
let wholesaleItemCounter = 0;

// Add new wholesale item
function addWholesaleItem() {
    console.log('=== addWholesaleItem called ===');
    
    wholesaleItemCounter++;
    console.log('Wholesale item counter:', wholesaleItemCounter);
    
    const container = document.getElementById('wholesaleItemsContainer');
    console.log('Container found:', !!container);
    
    if (!container) {
        console.error('wholesaleItemsContainer not found!');
        showNotification('Lỗi: Không tìm thấy container sản phẩm', 'error');
        return;
    }
    
    const itemHTML = `
        <div class="wholesale-item" id="wholesaleItem${wholesaleItemCounter}" style="background: #fff; border: 2px solid #e9ecef; border-radius: 12px; ;  box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s ease;">
            <div class="wholesale-item-header" style="display: flex; justify-content: space-between; align-items: center;  border-bottom: 2px solid #f8f9fa;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; background: linear-gradient(135deg, #007bff, #0056b3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${wholesaleItemCounter}</div>
                    <span style="font-size: 14px; font-weight: 600; color: #333;">Sản phẩm ${wholesaleItemCounter}</span>
                </div>
                <button type="button" onclick="removeWholesaleItem(${wholesaleItemCounter})" style="background: #dc3545; color: white; border: none; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;">
                    <i class="fas fa-trash" style="font-size: 12px; cursor: pointer;"></i>
                </button>
            </div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; ">
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555;  font-size: 14px;">📦 Tên Sản Phẩm *</label>
                    <select class="wholesale-product-select" onchange="updateWholesaleItemPrice(${wholesaleItemCounter})" required style="width: 100%; padding: 6px 16px; border: 2px solid #e9ecef; cursor: pointer; border-radius: 8px; font-size: 14px; background: white; transition: all 0.3s ease;">
                        <option value="">Chọn sản phẩm...</option>
                        ${generateProductOptions()}
                    </select>
                </div>
                <div style="position: relative;">
                    <label id="quantityLabel${wholesaleItemCounter}" style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">⚖️ Số Lượng *</label>
                    <input type="number" class="wholesale-quantity" min="0.1" step="0.1" placeholder="Nhập số lượng" onchange="updateWholesaleItemTotal(${wholesaleItemCounter})" required style="width: 100%; padding: 6px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: all 0.3s ease;">
                </div>
                <div style="position: relative;">
                    <label id="priceLabel${wholesaleItemCounter}" style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">💰 Giá Bán *</label>
                    <input type="text" class="wholesale-price" placeholder="Ví dụ: 39.000" onchange="updateWholesaleItemTotal(${wholesaleItemCounter})" required style="width: 100%; padding: 6px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: all 0.3s ease;">
                </div>
            </div>
            <div style="margin-top: 10px;">
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">💵 Thành Tiền</label>
                    <div class="wholesale-item-total" style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; font-weight: 700; color:rgb(40, 131, 4); font-size: 14px; border: 2px solid #e9ecef; display: flex; align-items: center; justify-content: center; min-height: 30px; text-align: center;">0 VNĐ</div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHTML);
    
    // Add format number event listeners
    const newItem = document.getElementById(`wholesaleItem${wholesaleItemCounter}`);
    if (newItem) {
        const priceInput = newItem.querySelector('.wholesale-price');
        if (priceInput) {
            priceInput.addEventListener('input', function() {
                formatNumberInput(this);
                updateWholesaleItemTotal(wholesaleItemCounter);
            });
        }
    }
    
    console.log('Wholesale item added successfully');
    updateWholesaleSummary();
}

// Generate product options
function generateProductOptions() {
    if (!window.productsData || Object.keys(window.productsData).length === 0) {
        return '<option value="">Không có sản phẩm nào</option>';
    }
    
    return Object.keys(window.productsData).map(productId => {
        const product = window.productsData[productId];
        const unit = product.unit || 'cái';
        const conversion = product.conversion || 1;
        return `<option value="${productId}" data-price="${product.price}" data-unit="${unit}" data-conversion="${conversion}">${product.name} - ${formatCurrency(product.price)} VNĐ/${unit}</option>`;
    }).join('');
}

// Refresh product options in all dropdowns
function refreshProductOptions() {
    const selects = document.querySelectorAll('.wholesale-product-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Chọn sản phẩm...</option>' + generateProductOptions();
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// Remove wholesale item
function removeWholesaleItem(itemId) {
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (item) {
        item.remove();
        updateWholesaleSummary();
        console.log(`Removed wholesale item ${itemId}`);
    }
}

// Update wholesale item price when product is selected
function updateWholesaleItemPrice(itemId) {
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (!item) return;
    
    const select = item.querySelector('.wholesale-product-select');
    const priceInput = item.querySelector('.wholesale-price');
    const quantityLabel = document.getElementById(`quantityLabel${itemId}`);
    const priceLabel = document.getElementById(`priceLabel${itemId}`);
    
    if (select && priceInput) {
        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption && selectedOption.dataset.price) {
            const price = parseInt(selectedOption.dataset.price);
            const unit = selectedOption.dataset.unit || 'cái';
            
            // Update labels with unit
            if (quantityLabel) {
                quantityLabel.innerHTML = `⚖️ Số Lượng (${unit}) *`;
            }
            if (priceLabel) {
                priceLabel.innerHTML = `💰 Giá Bán (VNĐ/${unit}) *`;
            }
            
            priceInput.value = formatCurrency(price);
            updateWholesaleItemTotal(itemId);
        } else {
            // Reset labels when no product selected
            if (quantityLabel) {
                quantityLabel.innerHTML = '⚖️ Số Lượng *';
            }
            if (priceLabel) {
                priceLabel.innerHTML = '💰 Giá Bán *';
            }
        }
    }
}

// Update wholesale item total
function updateWholesaleItemTotal(itemId) {
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (!item) return;
    
    const quantityInput = item.querySelector('.wholesale-quantity');
    const priceInput = item.querySelector('.wholesale-price');
    const totalDiv = item.querySelector('.wholesale-item-total');
    
    if (quantityInput && priceInput && totalDiv) {
        const quantity = parseFloat(quantityInput.value) || 0;
        const price = parseFormattedNumber(priceInput.value) || 0;
        const total = quantity * price;
        
        totalDiv.textContent = formatCurrency(total) + ' VNĐ';
        updateWholesaleSummary();
    }
}

// Update wholesale summary
function updateWholesaleSummary() {
    const items = document.querySelectorAll('.wholesale-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const totalDiv = item.querySelector('.wholesale-item-total');
        if (totalDiv) {
            const totalText = totalDiv.textContent.replace(/[^0-9]/g, '');
            subtotal += parseInt(totalText) || 0;
        }
    });
    
    const discountInput = document.getElementById('wholesaleDiscount');
    const shippingInput = document.getElementById('wholesaleShipping');
    
    const discount = parseFormattedNumber(discountInput?.value) || 0;
    const shipping = parseFormattedNumber(shippingInput?.value) || 0;
    
    const total = subtotal - discount + shipping;
    
    // Update summary display
    const subtotalSpan = document.getElementById('wholesaleSubtotal');
    const discountSpan = document.getElementById('wholesaleDiscountAmount');
    const shippingSpan = document.getElementById('wholesaleShippingAmount');
    const totalSpan = document.getElementById('wholesaleTotal');
    
    if (subtotalSpan) subtotalSpan.textContent = formatCurrency(subtotal) + ' VNĐ';
    if (discountSpan) discountSpan.textContent = formatCurrency(discount) + ' VNĐ';
    if (shippingSpan) shippingSpan.textContent = formatCurrency(shipping) + ' VNĐ';
    if (totalSpan) totalSpan.textContent = formatCurrency(total) + ' VNĐ';
}

// Clear wholesale form
function clearWholesaleForm() {
    // Clear all items
    const container = document.getElementById('wholesaleItemsContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    // Reset counter
    wholesaleItemCounter = 0;
    
    // Clear customer info
    const customerName = document.getElementById('wholesaleCustomerName');
    const customerPhone = document.getElementById('wholesaleCustomerPhone');
    const customerAddress = document.getElementById('wholesaleCustomerAddress');
    const discount = document.getElementById('wholesaleDiscount');
    const shipping = document.getElementById('wholesaleShipping');
    const deposit = document.getElementById('wholesaleDeposit');
    const notes = document.getElementById('wholesaleNotes');
    
    if (customerName) customerName.value = '';
    if (customerPhone) customerPhone.value = '';
    if (customerAddress) customerAddress.value = '';
    if (discount) discount.value = '';
    if (shipping) shipping.value = '';
    if (deposit) deposit.value = '';
    if (notes) notes.value = '';
    
    // Add first item
    addWholesaleItem();
    
    console.log('Wholesale form cleared');
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

// Parse formatted number
function parseFormattedNumber(formattedNum) {
    if (!formattedNum) return 0;
    return parseInt(formattedNum.toString().replace(/[^0-9]/g, '')) || 0;
}

// Format number input
function formatNumberInput(input) {
    let value = input.value;
    
    // Remove all non-digit characters except for the first character if it's a minus sign
    let isNegative = value.startsWith('-');
    value = value.replace(/[^\d]/g, '');
    
    // Add back negative sign if it was there
    if (isNegative && value) {
        value = '-' + value;
    }
    
    // Format with thousand separators
    if (value) {
        const number = parseInt(value);
        input.value = formatCurrency(Math.abs(number));
        if (isNegative) {
            input.value = '-' + input.value;
        }
    }
}

// Create wholesale order and save to Firebase
async function createWholesaleOrder(event) {
    if (event) {
        event.preventDefault();
    }
    
    console.log('=== Creating wholesale order ===');
    
    // Prevent double submission
    if (isSubmitting) {
        console.log('Already submitting, ignoring...');
        return;
    }
    
    isSubmitting = true;
    
    try {
        // Validate store selection
        if (!selectedStoreId) {
            throw new Error('Vui lòng chọn cửa hàng trước khi tạo đơn hàng');
        }
        
        if (!window.database) {
            throw new Error('Không thể kết nối cơ sở dữ liệu');
        }
        
        // Get form data
        const customerName = document.getElementById('wholesaleCustomerName')?.value?.trim();
        const customerPhone = document.getElementById('wholesaleCustomerPhone')?.value?.trim();
        const customerAddress = document.getElementById('wholesaleCustomerAddress')?.value?.trim();
        const orderDate = document.getElementById('wholesaleOrderDate')?.value;
        const discount = parseFormattedNumber(document.getElementById('wholesaleDiscount')?.value) || 0;
        const shipping = parseFormattedNumber(document.getElementById('wholesaleShipping')?.value) || 0;
        const deposit = parseFormattedNumber(document.getElementById('wholesaleDeposit')?.value) || 0;
        const notes = document.getElementById('wholesaleNotes')?.value?.trim() || '';
        
        // Validate required fields
        if (!customerName) {
            throw new Error('Vui lòng nhập tên khách hàng');
        }
        
        if (!customerPhone) {
            throw new Error('Vui lòng nhập số điện thoại khách hàng');
        }
        
        if (!orderDate) {
            throw new Error('Vui lòng chọn ngày đặt hàng');
        }
        
        // Collect items data
        const items = [];
        const itemElements = document.querySelectorAll('.wholesale-item');
        
        if (itemElements.length === 0) {
            throw new Error('Vui lòng thêm ít nhất một sản phẩm');
        }
        
        let subtotal = 0;
        
        for (const itemElement of itemElements) {
            const productSelect = itemElement.querySelector('.wholesale-product-select');
            const quantityInput = itemElement.querySelector('.wholesale-quantity');
            const priceInput = itemElement.querySelector('.wholesale-price');
            
            if (!productSelect?.value) {
                throw new Error('Vui lòng chọn sản phẩm cho tất cả các mục');
            }
            
            const quantity = parseFloat(quantityInput?.value);
            if (!quantity || quantity <= 0) {
                throw new Error('Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm');
            }
            
            const price = parseFormattedNumber(priceInput?.value);
            if (!price || price <= 0) {
                throw new Error('Vui lòng nhập giá bán hợp lệ cho tất cả sản phẩm');
            }
            
            const productId = productSelect.value;
            const productName = productSelect.options[productSelect.selectedIndex].text.split(' - ')[0];
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            const unit = selectedOption.dataset.unit || 'cái';
            const conversion = parseFloat(selectedOption.dataset.conversion) || 1;
            const actualQuantityForStock = quantity * conversion;
            const itemTotal = quantity * price;
            
            // Validate stock availability
            const product = window.productsData[productId];
            if (product && product.stock < actualQuantityForStock) {
                throw new Error(`Sản phẩm "${productName}" không đủ tồn kho. Cần: ${actualQuantityForStock}${unit}, Có: ${product.stock}${unit}`);
            }
            
            items.push({
                productId,
                productName,
                quantity,
                unit,
                conversion,
                actualQuantityForStock,
                price,
                total: itemTotal
            });
            
            subtotal += itemTotal;
        }
        
        const total = subtotal - discount + shipping;
        
        if (total <= 0) {
            throw new Error('Tổng tiền đơn hàng phải lớn hơn 0');
        }
        
        // Create order object
        const orderData = {
            type: 'wholesale',
            customerName,
            customerPhone,
            customerAddress,
            orderDate,
            items,
            subtotal,
            discount,
            shipping,
            total,
            deposit,
            notes,
            paymentStatus: deposit >= total ? 'paid' : (deposit > 0 ? 'partial' : 'pending'),
            createdAt: new Date().toISOString(),
            storeId: selectedStoreId
        };
        
        console.log('Order data prepared:', orderData);
        
        // Save to Firebase
        const orderRef = window.database.ref(`stores/${selectedStoreId}/orders`).push();
        await orderRef.set(orderData);
        
        const orderId = orderRef.key;
        console.log('Order saved with ID:', orderId);
        
        // Update stock for all ordered products
        console.log('=== Updating product stock for wholesale order ===');
        for (const item of items) {
            const productRef = window.database.ref(`products/${item.productId}`);
            const productSnapshot = await productRef.once('value');
            const currentProduct = productSnapshot.val();
            
            if (currentProduct) {
                const newStock = (currentProduct.stock || 0) - item.actualQuantityForStock;
                await productRef.update({ 
                    stock: Math.max(0, newStock), // Ensure stock doesn't go negative
                    updatedAt: new Date().toISOString()
                });
                console.log(`Updated stock for ${item.productName}: ${currentProduct.stock} -> ${newStock}`);
            }
        }
        
        // Show success message
        showNotification(`Đơn hàng bán sỉ đã được tạo thành công và cập nhật tồn kho! Mã đơn: ${orderId}`, 'success');
        
        // Clear form
        clearWholesaleForm();
        
        // Reload orders list
        loadWholesaleOrders();
        
        console.log('=== Wholesale order created successfully ===');
        
    } catch (error) {
        console.error('Error creating wholesale order:', error);
        showNotification('Lỗi tạo đơn hàng: ' + error.message, 'error');
    } finally {
        isSubmitting = false;
    }
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

// Export functions to global scope
window.initWholesaleOrders = initWholesaleOrders;
window.loadWholesaleOrders = loadWholesaleOrders;
window.displayWholesaleOrders = displayWholesaleOrders;
window.updatePaymentStatus = updatePaymentStatus;
window.getPaymentStatusText = getPaymentStatusText;
window.addWholesaleItem = addWholesaleItem;
window.removeWholesaleItem = removeWholesaleItem;
window.updateWholesaleItemPrice = updateWholesaleItemPrice;
window.updateWholesaleItemTotal = updateWholesaleItemTotal;
window.updateWholesaleSummary = updateWholesaleSummary;
window.clearWholesaleForm = clearWholesaleForm;
window.refreshProductOptions = refreshProductOptions;
window.createWholesaleOrder = createWholesaleOrder;

console.log('=== new-wholesale-orders.js loaded successfully (with product management) ===');
