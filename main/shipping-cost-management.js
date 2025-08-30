// Shipping Cost Management JavaScript
// Global variables
let shippingCostData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 15;
let shippingChart = null;
let editingShippingCostId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeShippingCostManagement();
});

// Initialize shipping cost management
function initializeShippingCostManagement() {
    console.log('Initializing Shipping Cost Management...');
    
    // Check for selected store
    checkSelectedStore();
    
    // Update header with selected store
    updateHeaderStoreDisplay();
    
    // Load data from Firebase
    loadShippingCostData();
    loadStoresForDropdown();
    loadSuppliersForDropdown();
    loadProductsForDropdown();
    
    // Set default date to current date/time
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('transactionDate').value = localDateTime;
    
    // Initialize chart
    initializeChart();
    
    // Setup modal event listeners
    setupModalEventListeners();
    
    // Setup number formatting
    setupNumberFormatting();
}

// Check selected store and redirect if none selected
function checkSelectedStore() {
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    const selectedStoreData = localStorage.getItem('selectedStoreData');
    
    if (!selectedStoreId || !selectedStoreData) {
        alert('Vui lòng chọn cửa hàng trước khi truy cập quản lý chi phí vận chuyển!');
        window.location.href = '../index.html';
        return;
    }
    
    console.log('Selected store:', selectedStoreId);
}

// Update header store display
function updateHeaderStoreDisplay() {
    // Wait for header to load, then update store display
    setTimeout(() => {
        const selectedStoreData = JSON.parse(localStorage.getItem('selectedStoreData') || '{}');
        const currentStoreNameElement = document.getElementById('currentStoreName');
        
        if (currentStoreNameElement && selectedStoreData.name) {
            currentStoreNameElement.textContent = selectedStoreData.name;
            console.log('Updated header store display:', selectedStoreData.name);
        } else {
            console.log('Header element not found or no store data');
        }
        
        // Load stores for header dropdown
        loadStoresForHeader();
    }, 500);
}

// Load stores for header dropdown
function loadStoresForHeader() {
    if (!database) return;
    
    database.ref('stores').on('value', (snapshot) => {
        const stores = snapshot.val();
        const storeList = document.getElementById('storeList');
        
        if (storeList && stores) {
            storeList.innerHTML = '';
            
            Object.keys(stores).forEach(key => {
                const store = stores[key];
                const storeItem = document.createElement('div');
                storeItem.className = 'store-item';
                storeItem.innerHTML = `
                    <div class="store-info">
                        <div class="store-name">${store.name}</div>
                        <div class="store-address">${store.address || ''}</div>
                    </div>
                `;
                storeItem.onclick = () => selectStore(key, store);
                storeList.appendChild(storeItem);
            });
        }
    });
}

// Select store function
function selectStore(storeId, storeData) {
    localStorage.setItem('selectedStoreId', storeId);
    localStorage.setItem('selectedStoreData', JSON.stringify(storeData));
    
    // Update header display
    const currentStoreNameElement = document.getElementById('currentStoreName');
    if (currentStoreNameElement) {
        currentStoreNameElement.textContent = storeData.name;
    }
    
    // Close dropdown
    const storeDropdown = document.getElementById('storeDropdown');
    if (storeDropdown) {
        storeDropdown.classList.add('hidden');
    }
    
    // Reload page data with new store
    location.reload();
}

// Toggle store dropdown
function toggleStoreDropdown() {
    const storeDropdown = document.getElementById('storeDropdown');
    if (storeDropdown) {
        storeDropdown.classList.toggle('hidden');
    }
}

// Load shipping cost data from Firebase
function loadShippingCostData() {
    if (!database) {
        console.error('Database not initialized');
        return;
    }
    
    // Load from warehouse transactions with shipping costs (all stores)
    database.ref('warehouseTransactions').on('value', (snapshot) => {
        const transactions = snapshot.val();
        shippingCostData = [];
        
        if (transactions) {
            Object.keys(transactions).forEach(key => {
                const transaction = transactions[key];
                if (transaction.shippingCost && transaction.shippingCost > 0) {
                    shippingCostData.push({
                        id: key,
                        ...transaction
                    });
                }
            });
        }
        
        // Also load from dedicated shipping costs collection (all stores)
        database.ref('shippingCosts').on('value', (snapshot) => {
            const shippingCosts = snapshot.val();
            if (shippingCosts) {
                Object.keys(shippingCosts).forEach(key => {
                    const cost = shippingCosts[key];
                    shippingCostData.push({
                        id: key,
                        ...cost
                    });
                });
            }
            
            // Sort by date (newest first)
            shippingCostData.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
            
            filteredData = [...shippingCostData];
            updateStatistics();
            updateTable();
            updateChart();
        });
    });
}

