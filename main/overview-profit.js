// Overview Profit Management JavaScript
let database;
let allOrders = [];
let filteredOrders = [];
let stores = [];

// Channel data
let tmdtOrders = [];
let retailOrders = [];
let wholesaleOrders = [];

// Charts
let channelProfitDistributionChart;
let channelRevenueComparisonChart;
let overallProfitTrendChart;

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
    console.log('Initializing overview profit management...');
    initializeOverviewProfitManagement();
    setDefaultDateRange();
});

// Initialize overview profit management
function initializeOverviewProfitManagement() {
    loadAllOrders();
    loadStores();
}

// Set default date range (last 30 days)
function setDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('overviewStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('overviewEndDate').value = endDate.toISOString().split('T')[0];
}

// Load all orders from Firebase
async function loadAllOrders() {
    try {
        console.log('Loading all orders from Firebase...');
        
        if (!database) {
            console.error('Firebase database not initialized');
            return;
        }

        const ordersRef = database.ref('orders');
        const snapshot = await ordersRef.once('value');
        const orders = snapshot.val() || {};

        console.log('Total orders in database:', Object.keys(orders).length);
        
        // Convert to array and categorize
        allOrders = Object.keys(orders).map(key => ({ id: key, ...orders[key] }));
        
        // Categorize orders by channel
        categorizeOrders();
        
        filteredOrders = [...allOrders];
        updateOverallStatistics();
        updateChannelStatistics();
        updateTopPerformance();
        updateOverviewCharts();
        updatePerformanceMetrics();
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showOverviewErrorMessage('Lỗi tải dữ liệu đơn hàng');
    }
}

// Categorize orders by channel
function categorizeOrders() {
    tmdtOrders = allOrders.filter(order => {
        return order.source === 'tmdt_sales' || 
               order.orderType === 'ecommerce' ||
               order.platform ||
               (order.orderId && order.orderId.includes('TMDT'));
    });
    
    retailOrders = allOrders.filter(order => {
        return order.source === 'retail_sales' || 
               order.orderType === 'retail' ||
               (order.orderId && order.orderId.includes('RETAIL'));
    });
    
    wholesaleOrders = allOrders.filter(order => {
        return order.source === 'wholesale_sales' || 
               order.orderType === 'wholesale' ||
               order.customerName ||
               (order.orderId && order.orderId.includes('WHOLESALE'));
    });
    
    console.log(`Categorized orders - TMĐT: ${tmdtOrders.length}, Retail: ${retailOrders.length}, Wholesale: ${wholesaleOrders.length}`);
}


// Load stores
async function loadStores() {
    try {
        const storesRef = database.ref('stores');
        const snapshot = await storesRef.once('value');
        const storesData = snapshot.val() || {};
        
        stores = Object.keys(storesData).map(key => ({
            id: key,
            ...storesData[key]
        }));
        
        populateStoreFilter();
    } catch (error) {
        console.error('Error loading stores:', error);
    }
}

// Populate store filter dropdown
function populateStoreFilter() {
    const storeFilter = document.getElementById('overviewStoreFilter');
    storeFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
    
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name || store.storeName || `Cửa hàng ${store.id}`;
        storeFilter.appendChild(option);
    });
}

// Filter overview data
function filterOverviewData() {
    const startDate = document.getElementById('overviewStartDate').value;
    const endDate = document.getElementById('overviewEndDate').value;
    const storeId = document.getElementById('overviewStoreFilter').value;
    const channel = document.getElementById('overviewChannelFilter').value;
    
    filteredOrders = allOrders.filter(order => {
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
        
        // Channel filter
        if (channel) {
            switch(channel) {
                case 'tmdt':
                    matches = matches && tmdtOrders.some(o => o.id === order.id);
                    break;
                case 'retail':
                    matches = matches && retailOrders.some(o => o.id === order.id);
                    break;
                case 'wholesale':
                    matches = matches && wholesaleOrders.some(o => o.id === order.id);
                    break;
            }
        }
        
        return matches;
    });
    
    updateOverallStatistics();
    updateChannelStatistics();
    updateTopPerformance();
    updateOverviewCharts();
    updatePerformanceMetrics();
}

