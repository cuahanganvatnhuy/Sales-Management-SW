// Wholesale Profit Management JavaScript
let database;
let wholesaleOrders = [];
let filteredWholesaleOrders = [];
let wholesaleStores = [];
let wholesaleCustomers = [];
let currentWholesalePage = 1;
const ordersPerPage = 10;

// Charts
let wholesaleProfitDistributionChart;
let wholesaleProfitTrendChart;

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf1n1TrAzwEMiAI",
    authDomain: "quan-ly-don-hang-a8b07.firebaseapp.com",
    databaseURL: "https://quan-ly-don-hang-a8b07-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "quan-ly-don-hang-a8b07",
    storageBucket: "quan-ly-don-hang-a8b07.appspot.com",
    messagingSenderId: "919181601842",
    appId: "1:919181601842:web:25f5b1c6d4c7fb8f7c85c3"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
database = firebase.database();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing wholesale profit management...');
    initializeWholesaleProfitManagement();
    setDefaultDateRange();
});

// Initialize wholesale profit management
function initializeWholesaleProfitManagement() {
    loadWholesaleOrders();
    loadWholesaleStores();
    loadWholesaleCustomers();
}

// Set default date range (last 30 days)
function setDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('wholesaleStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('wholesaleEndDate').value = endDate.toISOString().split('T')[0];
}

// Load wholesale orders from Firebase
async function loadWholesaleOrders() {
    try {
        console.log('Loading wholesale orders from Firebase...');
        
        if (!database) {
            console.error('Firebase database not initialized');
            return;
        }

        const ordersRef = database.ref('orders');
        const snapshot = await ordersRef.once('value');
        const allOrders = snapshot.val() || {};

        console.log('Total orders in database:', Object.keys(allOrders).length);
        
        // Filter wholesale orders
        wholesaleOrders = Object.keys(allOrders)
            .map(key => ({ id: key, ...allOrders[key] }))
            .filter(order => {
                const isWholesale = order.source === 'wholesale_sales' || 
                                  order.orderType === 'wholesale' ||
                                  order.customerName ||
                                  (order.orderId && order.orderId.includes('WHOLESALE'));
                
                if (isWholesale) {
                    console.log('Found wholesale order:', order.orderId || order.id, order);
                }
                return isWholesale;
            });

        console.log(`Loaded ${wholesaleOrders.length} wholesale orders from Firebase`);
        
        filteredWholesaleOrders = [...wholesaleOrders];
        updateWholesaleStatistics();
        updateWholesaleOrdersTable();
        updateWholesaleTopProducts();
        updateWholesaleCharts();
        
    } catch (error) {
        console.error('Error loading wholesale orders:', error);
        showWholesaleErrorMessage('Lỗi tải dữ liệu đơn hàng bán sỉ');
    }
}


// Load wholesale stores
async function loadWholesaleStores() {
    try {
        const storesRef = database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};
        
        wholesaleStores = Object.keys(stores).map(key => ({
            id: key,
            ...stores[key]
        }));
        
        populateWholesaleStoreFilter();
    } catch (error) {
        console.error('Error loading wholesale stores:', error);
    }
}

// Load wholesale customers
async function loadWholesaleCustomers() {
    try {
        // Extract unique customers from wholesale orders
        const uniqueCustomers = [...new Set(wholesaleOrders
            .filter(order => order.customerName)
            .map(order => order.customerName))];
        
        wholesaleCustomers = uniqueCustomers.map(name => ({ name }));
        populateWholesaleCustomerFilter();
    } catch (error) {
        console.error('Error loading wholesale customers:', error);
    }
}

// Populate store filter dropdown
function populateWholesaleStoreFilter() {
    const storeFilter = document.getElementById('wholesaleStoreFilter');
    storeFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
    
    wholesaleStores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name || store.storeName || `Cửa hàng ${store.id}`;
        storeFilter.appendChild(option);
    });
}

// Populate customer filter dropdown
function populateWholesaleCustomerFilter() {
    const customerFilter = document.getElementById('wholesaleCustomerFilter');
    customerFilter.innerHTML = '<option value="">Tất cả khách hàng</option>';
    
    wholesaleCustomers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.name;
        option.textContent = customer.name;
        customerFilter.appendChild(option);
    });
}

