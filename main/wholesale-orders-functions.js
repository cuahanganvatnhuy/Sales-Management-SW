// Additional functions for wholesale orders - search, delete, and customer list scrolling

// Delete wholesale order function
function deleteWholesaleOrder(orderId, showConfirm = true) {
    return new Promise((resolve, reject) => {
        if (showConfirm) {
            if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?\nHành động này không thể hoàn tác.')) {
                resolve(false);
                return;
            }
        }
        
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (!selectedStoreId) {
            console.error('No store selected');
            if (showConfirm) {
                showNotification('Vui lòng chọn cửa hàng trước khi xóa đơn hàng.', 'error');
            }
            reject(new Error('No store selected'));
            return;
        }
        
        if (showConfirm) showLoading();
        
        firebase.database().ref(`stores/${selectedStoreId}/orders/${orderId}`)
            .remove()
            .then(() => {
                console.log('Order deleted successfully:', orderId);
                
                if (window.wholesaleOrdersData) {
                    window.wholesaleOrdersData = window.wholesaleOrdersData.filter(order => order.id !== orderId);
                }
                
                if (showConfirm) {
                    hideLoading();
                    showNotification('Đã xóa đơn hàng thành công!', 'success');
                    loadWholesaleOrders();
                }
                
                resolve(true);
            })
            .catch((error) => {
                console.error('Error deleting order:', error);
                
                if (showConfirm) {
                    hideLoading();
                    showNotification('Có lỗi xảy ra khi xóa đơn hàng: ' + error.message, 'error');
                }
                
                reject(error);
            });
    });
}

// Search wholesale orders
function searchWholesaleOrders() {
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearOrderSearchBtn');
    
    if (searchTerm) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    displayWholesaleOrders(searchTerm);
}

