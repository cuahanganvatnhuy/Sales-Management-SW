// Warehouse Transaction Logger - Ghi nhận giao dịch kho khi tạo đơn hàng
// Tự động tạo warehouse transactions khi có đơn hàng để theo dõi sử dụng kho theo loại đơn hàng

/**
 * Ghi nhận giao dịch xuất kho khi tạo đơn hàng
 * @param {Object} orderData - Dữ liệu đơn hàng
 * @param {string} orderType - Loại đơn hàng: 'tmdt', 'wholesale', 'retail'
 * @param {string} storeId - ID cửa hàng
 */
async function logWarehouseTransactionForOrder(orderData, orderType, storeId) {
    if (!window.database || !orderData || !orderData.items) {
        console.error('Missing required data for warehouse transaction logging');
        return;
    }

    console.log(`=== Logging warehouse transactions for ${orderType} order: ${orderData.id} ===`);

    try {
        // Tạo giao dịch cho từng sản phẩm trong đơn hàng
        for (const item of orderData.items) {
            const transactionId = `${orderData.id}_${item.productId}_${Date.now()}`;
            
            // Xác định lý do xuất kho dựa trên loại đơn hàng
            let reason = '';
            let orderTypeDisplay = '';
            
            switch (orderType) {
                case 'tmdt':
                    reason = 'Xuất kho cho đơn hàng TMĐT';
                    orderTypeDisplay = 'TMĐT';
                    break;
                case 'wholesale':
                    reason = 'Xuất kho cho đơn hàng sỉ';
                    orderTypeDisplay = 'Sỉ';
                    break;
                case 'retail':
                    reason = 'Xuất kho cho đơn hàng lẻ';
                    orderTypeDisplay = 'Lẻ';
                    break;
                default:
                    reason = 'Xuất kho cho đơn hàng';
                    orderTypeDisplay = 'Khác';
            }

            // Tạo dữ liệu giao dịch kho
            const warehouseTransaction = {
                id: transactionId,
                type: 'out', // Xuất kho
                productId: item.productId,
                productName: item.productName || item.name,
                productSku: item.productSku || item.sku || '',
                quantity: item.quantity || item.actualQuantityForStock || 0,
                unitPrice: item.unitPrice || item.price || 0,
                totalValue: (item.quantity || item.actualQuantityForStock || 0) * (item.unitPrice || item.price || 0),
                reason: reason,
                orderType: orderType, // Thêm field để phân loại
                orderTypeDisplay: orderTypeDisplay,
                orderId: orderData.id,
                customerName: orderData.customerName || '',
                storeId: storeId,
                timestamp: new Date().toISOString(),
                performedBy: getStoreNameFromId(storeId) || 'Hệ thống',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            console.log(`Creating warehouse transaction:`, warehouseTransaction);

            // Lưu vào Firebase - cả global và store-specific
            const promises = [];
            
            // Lưu vào global warehouse transactions
            promises.push(
                window.database.ref(`warehouseTransactions/${transactionId}`).set(warehouseTransaction)
            );
            
            // Lưu vào store-specific warehouse transactions
            if (storeId) {
                promises.push(
                    window.database.ref(`stores/${storeId}/warehouseTransactions/${transactionId}`).set(warehouseTransaction)
                );
            }

            await Promise.all(promises);
            console.log(`✅ Warehouse transaction saved: ${transactionId}`);
        }

        console.log(`✅ All warehouse transactions logged for order: ${orderData.id}`);
        
    } catch (error) {
        console.error('Error logging warehouse transactions:', error);
        // Không throw error để không ảnh hưởng đến việc tạo đơn hàng
    }
}

/**
 * Lấy tên cửa hàng từ ID (sử dụng cache hoặc localStorage)
 */
function getStoreNameFromId(storeId) {
    try {
        // Thử lấy từ cache stores data
        if (window.storesDataCache && window.storesDataCache[storeId]) {
            return window.storesDataCache[storeId];
        }
        
        // Thử lấy từ localStorage
        const selectedStoreData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
        if (selectedStoreData.id === storeId && selectedStoreData.name) {
            return selectedStoreData.name;
        }
        
        // Fallback
        return `Cửa hàng ${storeId}`;
    } catch (error) {
        console.error('Error getting store name:', error);
        return `Cửa hàng ${storeId}`;
    }
}

/**
 * Tích hợp với hệ thống tạo đơn hàng hiện tại
 * Gọi hàm này sau khi tạo đơn hàng thành công
 */
window.logWarehouseTransactionForOrder = logWarehouseTransactionForOrder;

console.log('✅ Warehouse Transaction Logger loaded successfully');