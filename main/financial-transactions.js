// Format number to VND
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
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
        .then(data => {
            console.log('Excel processing completed. Found', data.length, 'transactions');
            
            if (data.length === 0) {
                alert('Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra lại cấu trúc file.');
                showLoading(false);
                return;
            }
            
            // Process data and update UI
            displayTransactionHistory(data);
            updateSummary();
            showLoading(false);
            
            // Show success message with column mapping info
            const mapping = detectColumnMapping(Object.keys(data[0] || {}));
            const mappingInfo = Object.keys(mapping).length > 0 ? 
                `\nCác cột được nhận diện: ${Object.keys(mapping).join(', ')}` : '';
            
            showNotification(`Đã xử lý thành công ${data.length} giao dịch từ file ${file.name}${mappingInfo}`, 'success');
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
                
                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                console.log('Processing sheet:', firstSheetName);
                
                // Try multiple conversion methods to ensure we get all data
                let jsonData = [];
                
                // Method 1: Simple JSON conversion
                try {
                    jsonData = XLSX.utils.sheet_to_json(worksheet);
                    console.log('Method 1 - Simple JSON conversion result count:', jsonData.length);
                } catch (e) {
                    console.log('Method 1 failed:', e);
                }
                
                // Method 2: Array format conversion
                if (jsonData.length <= 1) {
                    console.log('Trying Method 2 - Array format conversion...');
                    try {
                        const arrayData = XLSX.utils.sheet_to_json(worksheet, {
                            header: 1,
                            defval: '',
                            raw: false
                        });
                        
                        console.log('Method 2 - Array conversion result (first 5 rows):', arrayData.slice(0, 5));
                        
                        if (arrayData.length > 0) {
                            const headers = arrayData[0];
                            const dataRows = arrayData.slice(1);
                            
                            console.log('Method 2 - Headers:', headers);
                            console.log('Method 2 - Data rows count:', dataRows.length);
                            
                            jsonData = dataRows.map((row, index) => {
                                const obj = {};
                                headers.forEach((header, colIndex) => {
                                    obj[header] = row[colIndex] || '';
                                });
                                return obj;
                            }).filter(row => {
                                // Filter out completely empty rows
                                return Object.values(row).some(value => value !== '');
                            });
                            
                            console.log('Method 2 - Converted object data count:', jsonData.length);
                        }
                    } catch (e) {
                        console.log('Method 2 failed:', e);
                    }
                }
                
                // Method 3: Raw range reading
                if (jsonData.length <= 1) {
                    console.log('Trying Method 3 - Raw range reading...');
                    try {
                        const range = XLSX.utils.decode_range(worksheet['!ref']);
                        console.log('Method 3 - Sheet range:', range);
                        console.log('Method 3 - Total rows in range:', range.e.r + 1);
                        
                        const rawData = [];
                        for (let row = range.s.r; row <= range.e.r; row++) {
                            const rowData = {};
                            for (let col = range.s.c; col <= range.e.c; col++) {
                                const cellAddress = XLSX.utils.encode_cell({r: row, c: col});
                                const cell = worksheet[cellAddress];
                                const headerAddress = XLSX.utils.encode_cell({r: 0, c: col});
                                const headerCell = worksheet[headerAddress];
                                
                                if (headerCell && headerCell.v) {
                                    rowData[headerCell.v] = cell ? cell.v : '';
                                }
                            }
                            if (Object.keys(rowData).length > 0) {
                                rawData.push(rowData);
                            }
                        }
                        
                        console.log('Method 3 - Raw data count:', rawData.length);
                        if (rawData.length > jsonData.length) {
                            jsonData = rawData;
                            console.log('Method 3 - Using raw data instead');
                        }
                    } catch (e) {
                        console.log('Method 3 failed:', e);
                    }
                }
                
                console.log('Final JSON data count:', jsonData.length);
                console.log('First few rows:', jsonData.slice(0, 3));
                
                // Debug: Check if data is being filtered somewhere
                if (jsonData.length === 1) {
                    console.warn('⚠️ Only 1 row found! This might indicate a problem with Excel reading.');
                    console.log('Full data structure:', jsonData);
                }
                
                // Process the data
                const processedData = processExcelData(jsonData);
                resolve(processedData);
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

// Process Excel data into our format
function processExcelData(data) {
    console.log('Raw Excel data:', data);
    console.log('Total rows in Excel:', data.length);
    
    if (!data || data.length === 0) {
        console.warn('No data found in Excel file');
        return [];
    }
    
    // Log first row to understand structure
    console.log('First row keys:', Object.keys(data[0]));
    console.log('First row sample:', data[0]);
    
    // Show column mapping info
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    console.log('Available columns in Excel:', availableColumns);
    
    // Debug: Check if we have the expected columns
    const hasTotalRevenue = availableColumns.includes('Total Revenue');
    const hasTotalSettlement = availableColumns.includes('Total settlement amount');
    console.log('Has Total Revenue column:', hasTotalRevenue);
    console.log('Has Total settlement amount column:', hasTotalSettlement);
    
    // Try to detect column mapping automatically
    const columnMapping = detectColumnMapping(availableColumns);
    console.log('Detected column mapping:', columnMapping);
    
    // Debug: Show all available data for first few rows
    console.log('Debugging first 3 rows:');
    for (let i = 0; i < Math.min(3, data.length); i++) {
        console.log(`Row ${i + 1}:`, data[i]);
    }
    
    const processedData = data.map((item, index) => {
        // Clean column names by trimming spaces
        const cleanItem = {};
        Object.keys(item).forEach(key => {
            const cleanKey = key.trim();
            cleanItem[cleanKey] = item[key];
        });
        
        // Map TikTok Shop columns with cleaned names
        const orderId = cleanItem['Order/adjustment ID'] || 
                       cleanItem['Order ID'] || 
                       `ORDER_${index + 1}`;
        
        const date = cleanItem['Order settled time'] || 
                    cleanItem['Order created time'] || 
                    'N/A';
        
        // Use actual Total Revenue column if available, otherwise use Total settlement amount
        const revenue = parseFloat(cleanItem['Total Revenue'] || cleanItem['Total settlement amount'] || 0);
        const settlementAmount = parseFloat(cleanItem['Total settlement amount'] || 0);
        
        // Debug revenue calculation
        if (index < 3) {
            console.log(`Row ${index + 1} - Total Revenue:`, cleanItem['Total Revenue'], 'Total settlement amount:', cleanItem['Total settlement amount'], 'Calculated revenue:', revenue);
            console.log(`Row ${index + 1} - Clean keys:`, Object.keys(cleanItem));
        }
        
        // Use actual fee columns if available, otherwise estimate
        const transactionFee = Math.abs(parseFloat(cleanItem['Transaction fee'] || 0)) || (Math.abs(revenue) * 0.03);
        const commission = Math.abs(parseFloat(cleanItem['TikTok Shop commission fee'] || 0)) || (Math.abs(revenue) * 0.05);
        const vat = Math.abs(parseFloat(cleanItem['Platform VAT'] || 0)) || (Math.abs(revenue) * 0.1);
        const incomeTax = Math.abs(parseFloat(cleanItem['Platform income tax'] || 0)) || (Math.abs(revenue) * 0.05);
        
        const netAmount = settlementAmount; // Keep original value (can be negative for refunds)
        
        const processedItem = {
            orderId: orderId,
            date: formatDate(date),
            revenue: revenue,
            transactionFee: transactionFee,
            commission: commission,
            vat: vat,
            incomeTax: incomeTax,
            netAmount: netAmount,
            // Additional debug info
            totalFees: transactionFee + commission + vat + incomeTax,
            sellerShippingFee: 0,
            actualShippingFee: 0
        };
        
        // Log first few items for debugging
        if (index < 3) {
            console.log(`Processed item ${index + 1}:`, processedItem);
        }
        
        return processedItem;
    }); // Remove filter - process ALL rows
    
    console.log('Total processed items:', processedData.length);
    console.log('Sample processed data:', processedData.slice(0, 3));
    
    return processedData;
}

// Detect column mapping automatically
function detectColumnMapping(columns) {
    const mapping = {};
    
    // TikTok Shop specific column patterns based on actual file structure
    const patterns = {
        orderId: ['order/adjustment id', 'order id'],
        date: ['order settled time', 'order created time'],
        revenue: ['total revenue', 'total settlement amount'], // Prioritize Total Revenue
        transactionFee: ['transaction fee'],
        commission: ['tiktok shop commission fee'],
        vat: ['platform vat', 'vat'],
        incomeTax: ['platform income tax', 'income tax'],
        totalFees: ['total fees'],
        shippingFee: ['seller shipping fee', 'actual shipping fee', 'platform shipping'],
        netAmount: ['total settlement amount']
    };
    
    columns.forEach(column => {
        const lowerColumn = column.toLowerCase();
        
        Object.keys(patterns).forEach(field => {
            if (patterns[field].some(pattern => lowerColumn.includes(pattern))) {
                mapping[field] = column;
            }
        });
    });
    
    return mapping;
}

// Display transaction history in the table
function displayTransactionHistory(transactions) {
    console.log('Displaying transactions:', transactions);
    
    // Store transactions globally for summary calculation
    window.transactions = transactions;
    
    const tbody = document.getElementById('transactionHistory');
    if (!tbody) {
        console.error('Transaction table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!transactions || transactions.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="9" style="text-align: center; padding: 20px; color: #999;">Không có dữ liệu hợp lệ</td>';
        tbody.appendChild(tr);
        return;
    }
    
    transactions.forEach((transaction, index) => {
        const tr = document.createElement('tr');
        
        // Add row styling based on transaction type
        let rowClass = '';
        let netAmountColor = '';
        
        if (transaction.netAmount < 0) {
            rowClass = 'refund-row'; // Negative amount (refund)
            netAmountColor = 'color: #f44336; font-weight: bold;'; // Red for refunds
        } else if (transaction.netAmount === 0) {
            rowClass = 'zero-row'; // Zero amount
            netAmountColor = 'color: #666;'; // Gray for zero
        } else {
            netAmountColor = 'color: #4caf50; font-weight: bold;'; // Green for positive
        }
        
        tr.className = rowClass;
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${transaction.date}</td>
            <td>${transaction.orderId}</td>
            <td style="text-align: right;">${formatVND(transaction.revenue)}</td>
            <td style="text-align: right;">${formatVND(transaction.transactionFee)}</td>
            <td style="text-align: right;">${formatVND(transaction.commission)}</td>
            <td style="text-align: right;">${formatVND(transaction.vat)}</td>
            <td style="text-align: right;">${formatVND(transaction.incomeTax)}</td>
            <td style="text-align: right; ${netAmountColor}">${formatVND(transaction.netAmount)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Show footer with totals
    const footer = document.getElementById('transactionFooter');
    if (footer) {
        footer.style.display = 'table-row';
        updateSummary();
    }
}

// Update summary cards
function updateSummary() {
    const transactions = window.transactions || [];
    
    // Calculate totals including negative values (refunds)
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const totalTransactionFee = transactions.reduce((sum, t) => sum + (t.transactionFee || 0), 0);
    const totalCommission = transactions.reduce((sum, t) => sum + (t.commission || 0), 0);
    const totalVAT = transactions.reduce((sum, t) => sum + (t.vat || 0), 0);
    const totalIncomeTax = transactions.reduce((sum, t) => sum + (t.incomeTax || 0), 0);
    const totalFees = totalTransactionFee + totalCommission + totalVAT + totalIncomeTax;
    const totalNet = transactions.reduce((sum, t) => sum + (t.netAmount || 0), 0); // Include negative values
    
    // Update summary cards
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalFeesEl = document.getElementById('totalFees');
    const netAmountEl = document.getElementById('netAmount');
    
    if (totalRevenueEl) totalRevenueEl.textContent = formatVND(totalRevenue);
    if (totalFeesEl) totalFeesEl.textContent = formatVND(totalFees);
    if (netAmountEl) netAmountEl.textContent = formatVND(totalNet);
    
    // Update footer totals
    const sumRevenueEl = document.getElementById('sumRevenue');
    const sumTransactionFeeEl = document.getElementById('sumTransactionFee');
    const sumCommissionEl = document.getElementById('sumCommission');
    const sumVATEl = document.getElementById('sumVAT');
    const sumIncomeTaxEl = document.getElementById('sumIncomeTax');
    const sumNetAmountEl = document.getElementById('sumNetAmount');
    
    if (sumRevenueEl) sumRevenueEl.textContent = formatVND(totalRevenue);
    if (sumTransactionFeeEl) sumTransactionFeeEl.textContent = formatVND(totalTransactionFee);
    if (sumCommissionEl) sumCommissionEl.textContent = formatVND(totalCommission);
    if (sumVATEl) sumVATEl.textContent = formatVND(totalVAT);
    if (sumIncomeTaxEl) sumIncomeTaxEl.textContent = formatVND(totalIncomeTax);
    if (sumNetAmountEl) sumNetAmountEl.textContent = formatVND(totalNet);
    
    console.log('Summary updated:', {
        totalRevenue,
        totalFees,
        totalNet,
        transactionCount: transactions.length,
        positiveTransactions: transactions.filter(t => t.netAmount > 0).length,
        negativeTransactions: transactions.filter(t => t.netAmount < 0).length,
        zeroTransactions: transactions.filter(t => t.netAmount === 0).length
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
    console.log('Financial transactions page loaded');
    
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
