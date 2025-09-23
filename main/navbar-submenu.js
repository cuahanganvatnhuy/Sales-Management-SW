// Navbar Submenu JavaScript Functions

// Toggle Product Submenu
function toggleProductSubmenu(event) {
    event.preventDefault();
    const submenuItem = event.target.closest('.has-submenu');
    if (submenuItem) {
        submenuItem.classList.toggle('open');
        
        // Also handle order-submenu class
        const orderSubmenu = submenuItem.querySelector('.order-submenu');
        if (orderSubmenu) {
            orderSubmenu.classList.toggle('show');
        }
    }
}

// Toggle Order Submenu
function toggleOrderSubmenu(event) {
    event.preventDefault();
    const submenuItem = event.target.closest('.has-submenu');
    if (submenuItem) {
        submenuItem.classList.toggle('open');
        
        // Also handle order-submenu class
        const orderSubmenu = submenuItem.querySelector('.order-submenu');
        if (orderSubmenu) {
            orderSubmenu.classList.toggle('show');
        }
    }
}

// Toggle Sales Order Submenu
function toggleSalesOrderSubmenu(event) {
    event.preventDefault();
    const submenuItem = event.target.closest('.has-submenu');
    if (submenuItem) {
        submenuItem.classList.toggle('open');
        
        // Also handle order-submenu class
        const orderSubmenu = submenuItem.querySelector('.order-submenu');
        if (orderSubmenu) {
            orderSubmenu.classList.toggle('show');
        }
    }
}

// Toggle Profit Submenu
function toggleProfitSubmenu(event) {
    event.preventDefault();
    const submenuItem = event.target.closest('.has-submenu');
    if (submenuItem) {
        submenuItem.classList.toggle('open');
        
        // Also handle order-submenu class
        const orderSubmenu = submenuItem.querySelector('.order-submenu');
        if (orderSubmenu) {
            orderSubmenu.classList.toggle('show');
        }
    }
}

// Toggle Invoice Submenu
function toggleInvoiceSubmenu(event) {
    event.preventDefault();
    const submenuItem = event.target.closest('.has-submenu');
    if (submenuItem) {
        submenuItem.classList.toggle('open');
        
        // Also handle order-submenu class
        const orderSubmenu = submenuItem.querySelector('.order-submenu');
        if (orderSubmenu) {
            orderSubmenu.classList.toggle('show');
        }
    }
}

// Toggle Warehouse Submenu
function toggleWarehouseSubmenu(event) {
    event.preventDefault();
    const submenuItem = event.target.closest('.has-submenu');
    if (submenuItem) {
        submenuItem.classList.toggle('open');
        
        // Also handle order-submenu class
        const orderSubmenu = submenuItem.querySelector('.order-submenu');
        if (orderSubmenu) {
            orderSubmenu.classList.toggle('show');
        }
    }
}

// Toggle Report Submenu
function toggleReportSubmenu(event) {
    event.preventDefault();
    const submenuItem = event.target.closest('.has-submenu');
    if (submenuItem) {
        submenuItem.classList.toggle('open');
        
        // Also handle order-submenu class
        const orderSubmenu = submenuItem.querySelector('.order-submenu');
        if (orderSubmenu) {
            orderSubmenu.classList.toggle('show');
        }
    }
}

// General Toggle Submenu function
function toggleSubmenu(event) {
    event.preventDefault();
    const submenuItem = event.target.closest('.has-submenu');
    if (submenuItem) {
        submenuItem.classList.toggle('open');
        
        // Also handle order-submenu class
        const orderSubmenu = submenuItem.querySelector('.order-submenu');
        if (orderSubmenu) {
            orderSubmenu.classList.toggle('show');
        }
    }
}

// Close all submenus when clicking outside
document.addEventListener('click', function(event) {
    const isSubmenuClick = event.target.closest('.has-submenu');
    if (!isSubmenuClick) {
        // Close all open submenus
        const openSubmenus = document.querySelectorAll('.has-submenu.open');
        openSubmenus.forEach(submenu => {
            submenu.classList.remove('open');
            
            // Also close order-submenu
            const orderSubmenu = submenu.querySelector('.order-submenu');
            if (orderSubmenu) {
                orderSubmenu.classList.remove('show');
            }
        });
    }
});

// Initialize submenu functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Navbar submenu functionality initialized');
    
    // Add event listeners to all submenu toggles
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(event) {
            event.preventDefault();
            const submenuItem = this.closest('.has-submenu');
            if (submenuItem) {
                submenuItem.classList.toggle('open');
            }
        });
    });
});

// Make functions globally available
window.toggleProductSubmenu = toggleProductSubmenu;
window.toggleOrderSubmenu = toggleOrderSubmenu;
window.toggleSalesOrderSubmenu = toggleSalesOrderSubmenu;
window.toggleProfitSubmenu = toggleProfitSubmenu;
window.toggleInvoiceSubmenu = toggleInvoiceSubmenu;
window.toggleWarehouseSubmenu = toggleWarehouseSubmenu;
window.toggleReportSubmenu = toggleReportSubmenu;
window.toggleSubmenu = toggleSubmenu;
