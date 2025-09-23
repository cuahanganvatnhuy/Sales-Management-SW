/**
 * Retail Profit Management JavaScript
 * Quản lý lợi nhuận đơn hàng bán lẻ
 */

// Global variables
let retailOrders = [];
let filteredRetailOrders = [];
let retailCurrentPage = 1;
let retailPageSize = 10;
let retailTopProducts = [];
let retailCharts = {
    profitChart: null,
    trendChart: null
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛍️ Retail Profit Management: DOM loaded, initializing...');
    
    // Load current store from localStorage
    loadCurrentStoreFromStorage();
    
    setTimeout(() => {
        initializeRetailProfitManagement();
    }, 1000);
});

// Load current store from localStorage and update header
function loadCurrentStoreFromStorage() {
    try {
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        const selectedStoreData = localStorage.getItem('selectedStoreData');
        
        if (selectedStoreId && selectedStoreData) {
            const storeData = JSON.parse(selectedStoreData);
            console.log('🏪 Loading current store from storage:', storeData.name);
            
            // Wait for header to load, then update
            setTimeout(() => {
                const currentStoreName = document.getElementById('currentStoreName');
                if (currentStoreName) {
                    currentStoreName.textContent = storeData.name;
                    console.log('✅ Updated header with current store:', storeData.name);
                }
            }, 1500);
        } else {
            console.log('⚠️ No store selected in localStorage');
        }
    } catch (error) {
        console.error('Error loading current store from storage:', error);
    }
}

// Main initialization function
function initializeRetailProfitManagement() {
    console.log('🛍️ Initializing retail profit management...');
    
    if (!database) {
        console.error('Firebase database not initialized');
        setTimeout(initializeRetailProfitManagement, 1000);
        return;
    }
    
    loadRetailOrders();
    loadRetailStores();
    setDefaultDateRange();
}

// Load retail orders from Firebase
async function loadRetailOrders() {
    try {
        console.log('🛍️ Loading retail orders from Firebase...');
        
        const ordersRef = database.ref('orders');
        const snapshot = await ordersRef.once('value');
        const allOrders = snapshot.val() || {};

        console.log('Total orders in database:', Object.keys(allOrders).length);
        
        // Filter retail orders
        retailOrders = Object.keys(allOrders)
            .map(key => ({ id: key, ...allOrders[key] }))
            .filter(order => {
                const isRetail = order.source === 'retail_sales' || 
                                order.orderType === 'retail' ||
                                (order.orderId && order.orderId.includes('RETAIL'));
                
                if (isRetail) {
                    console.log('Found retail order:', order.orderId || order.id);
                }
                return isRetail;
            });

        console.log(`🛍️ Loaded ${retailOrders.length} retail orders from Firebase`);
        
        filteredRetailOrders = [...retailOrders];
        updateRetailStatistics();
        updateRetailOrdersTable();
        updateRetailTopProducts();
        updateRetailCharts();
        
    } catch (error) {
        console.error('Error loading retail orders:', error);
        showErrorMessage('Lỗi tải dữ liệu đơn hàng bán lẻ');
    }
}


