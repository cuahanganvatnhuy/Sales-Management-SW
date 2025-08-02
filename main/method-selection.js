// Method Selection - Chuyển đổi giữa tự tạo đơn và upload PDF
let currentCreationMethod = 'manual';

// Chọn phương thức tạo đơn hàng
function selectCreationMethod(method) {
    currentCreationMethod = method;
    
    // Update button states
    const manualBtn = document.getElementById('manualMethodBtn');
    const pdfBtn = document.getElementById('pdfMethodBtn');
    
    if (method === 'manual') {
        manualBtn.classList.add('active');
        pdfBtn.classList.remove('active');
        
        // Show manual order group
        document.getElementById('manualOrderGroup').style.display = 'block';
        document.getElementById('pdfUploadGroup').style.display = 'none';
        
        // Hide extracted orders if any
        const extractedOrders = document.getElementById('extractedOrders');
        if (extractedOrders) {
            extractedOrders.style.display = 'none';
        }
        
        // Show order forms container
        document.getElementById('orderFormsContainer').style.display = 'block';
        
    } else if (method === 'pdf') {
        manualBtn.classList.remove('active');
        pdfBtn.classList.add('active');
        
        // Show PDF upload group
        document.getElementById('manualOrderGroup').style.display = 'none';
        document.getElementById('pdfUploadGroup').style.display = 'block';
        
        // Hide order forms container
        document.getElementById('orderFormsContainer').style.display = 'none';
        
        // Initialize TikTok processor if not already done
        if (window.tikTokProcessor) {
            window.tikTokProcessor.bindEvents();
        }
    }
}

// Initialize method selection on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set default method
    selectCreationMethod('manual');
});
