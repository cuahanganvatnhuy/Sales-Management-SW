// Delete individual order form
function deleteOrderForm(orderIndex) {
    const orderForm = document.getElementById(`orderForm_${orderIndex}`);
    if (!orderForm) return;
    
    const orderForms = document.querySelectorAll('.order-form-item');
    
    // Không cho xóa nếu chỉ còn 1 đơn
    if (orderForms.length <= 1) {
        showNotification('Phải có ít nhất 1 đơn hàng!', 'warning');
        return;
    }
    
    // Xác nhận xóa
    if (!confirm(`Bạn có chắc muốn xóa Đơn Hàng ${orderIndex}?`)) {
        return;
    }
    
    // Animation xóa
    orderForm.style.transition = 'all 0.3s ease';
    orderForm.style.transform = 'translateX(-100%)';
    orderForm.style.opacity = '0';
    
    setTimeout(() => {
        orderForm.remove();
        renumberOrderForms();
        updateTotalOrdersCount();
        updateOrderCountInput();
        showNotification('Đã xóa đơn hàng!', 'success');
    }, 300);
}

// Renumber order forms after deletion
function renumberOrderForms() {
    const orderForms = document.querySelectorAll('.order-form-item');
    
    orderForms.forEach((form, index) => {
        const newIndex = index + 1;
        
        // Update form ID
        form.id = `orderForm_${newIndex}`;
        
        // Update title
        const titleElement = form.querySelector('.order-form-title');
        if (titleElement) {
            titleElement.innerHTML = `
                <i class="fas fa-shopping-bag"></i> 
                Đơn Hàng ${newIndex}
            `;
        }
        
        // Update delete button onclick
        const deleteBtn = form.querySelector('.delete-order-btn');
        if (deleteBtn) {
            deleteBtn.setAttribute('onclick', `deleteOrderForm(${newIndex})`);
        }
        
        // Update all input IDs and names
        const inputs = form.querySelectorAll('input, select, div[id]');
        inputs.forEach(input => {
            if (input.id && input.id.includes('_')) {
                const fieldName = input.id.split('_')[0];
                input.id = `${fieldName}_${newIndex}`;
            }
            if (input.name && input.name.includes('_')) {
                const fieldName = input.name.split('_')[0];
                input.name = `${fieldName}_${newIndex}`;
            }
            if (input.getAttribute('oninput')) {
                input.setAttribute('oninput', `calculateOrderTotal(${newIndex})`);
            }
        });
        
        // Update labels
        const labels = form.querySelectorAll('label[for]');
        labels.forEach(label => {
            if (label.getAttribute('for').includes('_')) {
                const fieldName = label.getAttribute('for').split('_')[0];
                label.setAttribute('for', `${fieldName}_${newIndex}`);
            }
        });
        
        // Update product select container
        const productContainer = form.querySelector('.product-select-container');
        if (productContainer) {
            productContainer.id = `productSelect_${newIndex}`;
            // Reinitialize product select for this form
            if (typeof initializeProductSelect === 'function') {
                initializeProductSelect(newIndex);
            }
        }
    });
}

// Update order count input to match actual form count
function updateOrderCountInput() {
    const orderForms = document.querySelectorAll('.order-form-item');
    const orderCountInput = document.getElementById('orderCount');
    
    if (orderCountInput) {
        orderCountInput.value = orderForms.length;
    }
}
