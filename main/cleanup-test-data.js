// Script to clean up test/fake data from Firebase database
console.log('🧹 Starting cleanup of test data from Firebase...');

// Function to clean up test warehouse transactions
async function cleanupTestWarehouseData() {
    try {
        console.log('🔍 Checking warehouse transactions for test data...');
        
        // Get all warehouse transactions
        const transactionsRef = database.ref('warehouseTransactions');
        const snapshot = await transactionsRef.once('value');
        const transactions = snapshot.val();
        
        if (!transactions) {
            console.log('✅ No warehouse transactions found');
            return;
        }
        
        let deletedCount = 0;
        const currentDate = new Date();
        const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Check each transaction
        for (const [transactionId, transaction] of Object.entries(transactions)) {
            let shouldDelete = false;
            
            // Check for future dates (test data indicator)
            if (transaction.timestamp) {
                const transactionDate = new Date(transaction.timestamp);
                if (transactionDate > currentDate) {
                    console.log(`🗑️ Found future date transaction: ${transactionId} - ${transactionDate.toISOString()}`);
                    shouldDelete = true;
                }
            }
            
            // Check for test product names
            const testProductNames = [
                'Mì tôm Hảo Hảo',
                'Nước ngọt Coca Cola', 
                'Bánh quy chocolate',
                'Sản phẩm A',
                'Sản phẩm B',
                'Sản phẩm C'
            ];
            
            if (transaction.productName && testProductNames.includes(transaction.productName)) {
                console.log(`🗑️ Found test product: ${transactionId} - ${transaction.productName}`);
                shouldDelete = true;
            }
            
            // Check for test SKUs
            const testSKUs = ['MT001', 'NN001', 'BQ001', 'SKU001', 'SKU002', 'SKU003'];
            if (transaction.productSku && testSKUs.includes(transaction.productSku)) {
                console.log(`🗑️ Found test SKU: ${transactionId} - ${transaction.productSku}`);
                shouldDelete = true;
            }
            
            // Delete if identified as test data
            if (shouldDelete) {
                await transactionsRef.child(transactionId).remove();
                deletedCount++;
                console.log(`❌ Deleted test transaction: ${transactionId}`);
            }
        }
        
        console.log(`✅ Cleanup complete! Deleted ${deletedCount} test transactions`);
        
    } catch (error) {
        console.error('❌ Error cleaning up warehouse data:', error);
    }
}

// Function to clean up test warehouse products
async function cleanupTestWarehouseProducts() {
    try {
        console.log('🔍 Checking warehouse products for test data...');
        
        const warehouseRef = database.ref('warehouse');
        const snapshot = await warehouseRef.once('value');
        const products = snapshot.val();
        
        if (!products) {
            console.log('✅ No warehouse products found');
            return;
        }
        
        let deletedCount = 0;
        const testProductNames = [
            'Mì tôm Hảo Hảo',
            'Nước ngọt Coca Cola',
            'Bánh quy chocolate',
            'Sản phẩm A',
            'Sản phẩm B', 
            'Sản phẩm C',
            'phô mai',
            'khô gà',
            'phô mai mozzarella loại ngon'
        ];
        
        for (const [productId, product] of Object.entries(products)) {
            if (product.name && testProductNames.includes(product.name)) {
                console.log(`🗑️ Found test warehouse product: ${productId} - ${product.name}`);
                await warehouseRef.child(productId).remove();
                deletedCount++;
                console.log(`❌ Deleted test warehouse product: ${productId}`);
            }
        }
        
        console.log(`✅ Warehouse products cleanup complete! Deleted ${deletedCount} test products`);
        
    } catch (error) {
        console.error('❌ Error cleaning up warehouse products:', error);
    }
}

// Function to clean up test orders
async function cleanupTestOrders() {
    try {
        console.log('🔍 Checking orders for test data...');
        
        // Check global orders
        const ordersRef = database.ref('orders');
        const snapshot = await ordersRef.once('value');
        const orders = snapshot.val();
        
        if (orders) {
            let deletedCount = 0;
            const currentDate = new Date();
            
            for (const [orderId, order] of Object.entries(orders)) {
                let shouldDelete = false;
                
                // Check for future dates
                if (order.createdAt || order.date) {
                    const orderDate = new Date(order.createdAt || order.date);
                    if (orderDate > currentDate) {
                        shouldDelete = true;
                    }
                }
                
                // Check for test customer names
                if (order.customerName && ['Khách hàng X', 'Khách hàng Y', 'Khách hàng Z'].includes(order.customerName)) {
                    shouldDelete = true;
                }
                
                if (shouldDelete) {
                    await ordersRef.child(orderId).remove();
                    deletedCount++;
                    console.log(`❌ Deleted test order: ${orderId}`);
                }
            }
            
            console.log(`✅ Orders cleanup complete! Deleted ${deletedCount} test orders`);
        }
        
    } catch (error) {
        console.error('❌ Error cleaning up orders:', error);
    }
}

// Main cleanup function
async function runCleanup() {
    if (typeof database === 'undefined') {
        console.error('❌ Firebase database not available');
        return;
    }
    
    console.log('🚀 Starting comprehensive test data cleanup...');
    
    await cleanupTestWarehouseData();
    await cleanupTestWarehouseProducts();
    await cleanupTestOrders();
    
    console.log('🎉 All cleanup operations completed!');
    console.log('🔄 Please refresh the warehouse management page to see updated data');
}

// Auto-run cleanup when this script is loaded
if (typeof database !== 'undefined') {
    runCleanup();
} else {
    console.log('⏳ Waiting for Firebase to initialize...');
    setTimeout(() => {
        if (typeof database !== 'undefined') {
            runCleanup();
        } else {
            console.error('❌ Firebase still not available after timeout');
        }
    }, 2000);
}

// Make function globally available for manual execution
window.runTestDataCleanup = runCleanup;