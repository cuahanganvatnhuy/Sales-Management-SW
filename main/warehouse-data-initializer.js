// REMOVED: Warehouse Data Initializer - No longer creating sample data
// System now uses only real Firebase data

console.log('⚠️ Warehouse sample data creation disabled - using real Firebase data only');
const sampleProducts = {
    'prod001': {
        id: 'prod001',
        name: 'Bánh quy chocolate',
        sku: 'BQ001',
        category: 'Bánh kẹo',
        stock: 150,
        unitPrice: 25000,
        unit: 'gói',
        costPrice: 20000,
        minStock: 20,
        description: 'Bánh quy chocolate thơm ngon',
        supplier: 'Công ty ABC',
        createdAt: new Date().toISOString()
    },
    'prod002': {
        id: 'prod002',
        name: 'Nước ngọt Coca Cola',
        sku: 'NN001',
        category: 'Nước giải khát',
        stock: 200,
        unitPrice: 12000,
        unit: 'chai',
        costPrice: 10000,
        minStock: 30,
        description: 'Nước ngọt Coca Cola 330ml',
        supplier: 'Công ty Coca Cola',
        createdAt: new Date().toISOString()
    },
    'prod003': {
        id: 'prod003',
        name: 'Mì tôm Hảo Hảo',
        sku: 'MT001',
        category: 'Thực phẩm khô',
        stock: 300,
        unitPrice: 4000,
        unit: 'gói',
        costPrice: 3000,
        minStock: 50,
        description: 'Mì tôm Hảo Hảo 65g',
        supplier: 'Công ty Acecook',
        createdAt: new Date().toISOString()
    },
    'prod004': {
        id: 'prod004',
        name: 'Sữa tươi Vinamilk',
        sku: 'ST001',
        category: 'Sữa và bơ sữa',
        stock: 100,
        unitPrice: 15000,
        unit: 'hộp',
        costPrice: 12000,
        minStock: 15,
        description: 'Sữa tươi Vinamilk 180ml',
        supplier: 'Công ty Vinamilk',
        createdAt: new Date().toISOString()
    },
    'prod005': {
        id: 'prod005',
        name: 'Gạo nàng hương',
        sku: 'GN001',
        category: 'Gạo và ngũ cốc',
        stock: 500,
        unitPrice: 25000,
        unit: 'kg',
        costPrice: 20000,
        minStock: 100,
        description: 'Gạo nàng hương thơm 5kg',
        supplier: 'Công ty Vinafood',
        createdAt: new Date().toISOString()
    }
};

// Sample categories data
const sampleCategories = {
    'cat001': {
        id: 'cat001',
        name: 'Bánh kẹo',
        description: 'Các loại bánh kẹo, snack',
        status: 'active'
    },
    'cat002': {
        id: 'cat002',
        name: 'Nước giải khát',
        description: 'Nước ngọt, nước trái cây, trà',
        status: 'active'
    },
    'cat003': {
        id: 'cat003',
        name: 'Thực phẩm khô',
        description: 'Mì, bún, phở, các loại khô',
        status: 'active'
    },
    'cat004': {
        id: 'cat004',
        name: 'Sữa và bơ sữa',
        description: 'Sữa tươi, sữa chua, bơ, phô mai',
        status: 'active'
    },
    'cat005': {
        id: 'cat005',
        name: 'Gạo và ngũ cốc',
        description: 'Gạo, bột, các loại hạt',
        status: 'active'
    }
};

