// Warehouse View Toggle Functions

// Switch to current warehouse list view
function switchToCurrentListView() {
    // Hide usage report view
    const usageReportView = document.getElementById('warehouseUsageReportView');
    if (usageReportView) {
        usageReportView.style.display = 'none';
    }
    
    // Show current warehouse list view
    const warehouseListView = document.getElementById('warehouseListView');
    if (warehouseListView) {
        warehouseListView.style.display = 'block';
    }
    
    // Update button states
    const currentBtn = document.getElementById('currentListViewBtn');
    const usageBtn = document.getElementById('usageReportViewBtn');
    
    if (currentBtn && usageBtn) {
        currentBtn.classList.add('active');
        usageBtn.classList.remove('active');
    }
}

// Switch to usage report view
function switchToUsageReportView() {
    // Hide current warehouse list view
    const warehouseListView = document.getElementById('warehouseListView');
    if (warehouseListView) {
        warehouseListView.style.display = 'none';
    }
    
    // Show usage report view
    const usageReportView = document.getElementById('warehouseUsageReportView');
    if (usageReportView) {
        usageReportView.style.display = 'block';
    }
    
    // Initialize the usage report if the function exists
    if (typeof initWarehouseUsageReport === 'function') {
        initWarehouseUsageReport();
    }
    
    // Update button states
    const currentBtn = document.getElementById('currentListViewBtn');
    const usageBtn = document.getElementById('usageReportViewBtn');
    
    if (currentBtn && usageBtn) {
        currentBtn.classList.remove('active');
        usageBtn.classList.add('active');
    }
}