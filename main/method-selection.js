// Method Selection - Chuyển đổi giữa tự tạo đơn, upload PDF và upload Excel
let currentCreationMethod = 'manual';

// Chọn phương thức tạo đơn hàng
function selectCreationMethod(method) {
    currentCreationMethod = method;
    
    // Update button states
    const manualBtn = document.getElementById('manualMethodBtn');
    const pdfBtn = document.getElementById('pdfMethodBtn');
    const excelBtn = document.getElementById('excelMethodBtn');
    
    // Reset all buttons
    manualBtn?.classList.remove('active');
    pdfBtn?.classList.remove('active');
    excelBtn?.classList.remove('active');
    
    // Hide all groups
    const manualGroup = document.getElementById('manualOrderGroup');
    const pdfGroup = document.getElementById('pdfUploadGroup');
    const excelGroup = document.getElementById('excelUploadGroup');
    const orderFormsContainer = document.getElementById('orderFormsContainer');
    
    if (manualGroup) manualGroup.style.display = 'none';
    if (pdfGroup) pdfGroup.style.display = 'none';
    if (excelGroup) excelGroup.style.display = 'none';
    
    if (method === 'manual') {
        manualBtn?.classList.add('active');
        
        // Show manual order group
        if (manualGroup) manualGroup.style.display = 'block';
        
        // Hide extracted orders if any
        const extractedOrders = document.getElementById('extractedOrders');
        if (extractedOrders) {
            extractedOrders.style.display = 'none';
        }
        
        // Show order forms container
        if (orderFormsContainer) orderFormsContainer.style.display = 'block';
        
    } else if (method === 'pdf') {
        pdfBtn?.classList.add('active');
        
        // Show PDF upload group
        if (pdfGroup) pdfGroup.style.display = 'block';
        
        // Hide order forms container
        if (orderFormsContainer) orderFormsContainer.style.display = 'none';
        
        // Initialize TikTok processor if not already done
        if (window.tikTokProcessor) {
            window.tikTokProcessor.bindEvents();
        }
        
    } else if (method === 'excel') {
        excelBtn?.classList.add('active');
        
        // Show Excel upload group
        if (excelGroup) excelGroup.style.display = 'block';
        
        // Show order forms container for Excel preview
        if (orderFormsContainer) orderFormsContainer.style.display = 'block';
        
        // Initialize Excel processor
        if (typeof initializeExcelUpload === 'function') {
            initializeExcelUpload();
        }
    }
}

// Initialize method selection on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set default method
    selectCreationMethod('manual');
});