// Filter wholesale orders
function filterWholesaleOrders() {
    const startDate = document.getElementById('wholesaleStartDate').value;
    const endDate = document.getElementById('wholesaleEndDate').value;
    const storeId = document.getElementById('wholesaleStoreFilter').value;
    const customerName = document.getElementById('wholesaleCustomerFilter').value;
    
    filteredWholesaleOrders = wholesaleOrders.filter(order => {
        let matches = true;
        
        // Date filter
        if (startDate && order.orderDate) {
            matches = matches && order.orderDate >= startDate;
        }
        if (endDate && order.orderDate) {
            matches = matches && order.orderDate <= endDate;
        }
        
        // Store filter
        if (storeId) {
            matches = matches && order.storeId === storeId;
        }
        
        // Customer filter
        if (customerName) {
            matches = matches && order.customerName === customerName;
        }
        
        return matches;
    });
    
    currentWholesalePage = 1;
    updateWholesaleStatistics();
    updateWholesaleOrdersTable();
    updateWholesaleTopProducts();
    updateWholesaleCharts();
}

// Search wholesale orders
function searchWholesaleOrders() {
    const searchTerm = document.getElementById('wholesaleSearchInput').value.toLowerCase();
    
    if (!searchTerm) {
        filterWholesaleOrders();
        return;
    }
    
    filteredWholesaleOrders = wholesaleOrders.filter(order => {
        return (order.orderId && order.orderId.toLowerCase().includes(searchTerm)) ||
               (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) ||
               (order.storeName && order.storeName.toLowerCase().includes(searchTerm));
    });
    
    currentWholesalePage = 1;
    updateWholesaleStatistics();
    updateWholesaleOrdersTable();
}

