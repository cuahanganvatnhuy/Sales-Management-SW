// Order Type Selection Functions

// Global variables to track current order type and creation method
let currentOrderType = 'ecommerce'; // Default to ecommerce
let currentCreationMethod = 'manual'; // Default to manual

// Initialize order type selection functionality
function initializeOrderTypeSelection() {
    console.log('Initializing order type selection...');
    
    // Bind event listeners to order type buttons
    const ecommerceBtn = document.getElementById('ecommerceTypeBtn');
    const retailBtn = document.getElementById('retailTypeBtn');
    const wholesaleBtn = document.getElementById('wholesaleTypeBtn');
    
    if (ecommerceBtn) {
        ecommerceBtn.addEventListener('click', () => selectOrderType('ecommerce'));
        console.log('Ecommerce button event listener added');
    }
    
    if (retailBtn) {
        retailBtn.addEventListener('click', () => selectOrderType('retail'));
        console.log('Retail button event listener added');
    }
    
    if (wholesaleBtn) {
        wholesaleBtn.addEventListener('click', () => selectOrderType('wholesale'));
        console.log('Wholesale button event listener added');
    }
    
    // Bind event listeners to creation method buttons
    const manualBtn = document.getElementById('manualMethodBtn');
    const pdfBtn = document.getElementById('pdfMethodBtn');
    
    if (manualBtn) {
        manualBtn.addEventListener('click', () => selectCreationMethod('manual'));
        console.log('Manual method button event listener added');
    }
    
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => selectCreationMethod('pdf'));
        console.log('PDF method button event listener added');
    }
    
    // Update UI based on current selections
    updateOrderTypeUI();
    updateCreationMethodUI();
    
    console.log('Order type selection initialized with type:', currentOrderType, 'and method:', currentCreationMethod);
}

// Select order type
function selectOrderType(type) {
    // Update current order type
    currentOrderType = type;
    
    // Update button states
    document.querySelectorAll('.btn-order-type').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`${type}TypeBtn`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Show/hide relevant sections based on order type
    updateOrderTypeUI();
    
    // Reset order forms when changing order type
    clearOrderForms();
    window.generateOrderForms();
    
    console.log('Order type selected:', type);
    showNotification(`Đã chọn loại đơn hàng: ${getOrderTypeLabel(type)}`, 'success');
}

// Get order type label
function getOrderTypeLabel(type) {
    switch(type) {
        case 'ecommerce':
            return 'Đơn Hàng Sàn TMĐT';
        case 'retail':
            return 'Bán Lẻ';
        case 'wholesale':
            return 'Bán Sỉ';
        default:
            return 'Đơn Hàng Sàn TMĐT';
    }
}

// Update UI based on order type
function updateOrderTypeUI() {
    // Show/hide ecommerce-specific sections
    const ecommerceMethodSelection = document.getElementById('ecommerceMethodSelection');
    const manualOrderGroup = document.getElementById('manualOrderGroup');
    const pdfUploadGroup = document.getElementById('pdfUploadGroup');
    const orderFormsContainer = document.getElementById('orderFormsContainer');
    
    // Hide all order type forms by default
    const retailOrderForm = document.getElementById('retailOrderForm');
    const wholesaleOrderForm = document.getElementById('wholesaleOrderForm');
    
    if (retailOrderForm) retailOrderForm.style.display = 'none';
    if (wholesaleOrderForm) wholesaleOrderForm.style.display = 'none';
    
    if (currentOrderType === 'ecommerce') {
        // Show ecommerce-specific sections
        if (ecommerceMethodSelection) {
            ecommerceMethodSelection.style.display = 'block';
        }
        
        // Show method selection based on current method
        if (currentCreationMethod === 'manual') {
            if (manualOrderGroup) manualOrderGroup.style.display = 'block';
            if (pdfUploadGroup) pdfUploadGroup.style.display = 'none';
        } else {
            if (manualOrderGroup) manualOrderGroup.style.display = 'none';
            if (pdfUploadGroup) pdfUploadGroup.style.display = 'block';
        }
        
        // Show order forms container
        if (orderFormsContainer) {
            orderFormsContainer.style.display = 'block';
        }
    } else if (currentOrderType === 'retail') {
        // Hide ecommerce-specific sections for retail
        if (ecommerceMethodSelection) {
            ecommerceMethodSelection.style.display = 'none';
        }
        if (manualOrderGroup) manualOrderGroup.style.display = 'none';
        if (pdfUploadGroup) pdfUploadGroup.style.display = 'none';
        
        // Show retail order form
        if (retailOrderForm) retailOrderForm.style.display = 'block';
        
        // Show order forms container
        if (orderFormsContainer) {
            orderFormsContainer.style.display = 'block';
        }
    } else if (currentOrderType === 'wholesale') {
        // Hide ecommerce-specific sections for wholesale
        if (ecommerceMethodSelection) {
            ecommerceMethodSelection.style.display = 'none';
        }
        if (manualOrderGroup) manualOrderGroup.style.display = 'none';
        if (pdfUploadGroup) pdfUploadGroup.style.display = 'none';
        
        // Show wholesale order form
        if (wholesaleOrderForm) wholesaleOrderForm.style.display = 'block';
        
        // Show order forms container
        if (orderFormsContainer) {
            orderFormsContainer.style.display = 'block';
        }
    }
    
    console.log('UI updated for order type:', currentOrderType);
}
