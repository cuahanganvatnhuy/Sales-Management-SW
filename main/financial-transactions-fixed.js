// Fixed columns for TikTok Shop (English names for Excel mapping)
const FIXED_COLUMNS = [
    'Order/adjustment ID',
    'Type',
    'Order created time',
    'Order settled time',
    'Currency',
    'Total settlement amount',
    'Total Revenue',
    'Subtotal after seller discounts',
    'Subtotal before discounts',
    'Seller discounts',
    'Refund subtotal after seller discounts',
    'Refund subtotal before seller discounts',
    'Refund of seller discounts',
    'Total Fees',
    'Transaction fee',
    'TikTok Shop commission fee',
    'Seller shipping fee',
    'Actual shipping fee',
    'Platform shipping fee',
    'Platform VAT',
    'Platform income tax'
];

// Vietnamese display names for columns
const COLUMN_NAMES_VI = {
    'Total settlement amount': 'Tổng thanh toán',
    'Total Revenue': 'Tổng doanh thu',
    'Subtotal after seller discounts': 'Tổng phụ sau giảm giá',
    'Subtotal before discounts': 'Tổng phụ trước giảm giá',
    'Seller discounts': 'Giảm giá người bán',
    'Refund subtotal after seller discounts': 'Hoàn tiền sau giảm giá',
    'Refund subtotal before seller discounts': 'Hoàn tiền trước giảm giá',
    'Refund of seller discounts': 'Hoàn giảm giá',
    'Total Fees': 'Tổng phí',
    'Transaction fee': 'Phí giao dịch',
    'TikTok Shop commission fee': 'Phí hoa hồng TikTok Shop',
    'Seller shipping fee': 'Phí vận chuyển người bán',
    'Actual shipping fee': 'Phí vận chuyển thực tế',
    'Platform shipping fee': 'Phí vận chuyển nền tảng',
    'Platform VAT': 'Thuế VAT nền tảng',
    'Platform income tax': 'Thuế TNCN nền tảng'
};

// Numeric columns for summary
const NUMERIC_COLUMNS = [
    'Total settlement amount',
    'Total Revenue',
    'Subtotal after seller discounts',
    'Subtotal before discounts',
    'Seller discounts',
    'Refund subtotal after seller discounts',
    'Refund subtotal before seller discounts',
    'Refund of seller discounts',
    'Total Fees',
    'Transaction fee',
    'TikTok Shop commission fee',
    'Seller shipping fee',
    'Actual shipping fee',
    'Platform shipping fee',
    'Platform VAT',
    'Platform income tax'
];

// Global variables
let allColumns = [];
let numericColumns = [];
let rawData = [];

// Date range selection state
let selectedDateRange = {
    type: 'today',
    startDate: null,
    endDate: null,
    label: 'Hôm nay'
};

// Format number to VND
function formatVND(amount) {
    if (amount === null || amount === undefined || amount === '') return '0₫';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(num);
}

// Check if a value is numeric
function isNumeric(value) {
    if (value === null || value === undefined || value === '') return false;
    return !isNaN(parseFloat(value)) && isFinite(value);
}

// Format date
function formatDate(dateStr) {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

// Process Excel file
function processExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Vui lòng chọn file Excel');
        return;
    }
    
    // Validate file type
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
        return;
    }
    
    console.log('Processing Excel file:', file.name, 'Size:', file.size, 'bytes');
    showLoading(true);
    
    readExcelFile(file)
        .then(result => {
            console.log('Excel processing completed. Found', result.data.length, 'rows');
            
            if (result.data.length === 0) {
                alert('Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra lại cấu trúc file.');
                showLoading(false);
                return;
            }
            
            // Store raw data globally
            rawData = result.data;
            
            // Display data
            displaySummaryCards();
            displayTransactionTable();
            showLoading(false);
            
            showNotification(`Đã xử lý sheet "${result.sheetName}": ${result.data.length} đơn hàng`, 'success');
            
            // Show save buttons footer after displaying data
            showSaveFooter();
        })
        .catch(error => {
            console.error('Error processing Excel file:', error);
            alert('Có lỗi xảy ra khi xử lý file Excel: ' + error.message);
            showLoading(false);
        });
}

