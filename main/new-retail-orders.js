// New Retail Orders Management System
// Tạo và quản lý đơn hàng bán lẻ

let retailOrdersData = [];
let retailItemCounter = 0;
let isSubmitting = false; // Flag to prevent double submission
let lastOrderId = null; // Track last created order ID to prevent duplicates
let isInitialized = false; // Flag to prevent multiple initialization

// ===== UTILITY FUNCTIONS FOR NUMBER FORMATTING =====

// Format number with thousands separator (10000 -> 10.000)
function formatNumber(num) {
    if (!num || isNaN(num)) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Parse formatted number back to integer (10.000 -> 10000)
function parseFormattedNumber(str) {
    if (!str) return 0;
    return parseInt(str.toString().replace(/\./g, '')) || 0;
}

// Add number formatting to input fields
function addNumberFormatting(inputElement) {
    if (!inputElement) return;
    
    inputElement.addEventListener('input', function(e) {
        const value = e.target.value.replace(/\./g, '');
        if (!isNaN(value) && value !== '') {
            e.target.value = formatNumber(parseInt(value));
        }
    });
    
    inputElement.addEventListener('blur', function(e) {
        const value = parseFormattedNumber(e.target.value);
        e.target.value = value > 0 ? formatNumber(value) : '';
        // Trigger change event to update calculations
        e.target.dispatchEvent(new Event('change'));
    });
}

// Initialize retail orders system
function initRetailOrders() {
    // Prevent multiple initialization
    if (isInitialized) {
        console.log('Retail orders already initialized, skipping...');
        return;
    }
    
    console.log('Initializing retail orders system...');
    isInitialized = true;
    
    // Set current date and time
    const now = new Date();
    document.getElementById('retailOrderDate').value = now.toISOString().split('T')[0];
    document.getElementById('retailOrderTime').value = now.toTimeString().slice(0, 5);
    
    // Add form submit event listener
    const retailForm = document.getElementById('retailOrderForm');
    if (retailForm) {
        // Remove any existing event listeners to prevent duplicates
        retailForm.removeEventListener('submit', createRetailOrder);
        // Add the event listener
        retailForm.addEventListener('submit', createRetailOrder);
    }
    
    // Add number formatting to discount and shipping inputs
    const discountInput = document.getElementById('retailDiscount');
    const shippingInput = document.getElementById('retailShipping');
    
    if (discountInput) {
        addNumberFormatting(discountInput);
        discountInput.placeholder = 'Ví dụ: 10.000';
    }
    if (shippingInput) {
        addNumberFormatting(shippingInput);
        shippingInput.placeholder = 'Ví dụ: 25.000';
    }
    
    // Load products first, then add first item
    loadProductsForRetail().then(() => {
        // Add first item after products are loaded
        addRetailItem();
    });
    
    // Load existing orders
    loadRetailOrders();
}

// Add new retail item
function addRetailItem() {
    retailItemCounter++;
    const container = document.getElementById('retailItemsContainer');
    
    const itemHTML = `
        <div class="retail-item" id="retailItem${retailItemCounter}" style="background: #fff; border: 2px solid #e9ecef; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s ease;" onmouseover="this.style.borderColor='#28a745'; this.style.boxShadow='0 4px 16px rgba(40,167,69,0.15)'" onmouseout="this.style.borderColor='#e9ecef'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
            <div class="retail-item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f8f9fa;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #28a745, #20c997); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${retailItemCounter}</div>
                    <span style="font-size: 16px; font-weight: 600; color: #333;">Sản phẩm ${retailItemCounter}</span>
                </div>
                <button type="button" onclick="removeRetailItem(${retailItemCounter})" style="background: #dc3545; color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;" onmouseover="this.style.background='#c82333'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='#dc3545'; this.style.transform='scale(1)'">
                    <i class="fas fa-trash" style="font-size: 12px; cursor: pointer;"></i>
                </button>
            </div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">📦 Tên Sản Phẩm *</label>
                    <select class="retail-product-select" onchange="updateRetailItemPrice(${retailItemCounter})" required style="width: 100%; padding: 12px 16px; border: 2px solid #e9ecef; cursor: pointer; border-radius: 8px; font-size: 14px; background: white; transition: all 0.3s ease;" onfocus="this.style.borderColor='#28a745'; this.style.boxShadow='0 0 0 3px rgba(40,167,69,0.1)'" onblur="this.style.borderColor='#e9ecef'; this.style.boxShadow='none'">
                        <option value="">Chọn sản phẩm...</option>
                        ${generateProductOptions()}
                    </select>
                </div>
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">⚖️ Số Lượng (kg) *</label>
                    <input type="number" class="retail-quantity" min="0.1" step="0.1" value="" onchange="updateRetailItemTotal(${retailItemCounter})" required style="width: 100%; padding: 12px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: all 0.3s ease;" onfocus="this.style.borderColor='#28a745'; this.style.boxShadow='0 0 0 3px rgba(40,167,69,0.1)'" onblur="this.style.borderColor='#e9ecef'; this.style.boxShadow='none'" placeholder="0.0">
                </div>
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">💰 Giá Bán (VNĐ) *</label>
                    <input type="text" class="retail-price" placeholder="Ví dụ: 50.000" onchange="updateRetailItemTotal(${retailItemCounter})" required style="width: 100%; padding: 12px 16px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: all 0.3s ease;" onfocus="this.style.borderColor='#28a745'; this.style.boxShadow='0 0 0 3px rgba(40,167,69,0.1)'" onblur="this.style.borderColor='#e9ecef'; this.style.boxShadow='none'">
                </div>
            </div>
            <div style="margin-top: 10px;">
                <div style="position: relative;">
                    <label style="display: block; font-weight: 600; color: #555; margin-bottom: 8px; font-size: 14px;">💵 Thành Tiền</label>
                    <div class="retail-item-total" style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; font-weight: 700; color: #28a745; font-size: 18px; border: 2px solid #e9ecef; display: flex; align-items: center; justify-content: center; min-height: 30px; text-align: center;">0 VNĐ</div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHTML);
    
    // Add number formatting to the price input of the newly added item
    const newPriceInput = document.querySelector(`#retailItem${retailItemCounter} .retail-price`);
    if (newPriceInput) {
        addNumberFormatting(newPriceInput);
    }
    
    updateRetailSummary();
}

// Remove retail item
function removeRetailItem(itemId) {
    const item = document.getElementById(`retailItem${itemId}`);
    if (item) {
        item.remove();
        updateRetailSummary();
        
        // If no items left, add one
        const container = document.getElementById('retailItemsContainer');
        if (container.children.length === 0) {
            addRetailItem();
        }
    }
}

// Update item price based on selected product
function updateRetailItemPrice(itemId) {
    const item = document.getElementById(`retailItem${itemId}`);
    if (!item) return;
    
    const productSelect = item.querySelector('.retail-product-select');
    const priceInput = item.querySelector('.retail-price');
    const selectedProductId = productSelect.value;
    
    if (selectedProductId && window.productsData && window.productsData[selectedProductId]) {
        const product = window.productsData[selectedProductId];
        priceInput.value = product.price || 0;
        updateRetailItemTotal(itemId);
    }
}

// Update item total
function updateRetailItemTotal(itemId) {
    const item = document.getElementById(`retailItem${itemId}`);
    if (!item) return;
    
    const quantity = parseFloat(item.querySelector('.retail-quantity').value) || 0;
    const price = parseInt(item.querySelector('.retail-price').value) || 0;
    const total = quantity * price;
    
    item.querySelector('.retail-item-total').textContent = formatCurrency(total) + ' VNĐ';
    updateRetailSummary();
}

// Update order summary
function updateRetailSummary() {
    const items = document.querySelectorAll('.retail-item');
    let subtotal = 0;
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('.retail-quantity').value) || 0;
        const price = parseFormattedNumber(item.querySelector('.retail-price').value) || 0;
        subtotal += quantity * price;
    });
    
    const discount = parseFormattedNumber(document.getElementById('retailDiscount').value) || 0;
    const shipping = parseFormattedNumber(document.getElementById('retailShipping').value) || 0;
    const total = subtotal - discount + shipping;
    
    document.getElementById('retailSubtotal').textContent = formatNumber(subtotal) + ' VNĐ';
    document.getElementById('retailTotal').textContent = formatNumber(total) + ' VNĐ';
}

