// Customer Selection Modal Functions
let allCustomers = [];
let filteredCustomers = [];
let selectedCustomer = null;

// Open customer selection modal
function openCustomerModal() {
    const modal = document.getElementById('customerModal');
    const loading = document.getElementById('customerModalLoading');
    const customerList = document.getElementById('customerList');
    const noResults = document.getElementById('noCustomersFound');
    const searchInput = document.getElementById('customerSearch');
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Show loading state
    loading.classList.remove('hidden');
    customerList.style.display = 'none';
    noResults.classList.add('hidden');
    
    // Clear search
    searchInput.value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    
    // Load customers from Firebase
    loadCustomersFromFirebase();
}

// Close customer selection modal
function closeCustomerModal() {
    const modal = document.getElementById('customerModal');
    modal.classList.add('hidden');
    selectedCustomer = null;
}

// Load customers from Firebase
function loadCustomersFromFirebase() {
    const storeId = localStorage.getItem('selectedStoreId');
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng trước', 'error');
        closeCustomerModal();
        return;
    }
    
    const customersRef = firebase.database().ref(`stores/${storeId}/customers`);
    
    customersRef.once('value')
        .then(snapshot => {
            allCustomers = [];
            
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const customer = {
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    };
                    allCustomers.push(customer);
                });
            }
            
            // Sort customers by name
            allCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
            filteredCustomers = [...allCustomers];
            displayCustomers();
        })
        .catch(error => {
            console.error('Error loading customers:', error);
            showNotification('Lỗi khi tải danh sách khách hàng', 'error');
            closeCustomerModal();
        });
}

// Display customers in the modal
function displayCustomers() {
    const loading = document.getElementById('customerModalLoading');
    const customerList = document.getElementById('customerList');
    const noResults = document.getElementById('noCustomersFound');
    
    // Hide loading
    loading.classList.add('hidden');
    
    if (filteredCustomers.length === 0) {
        customerList.style.display = 'none';
        noResults.classList.remove('hidden');
        return;
    }
    
    // Show customer list
    customerList.style.display = 'block';
    noResults.classList.add('hidden');
    
    // Generate customer items HTML
    const customersHTML = filteredCustomers.map(customer => `
        <div class="customer-item" onclick="selectCustomerFromModal('${customer.id}')">
            <div class="customer-info">
                <div class="customer-name">${customer.name || 'Không có tên'}</div>
                <div class="customer-details">
                    ${customer.phone ? `<div class="customer-phone"><i class="fas fa-phone"></i> ${customer.phone}</div>` : ''}
                    ${customer.address ? `<div class="customer-address"><i class="fas fa-map-marker-alt"></i> ${customer.address}</div>` : ''}
                </div>
            </div>
            <button type="button" class="select-btn" onclick="event.stopPropagation(); selectCustomerFromModal('${customer.id}')">
                <i class="fas fa-check"></i> Chọn
            </button>
        </div>
    `).join('');
    
    customerList.innerHTML = customersHTML;
}

// Search customers
function searchCustomers() {
    const searchInput = document.getElementById('customerSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Show/hide clear button
    clearBtn.style.display = searchTerm ? 'block' : 'none';
    
    if (!searchTerm) {
        filteredCustomers = [...allCustomers];
    } else {
        filteredCustomers = allCustomers.filter(customer => {
            const name = (customer.name || '').toLowerCase();
            const phone = (customer.phone || '').toLowerCase();
            const address = (customer.address || '').toLowerCase();
            
            return name.includes(searchTerm) || 
                   phone.includes(searchTerm) || 
                   address.includes(searchTerm);
        });
    }
    
    displayCustomers();
}

// Clear customer search
function clearCustomerSearch() {
    const searchInput = document.getElementById('customerSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    filteredCustomers = [...allCustomers];
    displayCustomers();
    searchInput.focus();
}

// Select customer from modal
function selectCustomerFromModal(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Update form fields
    document.getElementById('selectedCustomerDisplay').value = customer.name || 'Không có tên';
    document.getElementById('selectedCustomerId').value = customerId;
    document.getElementById('wholesaleCustomerName').value = customer.name || '';
    document.getElementById('wholesaleCustomerPhone').value = customer.phone || '';
    document.getElementById('wholesaleCustomerAddress').value = customer.address || '';
    
    // Disable save customer checkbox since this is an existing customer
    const saveCustomerCheckbox = document.getElementById('saveCustomer');
    if (saveCustomerCheckbox) {
        saveCustomerCheckbox.checked = false;
        saveCustomerCheckbox.disabled = true;
    }
    
    selectedCustomer = customer;
    closeCustomerModal();
    
    showNotification(`Đã chọn khách hàng: ${customer.name}`, 'success');
}

// Create new customer (redirect to form)
function createNewCustomer() {
    // Clear selected customer
    document.getElementById('selectedCustomerDisplay').value = '';
    document.getElementById('selectedCustomerId').value = '';
    document.getElementById('wholesaleCustomerName').value = '';
    document.getElementById('wholesaleCustomerPhone').value = '';
    document.getElementById('wholesaleCustomerAddress').value = '';
    
    // Enable save customer checkbox
    const saveCustomerCheckbox = document.getElementById('saveCustomer');
    if (saveCustomerCheckbox) {
        saveCustomerCheckbox.checked = true;
        saveCustomerCheckbox.disabled = false;
    }
    
    selectedCustomer = null;
    closeCustomerModal();
    
    // Focus on customer name field
    document.getElementById('wholesaleCustomerName').focus();
    
    showNotification('Vui lòng nhập thông tin khách hàng mới', 'info');
}

// Export customer modal functions to global scope
window.openCustomerModal = openCustomerModal;
window.closeCustomerModal = closeCustomerModal;
window.searchCustomers = searchCustomers;
window.clearCustomerSearch = clearCustomerSearch;
window.selectCustomerFromModal = selectCustomerFromModal;
window.createNewCustomer = createNewCustomer;