// Read Excel file
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                console.log('Excel workbook sheets:', workbook.SheetNames);
                
                // Find "Order details" sheet
                let targetSheetName = workbook.SheetNames.find(name => 
                    name.toLowerCase().includes('order details') || 
                    name.toLowerCase().includes('order_details') ||
                    name.toLowerCase() === 'order details'
                );
                
                if (!targetSheetName) {
                    console.warn('Sheet "Order details" not found, using first sheet');
                    targetSheetName = workbook.SheetNames[0];
                }
                
                const worksheet = workbook.Sheets[targetSheetName];
                console.log('Processing sheet:', targetSheetName);
                
                // Get sheet range
                const range = XLSX.utils.decode_range(worksheet['!ref']);
                console.log('Sheet range:', range, 'Total rows in sheet:', range.e.r + 1);
                
                // Try Method 1: sheet_to_json with header row
                let jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                    defval: '',
                    blankrows: false
                });
                
                console.log('Method 1 - sheet_to_json result:', jsonData.length);
                
                // If we only got 1 row, try reading as array and convert manually
                if (jsonData.length <= 1 && range.e.r > 1) {
                    console.log('Only got', jsonData.length, 'rows, trying array method...');
                    
                    // Read all rows as arrays
                    const arrayData = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1,
                        raw: false,
                        defval: '',
                        blankrows: false
                    });
                    
                    console.log('Method 2 - Array data rows:', arrayData.length);
                    console.log('First few rows:', arrayData.slice(0, 3));
                    
                    if (arrayData.length > 1) {
                        // Find header row (first non-empty row with "Order" or "Type")
                        let headerRowIndex = 0;
                        for (let i = 0; i < Math.min(5, arrayData.length); i++) {
                            const row = arrayData[i];
                            if (row && row.length > 0) {
                                const hasOrderColumn = row.some(cell => 
                                    cell && typeof cell === 'string' && 
                                    (cell.toLowerCase().includes('order') || cell.toLowerCase().includes('type'))
                                );
                                if (hasOrderColumn) {
                                    headerRowIndex = i;
                                    console.log('Found header row at index:', i);
                                    break;
                                }
                            }
                        }
                        
                        const headers = arrayData[headerRowIndex];
                        const dataRows = arrayData.slice(headerRowIndex + 1);
                        
                        console.log('Headers:', headers);
                        console.log('Data rows count:', dataRows.length);
                        
                        // Convert array data to objects
                        jsonData = dataRows.map(row => {
                            const obj = {};
                            headers.forEach((header, idx) => {
                                if (header) {
                                    obj[header] = row[idx] || '';
                                }
                            });
                            return obj;
                        }).filter(row => {
                            // Filter out completely empty rows
                            return Object.values(row).some(val => val !== '' && val !== null && val !== undefined);
                        });
                        
                        console.log('Method 2 - Converted to objects:', jsonData.length);
                    }
                }
                
                console.log('Final JSON data rows:', jsonData.length);
                console.log('Sample data (first 5):', jsonData.slice(0, 5));
                
                // Clean data - trim all string values
                jsonData = jsonData.map(row => {
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim();
                        const value = row[key];
                        cleanRow[cleanKey] = typeof value === 'string' ? value.trim() : value;
                    });
                    return cleanRow;
                });
                
                console.log('After cleaning, total rows:', jsonData.length);
                
                resolve({
                    data: jsonData,
                    sheetName: targetSheetName
                });
            } catch (error) {
                console.error('Error reading Excel file:', error);
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            reject(new Error('Lỗi khi đọc file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Display summary cards for numeric columns
function displaySummaryCards() {
    const summaryContainer = document.getElementById('summaryCardsContainer');
    if (!summaryContainer) {
        console.error('Summary cards container not found');
        return;
    }
    
    summaryContainer.innerHTML = '';
    
    if (rawData.length === 0) {
        summaryContainer.innerHTML = '<p class="empty-message">Chưa có dữ liệu</p>';
        return;
    }
    
    // Calculate sum for each numeric column
    NUMERIC_COLUMNS.forEach(col => {
        const sum = rawData.reduce((total, row) => {
            const value = parseFloat(row[col]);
            return total + (isNaN(value) ? 0 : value);
        }, 0);
        
        const card = document.createElement('div');
        card.className = 'summary-card';
        
        // Determine if this is a key column for highlighting
        const isKeyColumn = col.toLowerCase().includes('settlement') || 
                           col.toLowerCase().includes('total revenue');
        
        // Use Vietnamese name if available, otherwise use English name
        const displayName = COLUMN_NAMES_VI[col] || col;
        
        card.innerHTML = `
            <h3>${displayName}</h3>
            <div class="summary-amount ${isKeyColumn ? 'highlight' : ''}">${formatVND(sum)}</div>
            <div class="summary-note">${rawData.length} đơn hàng</div>
        `;
        
        summaryContainer.appendChild(card);
    });
}

// Display transaction table with fixed columns
function displayTransactionTable() {
    const tbody = document.getElementById('transactionTableBody');
    const tfoot = document.getElementById('transactionTableFooter');
    
    if (!tbody) {
        console.error('Transaction table body not found');
        return;
    }
    
    console.log('Displaying table with', rawData.length, 'rows');
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (rawData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${FIXED_COLUMNS.length + 1}" class="empty-table-message">Chưa có dữ liệu. Vui lòng tải lên file báo cáo.</td></tr>`;
        if (tfoot) tfoot.classList.add('hidden');
        return;
    }
    
    // Add data rows
    rawData.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Determine row class based on settlement amount
        let rowClass = '';
        const settlementValue = parseFloat(row['Total settlement amount']);
        if (!isNaN(settlementValue)) {
            if (settlementValue < 0) rowClass = 'refund-row';
            else if (settlementValue === 0) rowClass = 'zero-row';
        }
        tr.className = rowClass;
        
        // Add STT
        const tdSTT = document.createElement('td');
        tdSTT.textContent = index + 1;
        tr.appendChild(tdSTT);
        
        // Add data for each fixed column
        FIXED_COLUMNS.forEach(col => {
            const td = document.createElement('td');
            const value = row[col];
            const isNum = NUMERIC_COLUMNS.includes(col);
            
            // Format value
            if (isNum) {
                td.textContent = formatVND(value);
                td.style.textAlign = 'right';
                
                // Highlight negative values
                if (parseFloat(value) < 0) {
                    td.style.color = '#f44336';
                    td.style.fontWeight = 'bold';
                }
            } else if (col.toLowerCase().includes('time') || col.toLowerCase().includes('date')) {
                td.textContent = formatDate(value);
            } else {
                td.textContent = value || '';
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    // Update footer totals
    if (tfoot) {
        updateFooterTotals();
        tfoot.classList.remove('hidden');
    }
}

// Update footer totals
function updateFooterTotals() {
    NUMERIC_COLUMNS.forEach(col => {
        const sum = rawData.reduce((total, row) => {
            const value = parseFloat(row[col]);
            return total + (isNaN(value) ? 0 : value);
        }, 0);
        
        const footerCell = document.getElementById(`sum_${col.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (footerCell) {
            footerCell.textContent = formatVND(sum);
        }
    });
}

// Show/hide loading overlay
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .toast-success { background: #4caf50; }
            .toast-error { background: #f44336; }
            .toast-warning { background: #ff9800; }
            .toast-info { background: #2196f3; }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Calculate date ranges
function calculateDateRange(type) {
    const today = new Date();
    let startDate, endDate, label;
    
    switch(type) {
        case 'today':
            startDate = endDate = new Date(today);
            label = `Hôm nay (${formatDateVN(today)})`;
            break;
            
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            startDate = weekStart;
            endDate = weekEnd;
            label = `Tuần này (${formatDateVN(weekStart)} - ${formatDateVN(weekEnd)})`;
            break;
            
        case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            startDate = monthStart;
            endDate = monthEnd;
            label = `Tháng này (${formatDateVN(monthStart)} - ${formatDateVN(monthEnd)})`;
            break;
            
        default:
            startDate = endDate = today;
            label = 'Hôm nay';
    }
    
    return { startDate, endDate, label };
}

// Format date to Vietnamese
function formatDateVN(date) {
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Update date range display
function updateDateRangeDisplay() {
    const displayText = document.getElementById('selectedRangeText');
    if (displayText) {
        displayText.textContent = `Đã chọn: ${selectedDateRange.label}`;
    }
}

// Update custom date range
function updateCustomDateRange() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput.value && endDateInput.value) {
        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);
        
        if (start > end) {
            alert('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
            return;
        }
        
        selectedDateRange.startDate = start;
        selectedDateRange.endDate = end;
        selectedDateRange.label = `${formatDateVN(start)} - ${formatDateVN(end)}`;
        updateDateRangeDisplay();
    }
}

// Handle date range button clicks
function initDateRangeHandlers() {
    const buttons = document.querySelectorAll('.btn-date-range');
    const customDateRange = document.getElementById('customDateRange');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const rangeType = this.getAttribute('data-range');
            
            if (rangeType === 'custom') {
                customDateRange.classList.remove('hidden');
                selectedDateRange.type = 'custom';
                if (!startDateInput.value) {
                    startDateInput.value = new Date().toISOString().split('T')[0];
                }
                if (!endDateInput.value) {
                    endDateInput.value = new Date().toISOString().split('T')[0];
                }
                updateCustomDateRange();
            } else {
                customDateRange.classList.add('hidden');
                selectedDateRange.type = rangeType;
                const range = calculateDateRange(rangeType);
                selectedDateRange.startDate = range.startDate;
                selectedDateRange.endDate = range.endDate;
                selectedDateRange.label = range.label;
                updateDateRangeDisplay();
            }
        });
    });
    
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', updateCustomDateRange);
        endDateInput.addEventListener('change', updateCustomDateRange);
    }
    
    const range = calculateDateRange('today');
    selectedDateRange.startDate = range.startDate;
    selectedDateRange.endDate = range.endDate;
    selectedDateRange.label = range.label;
    updateDateRangeDisplay();
}

// Show save footer
function showSaveFooter() {
    const footer = document.getElementById('saveActionsFooter');
    const storeNameSpan = document.getElementById('footerStoreName');
    const dateRangeSpan = document.getElementById('footerDateRange');
    const orderCountSpan = document.getElementById('footerOrderCount');
    
    if (!footer) {
        console.error('Save actions footer not found!');
        return;
    }
    
    // Get current store from localStorage (using keys from main/header.js)
    let currentStoreName = 'Chưa chọn cửa hàng';
    try {
        const storeDataStr = localStorage.getItem('selectedStoreData');
        if (storeDataStr) {
            const storeData = JSON.parse(storeDataStr);
            currentStoreName = storeData.name || currentStoreName;
        }
    } catch (e) {
        console.error('Error parsing store data:', e);
    }
    
    // Populate footer info
    if (storeNameSpan) storeNameSpan.textContent = currentStoreName;
    if (dateRangeSpan) dateRangeSpan.textContent = selectedDateRange.label;
    if (orderCountSpan) orderCountSpan.textContent = `${rawData.length} đơn`;
    
    // Show footer
    footer.classList.remove('hidden');
}

// Hide save footer
function hideSaveFooter() {
    const footer = document.getElementById('saveActionsFooter');
    if (footer) {
        footer.classList.add('hidden');
    }
}

// Save transaction data to Firebase
async function saveTransactionData() {
    try {
        showLoading(true);
        
        console.log('=== SAVING DATA ===');
        
        // Try to sign in anonymously if not authenticated
        let user = firebase.auth().currentUser;
        if (!user) {
            console.log('No user, signing in anonymously...');
            try {
                const result = await firebase.auth().signInAnonymously();
                user = result.user;
                console.log('Signed in anonymously:', user.uid);
            } catch (error) {
                console.error('Error signing in anonymously:', error);
                alert('Không thể kết nối đến Firebase. Vui lòng thử lại.');
                showLoading(false);
                return;
            }
        }
        
        // Get current store from localStorage (using keys from main/header.js)
        const currentStoreId = localStorage.getItem('selectedStoreId');
        const storeDataStr = localStorage.getItem('selectedStoreData');
        
        if (!currentStoreId) {
            alert('Vui lòng chọn cửa hàng trước khi lưu dữ liệu');
            showLoading(false);
            return;
        }
        
        let currentStoreName = 'Unknown Store';
        try {
            if (storeDataStr) {
                const storeData = JSON.parse(storeDataStr);
                currentStoreName = storeData.name || currentStoreName;
            }
        } catch (e) {
            console.error('Error parsing store data:', e);
        }
        
        const totalSettlement = rawData.reduce((sum, row) => {
            const value = parseFloat(row['Total settlement amount']);
            return sum + (isNaN(value) ? 0 : value);
        }, 0);
        
        const totalRevenue = rawData.reduce((sum, row) => {
            const value = parseFloat(row['Total Revenue']);
            return sum + (isNaN(value) ? 0 : value);
        }, 0);
        
        const totalFees = rawData.reduce((sum, row) => {
            const value = parseFloat(row['Total Fees']);
            return sum + (isNaN(value) ? 0 : value);
        }, 0);
        
        const dataToSave = {
            storeId: currentStoreId,
            storeName: currentStoreName,
            dateRange: {
                type: selectedDateRange.type,
                startDate: selectedDateRange.startDate ? selectedDateRange.startDate.toISOString() : null,
                endDate: selectedDateRange.endDate ? selectedDateRange.endDate.toISOString() : null,
                label: selectedDateRange.label
            },
            transactions: rawData,
            summary: {
                totalOrders: rawData.length,
                totalRevenue: totalRevenue,
                totalSettlement: totalSettlement,
                totalFees: totalFees
            },
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        };
        
        await firebase.firestore()
            .collection('financialTransactions')
            .add(dataToSave);
        
        showLoading(false);
        hideSaveFooter();
        showNotification('Đã lưu dữ liệu giao dịch thành công!', 'success');
        
    } catch (error) {
        console.error('Error saving data:', error);
        showLoading(false);
        alert('Có lỗi khi lưu dữ liệu: ' + error.message);
    }
}

// Initialize save button handlers
function initSaveModalHandlers() {
    const btnNoSave = document.getElementById('btnNoSave');
    const btnSaveData = document.getElementById('btnSaveData');
    
    if (btnNoSave) {
        btnNoSave.addEventListener('click', () => {
            hideSaveFooter();
            showNotification('Đã hủy lưu dữ liệu', 'info');
        });
    }
    
    if (btnSaveData) {
        btnSaveData.addEventListener('click', () => {
            saveTransactionData();
        });
    }
}

// Load current store name on page load
function loadCurrentStoreName() {
    try {
        const storeDataStr = localStorage.getItem('selectedStoreData');
        if (storeDataStr) {
            const storeData = JSON.parse(storeDataStr);
            const currentStoreName = document.getElementById('currentStoreName');
            if (currentStoreName && storeData.name) {
                currentStoreName.textContent = storeData.name;
                console.log('Loaded current store:', storeData.name);
            }
        }
    } catch (e) {
        console.error('Error loading current store name:', e);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Financial transactions page loaded (Fixed columns version)');
    
    // Load current store name
    setTimeout(() => {
        loadCurrentStoreName();
    }, 1000);
    
    const fileUploadLabel = document.querySelector('.file-upload-label');
    const fileInput = document.getElementById('excelFile');
    
    if (!fileUploadLabel || !fileInput) {
        console.error('File upload elements not found');
        return;
    }
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        fileUploadLabel.style.borderColor = '#1890ff';
        fileUploadLabel.style.backgroundColor = '#f5f9ff';
    }
    
    function unhighlight() {
        fileUploadLabel.style.borderColor = '#d9d9d9';
        fileUploadLabel.style.backgroundColor = 'transparent';
    }
    
    // Handle dropped files
    fileUploadLabel.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                file.type === 'application/vnd.ms-excel' ||
                file.name.endsWith('.xlsx') || 
                file.name.endsWith('.xls')) {
                fileInput.files = files;
                console.log('File dropped:', file.name);
                setTimeout(() => processExcel(), 100);
            } else {
                alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            }
        }
    }
    
    // Auto process when file is selected
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            setTimeout(() => processExcel(), 100);
        }
    });
    
    // Initialize date range handlers
    initDateRangeHandlers();
    
    // Initialize save modal handlers
    initSaveModalHandlers();
});
