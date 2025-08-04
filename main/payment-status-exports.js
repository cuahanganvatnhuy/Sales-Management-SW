// Payment status functions for wholesale orders

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
        if (typeof displayWholesaleOrders === 'function') {
            displayWholesaleOrders();
        }
        
        const statusText = getPaymentStatusText(newStatus);
        showNotification(`Đã cập nhật trạng thái thanh toán: ${statusText}`, 'success');
        
    } catch (error) {
        console.error('Error updating payment status:', error);
        showNotification('Lỗi cập nhật trạng thái thanh toán!', 'error');
    }
}

// Export payment status functions to global scope
window.updatePaymentStatus = updatePaymentStatus;
window.getPaymentStatusText = getPaymentStatusText;

console.log('Payment status functions exported to global scope');
