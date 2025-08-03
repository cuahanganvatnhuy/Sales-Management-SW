// Global submenu toggle function for all pages
// This ensures submenu works even if navbar component hasn't loaded yet

if (!window.toggleSubmenu) {
    window.toggleSubmenu = function(event) {
        event.preventDefault();
        console.log('Toggle submenu clicked from global submenu.js');
        
        const submenu = document.getElementById('invoiceSubmenu');
        if (submenu) {
            const isHidden = submenu.style.display === 'none' || submenu.style.display === '';
            
            if (isHidden) {
                submenu.style.display = 'block';
                console.log('Submenu shown');
            } else {
                submenu.style.display = 'none';
                console.log('Submenu hidden');
            }
        } else {
            console.log('Submenu not found!');
        }
    };
    
    console.log('Global toggleSubmenu function loaded from submenu.js');
}

// Order submenu toggle function
if (!window.toggleOrderSubmenu) {
    window.toggleOrderSubmenu = function(event) {
        event.preventDefault();
        const submenu = document.getElementById('orderSubmenu');
        if (submenu) {
            submenu.classList.toggle('show');
            // Call updateOrderTypeUI if it exists
            if (typeof window.updateOrderTypeUI === 'function') {
                window.updateOrderTypeUI();
            }
            console.log('Order submenu toggled');
        } else {
            console.log('Order submenu not found!');
        }
    };
    
    console.log('Global toggleOrderSubmenu function loaded from submenu.js');
}

// Update order type UI function - fallback
if (!window.updateOrderTypeUI) {
    window.updateOrderTypeUI = function() {
        console.log('updateOrderTypeUI function not available on this page');
        // This is a fallback function that does nothing
        // The actual implementation is in order-type-selection.js
    };
    
    console.log('Global updateOrderTypeUI function loaded from submenu.js');
}

// Context-aware navigation function - fallback
if (!window.navigateToInvoice) {
    window.navigateToInvoice = function(type) {
        console.log('=== NAVIGATION DEBUG (submenu.js) ===');
        console.log('Type:', type);
        console.log('Current URL:', window.location.href);
        console.log('Current pathname:', window.location.pathname);
        
        const currentPath = window.location.pathname;
        const isInRoot = currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.includes('/index.html');
        
        console.log('Is in root?', isInRoot);
        
        let targetUrl;
        if (type === 'global') {
            targetUrl = isInRoot ? 'view/global-invoice.html' : 'global-invoice.html';
        } else {
            targetUrl = isInRoot ? 'view/store-invoice.html' : 'store-invoice.html';
        }
        
        console.log('Target URL:', targetUrl);
        console.log('Full target URL:', window.location.origin + '/' + targetUrl);
        console.log('About to navigate from submenu.js...');
        
        window.location.href = targetUrl;
    };
    
    console.log('Global navigateToInvoice function loaded from submenu.js');
}

// Close submenu when clicking outside
document.addEventListener('click', function(e) {
    const submenu = document.getElementById('invoiceSubmenu');
    const hasSubmenu = e.target.closest('.has-submenu');
    
    if (submenu && !hasSubmenu && submenu.style.display === 'block') {
        submenu.style.display = 'none';
        console.log('Submenu closed by clicking outside');
    }
});