// Load stores for dropdown
function loadStoresForDropdown() {
    if (!database) return;
    
    database.ref('stores').on('value', (snapshot) => {
        const stores = snapshot.val();
        const storeSelect = document.getElementById('storeSelect');
        const storeFilter = document.getElementById('storeFilter');
        
        if (stores) {
            // Load stores for modal dropdown
            if (storeSelect) {
                storeSelect.innerHTML = '<option value="">Chọn cửa hàng</option>';
                
                Object.keys(stores).forEach(key => {
                    const store = stores[key];
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = store.name;
                    storeSelect.appendChild(option);
                });
                
                storeSelect.disabled = false;
            }
            
            // Load stores for filter dropdown
            if (storeFilter) {
                storeFilter.innerHTML = '<option value="all">Tất cả cửa hàng</option>';
                
                Object.keys(stores).forEach(key => {
                    const store = stores[key];
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = store.name;
                    storeFilter.appendChild(option);
                });
            }
        }
    });
}

// Load suppliers for dropdown
function loadSuppliersForDropdown() {
    if (!database) return;
    
    // Get unique suppliers from existing transactions
    const suppliers = new Set();
    
    database.ref('warehouseTransactions').on('value', (snapshot) => {
        const transactions = snapshot.val();
        if (transactions) {
            Object.values(transactions).forEach(transaction => {
                if (transaction.supplier) {
                    suppliers.add(transaction.supplier);
                }
            });
        }
        
        const supplierFilter = document.getElementById('supplierFilter');
        const supplierSelect = document.getElementById('supplierSelect');
        
        supplierFilter.innerHTML = '<option value="all">Tất cả nhà cung cấp</option>';
        supplierSelect.innerHTML = '<option value="">Chọn nhà cung cấp</option>';
        
        suppliers.forEach(supplier => {
            const option1 = document.createElement('option');
            option1.value = supplier;
            option1.textContent = supplier;
            supplierFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = supplier;
            option2.textContent = supplier;
            supplierSelect.appendChild(option2);
        });
    });
}

// Load products for dropdown
function loadProductsForDropdown() {
    if (!database) return;
    
    database.ref('products').on('value', (snapshot) => {
        const products = snapshot.val();
        const productSelect = document.getElementById('productSelect');
        
        productSelect.innerHTML = '<option value="">Chọn sản phẩm</option>';
        
        if (products) {
            Object.keys(products).forEach(key => {
                const product = products[key];
                const option = document.createElement('option');
                option.value = key;
                option.textContent = `${product.name} (${product.sku})`;
                productSelect.appendChild(option);
            });
        }
    });
}

// Update statistics
function updateStatistics() {
    const importCosts = filteredData.filter(item => item.transactionType === 'import');
    const exportCosts = filteredData.filter(item => item.transactionType === 'export');
    
    const totalImportCost = importCosts.reduce((sum, item) => sum + (item.shippingCost || 0), 0);
    const totalExportCost = exportCosts.reduce((sum, item) => sum + (item.shippingCost || 0), 0);
    const totalShippingCost = totalImportCost + totalExportCost;
    const averageCost = filteredData.length > 0 ? totalShippingCost / filteredData.length : 0;
    
    document.getElementById('totalImportCost').textContent = formatCurrency(totalImportCost);
    document.getElementById('importCount').textContent = `${importCosts.length} lần nhập`;
    
    document.getElementById('totalExportCost').textContent = formatCurrency(totalExportCost);
    document.getElementById('exportCount').textContent = `${exportCosts.length} lần xuất`;
    
    document.getElementById('totalShippingCost').textContent = formatCurrency(totalShippingCost);
    document.getElementById('totalTransactions').textContent = `${filteredData.length} giao dịch`;
    
    document.getElementById('averageCost').textContent = formatCurrency(averageCost);
}

