// Payment Invoices JavaScript

let invoicesData = [];
let storesData = {};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Payment Invoices page loaded');
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load data
    loadStores();
    loadInvoices();
    
    // Set default dates (last 30 days)
    setDefaultDates();
});

// Initialize event listeners
function initializeEventListeners() {
    // Apply filter
    document.getElementById('applyFilterBtn').addEventListener('click', applyFilters);
    
    // Export Excel
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    
    // Print detail
    document.getElementById('printDetailBtn').addEventListener('click', printInvoiceDetail);
    
    // Delete buttons
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedInvoices);
    document.getElementById('deleteAllBtn').addEventListener('click', deleteAllInvoices);
    
    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);
    
    console.log('✅ Payment Invoices event listeners initialized');
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    document.getElementById('filterDateFrom').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('filterDateTo').value = today.toISOString().split('T')[0];
}

// Load stores
async function loadStores() {
    try {
        const storesRef = database.ref('stores');
        const snapshot = await storesRef.once('value');
        const stores = snapshot.val() || {};
        
        storesData = stores;
        
        // Populate store filter
        const filterStore = document.getElementById('filterStore');
        filterStore.innerHTML = '<option value="">Tất cả cửa hàng</option>';
        
        Object.entries(stores).forEach(([id, store]) => {
            if (store && store.name) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = store.name;
                filterStore.appendChild(option);
            }
        });
        
        console.log('✅ Stores loaded:', Object.keys(stores).length);
    } catch (error) {
        console.error('Error loading stores:', error);
        showNotification('Có lỗi khi tải danh sách cửa hàng!', 'error');
    }
}

// Load invoices
async function loadInvoices() {
    try {
        showLoading(true);
        
        const invoicesRef = database.ref('invoices');
        const snapshot = await invoicesRef.once('value');
        const invoices = snapshot.val() || {};
        
        invoicesData = Object.entries(invoices).map(([id, data]) => ({
            id,
            ...data
        }));
        
        console.log('✅ Invoices loaded:', invoicesData.length);
        
        applyFilters();
        showLoading(false);
    } catch (error) {
        console.error('Error loading invoices:', error);
        showLoading(false);
        showNotification('Có lỗi khi tải danh sách hóa đơn!', 'error');
    }
}

// Apply filters
function applyFilters() {
    const storeId = document.getElementById('filterStore').value;
    const status = document.getElementById('filterStatus').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    
    let filtered = [...invoicesData];
    
    // Filter by store
    if (storeId) {
        filtered = filtered.filter(inv => inv.storeId === storeId);
    }
    
    // Filter by status
    if (status) {
        filtered = filtered.filter(inv => inv.paymentStatus === status);
    }
    
    // Filter by date
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filtered = filtered.filter(inv => new Date(inv.createdAt) >= fromDate);
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(inv => new Date(inv.createdAt) <= toDate);
    }
    
    displayInvoices(filtered);
}