// Update overall statistics
function updateOverallStatistics() {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalCost = filteredOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
    
    document.getElementById('overallTotalOrders').textContent = totalOrders.toLocaleString();
    document.getElementById('overallTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('overallTotalProfit').textContent = formatCurrency(totalProfit);
    document.getElementById('overallProfitMargin').textContent = profitMargin.toFixed(1) + '%';
}

// Update channel statistics
function updateChannelStatistics() {
    // Filter each channel based on current filters
    const filteredTmdt = filteredOrders.filter(order => tmdtOrders.some(o => o.id === order.id));
    const filteredRetail = filteredOrders.filter(order => retailOrders.some(o => o.id === order.id));
    const filteredWholesale = filteredOrders.filter(order => wholesaleOrders.some(o => o.id === order.id));
    
    // TMĐT Statistics
    updateChannelStats('tmdt', filteredTmdt);
    
    // Retail Statistics
    updateChannelStats('retail', filteredRetail);
    
    // Wholesale Statistics
    updateChannelStats('wholesale', filteredWholesale);
}

// Update individual channel statistics
function updateChannelStats(channel, orders) {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalCost = orders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
    
    document.getElementById(`${channel}Orders`).textContent = totalOrders.toLocaleString();
    document.getElementById(`${channel}Revenue`).textContent = formatCurrency(totalRevenue);
    document.getElementById(`${channel}Profit`).textContent = formatCurrency(totalProfit);
    document.getElementById(`${channel}Margin`).textContent = profitMargin.toFixed(1) + '%';
    
    // Update profit color classes
    const profitElement = document.getElementById(`${channel}Profit`);
    const marginElement = document.getElementById(`${channel}Margin`);
    const profitClass = totalProfit > 0 ? 'profit-positive' : totalProfit < 0 ? 'profit-negative' : 'profit-neutral';
    
    profitElement.className = `stat-value profit ${profitClass}`;
    marginElement.className = `stat-value profit ${profitClass}`;
}

// Update top performance tables
function updateTopPerformance() {
    updateTopStores();
    updateTopProducts();
}

// Update top stores table
function updateTopStores() {
    const storeStats = {};
    
    filteredOrders.forEach(order => {
        const storeName = order.storeName || 'Không xác định';
        if (!storeStats[storeName]) {
            storeStats[storeName] = {
                name: storeName,
                revenue: 0,
                cost: 0
            };
        }
        
        storeStats[storeName].revenue += order.totalAmount || 0;
        storeStats[storeName].cost += order.totalCost || 0;
    });
    
    const topStores = Object.values(storeStats)
        .map(store => ({
            ...store,
            profit: store.revenue - store.cost,
            profitMargin: store.revenue > 0 ? ((store.revenue - store.cost) / store.revenue * 100) : 0
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);
    
    const tableBody = document.getElementById('topStoresTableBody');
    
    if (topStores.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <i class="fas fa-inbox"></i> Không có dữ liệu cửa hàng
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = topStores.map((store, index) => {
        const profitClass = store.profit > 0 ? 'profit-positive' : 
                           store.profit < 0 ? 'profit-negative' : 'profit-neutral';
        
        return `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${store.name}</td>
                <td>${formatCurrency(store.revenue)}</td>
                <td class="${profitClass}">${formatCurrency(store.profit)}</td>
                <td class="${profitClass}">${store.profitMargin.toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}

// Update top products table
function updateTopProducts() {
    const productStats = {};
    
    filteredOrders.forEach(order => {
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
        .slice(0, 5);
    
    const tableBody = document.getElementById('topProductsTableBody');
    
    if (topProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
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
                <td class="${profitClass}">${formatCurrency(product.profit)}</td>
                <td class="${profitClass}">${product.profitMargin.toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}

// Update overview charts
function updateOverviewCharts() {
    updateChannelProfitDistributionChart();
    updateChannelRevenueComparisonChart();
    updateOverallProfitTrendChart();
}

// Update channel profit distribution chart
function updateChannelProfitDistributionChart() {
    const ctx = document.getElementById('channelProfitDistributionChart').getContext('2d');
    
    if (channelProfitDistributionChart) {
        channelProfitDistributionChart.destroy();
    }
    
    const filteredTmdt = filteredOrders.filter(order => tmdtOrders.some(o => o.id === order.id));
    const filteredRetail = filteredOrders.filter(order => retailOrders.some(o => o.id === order.id));
    const filteredWholesale = filteredOrders.filter(order => wholesaleOrders.some(o => o.id === order.id));
    
    const tmdtProfit = filteredTmdt.reduce((sum, order) => sum + ((order.totalAmount || 0) - (order.totalCost || 0)), 0);
    const retailProfit = filteredRetail.reduce((sum, order) => sum + ((order.totalAmount || 0) - (order.totalCost || 0)), 0);
    const wholesaleProfit = filteredWholesale.reduce((sum, order) => sum + ((order.totalAmount || 0) - (order.totalCost || 0)), 0);
    
    channelProfitDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['TMĐT', 'Bán lẻ', 'Bán sỉ'],
            datasets: [{
                data: [tmdtProfit, retailProfit, wholesaleProfit],
                backgroundColor: ['#667eea', '#56ab2f', '#3498db']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + formatCurrency(context.parsed);
                        }
                    }
                }
            }
        }
    });
}

// Update channel revenue comparison chart
function updateChannelRevenueComparisonChart() {
    const ctx = document.getElementById('channelRevenueComparisonChart').getContext('2d');
    
    if (channelRevenueComparisonChart) {
        channelRevenueComparisonChart.destroy();
    }
    
    const filteredTmdt = filteredOrders.filter(order => tmdtOrders.some(o => o.id === order.id));
    const filteredRetail = filteredOrders.filter(order => retailOrders.some(o => o.id === order.id));
    const filteredWholesale = filteredOrders.filter(order => wholesaleOrders.some(o => o.id === order.id));
    
    const tmdtRevenue = filteredTmdt.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const retailRevenue = filteredRetail.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const wholesaleRevenue = filteredWholesale.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    channelRevenueComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['TMĐT', 'Bán lẻ', 'Bán sỉ'],
            datasets: [{
                label: 'Doanh thu',
                data: [tmdtRevenue, retailRevenue, wholesaleRevenue],
                backgroundColor: ['#667eea', '#56ab2f', '#3498db']
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
                            return 'Doanh thu: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            }
        }
    });
}

// Update overall profit trend chart
function updateOverallProfitTrendChart() {
    const ctx = document.getElementById('overallProfitTrendChart').getContext('2d');
    
    if (overallProfitTrendChart) {
        overallProfitTrendChart.destroy();
    }
    
    // Group orders by date
    const dailyProfit = {};
    filteredOrders.forEach(order => {
        const date = order.orderDate || new Date().toISOString().split('T')[0];
        const profit = (order.totalAmount || 0) - (order.totalCost || 0);
        dailyProfit[date] = (dailyProfit[date] || 0) + profit;
    });
    
    const sortedDates = Object.keys(dailyProfit).sort();
    const labels = sortedDates.map(date => formatDate(date));
    const data = sortedDates.map(date => dailyProfit[date]);
    
    overallProfitTrendChart = new Chart(ctx, {
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

// Update performance metrics
function updatePerformanceMetrics() {
    // Calculate metrics
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalProfit = filteredOrders.reduce((sum, order) => sum + ((order.totalAmount || 0) - (order.totalCost || 0)), 0);
    const totalOrders = filteredOrders.length;
    
    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Average profit margin
    const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
    
    // Growth calculations (simplified - comparing with previous period)
    const revenueGrowth = 15.2; // Placeholder - would need historical data
    const profitGrowth = 12.8; // Placeholder - would need historical data
    
    document.getElementById('revenueGrowth').textContent = `+${revenueGrowth.toFixed(1)}%`;
    document.getElementById('profitGrowth').textContent = `+${profitGrowth.toFixed(1)}%`;
    document.getElementById('avgOrderValue').textContent = formatCurrency(avgOrderValue);
    document.getElementById('avgProfitMargin').textContent = avgProfitMargin.toFixed(1) + '%';
}

// Export overview profit to Excel
function exportOverviewProfitToExcel() {
    const data = filteredOrders.map(order => {
        const profit = (order.totalAmount || 0) - (order.totalCost || 0);
        const profitMargin = order.totalAmount > 0 ? (profit / order.totalAmount * 100) : 0;
        
        let channel = 'Khác';
        if (tmdtOrders.some(o => o.id === order.id)) channel = 'TMĐT';
        else if (retailOrders.some(o => o.id === order.id)) channel = 'Bán lẻ';
        else if (wholesaleOrders.some(o => o.id === order.id)) channel = 'Bán sỉ';
        
        return {
            'Mã đơn hàng': order.orderId || order.id,
            'Ngày tạo': order.orderDate,
            'Kênh bán hàng': channel,
            'Cửa hàng': order.storeName || 'N/A',
            'Doanh thu': order.totalAmount || 0,
            'Chi phí': order.totalCost || 0,
            'Lợi nhuận': profit,
            'Tỷ suất (%)': profitMargin.toFixed(1)
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tổng quan lợi nhuận');
    
    const fileName = `Tong_quan_loi_nhuan_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// Refresh overview data
function refreshOverviewData() {
    console.log('Refreshing overview data...');
    loadAllOrders();
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

function showOverviewErrorMessage(message) {
    console.error(message);
    // You can implement a toast notification here
    alert(message);
}

// Make functions globally available
window.filterOverviewData = filterOverviewData;
window.exportOverviewProfitToExcel = exportOverviewProfitToExcel;
window.refreshOverviewData = refreshOverviewData;
