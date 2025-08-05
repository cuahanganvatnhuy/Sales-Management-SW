// Wholesale Orders Search and Filter Functions
// Chức năng tìm kiếm và lọc đơn hàng bán sỉ

// Search wholesale orders
function searchWholesaleOrders() {
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearOrderSearchBtn');
    
    // Show/hide clear button
    if (searchTerm) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    // Filter and display orders
    displayWholesaleOrders(searchTerm);
}

// Clear order search
function clearOrderSearch() {
    const searchInput = document.getElementById('orderSearch');
    const clearBtn = document.getElementById('clearOrderSearchBtn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Display all orders
    displayWholesaleOrders('');
}

// Search customers in modal
function searchCustomers() {
    const searchTerm = document.getElementById('customerSearch').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    const customerList = document.getElementById('customerList');
    
    // Show/hide clear button
    if (searchTerm) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    // Filter customers
    const customers = customerList.querySelectorAll('.customer-item');
    customers.forEach(customer => {
        const customerName = customer.querySelector('.customer-name').textContent.toLowerCase();
        const customerPhone = customer.querySelector('.customer-phone').textContent.toLowerCase();
        const customerAddress = customer.querySelector('.customer-address').textContent.toLowerCase();
        
        if (customerName.includes(searchTerm) || 
            customerPhone.includes(searchTerm) || 
            customerAddress.includes(searchTerm)) {
            customer.style.display = 'block';
        } else {
            customer.style.display = 'none';
        }
    });
}

// Clear customer search
function clearCustomerSearch() {
    const searchInput = document.getElementById('customerSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    const customerList = document.getElementById('customerList');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Show all customers
    const customers = customerList.querySelectorAll('.customer-item');
    customers.forEach(customer => {
        customer.style.display = 'block';
    });
}

// Filter orders by date range
function filterOrdersByDate() {
    const today = document.getElementById('todayFilter');
    const thisWeek = document.getElementById('weekFilter');
    const thisMonth = document.getElementById('monthFilter');
    const clearFilter = document.getElementById('clearFilter');
    
    let filterType = '';
    if (today.classList.contains('active')) filterType = 'today';
    else if (thisWeek.classList.contains('active')) filterType = 'week';
    else if (thisMonth.classList.contains('active')) filterType = 'month';
    
    displayWholesaleOrders('', filterType);
}

// Set date filter
function setDateFilter(filterType) {
    // Remove active class from all filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected filter
    if (filterType !== 'clear') {
        document.getElementById(filterType + 'Filter').classList.add('active');
    }
    
    // Apply filter
    filterOrdersByDate();
}

// Initialize search functionality
function initSearchFunctionality() {
    // Hide clear buttons initially
    const orderClearBtn = document.getElementById('clearOrderSearchBtn');
    const customerClearBtn = document.getElementById('clearSearchBtn');
    
    if (orderClearBtn) orderClearBtn.style.display = 'none';
    if (customerClearBtn) customerClearBtn.style.display = 'none';
    
    // Add event listeners for Enter key
    const orderSearchInput = document.getElementById('orderSearch');
    if (orderSearchInput) {
        orderSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchWholesaleOrders();
            }
        });
    }
    
    const customerSearchInput = document.getElementById('customerSearch');
    if (customerSearchInput) {
        customerSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCustomers();
            }
        });
    }
}

// Toggle all order selection
function toggleAllOrderSelection() {
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    
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
    
    // Update "select all" checkbox state
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

// Clear all selections
function clearOrderFilters() {
    // Clear search
    const searchInput = document.getElementById('orderSearch');
    const clearBtn = document.getElementById('clearOrderSearchBtn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    // Clear date filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Clear selections
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
    
    // Display all orders
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
        // Show loading
        if (typeof showLoading === 'function') showLoading();
        
        // Get store ID
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (!selectedStoreId) {
            if (typeof hideLoading === 'function') hideLoading();
            alert('Vui lòng chọn cửa hàng trước khi xóa đơn hàng.');
            return;
        }
        
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            if (typeof hideLoading === 'function') hideLoading();
            alert('Không thể kết nối với cơ sở dữ liệu.');
            return;
        }
        
        // Delete orders one by one
        let deletedCount = 0;
        let failedCount = 0;
        
        const deletePromises = orderIds.map(orderId => {
            return firebase.database().ref(`stores/${selectedStoreId}/wholesale-orders/${orderId}`)
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
            // Hide loading
            if (typeof hideLoading === 'function') hideLoading();
            
            // Show result message
            let message = '';
            if (deletedCount > 0) {
                message += `Đã xóa thành công ${deletedCount} đơn hàng.`;
            }
            if (failedCount > 0) {
                message += ` ${failedCount} đơn hàng không thể xóa.`;
            }
            
            if (typeof showNotification === 'function') {
                showNotification(message, deletedCount > 0 ? 'success' : 'error');
            } else {
                alert(message);
            }
            
            // Clear selections and reload orders
            clearOrderFilters();
            if (typeof loadWholesaleOrders === 'function') {
                loadWholesaleOrders();
            }
        }).catch((error) => {
            console.error('Error in bulk delete operation:', error);
            if (typeof hideLoading === 'function') hideLoading();
            if (typeof showNotification === 'function') {
                showNotification('Có lỗi xảy ra khi xóa đơn hàng: ' + error.message, 'error');
            } else {
                alert('Có lỗi xảy ra khi xóa đơn hàng: ' + error.message);
            }
        });
    }
}

// Export functions to global scope
window.searchWholesaleOrders = searchWholesaleOrders;
window.clearOrderSearch = clearOrderSearch;
window.searchCustomers = searchCustomers;
window.clearCustomerSearch = clearCustomerSearch;
window.filterOrdersByDate = filterOrdersByDate;
window.setDateFilter = setDateFilter;
window.initSearchFunctionality = initSearchFunctionality;
window.toggleAllOrderSelection = toggleAllOrderSelection;
window.toggleOrderSelection = toggleOrderSelection;
window.updateBulkDeleteButton = updateBulkDeleteButton;
window.clearOrderFilters = clearOrderFilters;
window.bulkDeleteOrders = bulkDeleteOrders;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchFunctionality);
} else {
    initSearchFunctionality();
}