// Update wholesale statistics
function updateWholesaleStatistics() {
    const totalOrders = filteredWholesaleOrders.length;
    const totalRevenue = filteredWholesaleOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalCost = filteredWholesaleOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
    
    document.getElementById('wholesaleTotalOrders').textContent = totalOrders.toLocaleString();
    document.getElementById('wholesaleTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('wholesaleTotalProfit').textContent = formatCurrency(totalProfit);
    document.getElementById('wholesaleProfitMargin').textContent = profitMargin.toFixed(1) + '%';
}

// Update wholesale orders table
function updateWholesaleOrdersTable() {
    const tableBody = document.getElementById('wholesaleOrdersTableBody');
    const startIndex = (currentWholesalePage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const ordersToShow = filteredWholesaleOrders.slice(startIndex, endIndex);
    
    if (ordersToShow.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <i class="fas fa-inbox"></i> Không có dữ liệu đơn hàng
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = ordersToShow.map(order => {
        const profit = (order.totalAmount || 0) - (order.totalCost || 0);
        const profitMargin = order.totalAmount > 0 ? (profit / order.totalAmount * 100) : 0;
        const profitClass = profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : 'profit-neutral';
        
        return `
            <tr>
                <td><strong>${order.orderId || order.id}</strong></td>
                <td>${formatDate(order.orderDate)}</td>
                <td>${order.customerName || 'N/A'}</td>
                <td>${order.storeName || 'N/A'}</td>
                <td>${formatCurrency(order.totalAmount || 0)}</td>
                <td>${formatCurrency(order.totalCost || 0)}</td>
                <td class="${profitClass}">${formatCurrency(profit)}</td>
                <td class="${profitClass}">${profitMargin.toFixed(1)}%</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-action" onclick="showWholesaleOrderDetail('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updateWholesalePagination();
}

// Update wholesale pagination
function updateWholesalePagination() {
    const totalPages = Math.ceil(filteredWholesaleOrders.length / ordersPerPage);
    const pagination = document.getElementById('wholesalePagination');
    const startIndex = (currentWholesalePage - 1) * ordersPerPage;
    const endIndex = Math.min(startIndex + ordersPerPage, filteredWholesaleOrders.length);
    
    // Update pagination info
    document.getElementById('wholesalePaginationInfo').textContent = 
        `Hiển thị ${startIndex + 1} - ${endIndex} của ${filteredWholesaleOrders.length} đơn hàng`;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentWholesalePage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeWholesalePage(${currentWholesalePage - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentWholesalePage - 2 && i <= currentWholesalePage + 2)) {
            paginationHTML += `
                <li class="page-item ${i === currentWholesalePage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changeWholesalePage(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentWholesalePage - 3 || i === currentWholesalePage + 3) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentWholesalePage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeWholesalePage(${currentWholesalePage + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Change wholesale page
function changeWholesalePage(page) {
    const totalPages = Math.ceil(filteredWholesaleOrders.length / ordersPerPage);
    if (page >= 1 && page <= totalPages) {
        currentWholesalePage = page;
        updateWholesaleOrdersTable();
    }
}

// Update wholesale top products
function updateWholesaleTopProducts() {
    const productStats = {};
    
    filteredWholesaleOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const productName = item.productName || 'Sản phẩm không xác định';
                if (!productStats[productName]) {
                    productStats[productName] = {
                        name: productName,
                        quantity: 0,
                        revenue: 0,
                        cost: 0
                    };
                }
                
                productStats[productName].quantity += item.quantity || 0;
                productStats[productName].revenue += (item.sellingPrice || 0) * (item.quantity || 0);
                productStats[productName].cost += (item.importPrice || 0) * (item.quantity || 0);
            });
        }
    });
    
    const topProducts = Object.values(productStats)
        .map(product => ({
            ...product,
            profit: product.revenue - product.cost,
            profitMargin: product.revenue > 0 ? ((product.revenue - product.cost) / product.revenue * 100) : 0
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);
    
    const tableBody = document.getElementById('wholesaleTopProductsTableBody');
    
    if (topProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <i class="fas fa-inbox"></i> Không có dữ liệu sản phẩm
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = topProducts.map((product, index) => {
        const profitClass = product.profit > 0 ? 'profit-positive' : 
                           product.profit < 0 ? 'profit-negative' : 'profit-neutral';
        
        return `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${product.name}</td>
                <td>${product.quantity.toLocaleString()}</td>
                <td>${formatCurrency(product.revenue)}</td>
                <td class="${profitClass}">${formatCurrency(product.profit)}</td>
                <td class="${profitClass}">${product.profitMargin.toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}

// Update wholesale charts
function updateWholesaleCharts() {
    updateWholesaleProfitDistributionChart();
    updateWholesaleProfitTrendChart();
}

// Update profit distribution chart
function updateWholesaleProfitDistributionChart() {
    const ctx = document.getElementById('wholesaleProfitDistributionChart').getContext('2d');
    
    if (wholesaleProfitDistributionChart) {
        wholesaleProfitDistributionChart.destroy();
    }
    
    const storeProfit = {};
    filteredWholesaleOrders.forEach(order => {
        const storeName = order.storeName || 'Không xác định';
        const profit = (order.totalAmount || 0) - (order.totalCost || 0);
        storeProfit[storeName] = (storeProfit[storeName] || 0) + profit;
    });
    
    const labels = Object.keys(storeProfit);
    const data = Object.values(storeProfit);
    
    wholesaleProfitDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#f5576c',
                    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update profit trend chart
function updateWholesaleProfitTrendChart() {
    const ctx = document.getElementById('wholesaleProfitTrendChart').getContext('2d');
    
    if (wholesaleProfitTrendChart) {
        wholesaleProfitTrendChart.destroy();
    }
    
    // Group orders by date
    const dailyProfit = {};
    filteredWholesaleOrders.forEach(order => {
        const date = order.orderDate || new Date().toISOString().split('T')[0];
        const profit = (order.totalAmount || 0) - (order.totalCost || 0);
        dailyProfit[date] = (dailyProfit[date] || 0) + profit;
    });
    
    const sortedDates = Object.keys(dailyProfit).sort();
    const labels = sortedDates.map(date => formatDate(date));
    const data = sortedDates.map(date => dailyProfit[date]);
    
    wholesaleProfitTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Lợi nhuận',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Lợi nhuận: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            }
        }
    });
}

// Show wholesale order detail
function showWholesaleOrderDetail(orderId) {
    const order = wholesaleOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const profit = (order.totalAmount || 0) - (order.totalCost || 0);
    const profitMargin = order.totalAmount > 0 ? (profit / order.totalAmount * 100) : 0;
    
    const modalContent = document.getElementById('wholesaleOrderDetailContent');
    modalContent.innerHTML = `
        <div class="order-detail">
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-info-circle"></i> Thông tin đơn hàng</h6>
                    <p><strong>Mã đơn hàng:</strong> ${order.orderId || order.id}</p>
                    <p><strong>Ngày tạo:</strong> ${formatDate(order.orderDate)}</p>
                    <p><strong>Khách hàng:</strong> ${order.customerName || 'N/A'}</p>
                    <p><strong>Cửa hàng:</strong> ${order.storeName || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-chart-line"></i> Thông tin tài chính</h6>
                    <p><strong>Doanh thu:</strong> ${formatCurrency(order.totalAmount || 0)}</p>
                    <p><strong>Chi phí:</strong> ${formatCurrency(order.totalCost || 0)}</p>
                    <p><strong>Lợi nhuận:</strong> <span class="${profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : 'profit-neutral'}">${formatCurrency(profit)}</span></p>
                    <p><strong>Tỷ suất:</strong> <span class="${profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : 'profit-neutral'}">${profitMargin.toFixed(1)}%</span></p>
                </div>
            </div>
            
            ${order.items && order.items.length > 0 ? `
                <div class="mt-4">
                    <h6><i class="fas fa-list"></i> Chi tiết sản phẩm</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>Số lượng</th>
                                    <th>Giá bán</th>
                                    <th>Giá nhập</th>
                                    <th>Lợi nhuận</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => {
                                    const itemProfit = ((item.sellingPrice || 0) - (item.importPrice || 0)) * (item.quantity || 0);
                                    return `
                                        <tr>
                                            <td>${item.productName || 'N/A'}</td>
                                            <td>${item.quantity || 0}</td>
                                            <td>${formatCurrency(item.sellingPrice || 0)}</td>
                                            <td>${formatCurrency(item.importPrice || 0)}</td>
                                            <td class="${itemProfit > 0 ? 'profit-positive' : itemProfit < 0 ? 'profit-negative' : 'profit-neutral'}">${formatCurrency(itemProfit)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('wholesaleOrderDetailModal'));
    modal.show();
}

// Print wholesale order detail
function printWholesaleOrderDetail() {
    window.print();
}

// Export wholesale profit to Excel
function exportWholesaleProfitToExcel() {
    const data = filteredWholesaleOrders.map(order => {
        const profit = (order.totalAmount || 0) - (order.totalCost || 0);
        const profitMargin = order.totalAmount > 0 ? (profit / order.totalAmount * 100) : 0;
        
        return {
            'Mã đơn hàng': order.orderId || order.id,
            'Ngày tạo': order.orderDate,
            'Khách hàng': order.customerName || 'N/A',
            'Cửa hàng': order.storeName || 'N/A',
            'Doanh thu': order.totalAmount || 0,
            'Chi phí': order.totalCost || 0,
            'Lợi nhuận': profit,
            'Tỷ suất (%)': profitMargin.toFixed(1)
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lợi nhuận đơn sỉ');
    
    const fileName = `Loi_nhuan_don_si_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// Refresh wholesale data
function refreshWholesaleData() {
    console.log('Refreshing wholesale data...');
    loadWholesaleOrders();
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function showWholesaleErrorMessage(message) {
    console.error(message);
    // You can implement a toast notification here
    alert(message);
}

// Make functions globally available
window.filterWholesaleOrders = filterWholesaleOrders;
window.searchWholesaleOrders = searchWholesaleOrders;
window.changeWholesalePage = changeWholesalePage;
window.showWholesaleOrderDetail = showWholesaleOrderDetail;
window.printWholesaleOrderDetail = printWholesaleOrderDetail;
window.exportWholesaleProfitToExcel = exportWholesaleProfitToExcel;
window.refreshWholesaleData = refreshWholesaleData;
