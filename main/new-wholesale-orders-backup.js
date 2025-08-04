// New Wholesale Orders Management System
// Tạo và quản lý đơn hàng bán sỉ

// Global variables
let selectedStoreId = null;
let selectedStoreData = null;
let wholesaleOrdersData = [];
window.wholesaleOrdersData = [];
let isSubmitting = false;


let lastOrderId = null;
let customersData = [];

// Pre-declare functions to avoid "not defined" errors
function addWholesaleItem() { /* Will be defined later */ }
function removeWholesaleItem() { /* Will be defined later */ }
function updateWholesaleItemPrice() { /* Will be defined later */ }
function updateWholesaleItemTotal() { /* Will be defined later */ }
function updateWholesaleSummary() { /* Will be defined later */ }
function clearWholesaleForm() { /* Will be defined later */ }
function createWholesaleOrder() { /* Will be defined later */ }
function viewWholesaleOrderDetails() { /* Will be defined later */ }
function printWholesaleInvoice() { /* Will be defined later */ }
function closeModal() { /* Will be defined later */ }
function loadWholesaleOrders() { /* Will be defined later */ }
function loadCustomers() { /* Will be defined later */ }
function selectCustomer() { /* Will be defined later */ }
function saveCustomerToFirebase(customerData) { /* Will be defined later */ }
function updateCustomerOrderInfo(customerId) { /* Will be defined later */ }

// Expose functions to global scope immediately
window.addWholesaleItem = addWholesaleItem;
window.removeWholesaleItem = removeWholesaleItem;
window.updateWholesaleItemPrice = updateWholesaleItemPrice;
window.updateWholesaleItemTotal = updateWholesaleItemTotal;
window.updateWholesaleSummary = updateWholesaleSummary;
window.clearWholesaleForm = clearWholesaleForm;
window.createWholesaleOrder = createWholesaleOrder;
window.viewWholesaleOrderDetails = viewWholesaleOrderDetails;
window.printWholesaleInvoice = printWholesaleInvoice;
window.closeModal = closeModal;
window.loadWholesaleOrders = loadWholesaleOrders;
window.selectCustomer = selectCustomer;
window.loadCustomers = loadCustomers;