// Clear order search
function clearOrderSearch() {
    const searchInput = document.getElementById('orderSearch');
    const clearBtn = document.getElementById('clearOrderSearchBtn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    displayWholesaleOrders('');
}

// Toggle all order selection
function toggleAllOrderSelection() {
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkDeleteButton();
}

// Toggle individual order selection
function toggleOrderSelection() {
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
    
    if (checkedBoxes.length === orderCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedBoxes.length > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    
    updateBulkDeleteButton();
}

// Update bulk delete button state
function updateBulkDeleteButton() {
    const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const selectedCount = document.getElementById('selectedCount');
    
    if (checkedBoxes.length > 0) {
        bulkDeleteBtn.disabled = false;
        bulkDeleteBtn.classList.remove('disabled');
        if (selectedCount) {
            selectedCount.textContent = `(${checkedBoxes.length})`;
        }
    } else {
        bulkDeleteBtn.disabled = true;
        bulkDeleteBtn.classList.add('disabled');
        if (selectedCount) {
            selectedCount.textContent = '';
        }
    }
}

// Clear all selections and filters
function clearOrderFilters() {
    const searchInput = document.getElementById('orderSearch');
    const clearBtn = document.getElementById('clearOrderSearchBtn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    updateBulkDeleteButton();
    displayWholesaleOrders('');
}

// Bulk delete selected orders
function bulkDeleteOrders() {
    const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
    const orderIds = Array.from(checkedBoxes).map(checkbox => checkbox.value);
    
    if (orderIds.length === 0) {
        alert('Vui lòng chọn ít nhất một đơn hàng để xóa.');
        return;
    }
    
    const confirmMessage = `Bạn có chắc chắn muốn xóa ${orderIds.length} đơn hàng đã chọn?\nHành động này không thể hoàn tác.`;
    
    if (confirm(confirmMessage)) {
        showLoading();
        
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (!selectedStoreId) {
            hideLoading();
            alert('Vui lòng chọn cửa hàng trước khi xóa đơn hàng.');
            return;
        }
        
        if (typeof firebase === 'undefined') {
            hideLoading();
            alert('Không thể kết nối với cơ sở dữ liệu.');
            return;
        }
        
        let deletedCount = 0;
        let failedCount = 0;
        
        const deletePromises = orderIds.map(orderId => {
            return firebase.database().ref(`stores/${selectedStoreId}/orders/${orderId}`)
                .remove()
                .then(() => {
                    console.log('Successfully deleted order:', orderId);
                    deletedCount++;
                })
                .catch((error) => {
                    console.error('Error deleting order:', orderId, error);
                    failedCount++;
                });
        });
        
        Promise.all(deletePromises).then(() => {
            hideLoading();
            
            console.log('=== Bulk delete completed ===');
            console.log('Deleted count:', deletedCount);
            console.log('Failed count:', failedCount);
            console.log('Order IDs that were deleted:', orderIds);
            
            let message = '';
            if (deletedCount > 0) {
                message += `Đã xóa thành công ${deletedCount} đơn hàng.`;
            }
            if (failedCount > 0) {
                message += ` ${failedCount} đơn hàng không thể xóa.`;
            }
            
            showNotification(message, deletedCount > 0 ? 'success' : 'error');
            
            // Clear local data immediately
            if (window.wholesaleOrdersData) {
                console.log('Before filtering local data:', window.wholesaleOrdersData.length, 'orders');
                window.wholesaleOrdersData = window.wholesaleOrdersData.filter(order => !orderIds.includes(order.id));
                console.log('After filtering local data:', window.wholesaleOrdersData.length, 'orders');
            }
            
            clearOrderFilters();
            
            // Add a small delay before reloading to ensure Firebase sync
            setTimeout(() => {
                console.log('Reloading orders after deletion...');
                loadWholesaleOrders();
            }, 500);
        }).catch((error) => {
            console.error('Error in bulk delete operation:', error);
            hideLoading();
            showNotification('Có lỗi xảy ra khi xóa đơn hàng: ' + error.message, 'error');
        });
    }
}

// Make customer list scrollable if more than 5 customers
function makeCustomerListScrollable() {
    const customerList = document.getElementById('customerList');
    if (!customerList) return;
    
    const customerItems = customerList.querySelectorAll('.customer-item');
    
    if (customerItems.length > 5) {
        customerList.style.maxHeight = '300px'; // Height for ~5 items
        customerList.style.overflowY = 'auto';
        customerList.style.border = '1px solid #ddd';
        customerList.style.borderRadius = '4px';
        customerList.style.padding = '5px';
        
        // Add custom scrollbar styling
        const style = document.createElement('style');
        style.textContent = `
            #customerList::-webkit-scrollbar {
                width: 8px;
            }
            #customerList::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }
            #customerList::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 4px;
            }
            #customerList::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
        `;
        
        if (!document.querySelector('#customerListScrollStyle')) {
            style.id = 'customerListScrollStyle';
            document.head.appendChild(style);
        }
    } else {
        customerList.style.maxHeight = 'none';
        customerList.style.overflowY = 'visible';
        customerList.style.border = 'none';
        customerList.style.padding = '0';
    }
}

// Search customers in modal
function searchCustomers() {
    const searchTerm = document.getElementById('customerSearch').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    const customerList = document.getElementById('customerList');
    
    if (searchTerm) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    const customers = customerList.querySelectorAll('.customer-item');
    let visibleCount = 0;
    
    customers.forEach(customer => {
        const customerName = customer.querySelector('.customer-name').textContent.toLowerCase();
        const customerPhone = customer.querySelector('.customer-phone').textContent.toLowerCase();
        const customerAddress = customer.querySelector('.customer-address').textContent.toLowerCase();
        
        if (customerName.includes(searchTerm) || 
            customerPhone.includes(searchTerm) || 
            customerAddress.includes(searchTerm)) {
            customer.style.display = 'block';
            visibleCount++;
        } else {
            customer.style.display = 'none';
        }
    });
    
    // Update scrollable behavior based on visible items
    if (visibleCount > 5) {
        customerList.style.maxHeight = '300px';
        customerList.style.overflowY = 'auto';
    } else {
        customerList.style.maxHeight = 'none';
        customerList.style.overflowY = 'visible';
    }
}

// Clear customer search
function clearCustomerSearch() {
    const searchInput = document.getElementById('customerSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    const customerList = document.getElementById('customerList');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    const customers = customerList.querySelectorAll('.customer-item');
    customers.forEach(customer => {
        customer.style.display = 'block';
    });
    
    // Re-apply scrollable behavior
    makeCustomerListScrollable();
}

// View wholesale order details
function viewWholesaleOrderDetails(orderId) {
    console.log('Viewing details for order:', orderId);
    
    // Find the order in our local data
    const order = window.wholesaleOrdersData.find(o => o.id === orderId);
    
    if (!order) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    
    // Create or get modal element
    let modal = document.getElementById('orderDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'orderDetailsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeOrderDetailsModal()">&times;</span>
                <h2>Chi Tiết Đơn Hàng Sỉ</h2>
                <div id="orderDetailsContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate order details
    const content = document.getElementById('orderDetailsContent');
    if (content) {
        content.innerHTML = `
            <div class="order-details">
                <div class="detail-row">
                    <span class="label">Mã đơn hàng:</span>
                    <span class="value">${order.id}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Khách hàng:</span>
                    <span class="value">${order.customerName || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Số điện thoại:</span>
                    <span class="value">${order.customerPhone || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Địa chỉ:</span>
                    <span class="value">${order.customerAddress || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Ngày đặt hàng:</span>
                    <span class="value">${order.orderDate || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Ngày giao hàng:</span>
                    <span class="value">${order.deliveryDate || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Trạng thái:</span>
                    <span class="value">${getStatusText(order.status)}</span>
                </div>
                <h3>Sản Phẩm</h3>
                <div class="products-list">
                    ${order.items.map(item => `
                        <div class="product-item">
                            <span>${item.productName}</span>
                            <span>${item.quantity}kg</span>
                            <span>${formatCurrency(item.price)} VNĐ</span>
                            <span>${formatCurrency(item.quantity * item.price)} VNĐ</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-totals">
                    <div class="total-row">
                        <span class="label">Tổng tiền:</span>
                        <span class="value">${formatCurrency(order.total)} VNĐ</span>
                    </div>
                    <div class="total-row">
                        <span class="label">Tiền cọc:</span>
                        <span class="value">${formatCurrency(order.deposit || 0)} VNĐ</span>
                    </div>
                    <div class="total-row">
                        <span class="label">Còn lại:</span>
                        <span class="value">${formatCurrency(order.total - (order.deposit || 0))} VNĐ</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Show modal
    modal.style.display = 'block';
}

// Close order details modal
function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Print wholesale invoice
function printWholesaleInvoice(orderId) {
    console.log('Printing invoice for order:', orderId);
    
    // Find the order in our local data
    const order = window.wholesaleOrdersData.find(o => o.id === orderId);
    
    if (!order) {
        showNotification('Không tìm thấy đơn hàng để in', 'error');
        return;
    }
    
    // Create a printable HTML content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hóa Đơn ${order.id}</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .invoice-header { text-align: center; margin-bottom: 20px; }
                .invoice-details { margin-bottom: 20px; }
                .detail-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .products-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .products-table th, .products-table td { border: 1px solid #000; padding: 8px; text-align: left; }
                .order-totals { margin-top: 20px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <h1>HÓA ĐƠN BÁN HÀNG</h1>
                <h2>${window.selectedStoreData?.name || 'Cửa hàng'}</h2>
                <p>${window.selectedStoreData?.address || ''}</p>
                <p>Điện thoại: ${window.selectedStoreData?.phone || ''}</p>
            </div>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <span>Mã đơn hàng:</span>
                    <span>${order.id}</span>
                </div>
                <div class="detail-row">
                    <span>Khách hàng:</span>
                    <span>${order.customerName || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span>Số điện thoại:</span>
                    <span>${order.customerPhone || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span>Địa chỉ:</span>
                    <span>${order.customerAddress || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span>Ngày đặt hàng:</span>
                    <span>${order.orderDate || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span>Ngày giao hàng:</span>
                    <span>${order.deliveryDate || 'N/A'}</span>
                </div>
            </div>
            
            <table class="products-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td>${item.productName}</td>
                            <td>${item.quantity}kg</td>
                            <td>${formatCurrency(item.price)} VNĐ</td>
                            <td>${formatCurrency(item.quantity * item.price)} VNĐ</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="order-totals">
                <div class="total-row">
                    <span>Tổng tiền:</span>
                    <span>${formatCurrency(order.total)} VNĐ</span>
                </div>
                <div class="total-row">
                    <span>Tiền cọc:</span>
                    <span>${formatCurrency(order.deposit || 0)} VNĐ</span>
                </div>
                <div class="total-row">
                    <span>Còn lại:</span>
                    <span>${formatCurrency(order.total - (order.deposit || 0))} VNĐ</span>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Export functions to global scope
window.deleteWholesaleOrder = deleteWholesaleOrder;
window.searchWholesaleOrders = searchWholesaleOrders;
window.clearOrderSearch = clearOrderSearch;
window.toggleAllOrderSelection = toggleAllOrderSelection;
window.toggleOrderSelection = toggleOrderSelection;
window.updateBulkDeleteButton = updateBulkDeleteButton;
window.clearOrderFilters = clearOrderFilters;
window.bulkDeleteOrders = bulkDeleteOrders;
window.makeCustomerListScrollable = makeCustomerListScrollable;
window.viewWholesaleOrderDetails = viewWholesaleOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.printWholesaleInvoice = printWholesaleInvoice;
window.searchCustomers = searchCustomers;
window.clearCustomerSearch = clearCustomerSearch;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize scrollable customer list
        setTimeout(makeCustomerListScrollable, 1000);
        
        // Hide clear buttons initially
        const orderClearBtn = document.getElementById('clearOrderSearchBtn');
        const customerClearBtn = document.getElementById('clearSearchBtn');
        
        if (orderClearBtn) orderClearBtn.style.display = 'none';
        if (customerClearBtn) customerClearBtn.style.display = 'none';
    });
} else {
    // Initialize scrollable customer list
    setTimeout(makeCustomerListScrollable, 1000);
    
    // Hide clear buttons initially
    const orderClearBtn = document.getElementById('clearOrderSearchBtn');
    const customerClearBtn = document.getElementById('clearSearchBtn');
    
    if (orderClearBtn) orderClearBtn.style.display = 'none';
    if (customerClearBtn) customerClearBtn.style.display = 'none';
}