// Sample warehouse transactions
const sampleTransactions = {
    'trans001': {
        id: 'trans001',
        productId: 'prod001',
        productName: 'Bánh quy chocolate',
        productSku: 'BQ001',
        type: 'in',
        quantity: 100,
        unitPrice: 20000,
        totalValue: 2000000,
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        reason: 'Nhập hàng mới',
        orderType: 'purchase',
        storeId: 'store1',
        userId: 'user001',
        userName: 'Nguyễn Văn A',
        note: 'Nhập hàng từ nhà cung cấp'
    },
    'trans002': {
        id: 'trans002',
        productId: 'prod001',
        productName: 'Bánh quy chocolate',
        productSku: 'BQ001',
        type: 'out',
        quantity: 20,
        unitPrice: 25000,
        totalValue: 500000,
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
        reason: 'Bán lẻ',
        orderType: 'retail_order',
        storeId: 'store1',
        userId: 'user001',
        userName: 'Nguyễn Văn A',
        note: 'Bán cho khách hàng'
    },
    'trans003': {
        id: 'trans003',
        productId: 'prod002',
        productName: 'Nước ngọt Coca Cola',
        productSku: 'NN001',
        type: 'in',
        quantity: 150,
        unitPrice: 10000,
        totalValue: 1500000,
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        reason: 'Nhập hàng mới',
        orderType: 'purchase',
        storeId: 'store1',
        userId: 'user001',
        userName: 'Nguyễn Văn A',
        note: 'Nhập hàng từ nhà cung cấp'
    },
    'trans004': {
        id: 'trans004',
        productId: 'prod002',
        productName: 'Nước ngọt Coca Cola',
        productSku: 'NN001',
        type: 'out',
        quantity: 30,
        unitPrice: 12000,
        totalValue: 360000,
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        reason: 'Bán sỉ',
        orderType: 'wholesale_order',
        storeId: 'store1',
        userId: 'user001',
        userName: 'Nguyễn Văn A',
        note: 'Bán sỉ cho đại lý'
    },
    'trans005': {
        id: 'trans005',
        productId: 'prod003',
        productName: 'Mì tôm Hảo Hảo',
        productSku: 'MT001',
        type: 'in',
        quantity: 200,
        unitPrice: 3000,
        totalValue: 600000,
        timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, // 6 days ago
        reason: 'Nhập hàng mới',
        orderType: 'purchase',
        storeId: 'store1',
        userId: 'user001',
        userName: 'Nguyễn Văn A',
        note: 'Nhập hàng từ nhà cung cấp'
    },
    'trans006': {
        id: 'trans006',
        productId: 'prod003',
        productName: 'Mì tôm Hảo Hảo',
        productSku: 'MT001',
        type: 'out',
        quantity: 50,
        unitPrice: 4000,
        totalValue: 200000,
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
        reason: 'Bán lẻ',
        orderType: 'retail_order',
        storeId: 'store1',
        userId: 'user001',
        userName: 'Nguyễn Văn A',
        note: 'Bán cho khách hàng'
    }
};

// Initialize warehouse data
async function initializeWarehouseData() {
    try {
        console.log('=== Initializing Warehouse Data ===');
        
        if (!window.database) {
            console.error('Firebase database not available');
            return;
        }
        
        // Check if data already exists
        const productsSnapshot = await window.database.ref('products').once('value');
        const categoriesSnapshot = await window.database.ref('categories').once('value');
        const transactionsSnapshot = await window.database.ref('warehouseTransactions').once('value');
        
        const existingProducts = productsSnapshot.val() || {};
        const existingCategories = categoriesSnapshot.val() || {};
        const existingTransactions = transactionsSnapshot.val() || {};
        
        console.log('Existing data:', {
            products: Object.keys(existingProducts).length,
            categories: Object.keys(existingCategories).length,
            transactions: Object.keys(existingTransactions).length
        });
        
        // Create products if none exist
        if (Object.keys(existingProducts).length === 0) {
            console.log('Creating sample products...');
            await window.database.ref('products').set(sampleProducts);
            console.log('✅ Sample products created successfully');
        } else {
            console.log('Products already exist, skipping...');
        }
        
        // Create categories if none exist
        if (Object.keys(existingCategories).length === 0) {
            console.log('Creating sample categories...');
            await window.database.ref('categories').set(sampleCategories);
            console.log('✅ Sample categories created successfully');
        } else {
            console.log('Categories already exist, skipping...');
        }
        
        // Create transactions if none exist
        if (Object.keys(existingTransactions).length === 0) {
            console.log('Creating sample transactions...');
            await window.database.ref('warehouseTransactions').set(sampleTransactions);
            console.log('✅ Sample transactions created successfully');
        } else {
            console.log('Transactions already exist, skipping...');
        }
        
        console.log('=== Warehouse Data Initialization Complete ===');
        
        // Show success notification
        if (typeof showNotification === 'function') {
            showNotification('Dữ liệu kho hàng đã được khởi tạo thành công!', 'success');
        }
        
        // Reload warehouse data if function exists
        if (typeof loadWarehouseData === 'function') {
            loadWarehouseData();
        }
        
        // Regenerate usage report if function exists
        if (typeof generateUsageReport === 'function') {
            setTimeout(() => {
                generateUsageReport();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error initializing warehouse data:', error);
        if (typeof showNotification === 'function') {
            showNotification('Lỗi khởi tạo dữ liệu kho: ' + error.message, 'error');
        }
    }
}

// Auto-initialize when database is available
function checkAndInitializeWarehouseData() {
    if (typeof window.database !== 'undefined') {
        initializeWarehouseData();
    } else {
        console.log('Database not available, waiting...');
        setTimeout(checkAndInitializeWarehouseData, 1000);
    }
}

// Export functions
window.initializeWarehouseData = initializeWarehouseData;
window.checkAndInitializeWarehouseData = checkAndInitializeWarehouseData;

// Auto-start initialization
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(checkAndInitializeWarehouseData, 2000);
});

console.log('Warehouse Data Initializer loaded successfully');
