// Format number to VND
function formatVND(amount) {
    if (amount === null || amount === undefined || amount === '') return '0₫';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount; // Return as-is if not a number
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

// Global variables
let allColumns = [];
let numericColumns = [];
let rawData = [];

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
            
            // Get all columns from first row
            allColumns = Object.keys(result.data[0]);
            console.log('All columns:', allColumns);
            
            // Detect numeric columns
            numericColumns = detectNumericColumns(result.data);
            console.log('Numeric columns:', numericColumns);
            
            // Display data
            displaySummaryCards();
            displayTransactionTable();
            showLoading(false);
            
            showNotification(`Đã xử lý sheet "${result.sheetName}": ${result.data.length} dòng với ${allColumns.length} cột`, 'success');
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
                
                // Find "Order details" sheet, fallback to first sheet if not found
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
                
                // Convert to JSON
                let jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                    defval: ''
                });
                
                console.log('Converted to JSON, rows:', jsonData.length);
                console.log('First 3 rows sample:', jsonData.slice(0, 3));
                
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
                
                console.log('After cleaning, rows:', jsonData.length);
                console.log('Final data to return:', jsonData.slice(0, 3));
                
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

// Detect which columns contain numeric data
function detectNumericColumns(data) {
    if (data.length === 0) return [];
    
    const columns = Object.keys(data[0]);
    const numeric = [];
    
    columns.forEach(col => {
        // Check if at least 50% of non-empty values are numeric
        let numericCount = 0;
        let totalCount = 0;
        
        data.forEach(row => {
            const value = row[col];
            if (value !== null && value !== undefined && value !== '') {
                totalCount++;
                if (isNumeric(value)) {
                    numericCount++;
                }
            }
        });
        
        if (totalCount > 0 && numericCount / totalCount >= 0.5) {
            numeric.push(col);
        }
    });
    
    return numeric;
}

// Display summary cards for all numeric columns
function displaySummaryCards() {
    const summaryContainer = document.getElementById('summaryCardsContainer');
    if (!summaryContainer) {
        console.error('Summary cards container not found');
        return;
    }
    
    summaryContainer.innerHTML = '';
    
    if (numericColumns.length === 0) {
        summaryContainer.innerHTML = '<p class="empty-message">Không tìm thấy cột số để tính tổng</p>';
        return;
    }
    
    // Calculate sum for each numeric column
    numericColumns.forEach(col => {
        const sum = rawData.reduce((total, row) => {
            const value = parseFloat(row[col]);
            return total + (isNaN(value) ? 0 : value);
        }, 0);
        
        const card = document.createElement('div');
        card.className = 'summary-card';
        
        // Determine if this is a key column for highlighting
        const isKeyColumn = col.toLowerCase().includes('settlement') || 
                           col.toLowerCase().includes('revenue') ||
                           col.toLowerCase().includes('total');
        
        card.innerHTML = `
            <h3>${col}</h3>
            <div class="summary-amount ${isKeyColumn ? 'highlight' : ''}">${formatVND(sum)}</div>
            <div class="summary-note">${rawData.length} giao dịch</div>
        `;
        
        summaryContainer.appendChild(card);
    });
}

// Display transaction table with all columns
function displayTransactionTable() {
    const tableContainer = document.getElementById('transactionTableContainer');
    if (!tableContainer) {
        console.error('Transaction table container not found');
        return;
    }
    
    console.log('displayTransactionTable called with rawData.length:', rawData.length);
    console.log('rawData sample:', rawData.slice(0, 3));
    
    if (rawData.length === 0 || allColumns.length === 0) {
        tableContainer.innerHTML = '<p class="empty-table-message">Chưa có dữ liệu</p>';
        return;
    }
    
    // Create table
    let tableHTML = '<div class="table-responsive"><table class="transaction-table"><thead><tr>';
    
    // Add STT column
    tableHTML += '<th>STT</th>';
    
    // Add all columns as headers
    allColumns.forEach(col => {
        tableHTML += `<th>${col}</th>`;
    });
    
    tableHTML += '</tr></thead><tbody>';
    
    // Add data rows
    rawData.forEach((row, index) => {
        // Determine row class based on settlement amount if exists
        let rowClass = '';
        const settlementCol = allColumns.find(col => 
            col.toLowerCase().includes('settlement') || 
            col.toLowerCase().includes('net amount')
        );
        
        if (settlementCol) {
            const value = parseFloat(row[settlementCol]);
            if (!isNaN(value)) {
                if (value < 0) rowClass = 'refund-row';
                else if (value === 0) rowClass = 'zero-row';
            }
        }
        
        tableHTML += `<tr class="${rowClass}">`;
        tableHTML += `<td>${index + 1}</td>`;
        
        allColumns.forEach(col => {
            const value = row[col];
            const isNum = numericColumns.includes(col);
            
            // Format value
            let displayValue;
            if (isNum) {
                displayValue = formatVND(value);
            } else if (col.toLowerCase().includes('time') || col.toLowerCase().includes('date')) {
                displayValue = formatDate(value);
            } else {
                displayValue = value || '';
            }
            
            // Style for numeric columns
            const style = isNum ? 'text-align: right;' : '';
            
            // Highlight negative values in red
            let cellStyle = style;
            if (isNum && parseFloat(value) < 0) {
                cellStyle += ' color: #f44336; font-weight: bold;';
            }
            
            tableHTML += `<td style="${cellStyle}">${displayValue}</td>`;
        });
        
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody>';
    
    // Add footer with totals
    tableHTML += '<tfoot><tr class="total-row">';
    tableHTML += '<td colspan="1"><strong>Tổng cộng:</strong></td>';
    
    allColumns.forEach(col => {
        if (numericColumns.includes(col)) {
            const sum = rawData.reduce((total, row) => {
                const value = parseFloat(row[col]);
                return total + (isNaN(value) ? 0 : value);
            }, 0);
            tableHTML += `<td style="text-align: right;"><strong>${formatVND(sum)}</strong></td>`;
        } else {
            tableHTML += '<td></td>';
        }
    });
    
    tableHTML += '</tr></tfoot></table></div>';
    
    tableContainer.innerHTML = tableHTML;
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
    
    // Create toast notification
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
    
    // Add styles if not exists
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
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Financial transactions page loaded (Dynamic version)');
    
    // Initialize drag and drop functionality
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
    
    // Highlight drop area when item is dragged over it
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
                
                // Auto-process the file immediately
                setTimeout(() => {
                    processExcel();
                }, 100);
            } else {
                alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            }
        }
    }
    
    // Add file change event listener - auto process when file is selected
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            // Auto-process the file immediately
            setTimeout(() => {
                processExcel();
            }, 100);
        }
    });
});