// Display invoices
function displayInvoices(invoices) {
    const invoicesList = document.getElementById('invoicesList');
    
    if (!invoices || invoices.length === 0) {
        invoicesList.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #ddd; margin-bottom: 16px; display: block;"></i>
                    <p style="color: #666;">Không có hóa đơn nào</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (newest first)
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Setup checkbox listeners after rendering
    setTimeout(() => {
        setupCheckboxListeners();
    }, 100);
    
    invoicesList.innerHTML = invoices.map((invoice, index) => {
        const totalAmount = invoice.totalAmount || 0;
        const paidAmount = invoice.paidAmount || 0;
        const remainingAmount = totalAmount - paidAmount;
        
        // Status badge
        let statusBadge = '';
        let statusClass = '';
        
        switch(invoice.paymentStatus) {
            case 'paid':
                statusBadge = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Đã thanh toán</span>';
                statusClass = 'status-paid';
                break;
            case 'partial':
                statusBadge = '<span class="badge badge-warning"><i class="fas fa-clock"></i> Thanh toán một phần</span>';
                statusClass = 'status-partial';
                break;
            default:
                statusBadge = '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Chưa thanh toán</span>';
                statusClass = 'status-unpaid';
                break;
        }
        
        // Format date range
        let dateRangeText = 'N/A';
        if (invoice.dateRange && invoice.dateRange.start && invoice.dateRange.end) {
            const startDate = new Date(invoice.dateRange.start).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const endDate = new Date(invoice.dateRange.end).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            dateRangeText = `${startDate} - ${endDate}`;
        }
        
        return `
            <tr class="${statusClass}">
                <td style="text-align: center;">
                    <input type="checkbox" class="invoice-checkbox" data-invoice-id="${invoice.id}">
                </td>
                <td>#${invoice.id.substring(0, 8)}</td>
                <td>${formatDate(invoice.createdAt)}</td>
                <td>${dateRangeText}</td>
                <td>${invoice.storeName || 'N/A'}</td>
                <td style="text-align: right;">${formatCurrency(totalAmount)}</td>
                <td style="text-align: right;">${formatCurrency(paidAmount)}</td>
                <td style="text-align: right;">${formatCurrency(remainingAmount)}</td>
                <td>${statusBadge}</td>
                <td class="notes-column">${invoice.paymentNote || 'Không có ghi chú'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewInvoiceDetail('${invoice.id}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSingleInvoice('${invoice.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// View invoice detail
function viewInvoiceDetail(invoiceId) {
    const invoice = invoicesData.find(inv => inv.id === invoiceId);
    if (!invoice) {
        showNotification('Không tìm thấy hóa đơn!', 'error');
        return;
    }
    
    const detailContent = document.getElementById('invoiceDetailContent');
    
    // Display invoice content
    if (invoice.invoiceContent) {
        detailContent.innerHTML = invoice.invoiceContent;
    } else {
        detailContent.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <i class="fas fa-file-invoice" style="font-size: 48px; color: #ddd; margin-bottom: 16px;"></i>
                <p>Không có nội dung hóa đơn</p>
            </div>
        `;
    }
    
    // Show modal
    document.getElementById('viewInvoiceModal').style.display = 'flex';
}

// Close view invoice modal
function closeViewInvoiceModal() {
    document.getElementById('viewInvoiceModal').style.display = 'none';
}

// Print invoice detail
function printInvoiceDetail() {
    const printWindow = window.open('', '_blank');
    const invoiceContent = document.getElementById('invoiceDetailContent').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hóa Đơn</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .invoice { max-width: 800px; margin: 0 auto; }
                .invoice-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333; }
                .invoice-title { font-size: 2rem; font-weight: bold; color: #333; margin: 0 0 10px 0; }
                .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding: 20px; background: #f8f9fa; }
                .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .invoice-table th { background: #333; color: white; padding: 12px; text-align: left; }
                .invoice-table td { padding: 12px; border-bottom: 1px solid #ddd; }
                .invoice-total { text-align: right; font-size: 1.2rem; font-weight: bold; margin-bottom: 30px; padding: 15px; background: #e9ecef; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            ${invoiceContent}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

// Export to Excel
function exportToExcel() {
    const storeId = document.getElementById('filterStore').value;
    const status = document.getElementById('filterStatus').value;
    
    let filtered = [...invoicesData];
    
    if (storeId) {
        filtered = filtered.filter(inv => inv.storeId === storeId);
    }
    
    if (status) {
        filtered = filtered.filter(inv => inv.paymentStatus === status);
    }
    
    if (filtered.length === 0) {
        showNotification('Không có dữ liệu để xuất!', 'warning');
        return;
    }
    
    // Create CSV content
    let csv = 'Mã HĐ,Ngày tạo,Cửa hàng,Tổng tiền,Đã thanh toán,Còn lại,Trạng thái,Ghi chú\n';
    
    filtered.forEach(invoice => {
        const totalAmount = invoice.totalAmount || 0;
        const paidAmount = invoice.paidAmount || 0;
        const remainingAmount = totalAmount - paidAmount;
        
        let statusText = '';
        switch(invoice.paymentStatus) {
            case 'paid': statusText = 'Đã thanh toán'; break;
            case 'partial': statusText = 'Thanh toán một phần'; break;
            default: statusText = 'Chưa thanh toán'; break;
        }
        
        csv += `#${invoice.id.substring(0, 8)},`;
        csv += `${formatDate(invoice.createdAt)},`;
        csv += `"${invoice.storeName || 'N/A'}",`;
        csv += `${totalAmount},`;
        csv += `${paidAmount},`;
        csv += `${remainingAmount},`;
        csv += `${statusText},`;
        csv += `"${invoice.paymentNote || ''}"\n`;
    });
    
    // Download CSV
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `hoa_don_thanh_toan_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Đã xuất file Excel thành công!', 'success');
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    toastIcon.className = `toast-icon ${iconClass}`;
    toastMessage.textContent = message;
    
    // Show toast
    toast.className = `toast show ${type}`;
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Toggle select all checkboxes
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateDeleteButtonsVisibility();
}

// Update delete buttons visibility based on selection
function updateDeleteButtonsVisibility() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    
    if (checkboxes.length > 0) {
        deleteSelectedBtn.style.display = 'inline-block';
        deleteSelectedBtn.textContent = `Xóa đã chọn (${checkboxes.length})`;
    } else {
        deleteSelectedBtn.style.display = 'none';
    }
}

// Setup checkbox listeners after rendering
function setupCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateDeleteButtonsVisibility);
    });
}

// Delete single invoice
function deleteSingleInvoice(invoiceId) {
    if (!confirm('Bạn có chắc chắn muốn xóa hóa đơn này?')) return;
    
    database.ref(`invoices/${invoiceId}`).remove()
        .then(() => {
            // Also delete payment history
            return database.ref(`paymentHistory/${invoiceId}`).remove();
        })
        .then(() => {
            showNotification('Đã xóa hóa đơn thành công!', 'success');
            loadInvoices();
        })
        .catch(error => {
            console.error('Error deleting invoice:', error);
            showNotification('Có lỗi khi xóa hóa đơn!', 'error');
        });
}

// Delete selected invoices
function deleteSelectedInvoices() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');
    
    if (checkboxes.length === 0) {
        showNotification('Vui lòng chọn hóa đơn cần xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${checkboxes.length} hóa đơn đã chọn?`)) return;
    
    const deletePromises = [];
    
    checkboxes.forEach(checkbox => {
        const invoiceId = checkbox.getAttribute('data-invoice-id');
        deletePromises.push(
            database.ref(`invoices/${invoiceId}`).remove()
                .then(() => database.ref(`paymentHistory/${invoiceId}`).remove())
        );
    });
    
    Promise.all(deletePromises)
        .then(() => {
            showNotification('Đã xóa các hóa đơn thành công!', 'success');
            document.getElementById('selectAll').checked = false;
            loadInvoices();
        })
        .catch(error => {
            console.error('Error deleting invoices:', error);
            showNotification('Có lỗi khi xóa hóa đơn!', 'error');
        });
}

// Delete all invoices
function deleteAllInvoices() {
    if (invoicesData.length === 0) {
        showNotification('Không có hóa đơn nào để xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa TẤT CẢ ${invoicesData.length} hóa đơn? Hành động này không thể hoàn tác!`)) return;
    
    const deletePromises = [];
    
    invoicesData.forEach(invoice => {
        deletePromises.push(
            database.ref(`invoices/${invoice.id}`).remove()
                .then(() => database.ref(`paymentHistory/${invoice.id}`).remove())
        );
    });
    
    Promise.all(deletePromises)
        .then(() => {
            showNotification('Đã xóa tất cả hóa đơn thành công!', 'success');
            invoicesData = [];
            displayInvoices([]);
        })
        .catch(error => {
            console.error('Error deleting all invoices:', error);
            showNotification('Có lỗi khi xóa hóa đơn!', 'error');
        });
}

// Add CSS for status badges and improved styling
const style = document.createElement('style');
style.textContent = `
    /* Header actions */
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e5e7eb;
    }
    
    .header-actions {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    /* Filter section improvements */
    .date-filter-section {
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        margin-bottom: 25px;
    }
    
    .date-filter-section .section-header h3 {
        color: #1f2937;
        font-size: 18px;
        font-weight: 600;
        margin: 0;
    }
    
    .date-filter-controls {
        display: flex;
        gap: 15px;
        margin-top: 20px;
        align-items: flex-end;
        flex-wrap: wrap;
    }
    
    .form-group {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 180px;
    }
    
    .form-group label {
        font-weight: 500;
        color: #374151;
        margin-bottom: 8px;
        font-size: 14px;
    }
    
    .form-control {
        padding: 10px 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.3s ease;
    }
    
    .form-control:focus {
        outline: none;
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }
    
    /* Invoice list section */
    .invoice-list-section {
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    /* Checkbox styling */
    .select-all-checkbox,
    .invoice-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #10b981;
    }
    
    /* Table styling - clean and basic */
    .products-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
    }
    
    .products-table thead th {
        color: #333 !important;
        background: #f8f9fa !important;
        font-weight: 600;
        font-size: 13px;
        padding: 12px 10px;
        border: 1px solid #dee2e6;
        text-align: left;
        white-space: nowrap;
    }
    
    .products-table tbody td {
        padding: 10px;
        border: 1px solid #dee2e6;
        font-size: 14px;
        color: #333;
        vertical-align: middle;
    }
    
    .products-table tbody tr:hover {
        background: #f8f9fa;
    }
    
    /* Notes column styling */
    .notes-column {
        background-color:rgb(247, 247, 247) !important;
        font-style: italic;
    }
    
    .badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    
   .badge-success  {
       
        color: #155724;
    }
    
    .badge-warning {
        background: #fff3cd;
        color: #856404;
    }
    
    .badge-danger {
        background: #f8d7da;
        color: #721c24;
    }
    
    .btn-sm {
        padding: 6px 12px;
        font-size: 13px;
    }
`;
document.head.appendChild(style);