// Load customers from Firebase
function loadCustomers() {
    if (!selectedStoreId) {
        console.log('No store selected, cannot load customers');
        return;
    }

    const customersRef = firebase.database().ref(`stores/${selectedStoreId}/customers`);
    
    customersRef.on('value', (snapshot) => {
        customersData = [];
        const data = snapshot.val();
        
        if (data) {
            Object.keys(data).forEach(key => {
                customersData.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        
        console.log('Loaded customers:', customersData.length);
        updateCustomerDropdown();
    });
}

// Update customer dropdown with loaded customers
function updateCustomerDropdown() {
    const customerSelect = document.getElementById('customerSelection');
    if (!customerSelect) return;
    
    // Clear existing options except default ones
    customerSelect.innerHTML = `
        <option value="">-- Chọn khách hàng cũ hoặc tạo mới --</option>
        <option value="new">+ Tạo khách hàng mới</option>
    `;
    
    // Add customer options
    customersData.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.name} - ${customer.phone || 'Không có SĐT'}`;
        customerSelect.appendChild(option);
    });
}

// Handle customer selection
function selectCustomer() {
    const customerSelect = document.getElementById('customerSelection');
    const selectedValue = customerSelect.value;
    
    const nameInput = document.getElementById('wholesaleCustomerName');
    const phoneInput = document.getElementById('wholesaleCustomerPhone');
    const addressInput = document.getElementById('wholesaleCustomerAddress');
    const saveCheckbox = document.getElementById('saveCustomer');
    
    if (selectedValue === 'new' || selectedValue === '') {
        // Clear form for new customer
        nameInput.value = '';
        phoneInput.value = '';
        addressInput.value = '';
        saveCheckbox.checked = true;
        
        // Enable inputs
        nameInput.disabled = false;
        phoneInput.disabled = false;
        addressInput.disabled = false;
    } else {
        // Fill form with selected customer data
        const customer = customersData.find(c => c.id === selectedValue);
        if (customer) {
            nameInput.value = customer.name || '';
            phoneInput.value = customer.phone || '';
            addressInput.value = customer.address || '';
            saveCheckbox.checked = false;
            
            // Disable inputs for existing customer
            nameInput.disabled = true;
            phoneInput.disabled = true;
            addressInput.disabled = true;
        }
    }
}

// Save customer to Firebase
function saveCustomerToFirebase(customerData) {
    if (!selectedStoreId) {
        console.error('No store selected');
        return Promise.reject('No store selected');
    }
    
    const customersRef = firebase.database().ref(`stores/${selectedStoreId}/customers`);
    const newCustomerRef = customersRef.push();
    
    const customerToSave = {
        name: customerData.name,
        phone: customerData.phone || '',
        address: customerData.address || '',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastOrderAt: firebase.database.ServerValue.TIMESTAMP,
        totalOrders: 1
    };
    
    return newCustomerRef.set(customerToSave)
        .then(() => {
            console.log('Customer saved successfully');
            return newCustomerRef.key;
        })
        .catch(error => {
            console.error('Error saving customer:', error);
            throw error;
        });
}

// Update customer's last order info
function updateCustomerOrderInfo(customerId) {
    if (!selectedStoreId || !customerId) return;
    
    const customerRef = firebase.database().ref(`stores/${selectedStoreId}/customers/${customerId}`);
    
    customerRef.once('value')
        .then(snapshot => {
            const customer = snapshot.val();
            if (customer) {
                const updates = {
                    lastOrderAt: firebase.database.ServerValue.TIMESTAMP,
                    totalOrders: (customer.totalOrders || 0) + 1
                };
                
                return customerRef.update(updates);
            }
        })
        .catch(error => {
            console.error('Error updating customer info:', error);
        });
}

// Initialize wholesale orders system
function initWholesaleOrders() {
    console.log('=== Initializing wholesale orders system ===');
    
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
    const depositInput = document.getElementById('wholesaleDeposit');
    
    [discountInput, shippingInput, depositInput].forEach(input => {
        if (input) {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value) {
                    e.target.value = formatNumber(value);
                }
            });
        }
    });
    
    // Load existing orders
    loadWholesaleOrders();
    
    // Load existing customers
    loadCustomers();
}

// Functions are already exposed above

// Load existing wholesale orders
function loadWholesaleOrders() {
    console.log('=== loadWholesaleOrders called ===');
    
    if (!selectedStoreId) {
        console.log('No store selected, skipping orders load');
        return;
    }
    
    if (!window.database) {
        console.error('Firebase database not available');
        return;
    }
    
    console.log('Loading wholesale orders for store:', selectedStoreId);
    
    // Load all orders first, then filter client-side for better control
    window.database.ref(`stores/${selectedStoreId}/orders`)
        .once('value')
        .then(snapshot => {
            const allOrders = snapshot.val() || {};
            console.log('All orders loaded:', Object.keys(allOrders).length, 'orders');
            
            // Debug: Show all order types
            const orderTypes = {};
            for (const [orderId, order] of Object.entries(allOrders)) {
                const type = order.type || 'undefined';
                if (!orderTypes[type]) orderTypes[type] = [];
                orderTypes[type].push(orderId);
            }
            console.log('Order types breakdown:', orderTypes);
            
            // Cleanup: Remove orders without type
            const undefinedOrders = orderTypes['undefined'] || [];
            if (undefinedOrders.length > 0) {
                console.log('Cleaning up', undefinedOrders.length, 'undefined type orders');
                const cleanupPromises = undefinedOrders.map(orderId => {
                    return window.database.ref(`stores/${selectedStoreId}/orders/${orderId}`).remove();
                });
                
                Promise.all(cleanupPromises).then(() => {
                    console.log('Successfully cleaned up undefined orders');
                }).catch(error => {
                    console.error('Error cleaning up undefined orders:', error);
                });
            }
            
            // Filter to show only wholesale orders
            const wholesaleOrders = {};
            for (const [orderId, order] of Object.entries(allOrders)) {
                // Only include orders that have type 'wholesale'
                // Exclude orders with type 'retail', 'ecommerce', 'tmdt', 'online' or undefined
                if (order.type === 'wholesale') {
                    wholesaleOrders[orderId] = order;
                }
            }
            
            console.log('Filtered wholesale orders:', Object.keys(wholesaleOrders).length, 'out of', Object.keys(allOrders).length, 'total orders');
            
            // Convert to array and sort by date
            wholesaleOrdersData = Object.values(wholesaleOrders).sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            // Export to window scope for global access
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
        const itemsText = order.items.map(item => `${item.productName} (${item.quantity}kg)`).join(', ');
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





// Get status text
function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'confirmed': 'Đã xác nhận', 
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || 'Chờ xử lý';
}

// Get payment status text
function getPaymentStatusText(paymentStatus) {
    const statusMap = {
        'pending': 'Chưa thanh toán',
        'partial': 'Thanh toán 1 phần',
        'paid': 'Đã thanh toán'
    };
    return statusMap[paymentStatus] || 'Chưa thanh toán';
}

// Update payment status
async function updatePaymentStatus(orderId, newStatus) {
    console.log('=== updatePaymentStatus called ===');
    console.log('Order ID:', orderId);
    console.log('New status:', newStatus);
    
    try {
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        
        if (!selectedStoreId) {
            showNotification('Vui lòng chọn cửa hàng trước!', 'error');
            return;
        }
        
        if (!window.database) {
            showNotification('Lỗi kết nối cơ sở dữ liệu!', 'error');
            return;
        }
        
        // Update payment status in Firebase
        await window.database.ref(`stores/${selectedStoreId}/orders/${orderId}/paymentStatus`).set(newStatus);
        
        // Update local data
        if (window.wholesaleOrdersData && Array.isArray(window.wholesaleOrdersData)) {
            const orderIndex = window.wholesaleOrdersData.findIndex(order => order.id === orderId);
            if (orderIndex !== -1) {
                window.wholesaleOrdersData[orderIndex].paymentStatus = newStatus;
            }
        }
        
        // Also update global wholesaleOrdersData if it exists
        if (typeof wholesaleOrdersData !== 'undefined' && Array.isArray(wholesaleOrdersData)) {
            const orderIndex = wholesaleOrdersData.findIndex(order => order.id === orderId);
            if (orderIndex !== -1) {
                wholesaleOrdersData[orderIndex].paymentStatus = newStatus;
            }
        }
        
        // Refresh display
        displayWholesaleOrders();
        
        const statusText = getPaymentStatusText(newStatus);
        showNotification(`Đã cập nhật trạng thái thanh toán: ${statusText}`, 'success');
        
    } catch (error) {
        console.error('Error updating payment status:', error);
        showNotification('Lỗi cập nhật trạng thái thanh toán!', 'error');
    }
}

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
        <div class="wholesale-item" id="wholesaleItem${wholesaleItemCounter}" style="background: #fff; border: 2px solid #e9ecef; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s ease;" onmouseover="this.style.borderColor='#007bff'; this.style.boxShadow='0 4px 16px rgba(0,123,255,0.15)'" onmouseout="this.style.borderColor='#e9ecef'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
            <div class="wholesale-item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f8f9fa;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #007bff, #0056b3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${wholesaleItemCounter}</div>
                    <span style="font-size: 16px; font-weight: 600; color: #333;">Sản phẩm ${wholesaleItemCounter}</span>
                </div>
                <button type="button" onclick="removeWholesaleItem(${wholesaleItemCounter})" style="background: #dc3545; color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;" onmouseover="this.style.background='#c82333'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='#dc3545'; this.style.transform='scale(1)'">
                    <i class="fas fa-trash" style="font-size: 12px; cursor: pointer;"></i>
                </button>
            </div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">📦 Tên Sản Phẩm *</label>
                    <select class="wholesale-product-select" onchange="updateWholesaleItemPrice(${wholesaleItemCounter})" required style="width: 100%; padding: 12px 16px; border: 2px solid #e9ecef; cursor: pointer; border-radius: 8px; font-size: 14px; background: white; transition: all 0.3s ease;" onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 3px rgba(0,123,255,0.1)'" onblur="this.style.borderColor='#e9ecef'; this.style.boxShadow='none'">
                        <option value="">Chọn sản phẩm...</option>
                        ${generateProductOptions()}
                    </select>
                </div>
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">⚖️ Số Lượng (kg) *</label>
                    <input type="number" class="wholesale-quantity" min="0.1" step="0.1"  placeholder="Nhập khối lượng" onchange="updateWholesaleItemTotal(${wholesaleItemCounter})" required style="width: 100%; padding: 12px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: all 0.3s ease;" onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 3px rgba(0,123,255,0.1)'" onblur="this.style.borderColor='#e9ecef'; this.style.boxShadow='none'" >
                </div>
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">💰 Giá Bán (VNĐ) *</label>
                    <input type="text" class="wholesale-price" placeholder="Ví dụ: 39.000" onchange="updateWholesaleItemTotal(${wholesaleItemCounter})" required style="width: 100%; padding: 12px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: all 0.3s ease;" onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 3px rgba(0,123,255,0.1)'" onblur="this.style.borderColor='#e9ecef'; this.style.boxShadow='none'">
                </div>
            </div>
            <div style="margin-top: 10px;">
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">💵 Thành Tiền</label>
                    <div class="wholesale-item-total" style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; font-weight: 700; color: #007bff; font-size: 18px; border: 2px solid #e9ecef; display: flex; align-items: center; justify-content: center; min-height: 30px; text-align: center;">0 VNĐ</div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHTML);
    
    // Add format number event listeners
    const newItem = document.getElementById(`wholesaleItem${wholesaleItemCounter}`);
    const priceInput = newItem.querySelector('.wholesale-price');
    
    // Format price input
    priceInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value) {
            e.target.value = formatNumber(value);
        }
    });
    
    updateWholesaleSummary();
}

// Remove wholesale item
function removeWholesaleItem(itemId) {
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (item) {
        item.remove();
        updateWholesaleSummary();
        
        // If no items left, add one
        const container = document.getElementById('wholesaleItemsContainer');
        if (container.children.length === 0) {
            addWholesaleItem();
        }
    }
}

// Load products data from Firebase
function loadProductsData() {
    return new Promise((resolve, reject) => {
        if (!window.database) {
            reject(new Error('Firebase database not available'));
            return;
        }
        
        console.log('Loading products data from Firebase...');
        
        window.database.ref('products').once('value')
            .then(snapshot => {
                const products = snapshot.val() || {};
                console.log('Products loaded from Firebase:', Object.keys(products).length, 'items');
                
                // Update global reference
                window.productsData = products;
                
                if (Object.keys(products).length > 0) {
                    resolve(products);
                } else {
                    reject(new Error('No products found in database'));
                }
            })
            .catch(error => {
                console.error('Error loading products from Firebase:', error);
                reject(error);
            });
    });
}

// Simple number formatter
function formatNumber(num) {
    if (!num) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Update item price based on selected product
function updateWholesaleItemPrice(itemId) {
    console.log('updateWholesaleItemPrice called for item:', itemId);
    
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (!item) {
        console.error('Item not found:', `wholesaleItem${itemId}`);
        return;
    }
    
    const productSelect = item.querySelector('.wholesale-product-select');
    const priceInput = item.querySelector('.wholesale-price');
    
    if (!productSelect || !priceInput) {
        console.error('Required elements not found in item:', itemId);
        return;
    }
    
    const selectedProductId = productSelect.value;
    
    console.log('Selected product ID:', selectedProductId);
    console.log('Products data available:', !!window.productsData);
    
    if (selectedProductId && window.productsData && window.productsData[selectedProductId]) {
        const product = window.productsData[selectedProductId];
        console.log('Selected product:', product);
        
        // Use retail price (same as retail system)
        if (product.price && product.price > 0) {
            const formattedPrice = formatNumber(product.price);
            console.log('Setting retail price:', formattedPrice);
            priceInput.value = formattedPrice;
            
            // Update the total immediately
            updateWholesaleItemTotal(itemId);
        } else {
            console.log('No valid price found for product');
            priceInput.value = '';
            updateWholesaleItemTotal(itemId);
        }
    } else {
        console.log('No product selected or product not found');
        if (!selectedProductId) {
            console.log('Clearing price - no product selected');
        } else if (!window.productsData) {
            console.log('Products data not available');
        } else {
            console.log('Selected product not found in data');
        }
        priceInput.value = '';
        updateWholesaleItemTotal(itemId);
    }
}

// Update item total
function updateWholesaleItemTotal(itemId) {
    const item = document.getElementById(`wholesaleItem${itemId}`);
    if (!item) return;
    
    const quantity = parseFloat(item.querySelector('.wholesale-quantity').value) || 0;
    const priceText = item.querySelector('.wholesale-price').value || '';
    const price = parseFormattedNumber(priceText);
    const total = quantity * price;
    
    console.log(`Calculating total for item ${itemId}:`);
    console.log('- Quantity:', quantity);
    console.log('- Price text:', priceText);
    console.log('- Price parsed:', price);
    console.log('- Total:', total);
    
    item.querySelector('.wholesale-item-total').textContent = formatNumber(total) + ' VNĐ';
    updateWholesaleSummary();
}

// Update order summary
function updateWholesaleSummary() {
    const items = document.querySelectorAll('.wholesale-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.wholesale-quantity').value) || 0;
        const priceText = item.querySelector('.wholesale-price').value || '';
        const price = parseFormattedNumber(priceText);
        subtotal += quantity * price;
    });
    
    const discount = parseFormattedNumber(document.getElementById('wholesaleDiscount').value) || 0;
    const shipping = parseFormattedNumber(document.getElementById('wholesaleShipping').value) || 0;
    const deposit = parseFormattedNumber(document.getElementById('wholesaleDeposit').value) || 0;
    
    console.log('Summary calculation:');
    console.log('- Discount:', discount);
    console.log('- Shipping:', shipping);
    console.log('- Deposit:', deposit);
    
    const total = subtotal - discount + shipping;
    const remaining = total - deposit;
    
    document.getElementById('wholesaleSubtotal').textContent = formatCurrency(subtotal) + ' VNĐ';
    document.getElementById('wholesaleTotal').textContent = formatCurrency(total) + ' VNĐ';
    document.getElementById('wholesaleRemaining').textContent = formatCurrency(remaining) + ' VNĐ';
}

// Generate product options
function generateProductOptions() {
    console.log('generateProductOptions called');
    console.log('window.productsData:', window.productsData);
    
    if (!window.productsData) {
        console.log('No productsData available');
        return '<option value="">Đang tải sản phẩm...</option>';
    }
    
    const productEntries = Object.entries(window.productsData);
    console.log('Product entries count:', productEntries.length);
    
    if (productEntries.length === 0) {
        console.log('No products found in productsData');
        return '<option value="">Không có sản phẩm nào</option>';
    }
    
    let options = '';
    for (const [id, product] of productEntries) {
        if (product && product.name && product.sku) {
            options += `<option value="${id}">${product.name} - ${product.sku}</option>`;
        } else {
            console.warn('Invalid product data:', id, product);
        }
    }
    
    console.log('Generated options HTML length:', options.length);
    return options || '<option value="">Không có sản phẩm hợp lệ</option>';
}

// Refresh product options in all existing dropdowns
function refreshProductOptions() {
    console.log('Refreshing product options in all dropdowns...');
    
    const productSelects = document.querySelectorAll('.wholesale-product-select');
    const newOptions = generateProductOptions();
    
    productSelects.forEach((select, index) => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Chọn sản phẩm...</option>' + newOptions;
        
        // Restore previous selection if it still exists
        if (currentValue && window.productsData && window.productsData[currentValue]) {
            select.value = currentValue;
        }
        
        console.log(`Refreshed dropdown ${index + 1}`);
    });
    
    console.log(`Refreshed ${productSelects.length} product dropdowns`);
}

// Create wholesale order
function createWholesaleOrder(event) {
    console.log('=== createWholesaleOrder called ===');
    console.log('Event:', event);
    console.log('isSubmitting:', isSubmitting);
    
    event.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
        console.log('Already submitting, ignoring duplicate request');
        return;
    }
    
    isSubmitting = true;
    
    // Disable submit button
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }
    
    // Show loading
    showLoading();
    
    try {
        // Check if store is selected
        if (!selectedStoreId) {
            throw new Error('Vui lòng chọn cửa hàng trước khi tạo đơn hàng');
        }
        
        // Get form data
        const formData = {
            customerName: document.getElementById('wholesaleCustomerName').value.trim(),
            customerPhone: document.getElementById('wholesaleCustomerPhone').value.trim(),
            customerAddress: document.getElementById('wholesaleCustomerAddress').value.trim(),
            orderDate: document.getElementById('wholesaleOrderDate').value,
            deliveryDate: document.getElementById('wholesaleDeliveryDate').value,
            items: [],
            discount: parseFormattedNumber(document.getElementById('wholesaleDiscount').value) || 0,
            shipping: parseFormattedNumber(document.getElementById('wholesaleShipping').value) || 0,
            deposit: parseFormattedNumber(document.getElementById('wholesaleDeposit').value) || 0
        };
        
        // Validate required fields
        if (!formData.customerName) {
            throw new Error('Vui lòng nhập tên khách hàng');
        }
        
        if (!formData.orderDate) {
            throw new Error('Vui lòng nhập ngày đặt hàng');
        }
        
        // Get items data
        const items = document.querySelectorAll('.wholesale-item');
        items.forEach((item, index) => {
            const productSelect = item.querySelector('.wholesale-product-select');
            const quantity = parseFloat(item.querySelector('.wholesale-quantity').value) || 0;
            const price = parseFormattedNumber(item.querySelector('.wholesale-price').value) || 0;
            
            if (!productSelect.value) {
                throw new Error(`Vui lòng chọn sản phẩm cho mục ${index + 1}`);
            }
            
            if (quantity <= 0) {
                throw new Error(`Số lượng sản phẩm ${index + 1} phải lớn hơn 0`);
            }
            
            if (price <= 0) {
                throw new Error(`Giá bán sản phẩm ${index + 1} phải lớn hơn 0`);
            }
            
            const product = window.productsData[productSelect.value];
            formData.items.push({
                productId: productSelect.value,
                productName: product.name,
                sku: product.sku,
                quantity: quantity,
                price: price,
                total: quantity * price
            });
        });
        
        if (formData.items.length === 0) {
            throw new Error('Vui lòng thêm ít nhất một sản phẩm');
        }
        
        // Calculate totals
        const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal - formData.discount + formData.shipping;
        const remaining = total - formData.deposit;
        
        // Determine payment status
        let paymentStatus = 'pending';
        if (formData.deposit >= total) {
            paymentStatus = 'paid';
        } else if (formData.deposit > 0) {
            paymentStatus = 'partial';
        }
        
        // Create unique order ID
        const orderId = 'wholesale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Check if this order ID was just created (prevent duplicate)
        if (lastOrderId === orderId) {
            throw new Error('Đơn hàng đang được xử lý, vui lòng đợi...');
        }
        
        lastOrderId = orderId;
        
        // Check if we should save customer info
        const saveCustomerCheckbox = document.getElementById('saveCustomer');
        const shouldSaveCustomer = saveCustomerCheckbox && saveCustomerCheckbox.checked;
        
        // Create order object
        const order = {
            id: orderId,
            type: 'wholesale',
            storeId: selectedStoreId,
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            customerAddress: formData.customerAddress,
            orderDate: formData.orderDate,
            deliveryDate: formData.deliveryDate,
            items: formData.items,
            subtotal: subtotal,
            discount: formData.discount,
            shipping: formData.shipping,
            deposit: formData.deposit,
            total: total,
            remaining: remaining,
            paymentStatus: paymentStatus,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        
        console.log('About to save wholesale order to Firebase:', order.id);
        
        // Save to Firebase
        saveWholesaleOrderToFirebase(order)
            .then(() => {
                // If requested, save customer info to address book
                if (shouldSaveCustomer) {
                    const customerData = {
                        name: formData.customerName,
                        phone: formData.customerPhone,
                        address: formData.customerAddress
                    };
                    
                    return saveCustomerToFirebase(customerData);
                }
            })
            .then(customerId => {
                if (customerId) {
                    showNotification('Thông tin khách hàng đã được lưu vào danh bạ', 'success');
                }
            })
            .catch(error => {
                console.error('Error saving customer:', error);
                showNotification('Lỗi khi lưu thông tin khách hàng: ' + error.message, 'error');
            });
        
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
        
        // Reset submission state
        isSubmitting = false;
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Tạo Đơn Hàng';
        }
    }
}

// Save order to Firebase
function saveWholesaleOrderToFirebase(order) {
    console.log('=== saveWholesaleOrderToFirebase called ===');
    console.log('Order ID:', order.id);
    console.log('Database available:', !!window.database);
    
    if (!window.database) {
        console.log('Database not available!');
        hideLoading();
        showNotification('Lỗi kết nối cơ sở dữ liệu', 'error');
        return Promise.reject('Database not available');
    }
    
    const ordersRef = window.database.ref(`stores/${order.storeId}/orders/${order.id}`);
    console.log('Firebase ref path:', `stores/${order.storeId}/orders/${order.id}`);
    
    console.log('Calling Firebase set...');
    return ordersRef.set(order)
        .then(() => {
            console.log('Firebase save SUCCESS for wholesale order:', order.id);
            hideLoading();
            showNotification('Tạo đơn hàng bán sỉ thành công!', 'success');
            
            // Add to local data (check for duplicates first)
            const existingOrderIndex = wholesaleOrdersData.findIndex(existingOrder => existingOrder.id === order.id);
            if (existingOrderIndex === -1) {
                console.log('Adding new wholesale order to local data:', order.id);
                wholesaleOrdersData.unshift(order);
            } else {
                console.log('Wholesale order already exists in local data, skipping:', order.id);
            }
            
            // Refresh orders list
            displayWholesaleOrders();
            
            // Clear form
            clearWholesaleForm();
            
            // Reset submission state
            isSubmitting = false;
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Tạo Đơn Hàng';
            }
        })
        .catch((error) => {
            console.log('Firebase save ERROR for wholesale order:', order.id, error);
            hideLoading();
            console.error('Error saving order:', error);
            showNotification('Lỗi khi lưu đơn hàng: ' + error.message, 'error');
            
            // Reset submission state
            isSubmitting = false;
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Tạo Đơn Hàng';
            }
            
            // Return the error to propagate it
            return Promise.reject(error);
        });
}

// Clear form
function clearWholesaleForm() {
    // Reset form fields
    document.getElementById('wholesaleCustomerName').value = '';
    document.getElementById('wholesaleCustomerPhone').value = '';
    document.getElementById('wholesaleCustomerAddress').value = '';
    document.getElementById('wholesaleDeliveryDate').value = '';
    document.getElementById('wholesaleDiscount').value = '0';
    document.getElementById('wholesaleShipping').value = '0';
    document.getElementById('wholesaleDeposit').value = '0';
    
    // Set current date
    const now = new Date();
    document.getElementById('wholesaleOrderDate').value = now.toISOString().split('T')[0];
    
    // Clear items
    document.getElementById('wholesaleItemsContainer').innerHTML = '';
    wholesaleItemCounter = 0;
    
    // Add first item
    addWholesaleItem();
    
    // Update summary
    updateWholesaleSummary();
function loadWholesaleOrders() {
    if (!window.database) {
        console.log('Database not available');
        return;
    }
    
    if (!selectedStoreId) {
        console.log('No store selected, cannot load orders');
        wholesaleOrdersData = [];
        displayWholesaleOrders();
        return;
    }
    
    showLoading();
    
    const ordersRef = window.database.ref(`stores/${selectedStoreId}/orders`);
    ordersRef.orderByChild('type').equalTo('wholesale').once('value')
        .then((snapshot) => {
            hideLoading();
            wholesaleOrdersData = [];
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const order = childSnapshot.val();
                    if (order && order.type === 'wholesale') {
                        wholesaleOrdersData.push(order);
                    }
                });
            }
            
            // Sort by creation date (newest first)
            wholesaleOrdersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            displayWholesaleOrders();
        })
        .catch((error) => {
            hideLoading();
            console.error('Error loading wholesale orders:', error);
            showNotification('Lỗi khi tải danh sách đơn hàng: ' + error.message, 'error');
        });
}

// Display wholesale orders
function displayWholesaleOrders() {
    const tbody = document.getElementById('wholesaleOrdersBody');
    const emptyState = document.getElementById('wholesaleEmptyState');
    
    if (wholesaleOrdersData.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    wholesaleOrdersData.forEach((order, index) => {
        const itemsText = order.items.map(item => `${item.productName} (${item.quantity}kg)`).join(', ');
        const statusBadge = getPaymentStatusBadge(order.paymentStatus);
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${order.customerName}</td>
                <td>${order.customerPhone || 'N/A'}</td>
                <td>${order.orderDate}</td>
                <td title="${itemsText}">${itemsText.length > 40 ? itemsText.substring(0, 40) + '...' : itemsText}</td>
                <td><strong>${formatCurrency(order.total)} VNĐ</strong></td>
                <td>${formatCurrency(order.deposit)} VNĐ</td>
                <td>${formatCurrency(order.remaining)} VNĐ  sdsadasdasdasd</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="wholesale-btn wholesale-btn-secondary wholesale-btn-small" onclick="viewWholesaleOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="wholesale-btn wholesale-btn-success wholesale-btn-small" onclick="updatePayment('${order.id}')">
                        <i class="fas fa-dollar-sign"></i>
                    </button>
                    <button class="wholesale-btn wholesale-btn-danger wholesale-btn-small" onclick="deleteWholesaleOrder('${order.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Get payment status badge
function getPaymentStatusBadge(status) {
    switch (status) {
        case 'paid':
            return '<span class="wholesale-status-badge wholesale-status-paid">Đã Thanh Toán</span>';
        case 'partial':
            return '<span class="wholesale-status-badge wholesale-status-partial">Thanh Toán 1 Phần</span>';
        default:
            return '<span class="wholesale-status-badge wholesale-status-pending">Chưa Thanh Toán</span>';
    }
}

// View wholesale order details
function viewWholesaleOrder(orderId) {
    const order = wholesaleOrdersData.find(o => o.id === orderId);
    if (!order) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    
    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `
            <tr style="transition: all 0.3s ease;" onmouseover="this.style.background='#f8f9ff'; this.style.transform='scale(1.01)'" onmouseout="this.style.background=''; this.style.transform='scale(1)'">
                <td style="padding: 18px 15px; font-weight: 600; color: #2d3748; font-size: 15px; border-bottom: 1px solid #e2e8f0;">${item.productName}</td>
                <td style="padding: 18px 15px; text-align: center; font-family: 'Courier New', monospace; background: linear-gradient(135deg, #f0f2ff, #e8f0fe); color: #667eea; font-size: 13px; font-weight: 600; border-radius: 8px; border-bottom: 1px solid #e2e8f0;">${item.sku}</td>
                <td style="padding: 18px 15px; text-align: center; font-weight: 700; color: #4a5568; font-size: 15px; border-bottom: 1px solid #e2e8f0;">${item.quantity} kg</td>
                <td style="padding: 18px 15px; text-align: right; color: #667eea; font-weight: 700; font-size: 15px; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.price)} VNĐ</td>
                <td style="padding: 18px 15px; text-align: right; color: #f5576c; font-weight: 800; font-size: 16px; background: linear-gradient(135deg, #fff5f5, #fef5e7); border-radius: 8px; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.total)} VNĐ</td>
            </tr>
        `;
    });
    
    const modalHtml = `
        <div class="modal-overlay" onclick="closeModal()" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(10px);">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 25px; width: 95%; max-width: 900px; max-height: 95vh; overflow-y: auto; box-shadow: 0 25px 80px rgba(0,0,0,0.3); position: relative; animation: modalSlideIn 0.4s ease-out;">
                <style>
                    @keyframes modalSlideIn {
                        from { transform: translateY(-50px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                </style>
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 25px 25px 0 0; display: flex; justify-content: space-between; align-items: center; position: relative;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                            📋
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 24px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">📊 Chi Tiết Đơn Hàng Bán Sỉ</h3>
                            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Mã đơn hàng: <strong>${order.id}</strong></p>
                        </div>
                    </div>
                    <button class="modal-close" onclick="closeModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; font-size: 18px;" onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1)'">
                        ✕
                    </button>
                </div>
                <div class="modal-body" style="padding: 40px; background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);">
                    <div class="info-cards-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 35px;">
                        <div class="info-card" style="background: linear-gradient(135deg, #fff 0%, #f8f9ff 100%); padding: 25px; border-radius: 20px; border-left: 5px solid #667eea; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 35px rgba(102, 126, 234, 0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 25px rgba(102, 126, 234, 0.15)'">
                            <h4 style="color: #667eea; margin-bottom: 20px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px;">🏢 Thông Tin Khách Hàng</h4>
                            <div style="space-y: 12px;">
                                <p style="margin: 12px 0; font-size: 15px; color: #4a5568;"><strong style="color: #2d3748;">Tên khách hàng:</strong> ${order.customerName}</p>
                                <p style="margin: 12px 0; font-size: 15px; color: #4a5568;"><strong style="color: #2d3748;">Số điện thoại:</strong> ${order.customerPhone || 'Không có'}</p>
                                <p style="margin: 12px 0; font-size: 15px; color: #4a5568;"><strong style="color: #2d3748;">Địa chỉ:</strong> ${order.customerAddress || 'Không có'}</p>
                            </div>
                        </div>
                        
                        <div class="info-card" style="background: linear-gradient(135deg, #fff 0%, #f0fff0 100%); padding: 25px; border-radius: 20px; border-left: 5px solid #48bb78; box-shadow: 0 8px 25px rgba(72, 187, 120, 0.15); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 35px rgba(72, 187, 120, 0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 25px rgba(72, 187, 120, 0.15)'">
                            <h4 style="color: #48bb78; margin-bottom: 20px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px;">📅 Thông Tin Đơn Hàng</h4>
                            <div style="space-y: 12px;">
                                <p style="margin: 12px 0; font-size: 15px; color: #4a5568;"><strong style="color: #2d3748;">Ngày đặt hàng:</strong> ${order.orderDate}</p>
                                <p style="margin: 12px 0; font-size: 15px; color: #4a5568;"><strong style="color: #2d3748;">Ngày giao hàng:</strong> ${order.deliveryDate || 'Chưa xác định'}</p>
                                <p style="margin: 12px 0; font-size: 15px; color: #4a5568;"><strong style="color: #2d3748;">Trạng thái:</strong> ${getPaymentStatusBadge(order.paymentStatus)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-items" style="margin-bottom: 35px;">
                        <h4 style="color: #667eea; margin-bottom: 20px; font-size: 20px; font-weight: 700; text-align: center; padding-bottom: 10px; border-bottom: 3px solid #667eea;">📦 Chi Tiết Sản Phẩm</h4>
                        <div style="overflow-x: auto; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 20px; overflow: hidden;">
                                <thead>
                                    <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                        <th style="padding: 20px 15px; text-align: left; font-weight: 600; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Tên Sản Phẩm</th>
                                        <th style="padding: 20px 15px; text-align: center; font-weight: 600; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Mã SKU</th>
                                        <th style="padding: 20px 15px; text-align: center; font-weight: 600; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Số Lượng</th>
                                        <th style="padding: 20px 15px; text-align: right; font-weight: 600; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Đơn Giá</th>
                                        <th style="padding: 20px 15px; text-align: right; font-weight: 600; color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Thành Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="order-summary" style="background: linear-gradient(135deg, #fff5f5 0%, #fef5e7 100%); padding: 30px; border-radius: 20px; border-left: 5px solid #f5576c; box-shadow: 0 8px 25px rgba(245, 87, 108, 0.15); margin-bottom: 30px;">
                        <h4 style="color: #f5576c; margin-bottom: 25px; font-size: 20px; font-weight: 700; text-align: center; padding-bottom: 10px; border-bottom: 3px solid #f5576c;">💰 Tổng Kết Đơn Hàng</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px;">
                            <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
                                <p style="margin: 0; font-size: 14px; color: #6c757d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Tạm Tính</p>
                                <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #4a5568;">${formatCurrency(order.subtotal)} VNĐ</p>
                            </div>
                            <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
                                <p style="margin: 0; font-size: 14px; color: #6c757d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Giảm Giá</p>
                                <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #e53e3e;">-${formatCurrency(order.discount)} VNĐ</p>
                            </div>
                            <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
                                <p style="margin: 0; font-size: 14px; color: #6c757d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Vận Chuyển</p>
                                <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #4a5568;">${formatCurrency(order.shipping)} VNĐ</p>
                            </div>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 25px; border-radius: 15px; text-align: center; margin-bottom: 25px;">
                            <p style="margin: 0; font-size: 16px; color: white; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">💵 Tổng Cộng</p>
                            <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: 800; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${formatCurrency(order.total)} VNĐ</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div style="background: linear-gradient(135deg, #e8f5e8, #f0fff0); padding: 20px; border-radius: 15px; text-align: center; border-left: 4px solid #48bb78;">
                                <p style="margin: 0; font-size: 14px; color: #48bb78; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">💳 Đã Thanh Toán</p>
                                <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #48bb78;">${formatCurrency(order.deposit)} VNĐ</p>
                            </div>
                            <div style="background: linear-gradient(135deg, #fff5e6, #fef5e7); padding: 20px; border-radius: 15px; text-align: center; border-left: 4px solid #f5a623;">
                                <p style="margin: 0; font-size: 14px; color: #f5a623; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⏳ Còn Phải Trả</p>
                                <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #f5a623;">${formatCurrency(order.remaining)} VNĐ</p>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: center; gap: 20px; margin-top: 30px; padding: 30px; background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%); border-radius: 20px; border-top: 3px solid #667eea;">
                        <button onclick="printWholesaleInvoice('${order.id}')" style="background: linear-gradient(135deg, #48bb78, #38a169); color: white; border: none; padding: 15px 30px; border-radius: 15px; cursor: pointer; font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 12px; transition: all 0.4s ease; box-shadow: 0 8px 25px rgba(72, 187, 120, 0.3); text-transform: uppercase; letter-spacing: 0.5px;" onmouseover="this.style.transform='translateY(-3px) scale(1.05)'; this.style.boxShadow='0 15px 35px rgba(72, 187, 120, 0.4)'; this.style.background='linear-gradient(135deg, #38a169, #2f855a)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 8px 25px rgba(72, 187, 120, 0.3)'; this.style.background='linear-gradient(135deg, #48bb78, #38a169)'">
                            🖨️ In Hóa Đơn
                        </button>
                        <button onclick="updatePayment('${order.id}')" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 15px 30px; border-radius: 15px; cursor: pointer; font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 12px; transition: all 0.4s ease; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3); text-transform: uppercase; letter-spacing: 0.5px;" onmouseover="this.style.transform='translateY(-3px) scale(1.05)'; this.style.boxShadow='0 15px 35px rgba(102, 126, 234, 0.4)'; this.style.background='linear-gradient(135deg, #5a67d8, #553c9a)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 8px 25px rgba(102, 126, 234, 0.3)'; this.style.background='linear-gradient(135deg, #667eea, #764ba2)'">
                            💳 Cập Nhật TT
                        </button>
                        <button onclick="closeModal()" style="background: linear-gradient(135deg, #a0aec0, #718096); color: white; border: none; padding: 15px 30px; border-radius: 15px; cursor: pointer; font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 12px; transition: all 0.4s ease; box-shadow: 0 8px 25px rgba(160, 174, 192, 0.3); text-transform: uppercase; letter-spacing: 0.5px;" onmouseover="this.style.transform='translateY(-3px) scale(1.05)'; this.style.boxShadow='0 15px 35px rgba(160, 174, 192, 0.4)'; this.style.background='linear-gradient(135deg, #718096, #4a5568)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 8px 25px rgba(160, 174, 192, 0.3)'; this.style.background='linear-gradient(135deg, #a0aec0, #718096)'">
                            ✖️ Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Update payment
function updatePayment(orderId) {
    const order = wholesaleOrdersData.find(o => o.id === orderId);
    if (!order) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    
    const newPayment = prompt(`Nhập số tiền thanh toán thêm (hiện tại: ${formatCurrency(order.deposit)} VNĐ):`);
    if (newPayment === null) return;
    
    const paymentAmount = parseInt(newPayment) || 0;
    if (paymentAmount <= 0) {
        showNotification('Số tiền thanh toán phải lớn hơn 0', 'error');
        return;
    }
    
    const newDeposit = order.deposit + paymentAmount;
    const newRemaining = order.total - newDeposit;
    
    let newPaymentStatus = 'pending';
    if (newDeposit >= order.total) {
        newPaymentStatus = 'paid';
    } else if (newDeposit > 0) {
        newPaymentStatus = 'partial';
    }
    
    // Update order
    const updatedOrder = {
        ...order,
        deposit: newDeposit,
        remaining: Math.max(0, newRemaining),
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString()
    };
    
    // Save to Firebase
    showLoading();
    const orderRef = window.database.ref('orders/' + orderId);
    orderRef.set(updatedOrder)
        .then(() => {
            hideLoading();
            showNotification('Cập nhật thanh toán thành công!', 'success');
        })
        .catch((error) => {
            hideLoading();
            console.error('Error updating payment:', error);
            showNotification('Lỗi khi cập nhật thanh toán: ' + error.message, 'error');
        });
}

// Delete wholesale order
function deleteWholesaleOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
        return;
    }
    
    showLoading();
    
    const orderRef = window.database.ref('orders/' + orderId);
    orderRef.remove()
        .then(() => {
            hideLoading();
            showNotification('Xóa đơn hàng thành công!', 'success');
            
            // Remove from local data
            wholesaleOrdersData = wholesaleOrdersData.filter(order => order.id !== orderId);
            displayWholesaleOrders();
        })
        .catch((error) => {
            hideLoading();
            console.error('Error deleting order:', error);
            showNotification('Lỗi khi xóa đơn hàng: ' + error.message, 'error');
        });
}

// Print wholesale invoice
function printWholesaleInvoice(orderId) {
    const order = wholesaleOrdersData.find(o => o.id === orderId);
    if (!order) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    
    // Get store info from localStorage
    const storeData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
    const storeName = storeData.name || 'Cửa Hàng';
    const storeAddress = storeData.address || 'Địa chỉ cửa hàng';
    const storePhone = storeData.phone || 'Số điện thoại';
    const storeEmail = storeData.email || 'Email cửa hàng';
    
    // Generate items HTML
    let itemsHtml = '';
    order.items.forEach((item, index) => {
        itemsHtml += `
            <tr>
                <td style="padding: 18px 15px; text-align: center; font-weight: 600; color: #667eea; font-size: 16px;">${index + 1}</td>
                <td style="padding: 18px 15px; font-weight: 600; color: #2d3748; font-size: 15px;">${item.productName}</td>
                <td style="padding: 18px 15px; text-align: center; font-family: 'Courier New', monospace; background: linear-gradient(135deg, #f0f2ff, #e8f0fe); color: #667eea; font-size: 13px; font-weight: 600; border-radius: 8px;">${item.sku}</td>
                <td style="padding: 18px 15px; text-align: center; font-weight: 700; color: #4a5568; font-size: 15px;">${item.quantity} kg</td>
                <td style="padding: 18px 15px; text-align: right; color: #667eea; font-weight: 700; font-size: 15px;">${formatCurrency(item.price)} VNĐ</td>
                <td style="padding: 18px 15px; text-align: right; color: #f5576c; font-weight: 800; font-size: 16px; background: linear-gradient(135deg, #fff5f5, #fef5e7); border-radius: 8px;">${formatCurrency(item.total)} VNĐ</td>
            </tr>
        `;
    });
    
    const invoiceHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Hóa Đơn Bán Sỉ - ${order.id}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .invoice-container { 
                    max-width: 900px; 
                    width: 100%;
                    background: white; 
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                    overflow: hidden;
                    position: relative;
                }
                .invoice-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 6px;
                    background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c);
                }
                .company-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px;
                    text-align: center;
                    position: relative;
                }
                .company-header::after {
                    content: '';
                    position: absolute;
                    bottom: -20px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 20px solid transparent;
                    border-right: 20px solid transparent;
                    border-top: 20px solid #764ba2;
                }
                .company-logo {
                    width: 80px;
                    height: 80px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    font-size: 32px;
                }
                .company-header h1 { 
                    font-size: 32px; 
                    margin-bottom: 8px; 
                    font-weight: 700;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .company-header .store-name {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 5px;
                    opacity: 0.95;
                }
                .company-header .store-details {
                    font-size: 14px;
                    opacity: 0.85;
                    line-height: 1.4;
                }
                .invoice-title {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    padding: 25px 40px;
                    text-align: center;
                    margin-top: 20px;
                }
                .invoice-title h2 {
                    font-size: 28px;
                    margin-bottom: 8px;
                    font-weight: 700;
                }
                .invoice-title .order-id {
                    font-size: 16px;
                    font-weight: 500;
                    opacity: 0.9;
                }
                .invoice-content { 
                    padding: 40px; 
                }
                .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 40px; 
                    margin-bottom: 40px; 
                }
                .info-card {
                    background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
                    border-radius: 15px;
                    padding: 25px;
                    border-left: 5px solid #667eea;
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
                }
                .info-card h3 { 
                    color: #667eea; 
                    margin-bottom: 20px; 
                    font-size: 18px; 
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .info-card p { 
                    margin-bottom: 10px; 
                    font-size: 15px;
                    color: #4a5568;
                }
                .info-card p strong {
                    color: #2d3748;
                    font-weight: 600;
                }
                .items-section {
                    margin-bottom: 40px;
                }
                .items-section h3 {
                    color: #667eea;
                    font-size: 20px;
                    font-weight: 700;
                    margin-bottom: 20px;
                    text-align: center;
                    padding-bottom: 10px;
                    border-bottom: 3px solid #667eea;
                }
                .items-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                .items-table th { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white;
                    padding: 20px 15px; 
                    text-align: left; 
                    font-weight: 600; 
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .items-table tbody tr {
                    transition: all 0.3s ease;
                }
                .items-table tbody tr:nth-child(even) {
                    background: #f8f9ff;
                }
                .items-table tbody tr:hover {
                    background: #e8f0fe;
                    transform: scale(1.01);
                }
                .items-table td { 
                    padding: 18px 15px; 
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 14px;
                }
                .summary-section { 
                    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); 
                    padding: 30px; 
                    border-radius: 15px; 
                    border: 2px solid #e2e8f0;
                    margin-bottom: 30px;
                }
                .summary-row { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 15px;
                    font-size: 16px;
                }
                .summary-row.total { 
                    font-size: 24px; 
                    font-weight: 700; 
                    color: #667eea; 
                    border-top: 3px solid #667eea; 
                    padding-top: 20px; 
                    margin-top: 20px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .payment-info { 
                    background: linear-gradient(135deg, #e8f5e8 0%, #f0fff0 100%); 
                    padding: 25px; 
                    border-radius: 15px; 
                    border-left: 5px solid #48bb78;
                    box-shadow: 0 5px 15px rgba(72, 187, 120, 0.1);
                }
                .payment-info h3 {
                    color: #48bb78;
                    margin-bottom: 20px;
                    font-size: 18px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .footer { 
                    text-align: center; 
                    padding: 30px; 
                    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); 
                    color: #718096; 
                    font-size: 14px;
                    border-top: 1px solid #e2e8f0;
                }
                .footer p {
                    margin-bottom: 8px;
                }
                .footer .thank-you {
                    font-size: 16px;
                    font-weight: 600;
                    color: #667eea;
                    margin-bottom: 10px;
                }
                @media print { 
                    body { 
                        background: white; 
                        padding: 0;
                    } 
                    .invoice-container { 
                        box-shadow: none; 
                        margin: 0;
                        border-radius: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="company-header">
                    <div class="company-logo">
                        🏪
                    </div>
                    <div class="store-name">${storeName}</div>
                    <div class="store-details">
                        📍 ${storeAddress}<br>
                        📞 ${storePhone} | 📧 ${storeEmail}
                    </div>
                </div>
                
                <div class="invoice-title">
                    <h2>🧾 HÓA ĐƠN BÁN SỈ</h2>
                    <div class="order-id">Mã đơn hàng: <strong>${order.id}</strong></div>
                </div>
                
                <div class="invoice-content">
                    <div class="info-grid">
                        <div class="info-card">
                            <h3>🏢 Thông Tin Khách Hàng</h3>
                            <p><strong>Tên khách hàng:</strong> ${order.customerName}</p>
                            <p><strong>Số điện thoại:</strong> ${order.customerPhone || 'Không có'}</p>
                            <p><strong>Địa chỉ:</strong> ${order.customerAddress || 'Không có'}</p>
                        </div>
                        
                        <div class="info-card">
                            <h3>📅 Thông Tin Đơn Hàng</h3>
                            <p><strong>Ngày đặt hàng:</strong> ${order.orderDate}</p>
                            <p><strong>Ngày giao hàng:</strong> ${order.deliveryDate || 'Chưa xác định'}</p>
                            <p><strong>Trạng thái:</strong> ${order.status || 'Đang xử lý'}</p>
                        </div>
                    </div>
                    
                    <div class="items-section">
                        <h3>📦 Chi Tiết Sản Phẩm</h3>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 60px; text-align: center;">STT</th>
                                    <th>Tên Sản Phẩm</th>
                                    <th style="width: 120px; text-align: center;">Mã SKU</th>
                                    <th style="width: 100px; text-align: center;">Số Lượng</th>
                                    <th style="width: 130px; text-align: right;">Đơn Giá</th>
                                    <th style="width: 130px; text-align: right;">Thành Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="summary-section">
                        <div class="summary-row">
                            <span><strong>💰 Tạm tính:</strong></span>
                            <span><strong>${formatCurrency(order.subtotal)} VNĐ</strong></span>
                        </div>
                        <div class="summary-row">
                            <span><strong>🎯 Giảm giá:</strong></span>
                            <span style="color: #e53e3e;"><strong>-${formatCurrency(order.discount)} VNĐ</strong></span>
                        </div>
                        <div class="summary-row">
                            <span><strong>🚚 Phí vận chuyển:</strong></span>
                            <span><strong>${formatCurrency(order.shipping)} VNĐ</strong></span>
                        </div>
                        <div class="summary-row total">
                            <span>💎 TỔNG CỘNG:</span>
                            <span>${formatCurrency(order.total)} VNĐ</span>
                        </div>
                    </div>
                    
                    <div class="payment-info">
                        <h3 style="color: #007bff; margin-bottom: 15px;"><i class="fas fa-credit-card"></i> Thông Tin Thanh Toán</h3>
                        <div class="summary-row">
                            <span><strong>Tiền cọc đã thanh toán:</strong></span>
                            <span style="color: #28a745; font-weight: 600;">${formatCurrency(order.deposit)} VNĐ</span>
                        </div>
                        <div class="summary-row">
                            <span><strong>Còn phải thanh toán:</strong></span>
                            <span style="color: #ffc107; font-weight: 600;">${formatCurrency(order.remaining)} VNĐ</span>
                        </div>
                        <div class="summary-row" style="margin-top: 10px;">
                            <span><strong>Trạng thái:</strong></span>
                            <span>${getPaymentStatusText(order.paymentStatus)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p class="thank-you">🙏 Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
                    <p>📅 Ngày in: ${new Date().toLocaleDateString('vi-VN')} - ⏰ ${new Date().toLocaleTimeString('vi-VN')}</p>
                    <p style="margin-top: 15px; font-size: 12px; opacity: 0.7;">💼 Hệ thống quản lý bán hàng - ${storeName}</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Open in new window and print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };
}

// Get payment status text for invoice
function getPaymentStatusText(status) {
    switch (status) {
        case 'paid':
            return '<span style="color: #28a745; font-weight: 600;">Đã Thanh Toán Đầy Đủ</span>';
        case 'partial':
            return '<span style="color: #ffc107; font-weight: 600;">Thanh Toán Một Phần</span>';
        default:
            return '<span style="color: #dc3545; font-weight: 600;">Chưa Thanh Toán</span>';
    }
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Show notification function
function showNotification(message, type = 'info') {
    console.log('showNotification called:', message, type);
    
    let notification = document.getElementById('notification');
    
    // Create notification element if it doesn't exist
    if (!notification) {
        console.log('Creating notification element');
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification hidden';
        notification.innerHTML = `
            <i class="notification-icon"></i>
            <span class="notification-message"></span>
        `;
        document.body.appendChild(notification);
    }
    
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
    
    console.log('Notification shown:', notification.className);
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
        console.log('Notification hidden');
    }, 4000);
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function formatNumber(num) {
    // Handle undefined, null, or empty values
    if (num === undefined || num === null || num === '') {
        return '0';
    }
    
    // Convert to string and remove any non-digit characters
    const cleanNum = num.toString().replace(/[^0-9]/g, '');
    
    // If no digits found, return '0'
    if (cleanNum === '') {
        return '0';
    }
    
    // Add thousands separator
    return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseFormattedNumber(formattedNum) {
    if (!formattedNum) return 0;
    return parseInt(formattedNum.toString().replace(/[^0-9]/g, '')) || 0;
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const messageSpan = notification.querySelector('.notification-message');
    
    // Set icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    icon.className = `notification-icon ${iconClass}`;
    messageSpan.textContent = message;
    
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
window.addWholesaleItem = addWholesaleItem;
window.removeWholesaleItem = removeWholesaleItem;
window.updateWholesaleItemPrice = updateWholesaleItemPrice;
window.updateWholesaleItemTotal = updateWholesaleItemTotal;
window.updateWholesaleSummary = updateWholesaleSummary;
window.createWholesaleOrder = createWholesaleOrder;
window.clearWholesaleForm = clearWholesaleForm;
window.viewWholesaleOrder = viewWholesaleOrder;
window.updatePayment = updatePayment;
window.deleteWholesaleOrder = deleteWholesaleOrder;
window.closeModal = closeModal;
window.updatePaymentStatus = updatePaymentStatus;
window.getPaymentStatusText = getPaymentStatusText;
window.goToPage = goToPage;
window.previousPage = previousPage;
window.nextPage = nextPage;

function parseFormattedNumber(formattedNum) {
    if (!formattedNum) return 0;
    return parseInt(formattedNum.toString().replace(/[^0-9]/g, '')) || 0;
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const messageSpan = notification.querySelector('.notification-message');
    
    // Set icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    icon.className = `notification-icon ${iconClass}`;
    messageSpan.textContent = message;
    
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
window.addWholesaleItem = addWholesaleItem;
window.removeWholesaleItem = removeWholesaleItem;
window.updateWholesaleItemPrice = updateWholesaleItemPrice;
window.updateWholesaleItemTotal = updateWholesaleItemTotal;
window.updateWholesaleSummary = updateWholesaleSummary;
window.createWholesaleOrder = createWholesaleOrder;
window.clearWholesaleForm = clearWholesaleForm;
window.viewWholesaleOrder = viewWholesaleOrder;
window.updatePayment = updatePayment;
window.deleteWholesaleOrder = deleteWholesaleOrder;
window.closeModal = closeModal;window.updatePaymentStatus = updatePaymentStatus;
window.getPaymentStatusText = getPaymentStatusText;
