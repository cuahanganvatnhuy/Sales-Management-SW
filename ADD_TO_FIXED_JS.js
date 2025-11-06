// ==============================================
// THÊM CODE NÀY VÀO CUỐI FILE financial-transactions-fixed.js
// (Sau phần updateFooterTotals, trước phần Initialize page)
// ==============================================

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
            weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
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

// Handle date range button clicks
function initDateRangeHandlers() {
    const buttons = document.querySelectorAll('.btn-date-range');
    const customDateRange = document.getElementById('customDateRange');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all buttons
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const rangeType = this.getAttribute('data-range');
            
            if (rangeType === 'custom') {
                customDateRange.classList.remove('hidden');
                selectedDateRange.type = 'custom';
                // Set default dates if not set
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
    
    // Handle custom date changes
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', updateCustomDateRange);
        endDateInput.addEventListener('change', updateCustomDateRange);
    }
    
    // Initialize with today
    const range = calculateDateRange('today');
    selectedDateRange.startDate = range.startDate;
    selectedDateRange.endDate = range.endDate;
    selectedDateRange.label = range.label;
    updateDateRangeDisplay();
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

// Show save modal
function showSaveModal() {
    const modal = document.getElementById('saveModal');
    const dateRangeSpan = document.getElementById('modalDateRange');
    const orderCountSpan = document.getElementById('modalOrderCount');
    const totalAmountSpan = document.getElementById('modalTotalAmount');
    
    if (!modal) return;
    
    // Calculate total settlement amount
    const totalSettlement = rawData.reduce((sum, row) => {
        const value = parseFloat(row['Total settlement amount']);
        return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    // Populate modal
    dateRangeSpan.textContent = selectedDateRange.label;
    orderCountSpan.textContent = `${rawData.length} đơn`;
    totalAmountSpan.textContent = formatVND(totalSettlement);
    
    // Show modal
    modal.style.display = 'flex';
}

// Hide save modal
function hideSaveModal() {
    const modal = document.getElementById('saveModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Save transaction data to Firebase
async function saveTransactionData() {
    try {
        showLoading(true);
        
        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Vui lòng đăng nhập để lưu dữ liệu');
            showLoading(false);
            return;
        }
        
        // Calculate summary
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
        
        // Prepare data
        const dataToSave = {
            userId: user.uid,
            userEmail: user.email,
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
        
        // Save to Firestore
        await firebase.firestore()
            .collection('financialTransactions')
            .add(dataToSave);
        
        showLoading(false);
        hideSaveModal();
        showNotification('Đã lưu dữ liệu giao dịch thành công!', 'success');
        
    } catch (error) {
        console.error('Error saving data:', error);
        showLoading(false);
        alert('Có lỗi khi lưu dữ liệu: ' + error.message);
    }
}

// Initialize save modal handlers
function initSaveModalHandlers() {
    const btnCancel = document.getElementById('btnCancelSave');
    const btnConfirm = document.getElementById('btnConfirmSave');
    const modal = document.getElementById('saveModal');
    
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            hideSaveModal();
            showNotification('Đã hủy lưu dữ liệu', 'info');
        });
    }
    
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            saveTransactionData();
        });
    }
    
    // Click outside modal to close
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideSaveModal();
            }
        });
    }
}

// ==============================================
// UPDATE HÀM processExcel ĐỂ HIỂN THỊ MODAL SAU KHI LOAD DỮ LIỆU
// Tìm dòng: showNotification(`Đã xử lý sheet...
// Thêm ngay sau dòng đó:
// showSaveModal();
// ==============================================