// Load stores for filter dropdown
async function loadRetailStores() {
    try {
        if (!database) return;

        const storesRef = database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};

        const storeSelect = document.getElementById('retail-store-select');
        if (storeSelect) {
            storeSelect.innerHTML = '<option value="all">Tất Cả Cửa Hàng</option>';
            
            Object.keys(stores).forEach(storeId => {
                const store = stores[storeId];
                const option = document.createElement('option');
                option.value = storeId;
                option.textContent = store.name || `Cửa hàng ${storeId}`;
                storeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading stores:', error);
    }
}

// Update statistics
function updateRetailStatistics() {
    const selectedStoreId = document.getElementById('retail-store-select')?.value;
    let ordersToAnalyze = filteredRetailOrders;

    if (selectedStoreId && selectedStoreId !== 'all') {
        ordersToAnalyze = filteredRetailOrders.filter(order => order.storeId === selectedStoreId);
    }

    const totalOrders = ordersToAnalyze.length;
    const totalRevenue = ordersToAnalyze.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);
    
    // Calculate total costs including import costs and additional costs
    let totalImportCost = 0;
    let totalAdditionalCost = 0;
    let totalNetProfit = 0;
    
    ordersToAnalyze.forEach(order => {
        const importCost = parseFloat(order.importPrice) * parseFloat(order.quantity) || 0;
        const additionalCost = calculateOrderCost(order);
        const grossProfit = parseFloat(order.totalProfit) || 0;
        const netProfit = grossProfit - additionalCost;
        
        totalImportCost += importCost;
        totalAdditionalCost += additionalCost;
        totalNetProfit += netProfit;
    });
    
    const totalCost = totalImportCost + totalAdditionalCost;
    const avgProfit = totalOrders > 0 ? totalNetProfit / totalOrders : 0;
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    updateElementText('retail-total-profit', formatCurrency(totalNetProfit));
    updateElementText('retail-total-revenue', formatCurrency(totalRevenue));
    updateElementText('retail-total-cost', formatCurrency(totalCost));
    updateElementText('retail-total-orders', totalOrders.toString());
    updateElementText('retail-avg-profit', formatCurrency(avgProfit));
    updateElementText('retail-profit-margin', `${profitMargin.toFixed(1)}%`);
}

// Update orders table
function updateRetailOrdersTable() {
    const tableBody = document.getElementById('retail-orders-table');
    if (!tableBody) return;

    const startIndex = (retailCurrentPage - 1) * retailPageSize;
    const endIndex = startIndex + retailPageSize;
    const pageOrders = filteredRetailOrders.slice(startIndex, endIndex);

    if (pageOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="15" class="text-center">Không có dữ liệu đơn hàng bán lẻ</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = pageOrders.map((order, index) => {
        const grossProfit = parseFloat(order.totalProfit) || 0;
        const additionalCost = calculateOrderCost(order);
        const netProfit = grossProfit - additionalCost;
        
        const grossProfitClass = grossProfit > 0 ? 'profit-positive' : grossProfit < 0 ? 'profit-negative' : 'profit-neutral';
        const netProfitClass = netProfit > 0 ? 'profit-positive' : netProfit < 0 ? 'profit-negative' : 'profit-neutral';
        
        return `
            <tr>
                <td><input type="checkbox" class="order-checkbox" data-order-id="${order.id}"></td>
                <td>${startIndex + index + 1}</td>
                <td>${order.orderId || '-'}</td>
                <td>${order.productName || '-'}</td>
                <td>${order.sku || '-'}</td>
                <td>${order.quantity || 0}</td>
                <td>${formatCurrency(order.importPrice || 0)}</td>
                <td>${formatCurrency(order.sellingPrice || 0)}</td>
                <td class="${grossProfitClass}">${formatCurrency(grossProfit)}</td>
                <td class="cost-value">${formatCurrency(additionalCost)}</td>
                <td class="${netProfitClass}"><strong>${formatCurrency(netProfit)}</strong></td>
                <td>${formatCurrency(order.totalAmount || 0)}</td>
                <td>${order.storeName || '-'}</td>
                <td>${formatDate(order.orderDate)}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary" onclick="openRetailOrderDetailModal('${order.id}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    updateRetailPagination();
}

// Update top products
function updateRetailTopProducts() {
    const productStats = {};
    
    filteredRetailOrders.forEach(order => {
        const productKey = order.sku || order.productName || 'Unknown';
        if (!productStats[productKey]) {
            productStats[productKey] = {
                productName: order.productName || 'Unknown',
                sku: order.sku || '-',
                totalSold: 0,
                totalRevenue: 0,
                totalProfit: 0
            };
        }
        
        productStats[productKey].totalSold += parseInt(order.quantity) || 0;
        productStats[productKey].totalRevenue += parseFloat(order.totalAmount) || 0;
        productStats[productKey].totalProfit += parseFloat(order.totalProfit) || 0;
    });

    retailTopProducts = Object.values(productStats)
        .sort((a, b) => b.totalProfit - a.totalProfit)
        .slice(0, 10);

    updateRetailTopProductsTable();
}

// Update top products table
function updateRetailTopProductsTable() {
    const tableBody = document.querySelector('#retail-top-products tbody');
    if (!tableBody) return;

    if (retailTopProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">Không có dữ liệu sản phẩm</td>
            </tr>
        `;
        return;
    }

    const totalProfit = retailTopProducts.reduce((sum, product) => sum + product.totalProfit, 0);

    tableBody.innerHTML = retailTopProducts.map((product, index) => {
        const profitPercentage = totalProfit > 0 ? (product.totalProfit / totalProfit * 100) : 0;
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${product.productName}</td>
                <td>${product.sku}</td>
                <td>${product.totalSold}</td>
                <td>${formatCurrency(product.totalRevenue)}</td>
                <td>${formatCurrency(product.totalProfit)}</td>
                <td>${profitPercentage.toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}

// Update charts
function updateRetailCharts() {
    updateRetailProfitChart();
    updateRetailTrendChart();
}

function updateRetailProfitChart() {
    const ctx = document.getElementById('retailProfitChart');
    if (!ctx) return;

    if (retailCharts.profitChart) {
        retailCharts.profitChart.destroy();
    }

    const topProducts = retailTopProducts.slice(0, 5);
    
    retailCharts.profitChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: topProducts.map(p => p.productName),
            datasets: [{
                data: topProducts.map(p => p.totalProfit),
                backgroundColor: [
                    '#28a745',
                    '#20c997',
                    '#17a2b8',
                    '#ffc107',
                    '#fd7e14'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateRetailTrendChart() {
    const ctx = document.getElementById('retailTrendChart');
    if (!ctx) return;

    if (retailCharts.trendChart) {
        retailCharts.trendChart.destroy();
    }

    // Group orders by date
    const dailyProfit = {};
    filteredRetailOrders.forEach(order => {
        const date = new Date(order.orderDate).toDateString();
        if (!dailyProfit[date]) {
            dailyProfit[date] = 0;
        }
        dailyProfit[date] += parseFloat(order.totalProfit) || 0;
    });

    const sortedDates = Object.keys(dailyProfit).sort((a, b) => new Date(a) - new Date(b));
    
    retailCharts.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.map(date => new Date(date).toLocaleDateString('vi-VN')),
            datasets: [{
                label: 'Lợi nhuận',
                data: sortedDates.map(date => dailyProfit[date]),
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Filter functions
function updateRetailStoreFilter() {
    updateRetailStatistics();
    updateRetailOrdersTable();
    updateRetailTopProducts();
    updateRetailCharts();
}

function filterRetailOrdersByDate() {
    const fromDate = document.getElementById('retail-date-from')?.value;
    const toDate = document.getElementById('retail-date-to')?.value;

    filteredRetailOrders = retailOrders.filter(order => {
        if (!order.orderDate) return true;
        
        const orderDate = new Date(order.orderDate);
        if (fromDate && orderDate < new Date(fromDate)) return false;
        if (toDate && orderDate > new Date(toDate + 'T23:59:59')) return false;
        
        return true;
    });

    retailCurrentPage = 1;
    updateRetailStatistics();
    updateRetailOrdersTable();
    updateRetailTopProducts();
    updateRetailCharts();
}

function clearRetailDateFilter() {
    document.getElementById('retail-date-from').value = '';
    document.getElementById('retail-date-to').value = '';
    
    filteredRetailOrders = [...retailOrders];
    retailCurrentPage = 1;
    updateRetailStatistics();
    updateRetailOrdersTable();
    updateRetailTopProducts();
    updateRetailCharts();
}

// Search functions
function searchRetailOrders() {
    const searchTerm = document.getElementById('retail-search-input')?.value.toLowerCase() || '';

    filteredRetailOrders = retailOrders.filter(order => {
        return !searchTerm || 
            (order.productName && order.productName.toLowerCase().includes(searchTerm)) ||
            (order.sku && order.sku.toLowerCase().includes(searchTerm)) ||
            (order.orderId && order.orderId.toLowerCase().includes(searchTerm));
    });

    retailCurrentPage = 1;
    updateRetailOrdersTable();
    updateRetailSearchResults();
}

function clearRetailSearch() {
    document.getElementById('retail-search-input').value = '';
    
    filteredRetailOrders = [...retailOrders];
    retailCurrentPage = 1;
    updateRetailOrdersTable();
    hideRetailSearchResults();
}

function updateRetailSearchResults() {
    const resultsDiv = document.getElementById('retail-search-results');
    const resultsText = document.getElementById('retail-search-results-text');
    
    if (resultsDiv && resultsText) {
        resultsText.textContent = `Tìm thấy ${filteredRetailOrders.length} kết quả`;
        resultsDiv.style.display = 'block';
    }
}

function hideRetailSearchResults() {
    const resultsDiv = document.getElementById('retail-search-results');
    if (resultsDiv) {
        resultsDiv.style.display = 'none';
    }
}

// Pagination functions
function updateRetailPagination() {
    const totalPages = Math.ceil(filteredRetailOrders.length / retailPageSize);
    const paginationInfo = document.getElementById('retail-pagination-info');
    const paginationNumbers = document.getElementById('retail-pagination-numbers');
    const prevBtn = document.getElementById('retail-prev-page');
    const nextBtn = document.getElementById('retail-next-page');

    if (paginationInfo) {
        const startIndex = (retailCurrentPage - 1) * retailPageSize + 1;
        const endIndex = Math.min(retailCurrentPage * retailPageSize, filteredRetailOrders.length);
        paginationInfo.textContent = `Hiển thị ${startIndex}-${endIndex} của ${filteredRetailOrders.length} đơn hàng`;
    }

    if (prevBtn) prevBtn.disabled = retailCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = retailCurrentPage >= totalPages;

    if (paginationNumbers) {
        paginationNumbers.innerHTML = generateRetailPageNumbers(retailCurrentPage, totalPages);
    }
}

function generateRetailPageNumbers(currentPage, totalPages) {
    let html = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button type="button" class="${i === currentPage ? 'active' : ''}" 
                    onclick="changeRetailPage(${i})">
                ${i}
            </button>
        `;
    }

    return html;
}

function changeRetailPage(page) {
    const totalPages = Math.ceil(filteredRetailOrders.length / retailPageSize);
    
    if (typeof page === 'number' && page !== retailCurrentPage) {
        if (page >= 1 && page <= totalPages) {
            retailCurrentPage = page;
            updateRetailOrdersTable();
        }
    } else {
        const newPage = retailCurrentPage + page;
        if (newPage >= 1 && newPage <= totalPages) {
            retailCurrentPage = newPage;
            updateRetailOrdersTable();
        }
    }
}

function changeRetailPageSize() {
    const pageSizeSelect = document.getElementById('retail-page-size');
    if (pageSizeSelect) {
        retailPageSize = parseInt(pageSizeSelect.value);
        retailCurrentPage = 1;
        updateRetailOrdersTable();
    }
}

// Order selection functions
function selectAllRetailOrders() {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    const selectAllCheckbox = document.getElementById('retail-select-all');
    const isChecked = selectAllCheckbox.checked;
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}

// Modal functions
function openRetailOrderDetailModal(orderId) {
    const order = retailOrders.find(o => o.id === orderId);
    if (!order) return;

    const grossProfit = parseFloat(order.totalProfit) || 0;
    const additionalCost = calculateOrderCost(order);
    const netProfit = grossProfit - additionalCost;
    
    // Generate cost breakdown
    let costBreakdown = '';
    
    // Default costs
    Object.values(retailCostConfig.costs).forEach(cost => {
        if (cost.value > 0) {
            let costAmount = 0;
            if (cost.type === 'fixed') {
                costAmount = cost.value;
            } else if (cost.type === 'monthly') {
                costAmount = cost.value / (cost.monthlyOrders || 100);
            } else if (cost.type === 'percentage') {
                costAmount = (parseFloat(order.totalAmount) || 0) * cost.value / 100;
            }
            
            if (costAmount > 0) {
                costBreakdown += `
                    <div class="cost-breakdown-item">
                        <span class="cost-breakdown-name"><i class="${cost.icon}"></i> ${cost.name}:</span>
                        <span class="cost-breakdown-value">${formatCurrency(costAmount)}</span>
                    </div>
                `;
            }
        }
    });
    
    // Custom costs
    Object.values(retailCostConfig.customCosts).forEach(cost => {
        if (cost.value > 0) {
            let costAmount = 0;
            if (cost.type === 'fixed') {
                costAmount = cost.value;
            } else if (cost.type === 'monthly') {
                costAmount = cost.value / (cost.monthlyOrders || 100);
            } else if (cost.type === 'percentage') {
                costAmount = (parseFloat(order.totalAmount) || 0) * cost.value / 100;
            }
            
            if (costAmount > 0) {
                costBreakdown += `
                    <div class="cost-breakdown-item">
                        <span class="cost-breakdown-name"><i class="${cost.icon}"></i> ${cost.name}:</span>
                        <span class="cost-breakdown-value">${formatCurrency(costAmount)}</span>
                    </div>
                `;
            }
        }
    });

    const modalContent = `
        <div class="modal-overlay" id="retail-order-modal" onclick="closeRetailOrderDetailModal()">
            <div class="modal-content order-detail-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3><i class="fas fa-shopping-bag"></i> Chi Tiết Đơn Hàng Bán Lẻ</h3>
                    <button type="button" class="close-modal" onclick="closeRetailOrderDetailModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="order-info-grid">
                        <div class="info-section">
                            <h4><i class="fas fa-info-circle"></i> Thông Tin Đơn Hàng</h4>
                            <p><strong>Mã đơn hàng:</strong> ${order.orderId || '-'}</p>
                            <p><strong>Ngày tạo:</strong> ${formatDate(order.orderDate)}</p>
                            <p><strong>Cửa hàng:</strong> ${order.storeName || '-'}</p>
                        </div>
                        <div class="info-section">
                            <h4><i class="fas fa-box"></i> Thông Tin Sản Phẩm</h4>
                            <p><strong>Tên sản phẩm:</strong> ${order.productName || '-'}</p>
                            <p><strong>SKU:</strong> ${order.sku || '-'}</p>
                            <p><strong>Số lượng:</strong> ${order.quantity || 0}</p>
                        </div>
                        <div class="info-section">
                            <h4><i class="fas fa-calculator"></i> Thông Tin Tài Chính</h4>
                            <p><strong>Giá nhập:</strong> ${formatCurrency(order.importPrice || 0)}</p>
                            <p><strong>Giá bán:</strong> ${formatCurrency(order.sellingPrice || 0)}</p>
                            <p><strong>Tổng tiền:</strong> ${formatCurrency(order.totalAmount || 0)}</p>
                            <hr>
                            <p><strong>Lợi nhuận gộp:</strong> <span class="profit-positive">${formatCurrency(grossProfit)}</span></p>
                            <p><strong>Tổng chi phí:</strong> <span class="cost-value">${formatCurrency(additionalCost)}</span></p>
                            <p><strong>Lợi nhuận thực:</strong> <span class="${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${formatCurrency(netProfit)}</span></p>
                        </div>
                        ${costBreakdown ? `
                        <div class="info-section cost-breakdown-section">
                            <h4><i class="fas fa-receipt"></i> Chi Tiết Chi Phí</h4>
                            <div class="cost-breakdown">
                                ${costBreakdown}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeRetailOrderDetailModal()">
                        <i class="fas fa-times"></i> Đóng
                    </button>
                    <button type="button" class="btn btn-primary" onclick="printRetailOrderInvoice('${order.id}')">
                        <i class="fas fa-print"></i> In Hóa Đơn
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
}

function closeRetailOrderDetailModal() {
    const modal = document.getElementById('retail-order-modal');
    if (modal) {
        modal.remove();
    }
}

// Export functions
function exportRetailProfitReport() {
    try {
        const workbook = XLSX.utils.book_new();
        
        const exportData = filteredRetailOrders.map((order, index) => ({
            'STT': index + 1,
            'Mã ĐH': order.orderId || '-',
            'Sản Phẩm': order.productName || '-',
            'SKU': order.sku || '-',
            'Số Lượng': order.quantity || 0,
            'Giá Nhập (VNĐ)': order.importPrice || 0,
            'Giá Bán (VNĐ)': order.sellingPrice || 0,
            'Lợi Nhuận': order.totalProfit || 0,
            'Tổng Tiền': order.totalAmount || 0,
            'Cửa Hàng': order.storeName || '-',
            'Ngày Tạo': formatDate(order.orderDate)
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Lợi Nhuận Bán Lẻ');

        const now = new Date();
        const filename = `Bao_Cao_Loi_Nhuan_Ban_Le_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}.xlsx`;

        XLSX.writeFile(workbook, filename);
        
        console.log('Retail profit report exported successfully');
    } catch (error) {
        console.error('Error exporting retail profit report:', error);
        alert('Lỗi xuất báo cáo. Vui lòng thử lại.');
    }
}

// Utility functions
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function showErrorMessage(message) {
    console.error(message);
    alert(message);
}

function setDefaultDateRange() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const fromDateInput = document.getElementById('retail-date-from');
    const toDateInput = document.getElementById('retail-date-to');
    
    if (fromDateInput) {
        fromDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    }
    
    if (toDateInput) {
        toDateInput.value = today.toISOString().split('T')[0];
    }
}

// Cost Configuration Variables
let retailCostConfig = {
    storeId: null,
    storeName: null,
    costs: {
        tape: { name: 'Chi Phí Băng Keo', icon: 'fas fa-tape', type: 'fixed', value: 0, monthlyOrders: 100 },
        rent: { name: 'Chi Phí Mặt Bằng', icon: 'fas fa-building', type: 'monthly', value: 0, monthlyOrders: 100 },
        other: { name: 'Chi Phí Khác', icon: 'fas fa-receipt', type: 'fixed', value: 0, monthlyOrders: 100 }
    },
    customCosts: {}
};

// Cost Configuration Functions
function openRetailCostConfigModal() {
    console.log('🔧 Opening retail cost configuration modal...');
    
    // Load current store info
    loadCurrentStoreForCostConfig();
    
    // Load existing cost configuration
    loadRetailCostConfig();
    
    // Show modal
    const modal = document.getElementById('retail-cost-config-modal');
    if (modal) {
        modal.style.display = 'flex';
        updateCostConfigDisplay();
    }
}

function closeRetailCostConfigModal() {
    const modal = document.getElementById('retail-cost-config-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadCurrentStoreForCostConfig() {
    try {
        const selectedStoreData = localStorage.getItem('selectedStoreData');
        const storeDisplay = document.getElementById('current-store-display');
        
        if (selectedStoreData && storeDisplay) {
            const storeData = JSON.parse(selectedStoreData);
            storeDisplay.textContent = storeData.name || 'Cửa hàng không xác định';
            
            // Update cost config store info
            retailCostConfig.storeId = storeData.id || localStorage.getItem('selectedStoreId');
            retailCostConfig.storeName = storeData.name;
        } else if (storeDisplay) {
            storeDisplay.textContent = 'Chưa chọn cửa hàng';
        }
    } catch (error) {
        console.error('Error loading current store for cost config:', error);
    }
}

async function loadRetailCostConfig() {
    try {
        if (!database || !retailCostConfig.storeId) return;
        
        console.log('📊 Loading retail cost configuration from Firebase...');
        
        const configRef = database.ref(`retailCostConfig/${retailCostConfig.storeId}`);
        const snapshot = await configRef.once('value');
        const savedConfig = snapshot.val();
        
        if (savedConfig) {
            console.log('✅ Found saved cost configuration:', savedConfig);
            
            // Merge saved config with default config
            if (savedConfig.costs) {
                Object.keys(savedConfig.costs).forEach(key => {
                    if (retailCostConfig.costs[key]) {
                        retailCostConfig.costs[key] = { ...retailCostConfig.costs[key], ...savedConfig.costs[key] };
                    }
                });
            }
            
            if (savedConfig.customCosts) {
                retailCostConfig.customCosts = savedConfig.customCosts;
            }
        } else {
            console.log('📝 No saved cost configuration found, using defaults');
        }
        
        updateCostConfigDisplay();
        
    } catch (error) {
        console.error('Error loading retail cost configuration:', error);
    }
}

function updateCostConfigDisplay() {
    // Update default cost items
    Object.keys(retailCostConfig.costs).forEach(key => {
        const cost = retailCostConfig.costs[key];
        updateCostItemDisplay(key, cost);
    });
    
    // Update custom cost items
    updateCustomCostItems();
    
    // Update cost summary
    updateCostSummary();
}

function updateCostItemDisplay(costId, cost) {
    const valueElement = document.getElementById(`${costId}-cost-value`);
    const typeElement = document.getElementById(`${costId}-cost-type`);
    
    if (valueElement) {
        if (cost.type === 'percentage') {
            valueElement.textContent = `${cost.value}%`;
        } else {
            valueElement.textContent = formatCurrency(cost.value);
        }
    }
    
    if (typeElement) {
        const typeLabels = {
            'fixed': 'Cố định',
            'monthly': 'Hàng tháng',
            'percentage': 'Phần trăm'
        };
        typeElement.textContent = typeLabels[cost.type] || 'Cố định';
    }
}

function updateCustomCostItems() {
    const container = document.getElementById('custom-cost-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(retailCostConfig.customCosts).forEach(costId => {
        const cost = retailCostConfig.customCosts[costId];
        const costItemHtml = `
            <div class="cost-item">
                <div class="cost-item-header">
                    <span class="cost-icon"><i class="${cost.icon}"></i></span>
                    <span class="cost-name">${cost.name}</span>
                    <div class="cost-actions">
                        <button type="button" class="btn-edit" onclick="editCostItem('${costId}')">
                            <i class="fas fa-edit"></i>
                        </button>
                         
                    </div>
                </div>
                <div class="cost-details">
                    <span class="cost-value">${cost.type === 'percentage' ? cost.value + '%' : formatCurrency(cost.value)}</span>
                    <span class="cost-type">${cost.type === 'fixed' ? 'Cố định' : cost.type === 'monthly' ? 'Hàng tháng' : 'Phần trăm'}</span>
                </div>
               
            </div>
        `;
        container.insertAdjacentHTML('beforeend', costItemHtml);
    });
}

function updateCostSummary() {
    let totalFixed = 0;
    let totalMonthly = 0;
    let totalPercentage = 0;
    
    // Calculate from default costs
    Object.values(retailCostConfig.costs).forEach(cost => {
        if (cost.type === 'fixed') {
            totalFixed += parseFloat(cost.value) || 0;
        } else if (cost.type === 'monthly') {
            totalMonthly += parseFloat(cost.value) || 0;
        } else if (cost.type === 'percentage') {
            totalPercentage += parseFloat(cost.value) || 0;
        }
    });
    
    // Calculate from custom costs
    Object.values(retailCostConfig.customCosts).forEach(cost => {
        if (cost.type === 'fixed') {
            totalFixed += parseFloat(cost.value) || 0;
        } else if (cost.type === 'monthly') {
            totalMonthly += parseFloat(cost.value) || 0;
        } else if (cost.type === 'percentage') {
            totalPercentage += parseFloat(cost.value) || 0;
        }
    });
    
    // Calculate average cost per order (assuming 100 orders per month for monthly costs)
    const avgMonthlyOrders = 100;
    const avgCostPerOrder = totalFixed + (totalMonthly / avgMonthlyOrders);
    
    // Update display
    updateElementText('total-fixed-costs', formatCurrency(totalFixed));
    updateElementText('total-monthly-costs', formatCurrency(totalMonthly));
    updateElementText('avg-cost-per-order', formatCurrency(avgCostPerOrder));
}

async function saveRetailCostConfig() {
    try {
        if (!database || !retailCostConfig.storeId) {
            alert('Lỗi: Không thể lưu cấu hình. Vui lòng chọn cửa hàng.');
            return;
        }
        
        console.log('💾 Saving retail cost configuration...');
        
        const configRef = database.ref(`retailCostConfig/${retailCostConfig.storeId}`);
        await configRef.set({
            storeId: retailCostConfig.storeId,
            storeName: retailCostConfig.storeName,
            costs: retailCostConfig.costs,
            customCosts: retailCostConfig.customCosts,
            lastUpdated: new Date().toISOString()
        });
        
        console.log('✅ Cost configuration saved successfully');
        alert('Cấu hình chi phí đã được lưu thành công!');
        
        closeRetailCostConfigModal();
        
        // Reload orders to recalculate with new costs
        loadRetailOrders();
        
    } catch (error) {
        console.error('Error saving retail cost configuration:', error);
        alert('Lỗi khi lưu cấu hình chi phí. Vui lòng thử lại.');
    }
}

// Cost Item Edit Functions
function editCostItem(costId) {
    console.log('✏️ Editing cost item:', costId);
    
    let cost;
    if (retailCostConfig.costs[costId]) {
        cost = retailCostConfig.costs[costId];
    } else if (retailCostConfig.customCosts[costId]) {
        cost = retailCostConfig.customCosts[costId];
    } else {
        console.error('Cost item not found:', costId);
        return;
    }
    
    // Populate edit form
    document.getElementById('edit-cost-id').value = costId;
    document.getElementById('edit-cost-name').value = cost.name;
    document.getElementById('edit-cost-icon').value = cost.icon;
    document.getElementById('edit-cost-type').value = cost.type;
    document.getElementById('edit-cost-value').value = cost.value;
    document.getElementById('edit-monthly-orders').value = cost.monthlyOrders || 100;
    
    // Show/hide delete button for custom costs
    const deleteBtn = document.getElementById('delete-cost-btn');
    if (deleteBtn) {
        deleteBtn.style.display = retailCostConfig.customCosts[costId] ? 'inline-flex' : 'none';
    }
    
    // Toggle cost calculation fields
    toggleCostCalculation();
    
    // Show edit modal
    const modal = document.getElementById('cost-item-edit-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeCostItemEditModal() {
    const modal = document.getElementById('cost-item-edit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleCostCalculation() {
    const costType = document.getElementById('edit-cost-type').value;
    const monthlyOrdersGroup = document.getElementById('monthly-orders-group');
    const costValueSuffix = document.getElementById('cost-value-suffix');
    
    if (monthlyOrdersGroup) {
        monthlyOrdersGroup.style.display = costType === 'monthly' ? 'block' : 'none';
    }
    
    if (costValueSuffix) {
        costValueSuffix.textContent = costType === 'percentage' ? '%' : '₫';
    }
}

function saveCostItem() {
    const costId = document.getElementById('edit-cost-id').value;
    const name = document.getElementById('edit-cost-name').value.trim();
    const icon = document.getElementById('edit-cost-icon').value;
    const type = document.getElementById('edit-cost-type').value;
    const value = parseFloat(document.getElementById('edit-cost-value').value) || 0;
    const monthlyOrders = parseInt(document.getElementById('edit-monthly-orders').value) || 100;
    
    if (!name) {
        alert('Vui lòng nhập tên chi phí');
        return;
    }
    
    const costData = {
        name: name,
        icon: icon,
        type: type,
        value: value,
        monthlyOrders: monthlyOrders
    };
    
    // Save to appropriate config object
    if (retailCostConfig.costs[costId]) {
        retailCostConfig.costs[costId] = { ...retailCostConfig.costs[costId], ...costData };
    } else {
        retailCostConfig.customCosts[costId] = costData;
    }
    
    console.log('💾 Saved cost item:', costId, costData);
    
    // Update display
    updateCostConfigDisplay();
    
    // Close edit modal
    closeCostItemEditModal();
}

function deleteCostItem() {
    const costId = document.getElementById('edit-cost-id').value;
    
    if (!retailCostConfig.customCosts[costId]) {
        alert('Không thể xóa chi phí mặc định');
        return;
    }
    
    if (confirm('Bạn có chắc chắn muốn xóa chi phí này?')) {
        delete retailCostConfig.customCosts[costId];
        console.log('🗑️ Deleted custom cost item:', costId);
        
        updateCostConfigDisplay();
        closeCostItemEditModal();
    }
}

function addNewCostItem() {
    const newCostId = 'custom_' + Date.now();
    
    // Create new cost item with default values
    retailCostConfig.customCosts[newCostId] = {
        name: 'Chi Phí Mới',
        icon: 'fas fa-coins',
        type: 'fixed',
        value: 0,
        monthlyOrders: 100
    };
    
    console.log('➕ Added new cost item:', newCostId);
    
    // Open edit modal for the new item
    editCostItem(newCostId);
}

// Calculate cost for an order
function calculateOrderCost(order) {
    let totalCost = 0;
    
    // Calculate fixed costs
    Object.values(retailCostConfig.costs).forEach(cost => {
        if (cost.type === 'fixed') {
            totalCost += parseFloat(cost.value) || 0;
        } else if (cost.type === 'monthly') {
            const avgCostPerOrder = (parseFloat(cost.value) || 0) / (cost.monthlyOrders || 100);
            totalCost += avgCostPerOrder;
        } else if (cost.type === 'percentage') {
            const orderTotal = parseFloat(order.totalAmount) || 0;
            totalCost += (orderTotal * (parseFloat(cost.value) || 0)) / 100;
        }
    });
    
    // Calculate custom costs
    Object.values(retailCostConfig.customCosts).forEach(cost => {
        if (cost.type === 'fixed') {
            totalCost += parseFloat(cost.value) || 0;
        } else if (cost.type === 'monthly') {
            const avgCostPerOrder = (parseFloat(cost.value) || 0) / (cost.monthlyOrders || 100);
            totalCost += avgCostPerOrder;
        } else if (cost.type === 'percentage') {
            const orderTotal = parseFloat(order.totalAmount) || 0;
            totalCost += (orderTotal * (parseFloat(cost.value) || 0)) / 100;
        }
    });
    
    return totalCost;
}

// Print invoice function
function printRetailOrderInvoice(orderId) {
    const order = retailOrders.find(o => o.id === orderId);
    if (!order) return;

    const grossProfit = parseFloat(order.totalProfit) || 0;
    const additionalCost = calculateOrderCost(order);
    const netProfit = grossProfit - additionalCost;
    
    const storeData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hóa Đơn Bán Lẻ - ${order.orderId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .store-name { font-size: 24px; font-weight: bold; color: #28a745; }
                .invoice-title { font-size: 18px; margin-top: 10px; }
                .info-section { margin: 20px 0; }
                .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
                .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .table th { background-color: #f8f9fa; }
                .total-section { margin-top: 20px; text-align: right; }
                .total-row { margin: 5px 0; }
                .grand-total { font-size: 18px; font-weight: bold; color: #28a745; }
                .footer { text-align: center; margin-top: 30px; font-style: italic; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="store-name">${storeData.name || 'Cửa Hàng'}</div>
                <div>${storeData.address || ''}</div>
                <div>${storeData.phone || ''} - ${storeData.email || ''}</div>
                <div class="invoice-title">HÓA ĐƠN BÁN LẺ</div>
            </div>
            
            <div class="info-section">
                <div class="info-row">
                    <span><strong>Mã đơn hàng:</strong> ${order.orderId || '-'}</span>
                    <span><strong>Ngày:</strong> ${formatDate(order.orderDate)}</span>
                </div>
                <div class="info-row">
                    <span><strong>Cửa hàng:</strong> ${order.storeName || '-'}</span>
                    <span><strong>Nhân viên:</strong> ${storeData.name || 'Admin'}</span>
                </div>
            </div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Sản phẩm</th>
                        <th>SKU</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>${order.productName || '-'}</td>
                        <td>${order.sku || '-'}</td>
                        <td>${order.quantity || 0}</td>
                        <td>${formatCurrency(order.sellingPrice || 0)}</td>
                        <td>${formatCurrency(order.totalAmount || 0)}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="total-section">
                <div class="total-row">Tổng tiền: ${formatCurrency(order.totalAmount || 0)}</div>
                <div class="total-row grand-total">Thành tiền: ${formatCurrency(order.totalAmount || 0)}</div>
            </div>
            
            <div class="footer">
                <p>Cảm ơn quý khách đã mua hàng!</p>
                <p>Hóa đơn được in từ hệ thống quản lý bán hàng</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    }
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Export functions to global scope
window.initializeRetailProfitManagement = initializeRetailProfitManagement;
window.updateRetailStoreFilter = updateRetailStoreFilter;
window.filterRetailOrdersByDate = filterRetailOrdersByDate;
window.clearRetailDateFilter = clearRetailDateFilter;
window.searchRetailOrders = searchRetailOrders;
window.clearRetailSearch = clearRetailSearch;
window.changeRetailPage = changeRetailPage;
window.changeRetailPageSize = changeRetailPageSize;
window.selectAllRetailOrders = selectAllRetailOrders;
window.openRetailOrderDetailModal = openRetailOrderDetailModal;
window.closeRetailOrderDetailModal = closeRetailOrderDetailModal;
window.exportRetailProfitReport = exportRetailProfitReport;
window.printRetailOrderInvoice = printRetailOrderInvoice;

// Cost configuration functions
window.openRetailCostConfigModal = openRetailCostConfigModal;
window.closeRetailCostConfigModal = closeRetailCostConfigModal;
window.saveRetailCostConfig = saveRetailCostConfig;
window.editCostItem = editCostItem;
window.closeCostItemEditModal = closeCostItemEditModal;
window.toggleCostCalculation = toggleCostCalculation;
window.saveCostItem = saveCostItem;
window.deleteCostItem = deleteCostItem;
window.addNewCostItem = addNewCostItem;

console.log('✅ Retail profit management functions loaded');