// Apply filters
function applyFilters() {
    const timeFilter = document.getElementById('periodFilter').value;
    const storeFilter = document.getElementById('storeFilter').value;
    
    // Handle custom date visibility
    const customDateGroup = document.getElementById('customDateGroup');
    const customDateToGroup = document.getElementById('customDateToGroup');
    
    if (timeFilter === 'custom') {
        customDateGroup.classList.remove('custom-date-hidden');
        customDateToGroup.classList.remove('custom-date-hidden');
    } else {
        customDateGroup.classList.add('custom-date-hidden');
        customDateToGroup.classList.add('custom-date-hidden');
    }
    
    filteredData = shippingCostData.filter(item => {
        const storeMatch = storeFilter === 'all' || item.storeId === storeFilter;
        const timeMatch = filterByTime(item, timeFilter);
        
        return storeMatch && timeMatch;
    });
    
    currentPage = 1;
    updateStatistics();
    updateTable();
    updateChart();
}

// Filter by time period
function filterByTime(item, timeFilter) {
    if (timeFilter === 'all') return true;
    
    const itemDate = new Date(item.date || item.timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (timeFilter) {
        case 'today':
            return itemDate >= today;
            
        case '7days':
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            return itemDate >= sevenDaysAgo;
            
        case '30days':
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            return itemDate >= thirtyDaysAgo;
            
        case 'thisMonth':
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return itemDate >= thisMonthStart;
            
        case 'lastMonth':
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
            
        case 'custom':
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            if (!startDate && !endDate) return true;
            
            if (startDate && !endDate) {
                return itemDate >= new Date(startDate);
            }
            
            if (!startDate && endDate) {
                return itemDate <= new Date(endDate + 'T23:59:59');
            }
            
            return itemDate >= new Date(startDate) && itemDate <= new Date(endDate + 'T23:59:59');
            
        default:
            return true;
    }
}

// Clear filters
function clearFilters() {
    document.getElementById('periodFilter').value = 'all';
    document.getElementById('storeFilter').value = 'all';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    // Hide custom date fields
    document.getElementById('customDateGroup').classList.add('custom-date-hidden');
    document.getElementById('customDateToGroup').classList.add('custom-date-hidden');
    
    applyFilters();
}

// Update table
function updateTable() {
    const tableBody = document.getElementById('shippingCostTableBody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <i class="fas fa-shipping-fast"></i>
                    <h3>Không có dữ liệu</h3>
                    <p>Chưa có chi phí vận chuyển nào được ghi nhận</p>
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pageData.map((item, index) => `
            <tr onclick="viewShippingCostDetail('${item.id}')">
                <td>${startIndex + index + 1}</td>
                <td>${formatDateTime(item.timestamp || item.date)}</td>
                <td>
                    <span class="status-badge status-${item.type === 'import' || item.type === 'in' ? 'import' : 'export'}">
                        ${item.type === 'import' || item.type === 'in' ? 'Nhập hàng' : 'Xuất hàng'}
                    </span>
                </td>
                <td>${item.transactionId || item.id}</td>
                <td>${item.storeName || 'N/A'}</td>
                <td>${item.supplier || 'N/A'}</td>
                <td>${item.productName || 'N/A'}</td>
                <td>${item.quantity || 0}</td>
                <td class="text-right font-weight-bold">${formatCurrency(item.shippingCost || 0)}</td>
                <td>${item.notes || ''}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="event.stopPropagation(); editShippingCost('${item.id}')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="event.stopPropagation(); deleteShippingCost('${item.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    // Update table info
    document.getElementById('tableResultCount').textContent = 
        `Hiển thị ${pageData.length} / ${filteredData.length} kết quả`;
    
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginationInfo = document.getElementById('paginationInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    paginationInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
    
    // Update navigation buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = i === currentPage ? 'active' : '';
        button.onclick = () => goToPage(i);
        pageNumbers.appendChild(button);
    }
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        updateTable();
    }
}

// Go to specific page
function goToPage(page) {
    currentPage = page;
    updateTable();
}

// Initialize chart
function initializeChart() {
    const ctx = document.getElementById('shippingCostChart').getContext('2d');
    
    shippingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Chi phí nhập hàng',
                data: [],
                borderColor: 'rgb(79, 172, 254)',
                backgroundColor: 'rgba(79, 172, 254, 0.1)',
                tension: 0.4
            }, {
                label: 'Chi phí xuất hàng',
                data: [],
                borderColor: 'rgb(67, 233, 123)',
                backgroundColor: 'rgba(67, 233, 123, 0.1)',
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
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            }
        }
    });
}

// Update chart
function updateChart() {
    const chartType = document.getElementById('chartType').value;
    const chartData = generateChartData(chartType);
    
    shippingChart.data.labels = chartData.labels;
    shippingChart.data.datasets[0].data = chartData.importData;
    shippingChart.data.datasets[1].data = chartData.exportData;
    shippingChart.update();
}

// Generate chart data
function generateChartData(type) {
    const labels = [];
    const importData = [];
    const exportData = [];
    
    console.log('Generating chart data for type:', type);
    console.log('Filtered data:', filteredData);
    
    // If no data, create chart with last 7 days for daily view
    if (!filteredData || filteredData.length === 0) {
        if (type === 'daily') {
            // Show last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const key = date.toISOString().split('T')[0];
                labels.push(formatChartLabel(key, type));
                importData.push(0);
                exportData.push(0);
            }
        } else {
            const today = new Date();
            let key;
            
            switch (type) {
                case 'weekly':
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'monthly':
                default:
                    key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                    break;
            }
            
            labels.push(formatChartLabel(key, type));
            importData.push(0);
            exportData.push(0);
        }
        
        return { labels, importData, exportData };
    }
    
    // For daily view, create a complete date range
    if (type === 'daily') {
        // Get date range from data or default to last 7 days
        let minDate = new Date();
        let maxDate = new Date();
        
        if (filteredData.length > 0) {
            const dates = filteredData.map(item => new Date(item.timestamp || item.date));
            minDate = new Date(Math.min(...dates));
            maxDate = new Date(Math.max(...dates));
            
            // Extend range to show at least 7 days
            const daysDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24);
            if (daysDiff < 6) {
                minDate.setDate(maxDate.getDate() - 6);
            }
        } else {
            minDate.setDate(maxDate.getDate() - 6);
        }
        
        // Create data for each day in range
        const groupedData = {};
        filteredData.forEach(item => {
            const date = new Date(item.timestamp || item.date);
            const key = date.toISOString().split('T')[0];
            
            if (!groupedData[key]) {
                groupedData[key] = { import: 0, export: 0 };
            }
            
            const cost = item.shippingCost || 0;
            if (item.transactionType === 'import' || item.type === 'import' || item.type === 'in') {
                groupedData[key].import += cost;
            } else {
                groupedData[key].export += cost;
            }
        });
        
        // Fill in all dates in range
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().split('T')[0];
            labels.push(formatChartLabel(key, type));
            importData.push(groupedData[key] ? groupedData[key].import : 0);
            exportData.push(groupedData[key] ? groupedData[key].export : 0);
        }
    } else {
        // Group data by time period for weekly/monthly
        const groupedData = {};
        
        filteredData.forEach(item => {
            const date = new Date(item.timestamp || item.date);
            let key;
            
            switch (type) {
                case 'weekly':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'monthly':
                default:
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
            }
            
            if (!groupedData[key]) {
                groupedData[key] = { import: 0, export: 0 };
            }
            
            const cost = item.shippingCost || 0;
            if (item.transactionType === 'import' || item.type === 'import' || item.type === 'in') {
                groupedData[key].import += cost;
            } else {
                groupedData[key].export += cost;
            }
        });
        
        // Sort keys and create chart data
        const sortedKeys = Object.keys(groupedData).sort();
        
        sortedKeys.forEach(key => {
            labels.push(formatChartLabel(key, type));
            importData.push(groupedData[key].import);
            exportData.push(groupedData[key].export);
        });
    }
    
    console.log('Chart data generated:', { labels, importData, exportData });
    
    return { labels, importData, exportData };
}

// Format chart label
function formatChartLabel(key, type) {
    switch (type) {
        case 'daily':
            return new Date(key).toLocaleDateString('vi-VN');
        case 'weekly':
            return `Tuần ${new Date(key).toLocaleDateString('vi-VN')}`;
        case 'monthly':
        default:
            const [year, month] = key.split('-');
            return `${month}/${year}`;
    }
}

// Modal functions
function openAddShippingCostModal() {
    editingShippingCostId = null;
    document.getElementById('modalTitle').textContent = 'Thêm Chi Phí Vận Chuyển';
    document.getElementById('shippingCostForm').reset();
    
    // Set default date
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('transactionDate').value = localDateTime;
    
    document.getElementById('shippingCostModal').classList.add('show');
}

function closeShippingCostModal() {
    document.getElementById('shippingCostModal').classList.remove('show');
    editingShippingCostId = null;
}

function setupModalEventListeners() {
    // Close modal when clicking outside
    document.getElementById('shippingCostModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeShippingCostModal();
        }
    });
}

// Save shipping cost
function saveShippingCost() {
    const form = document.getElementById('shippingCostForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Get form values
    const transactionType = document.getElementById('transactionType').value;
    const transactionDate = document.getElementById('transactionDate').value;
    const storeId = document.getElementById('storeSelect').value;
    const shippingCostInput = document.getElementById('shippingCost');
    const shippingCost = parseFloat(shippingCostInput.value.replace(/\./g, '')) || 0;
    const shippingMethod = document.getElementById('shippingMethod').value;
    const notes = document.getElementById('notes').value;
    
    // Validation
    if (!transactionType || !transactionDate || !storeId || !shippingCost || !shippingMethod) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
        return;
    }
    
    // Validate shipping cost range
    if (shippingCost > 100000000) {
        alert('Chi phí vận chuyển không được vượt quá 100,000,000 VNĐ!');
        return;
    }
    
    if (shippingCost < 0) {
        alert('Chi phí vận chuyển không được âm!');
        return;
    }
    
    // Get store name from stores data
    database.ref(`stores/${storeId}`).once('value', (snapshot) => {
        const storeData = snapshot.val();
        const storeName = storeData ? storeData.name : 'Không xác định';
        
        const shippingCostData = {
            transactionType,
            date: transactionDate,
            timestamp: new Date().toISOString(),
            storeId,
            storeName,
            shippingCost,
            shippingMethod,
            notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (editingShippingCostId) {
            // Update existing shipping cost
            database.ref(`shippingCosts/${editingShippingCostId}`).update(shippingCostData)
                .then(() => {
                    console.log('Shipping cost updated successfully');
        
                    closeShippingCostModal();
                    resetForm();
                })
                .catch((error) => {
                    console.error('Error updating shipping cost:', error);
                    alert('Có lỗi xảy ra khi cập nhật chi phí vận chuyển!');
                });
        } else {
            // Add new shipping cost
            database.ref('shippingCosts').push(shippingCostData)
                .then(() => {
                    console.log('Shipping cost saved successfully');
                
                    closeShippingCostModal();
                    resetForm();
                })
                .catch((error) => {
                    console.error('Error saving shipping cost:', error);
                    // Check if data was actually saved despite the error
                    setTimeout(() => {
                        database.ref('shippingCosts').orderByChild('timestamp').limitToLast(1).once('value', (snapshot) => {
                            if (snapshot.exists()) {
                                const data = snapshot.val();
                                const lastEntry = Object.values(data)[0];
                                if (lastEntry.timestamp === shippingCostData.timestamp) {
                                    alert('Dữ liệu đã được lưu thành công!');
                                    closeShippingCostModal();
                                    resetForm();
                                    return;
                                }
                            }
                            alert('Có lỗi xảy ra khi lưu chi phí vận chuyển!');
                        });
                    }, 1000);
                });
        }
    });
}

// Edit shipping cost
function editShippingCost(id) {
    const item = shippingCostData.find(item => item.id === id);
    if (!item) return;
    
    editingShippingCostId = id;
    document.getElementById('modalTitle').textContent = 'Chỉnh Sửa Chi Phí Vận Chuyển';
    
    // Fill form with existing data
    document.getElementById('transactionType').value = item.type || '';
    document.getElementById('transactionDate').value = item.timestamp || '';
    document.getElementById('storeSelect').value = item.storeId || '';
    document.getElementById('supplierSelect').value = item.supplier || '';
    document.getElementById('productSelect').value = item.productId || '';
    document.getElementById('quantity').value = item.quantity || '';
    document.getElementById('shippingCost').value = item.shippingCost || '';
    document.getElementById('transactionId').value = item.transactionId || '';
    document.getElementById('notes').value = item.notes || '';
    
    document.getElementById('shippingCostModal').classList.add('show');
}

// Delete shipping cost
function deleteShippingCost(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa chi phí vận chuyển này?')) return;
    
    database.ref(`shippingCosts/${id}`).remove()
        .then(() => {
            showNotification('Xóa chi phí vận chuyển thành công!', 'success');
        })
        .catch(error => {
            console.error('Error deleting shipping cost:', error);
            showNotification('Lỗi khi xóa chi phí vận chuyển!', 'error');
        });
}

// View shipping cost detail
function viewShippingCostDetail(id) {
    const item = shippingCostData.find(item => item.id === id);
    if (!item) return;
    
    // You can implement a detail modal here
    console.log('Viewing shipping cost detail:', item);
}

// Export to Excel
function exportToExcel() {
    if (filteredData.length === 0) {
        showNotification('Không có dữ liệu để xuất!', 'warning');
        return;
    }
    
    const exportData = filteredData.map((item, index) => ({
        'STT': index + 1,
        'Ngày': formatDateTime(item.timestamp || item.date),
        'Loại Giao Dịch': item.transactionType === 'import' ? 'Nhập hàng' : 'Xuất hàng',
        'Mã Giao Dịch': item.transactionId || item.id,
        'Cửa Hàng': item.storeName || 'N/A',
        'Hình Thức Vận Chuyển': getShippingMethodName(item.shippingMethod),
        'Nhà Cung Cấp': item.supplier || 'N/A',
        'Sản Phẩm': item.productName || 'N/A',
        'Số Lượng': item.quantity || 0,
        'Chi Phí Vận Chuyển (VNĐ)': formatCurrency(item.shippingCost || 0),
        'Ghi Chú': item.notes || ''
    }));
    
    // Create and download Excel file
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi Phí Vận Chuyển');
    
    const fileName = `chi-phi-van-chuyen-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    showNotification('Xuất Excel thành công!', 'success');
}

// Get shipping method display name
function getShippingMethodName(method) {
    const methods = {
        'xe_tai': 'Chành Xe',
        'ship_cod': 'Ship COD',
        'grab_express': 'Grab Express',
        'giao_hang_nhanh': 'Giao Hàng Nhanh',
        'giao_hang_tiet_kiem': 'Giao Hàng Tiết Kiệm',
        'viettel_post': 'Viettel Post',
        'vnpost': 'VN Post',
        'j_t_express': 'J&T Express',
        'shopee_express': 'Shopee Express',
        'lazada_express': 'Lazada Express',
        'khac': 'Khác'
    };
    return methods[method] || method || 'N/A';
}

// Utility functions
function generateTransactionId() {
    return 'SC' + Date.now().toString().slice(-8);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(num);
}

function setupNumberFormatting() {
    const shippingCostInput = document.getElementById('shippingCost');
    if (shippingCostInput) {
        shippingCostInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d]/g, '');
            if (value) {
                // Format with dots as thousand separators
                let formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                e.target.value = formatted;
            }
        });
        
        // Store raw value for form submission
        shippingCostInput.addEventListener('blur', function(e) {
            let value = e.target.value.replace(/\./g, '');
            e.target.setAttribute('data-raw-value', value);
        });
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function isThisWeek(date) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return date >= weekStart && date <= weekEnd;
}

function isThisMonth(date) {
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function isThisQuarter(date) {
    const today = new Date();
    const currentQuarter = Math.floor(today.getMonth() / 3);
    const dateQuarter = Math.floor(date.getMonth() / 3);
    return dateQuarter === currentQuarter && date.getFullYear() === today.getFullYear();
}

function isThisYear(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear();
}

function showNotification(message, type) {
    // Simple notification - you can enhance this
    alert(message);
}

// Global functions for HTML onclick events
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.updateChart = updateChart;
window.changePage = changePage;
window.openAddShippingCostModal = openAddShippingCostModal;
window.closeShippingCostModal = closeShippingCostModal;
window.saveShippingCost = saveShippingCost;
window.editShippingCost = editShippingCost;
window.deleteShippingCost = deleteShippingCost;
window.viewShippingCostDetail = viewShippingCostDetail;
window.exportToExcel = exportToExcel;
window.toggleStoreDropdown = toggleStoreDropdown;
window.selectStore = selectStore;