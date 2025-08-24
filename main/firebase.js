// Firebase Configuration và khởi tạo
const firebaseConfig = {
    apiKey: "AIzaSyDVMShVqAkxJsaFbhApFTcmvktynFzwcDA",
    authDomain: "quan-ly-don-hang-a8b07.firebaseapp.com",
    databaseURL: "https://quan-ly-don-hang-a8b07-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "quan-ly-don-hang-a8b07",
    storageBucket: "quan-ly-don-hang-a8b07.firebasestorage.app",
    messagingSenderId: "677915196614",
    appId: "1:677915196614:web:32c0c33da92ac6a6572bc7"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Khởi tạo Realtime Database
const database = firebase.database();

// Expose database to global scope
window.database = database;

// ===== FUNCTIONS QUẢN LÝ ĐƠN HÀNG =====

// Lấy tất cả đơn hàng
function getAllOrders() {
    return database.ref('orders').once('value').then(snapshot => {
        return snapshot.val() || {};
    });
}

// Thêm đơn hàng mới
function addOrder(orderData) {
    const newOrderRef = database.ref('orders').push();
    const orderId = newOrderRef.key;
    
    const order = {
        id: orderId,
        ...orderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    return newOrderRef.set(order);
}

// Cập nhật đơn hàng
function updateOrder(orderId, updateData) {
    const updates = {
        ...updateData,
        updatedAt: new Date().toISOString()
    };
    return database.ref(`orders/${orderId}`).update(updates);
}

// Xóa đơn hàng
function deleteOrder(orderId) {
    return database.ref(`orders/${orderId}`).remove();
}

// ===== FUNCTIONS QUẢN LÝ SẢN PHẨM =====

// Lấy tất cả sản phẩm
function getAllProducts() {
    return database.ref('products').once('value').then(snapshot => {
        return snapshot.val() || {};
    });
}

// Thêm sản phẩm mới
function addProduct(productData) {
    const newProductRef = database.ref('products').push();
    const productId = newProductRef.key;
    
    const product = {
        id: productId,
        ...productData,
        createdAt: new Date().toISOString()
    };
    
    return newProductRef.set(product);
}

// ===== FUNCTIONS QUẢN LÝ CỬA HÀNG =====

// Lấy tất cả cửa hàng
function getAllStores() {
    return database.ref('stores').once('value').then(snapshot => {
        return snapshot.val() || {};
    });
}

// Thêm cửa hàng mới
function addStore(storeData) {
    const newStoreRef = database.ref('stores').push();
    const storeId = newStoreRef.key;
    
    const store = {
        id: storeId,
        ...storeData,
        createdAt: new Date().toISOString()
    };
    
    return newStoreRef.set(store);
}

// ===== FUNCTIONS THỐNG KÊ =====

// Lấy thống kê theo ngày
function getDailyStats(date) {
    return database.ref(`statistics/daily/${date}`).once('value').then(snapshot => {
        return snapshot.val() || {
            date: date,
            totalOrders: 0,
            totalRevenue: 0,
            completedOrders: 0,
            pendingOrders: 0
        };
    });
}

// Cập nhật thống kê
function updateStats(date, statsData) {
    return database.ref(`statistics/daily/${date}`).set(statsData);
}

// ===== UTILITY FUNCTIONS =====

// Format tiền tệ VND
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Format ngày
function formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN');
}

// Tạo ID duy nhất
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Hiển thị thông báo
function showNotification(message, type = 'success') {
    // Tạo toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = document.querySelector('.notification-message');
    const iconElement = document.querySelector('.notification-icon');
    
    if (!notification || !messageElement || !iconElement) {
        console.log(`Notification: ${message} (${type})`);
        return;
    }
    
    // Set message
    messageElement.textContent = message;
    
    // Set icon based on type
    iconElement.className = 'notification-icon';
    switch (type) {
        case 'success':
            iconElement.classList.add('fas', 'fa-check-circle');
            notification.className = 'notification success';
            break;
        case 'error':
            iconElement.classList.add('fas', 'fa-exclamation-circle');
            notification.className = 'notification error';
            break;
        case 'warning':
            iconElement.classList.add('fas', 'fa-exclamation-triangle');
            notification.className = 'notification warning';
            break;
        default:
            iconElement.classList.add('fas', 'fa-info-circle');
            notification.className = 'notification info';
    }
    
    // Show notification
    notification.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// ===== DATABASE INITIALIZATION =====

// Check database connection
function initializeDatabase() {
    return database.ref().once('value')
        .then(snapshot => {
            const data = snapshot.val();
            if (!data || Object.keys(data).length === 0) {
                console.log('📄 Database is empty - using real data only');
                return true;
            } else {
                console.log('✅ Database has existing data!');
                return true;
            }
        })
        .catch(error => {
            console.error('❌ Database connection error:', error);
            return false;
        });
}

console.log('Firebase initialized successfully!');
console.log('Database URL:', firebaseConfig.databaseURL);

// Auto-check database connection when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        initializeDatabase();
    }, 1000); // Wait 1 second for Firebase to initialize
});