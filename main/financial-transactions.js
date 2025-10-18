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
    
    showLoading(true);
    
    readExcelFile(file)
        .then(data => {
            // Process data and update UI
            displayTransactionHistory(data);
            updateSummary();
            showLoading(false);
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
                
                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // Process the data
                const processedData = processExcelData(jsonData);
                resolve(processedData);
            } catch (error) {
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
    return data.map(item => {
        // Map TikTok Shop columns to our format
        // Adjust these mappings based on actual Excel structure
        return {
            orderId: item['Order/adjustment ID'] || 'N/A',
            date: formatDate(item['Order settled time'] || item['Order created time']),
            revenue: parseFloat(item['Total Revenue'] || 0),
            transactionFee: Math.abs(parseFloat(item['Transaction fee'] || 0)),
            commission: Math.abs(parseFloat(item['TikTok Shop commission fee'] || 0)),
            vat: Math.abs(parseFloat(item['Platform VAT'] || 0)),
            incomeTax: Math.abs(parseFloat(item['Platform income tax'] || 0)),
            netAmount: parseFloat(item['Total settlement amount'] || 0)
        };
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Display transaction history in the table
function displayTransactionHistory(transactions) {
    const tbody = document.querySelector('#transactionTable tbody');
    tbody.innerHTML = '';
    
    if (!transactions || transactions.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="8" class="text-center">Không có dữ liệu</td>';
        tbody.appendChild(tr);
        return;
    }
    
    transactions.forEach((transaction, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${transaction.orderId}</td>
            <td>${transaction.date}</td>
            <td class="text-right">${formatVND(transaction.revenue)}</td>
            <td class="text-right">${formatVND(transaction.transactionFee)}</td>
            <td class="text-right">${formatVND(transaction.commission)}</td>
            <td class="text-right">${formatVND(transaction.vat)}</td>
            <td class="text-right">${formatVND(transaction.incomeTax)}</td>
            <td class="text-right">${formatVND(transaction.netAmount)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Update summary cards
function updateSummary() {
    const transactions = window.transactions || [];
    
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const totalFees = transactions.reduce((sum, t) => sum + (t.transactionFee || 0) + (t.commission || 0) + (t.vat || 0) + (t.incomeTax || 0), 0);
    const totalNet = transactions.reduce((sum, t) => sum + (t.netAmount || 0), 0);
    
    document.getElementById('totalRevenue').textContent = formatVND(totalRevenue);
    document.getElementById('totalFees').textContent = formatVND(totalFees);
    document.getElementById('totalNet').textContent = formatVND(totalNet);
}

// Show/hide loading overlay
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('excelFile');
    
    if (!dropArea || !fileInput) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
    }
});