// Load products for retail orders
async function loadProductsForRetail() {
    try {
        console.log('Loading products for retail orders...');
        if (typeof getAllProducts === 'function') {
            const products = await getAllProducts();
            window.productsData = products;
            console.log('Products loaded for retail:', products);
        } else {
            console.error('getAllProducts function not available');
        }
    } catch (error) {
        console.error('Error loading products for retail:', error);
    }
}

// Generate product options
function generateProductOptions() {
    if (!window.productsData || Object.keys(window.productsData).length === 0) {
        return '<option value="">Đang tải sản phẩm...</option>';
    }
    
    let options = '';
    for (const [id, product] of Object.entries(window.productsData)) {
        const sku = product.sku ? ` - ${product.sku}` : '';
        const unit = product.unit || 'cái';
        const price = product.price || 0;
        options += `<option value="${id}" data-unit="${unit}" data-conversion="${product.conversion || 1}" data-price="${price}">${product.name}${sku} - ${formatCurrency(price)}/${unit}</option>`;
    }
    return options;
}

// Create retail order
function createRetailOrder(event) {
    console.log('=== createRetailOrder called ===');
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
        // Get form data
        const formData = {
            customerName: document.getElementById('retailCustomerName').value.trim(),
            customerPhone: document.getElementById('retailCustomerPhone').value.trim(),
            orderDate: document.getElementById('retailOrderDate').value,
            orderTime: document.getElementById('retailOrderTime').value,
            items: [],
            discount: parseFormattedNumber(document.getElementById('retailDiscount').value) || 0,
            shipping: parseFormattedNumber(document.getElementById('retailShipping').value) || 0
        };
        
        // Validate required fields
        if (!formData.customerName) {
            throw new Error('Vui lòng nhập tên khách hàng');
        }
        
        if (!formData.orderDate || !formData.orderTime) {
            throw new Error('Vui lòng nhập ngày và giờ bán');
        }
        
        // Get items data
        const items = document.querySelectorAll('.retail-item');
        items.forEach((item, index) => {
            const productSelect = item.querySelector('.retail-product-select');
            const quantity = parseFloat(item.querySelector('.retail-quantity').value) || 0;
            const price = parseFormattedNumber(item.querySelector('.retail-price').value) || 0;
            
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
            
            // Calculate actual quantity for stock deduction based on conversion
            const unit = product.unit || 'cái';
            const conversion = product.conversion || 1;
            const actualQuantityForStock = quantity * conversion;
            
            // Check stock availability
            const currentStock = product.stock || 0;
            if (currentStock < actualQuantityForStock) {
                throw new Error(`Không đủ tồn kho cho sản phẩm "${product.name}" trong mục ${index + 1}! Cần: ${actualQuantityForStock} ${unit}, Còn: ${currentStock} ${unit}`);
            }
            
            formData.items.push({
                productId: productSelect.value,
                productName: product.name,
                sku: product.sku,
                quantity: quantity,
                unit: unit,
                conversion: conversion,
                actualQuantityForStock: actualQuantityForStock,
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
        
        // Get current store info
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (!selectedStoreId) {
            throw new Error('Vui lòng chọn cửa hàng trước khi tạo đơn hàng');
        }
        
        // Create unique order ID
        const orderId = 'retail_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Check if this order ID was just created (prevent duplicate)
        if (lastOrderId === orderId) {
            throw new Error('Đơn hàng đang được xử lý, vui lòng đợi...');
        }
        
        lastOrderId = orderId;
        
        // Create order object
        const order = {
            id: orderId,
            type: 'retail',
            storeId: selectedStoreId,
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            orderDate: formData.orderDate,
            orderTime: formData.orderTime,
            items: formData.items,
            subtotal: subtotal,
            discount: formData.discount,
            shipping: formData.shipping,
            total: total,
            createdAt: new Date().toISOString(),
            status: 'completed'
        };
        
        console.log('About to save order to Firebase:', order.id);
        // Save to Firebase
        saveRetailOrderToFirebase(order);
        
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
function saveRetailOrderToFirebase(order) {
    console.log('=== saveRetailOrderToFirebase called ===');
    console.log('Order ID:', order.id);
    console.log('Database available:', !!window.database);
    
    if (!window.database) {
        console.log('Database not available!');
        hideLoading();
        showNotification('Lỗi kết nối cơ sở dữ liệu', 'error');
        return;
    }
    
    const ordersRef = window.database.ref(`stores/${order.storeId}/orders/${order.id}`);
    console.log('Firebase ref path:', `stores/${order.storeId}/orders/${order.id}`);
    
    console.log('Calling Firebase set...');
    ordersRef.set(order)
        .then(async () => {
            console.log('Firebase save SUCCESS for order:', order.id);
            
            // Update stock for all ordered products
            console.log('=== Updating product stock for retail order ===');
            try {
                for (const item of order.items) {
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
            } catch (stockError) {
                console.error('Error updating stock:', stockError);
                // Don't fail the order creation, just log the error
            }
            
            hideLoading();
            showNotification('Tạo đơn hàng bán lẻ thành công và cập nhật tồn kho!', 'success');
            
            // Add to local data (check for duplicates first)
            const existingOrderIndex = retailOrdersData.findIndex(existingOrder => existingOrder.id === order.id);
            if (existingOrderIndex === -1) {
                console.log('Adding new order to local data:', order.id);
                retailOrdersData.unshift(order);
            } else {
                console.log('Order already exists in local data, skipping:', order.id);
            }
            
            // Refresh orders list
            displayRetailOrders();
            
            // Clear form
            clearRetailForm();
            
            // Reset submission state
            isSubmitting = false;
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Tạo Đơn Hàng';
            }
        })
        .catch((error) => {
            console.log('Firebase save ERROR for order:', order.id, error);
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
        });
}

// Clear form
function clearRetailForm() {
    // Reset form fields
    document.getElementById('retailCustomerName').value = '';
    document.getElementById('retailCustomerPhone').value = '';
    document.getElementById('retailDiscount').value = '0';
    document.getElementById('retailShipping').value = '0';
    
    // Set current date and time
    const now = new Date();
    document.getElementById('retailOrderDate').value = now.toISOString().split('T')[0];
    document.getElementById('retailOrderTime').value = now.toTimeString().slice(0, 5);
    
    // Clear items
    document.getElementById('retailItemsContainer').innerHTML = '';
    retailItemCounter = 0;
    
    // Add first item
    addRetailItem();
    
    // Update summary
    updateRetailSummary();
}

// Load retail orders from Firebase
function loadRetailOrders() {
    if (!window.database) {
        console.error('Database not initialized');
        return;
    }
    
    // Get current store ID
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (!selectedStoreId) {
        console.log('No store selected, clearing retail orders');
        retailOrdersData = [];
        displayRetailOrders();
        return;
    }
    
    console.log('Loading retail orders for store:', selectedStoreId);
    const ordersRef = window.database.ref(`stores/${selectedStoreId}/orders`);
    
    ordersRef.orderByChild('type').equalTo('retail').on('value', (snapshot) => {
        retailOrdersData = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                // Double check that this order belongs to current store
                if (order.storeId === selectedStoreId) {
                    retailOrdersData.push(order);
                }
            });
            
            // Sort by creation date (newest first)
            retailOrdersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            console.log(`Loaded ${retailOrdersData.length} retail orders for store ${selectedStoreId}`);
        } else {
            console.log('No retail orders found for store:', selectedStoreId);
        }
        
        displayRetailOrders();
    });
}

// Display retail orders
function displayRetailOrders() {
    const tbody = document.getElementById('retailOrdersBody');
    const emptyState = document.getElementById('retailEmptyState');
    
    if (retailOrdersData.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    retailOrdersData.forEach((order, index) => {
        const itemsText = order.items.map(item => `${item.productName} (${item.quantity}kg)`).join(', ');
        const orderDateTime = `${order.orderDate} ${order.orderTime}`;
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${order.customerName}</td>
                <td>${order.customerPhone || 'N/A'}</td>
                <td>${orderDateTime}</td>
                <td title="${itemsText}">${itemsText.length > 50 ? itemsText.substring(0, 50) + '...' : itemsText}</td>
                <td><strong>${formatCurrency(order.total)} VNĐ</strong></td>
                <td>
                    <button class="retail-btn retail-btn-secondary retail-btn-small" onclick="viewRetailOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="retail-btn retail-btn-danger retail-btn-small" onclick="deleteRetailOrder('${order.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button style="background-color: #059669 !important;padding: 6px 8px !important; color:white" class="btn btn-light" onclick="printRetailOrder('${order.id}')" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 6px; margin-right: 10px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            <i class="fas fa-print"></i> In Hóa Đơn
                        </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function viewRetailOrder(orderId) {
    const order = retailOrdersData.find(o => o.id === orderId);
    if (!order) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    
    // Create modal items HTML
    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `
            <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 12px; text-align: left; font-weight: 500;">${item.productName}</td>
                <td style="padding: 12px; text-align: center; font-family: monospace; background: #f8f9fa; font-size: 13px;">${item.sku}</td>
                <td style="padding: 12px; text-align: center; font-weight: 600;">${item.quantity} kg</td>
                <td style="padding: 12px; text-align: right; font-weight: 500;">${formatCurrency(item.price)} VNĐ</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: #28a745;">${formatCurrency(item.total)} VNĐ</td>
                
            </tr>
        `;
    });
    
    const modalHtml = `
        <div class="modal-overlay" onclick="closeModal()" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 12px; max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <div class="modal-header" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 25px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Chi Tiết Đơn Hàng Bán Lẻ</h3>
                    <div class="modal-actions">
                        <button class="btn btn-light" onclick="printRetailOrder('${order.id}')" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 6px; margin-right: 10px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            <i class="fas fa-print"></i> In Hóa Đơn
                        </button>
                        <button class="modal-close" onclick="closeModal()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 12px; border-radius: 6px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px;">
                        <div class="info-card" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
                            <h4 style="color: #28a745; margin-bottom: 15px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-user" style="font-size: 18px;"></i> Thông Tin Khách Hàng
                            </h4>
                            <div style="space-y: 8px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-weight: 600; color: #555;">Tên:</span>
                                    <span style="color: #333;">${order.customerName}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-weight: 600; color: #555;">Số điện thoại:</span>
                                    <span style="color: #333;">${order.customerPhone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="info-card" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #17a2b8;">
                            <h4 style="color: #17a2b8; margin-bottom: 15px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-receipt" style="font-size: 18px;"></i> Thông Tin Đơn Hàng
                            </h4>
                            <div style="space-y: 8px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-weight: 600; color: #555;">Mã đơn:</span>
                                    <span style="color: #333; font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${order.id}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-weight: 600; color: #555;">Ngày bán:</span>
                                    <span style="color: #333;">${order.orderDate}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-weight: 600; color: #555;">Giờ bán:</span>
                                    <span style="color: #333;">${order.orderTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="products-section" style="margin-bottom: 25px;">
                        <h4 style="color: #28a745; margin-bottom: 15px; font-size: 18px; display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 2px solid #e9ecef;">
                            <i class="fas fa-box" style="font-size: 20px;"></i> Sản Phẩm
                        </h4>
                        <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: linear-gradient(135deg, #28a745, #20c997); color: white;">
                                        <th style="padding: 15px 12px; text-align: left; font-weight: 600;">Sản Phẩm</th>
                                        <th style="padding: 15px 12px; text-align: center; font-weight: 600;">SKU</th>
                                        <th style="padding: 15px 12px; text-align: center; font-weight: 600;">Số Lượng</th>
                                        <th style="padding: 15px 12px; text-align: right; font-weight: 600;">Giá</th>
                                        <th style="padding: 15px 12px; text-align: right; font-weight: 600;">Thành Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="summary-section" style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 25px; border-radius: 10px; border: 1px solid #dee2e6;">
                        <h4 style="color: #28a745; margin-bottom: 20px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-calculator" style="font-size: 20px;"></i> Tổng Kết
                        </h4>
                        <div style="space-y: 12px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                                <span style="font-weight: 600; color: #555;">Tạm tính:</span>
                                <span style="font-weight: 600; color: #333;">${formatCurrency(order.subtotal)} VNĐ</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                                <span style="font-weight: 600; color: #555;">Giảm giá:</span>
                                <span style="font-weight: 600; color: #dc3545;">-${formatCurrency(order.discount)} VNĐ</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                                <span style="font-weight: 600; color: #555;">Phí vận chuyển:</span>
                                <span style="font-weight: 600; color: #333;">+${formatCurrency(order.shipping)} VNĐ</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 15px; border-top: 2px solid #28a745; background: rgba(40, 167, 69, 0.1); border-radius: 6px; padding-left: 15px; padding-right: 15px;">
                                <span style="font-weight: bold; color: #28a745; font-size: 18px;">Tổng Cộng:</span>
                                <span style="font-weight: bold; color: #28a745; font-size: 18px;">${formatCurrency(order.total)} VNĐ</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Print retail order invoice
function printRetailOrder(orderId) {
    const order = retailOrdersData.find(o => o.id === orderId);
    if (!order) {
        showNotification('Không tìm thấy đơn hàng để in', 'error');
        return;
    }
    
    // Get current store info
    const selectedStoreData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
    const storeName = selectedStoreData.name || 'Cửa Hàng ABC';
    const storeAddress = selectedStoreData.address || '123 Đường ABC, Quận 1, TP.HCM';
    const storePhone = selectedStoreData.phone || '0123-456-789';
    const storeEmail = selectedStoreData.email || 'info@cuahang.com';
    
    // Create print content
    let itemsHtml = '';
    order.items.forEach((item, index) => {
        itemsHtml += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.sku}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity} kg</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatNumber(item.price)} VNĐ</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatNumber(item.total)} VNĐ</td>
            </tr>
        `;
    });
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Hóa Đơn Bán Lẻ - ${order.id}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.4; 
                    color: #333; 
                    background: #fff;
                    padding: 20px;
                }
                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                }
                .invoice-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #28a745;
                }
                .company-name {
                    font-size: 24px;
                    font-weight: bold;
                    color: #28a745;
                    margin-bottom: 8px;
                }
                .company-details {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 15px;
                }
                .invoice-title {
                    font-size: 20px;
                    font-weight: bold;
                    color: #333;
                    margin-top: 15px;
                }
                .invoice-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 25px;
                }
                .info-section {
                    width: 48%;
                }
                .info-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #28a745;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                }
                .info-row {
                    margin-bottom: 5px;
                    font-size: 14px;
                }
                .info-label {
                    font-weight: bold;
                    display: inline-block;
                    width: 120px;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    border: 1px solid #ddd;
                }
                .items-table th {
                    background: #28a745;
                    color: white;
                    padding: 12px 8px;
                    text-align: center;
                    font-weight: bold;
                    border: 1px solid #ddd;
                }
                .items-table td {
                    padding: 10px 8px;
                    border: 1px solid #ddd;
                    text-align: center;
                }
                .items-table tr:nth-child(even) {
                    background: #f9f9f9;
                }
                .summary-section {
                    margin-top: 25px;
                    text-align: right;
                }
                .summary-row {
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                .summary-label {
                    font-weight: bold;
                    display: inline-block;
                    width: 150px;
                    text-align: right;
                }
                .summary-value {
                    display: inline-block;
                    width: 120px;
                    text-align: right;
                }
                .total-row {
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 2px solid #28a745;
                    font-size: 18px;
                    font-weight: bold;
                    color: #28a745;
                }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #666;
                }
                @media print {
                    body { padding: 10px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="company-name">${storeName.toUpperCase()}</div>
                    <div class="company-details">
                        Địa chỉ: ${storeAddress}<br>
                        Điện thoại: ${storePhone} | Email: ${storeEmail}
                    </div>
                    <div class="invoice-title">HÓA ĐƠN BÁN LẺ</div>
                </div>
            
                <div class="invoice-info">
                    <div class="info-section">
                        <div class="info-title">Thông Tin Khách Hàng</div>
                        <div class="info-row">
                            <span class="info-label">Tên khách hàng:</span> ${order.customerName}
                        </div>
                        <div class="info-row">
                            <span class="info-label">Số điện thoại:</span> ${order.customerPhone || 'N/A'}
                        </div>
                    </div>
                    <div class="info-section">
                        <div class="info-title">Thông Tin Đơn Hàng</div>
                        <div class="info-row">
                            <span class="info-label">Mã đơn hàng:</span> ${order.id}
                        </div>
                        <div class="info-row">
                            <span class="info-label">Ngày bán:</span> ${order.orderDate}
                        </div>
                        <div class="info-row">
                            <span class="info-label">Giờ bán:</span> ${order.orderTime}
                        </div>
                    </div>
                </div>
            
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 8%;">STT</th>
                            <th style="width: 35%;">Tên Sản Phẩm</th>
                            <th style="width: 15%;">Mã SKU</th>
                            <th style="width: 12%;">Số Lượng</th>
                            <th style="width: 15%;">Đơn Giá</th>
                            <th style="width: 15%;">Thành Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            
                <div class="summary-section">
                    <div class="summary-row">
                        <span class="summary-label">Tạm tính:</span>
                        <span class="summary-value">${formatNumber(order.subtotal)} VNĐ</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Giảm giá:</span>
                        <span class="summary-value">${formatNumber(order.discount)} VNĐ</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Phí vận chuyển:</span>
                        <span class="summary-value">${formatNumber(order.shipping)} VNĐ</span>
                    </div>
                    <div class="total-row">
                        <span class="summary-label">TỔNG CỘNG:</span>
                        <span class="summary-value">${formatNumber(order.total)} VNĐ</span>
                    </div>
                </div>
            
                <div class="footer">
                    <p>Cảm ơn quý khách đã mua hàng!</p>
                    <p>Ngày in: ${new Date().toLocaleString('vi-VN')}</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Auto print when loaded
    printWindow.onload = function() {
        printWindow.print();
        // Close window after printing (optional)
        setTimeout(() => {
            printWindow.close();
        }, 1000);
    };
}

// Delete retail order
function deleteRetailOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
        return;
    }
    
    if (!window.database) {
        showNotification('Lỗi kết nối cơ sở dữ liệu', 'error');
        return;
    }
    
    // Get current store ID
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    if (!selectedStoreId) {
        showNotification('Vui lòng chọn cửa hàng', 'error');
        return;
    }
    
    const orderRef = window.database.ref(`stores/${selectedStoreId}/orders/${orderId}`);
    
    orderRef.remove()
        .then(() => {
            showNotification('Xóa đơn hàng thành công!', 'success');
            
            // Remove from local data
            const index = retailOrdersData.findIndex(order => order.id === orderId);
            if (index > -1) {
                retailOrdersData.splice(index, 1);
                displayRetailOrders();
            }
        })
        .catch((error) => {
            console.error('Error deleting order:', error);
            showNotification('Lỗi khi xóa đơn hàng: ' + error.message, 'error');
        });
}

// ...
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
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
window.initRetailOrders = initRetailOrders;
window.addRetailItem = addRetailItem;
window.removeRetailItem = removeRetailItem;
window.updateRetailItemPrice = updateRetailItemPrice;
window.updateRetailItemTotal = updateRetailItemTotal;
window.updateRetailSummary = updateRetailSummary;
window.createRetailOrder = createRetailOrder;
window.clearRetailForm = clearRetailForm;
window.viewRetailOrder = viewRetailOrder;
window.deleteRetailOrder = deleteRetailOrder;
window.closeModal = closeModal;