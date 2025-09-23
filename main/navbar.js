// Navbar and Header Component Loader
class NavbarLoader {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.pageTitle = this.getPageTitle();
    }

    // Get current page name from URL
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        
        // Map filenames to nav IDs
        const pageMap = {
            'index': 'nav-home',
            'products': 'nav-products',
            'orders': 'nav-orders',
            'order-management': 'nav-order-management',
            'stores': 'nav-stores',
            'reports': 'nav-reports',
            'warehouse-management': 'nav-warehouse',
            'settings': 'nav-settings',
            'profit-management': 'nav-profit-management',
            'retail-profit': 'nav-profit-management',
            'wholesale-profit': 'nav-profit-management',
            'overview-profit': 'nav-profit-management'
        };
        
        return pageMap[filename] || 'nav-home';
    }

    // Get page title from filename
    getPageTitle() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        
        // Map filenames to page titles
        const titleMap = {
            'index': 'Trang Chủ',
            'products': 'Quản Lý Sản Phẩm', 
            'orders': 'Tạo Đơn Hàng',
            'order-management': 'Quản Lý Đơn Hàng',
            'stores': 'Quản Lý Cửa Hàng',
            'reports': 'Báo Cáo & Thống Kê',
            'warehouse-management': 'Quản Lý Kho',
            'settings': 'Cài Đặt Hệ Thống',
            'profit-management': 'Lợi Nhuận Đơn TMĐT',
            'retail-profit': 'Lợi Nhuận Đơn Lẻ',
            'wholesale-profit': 'Lợi Nhuận Đơn Sỉ',
            'overview-profit': 'Tổng Quan Lợi Nhuận'
        };
        
        return titleMap[filename] || 'PMQLDH';
    }

    // Load navbar HTML
    async loadNavbar() {
        try {
            const response = await fetch('../components/navbar.html');
            if (!response.ok) {
                throw new Error('Failed to load navbar');
            }
            
            const navbarHTML = await response.text();
            
            // Insert navbar into placeholder
            const navbarContainer = document.getElementById('navbar-container');
            if (navbarContainer) {
                navbarContainer.innerHTML = navbarHTML;
                
                // Execute scripts in navbar HTML
                const scripts = navbarContainer.getElementsByTagName('script');
                for (let i = 0; i < scripts.length; i++) {
                    if (scripts[i].src) {
                        // External script - already loaded by browser
                        continue;
                    } else {
                        // Inline script - execute it
                        eval(scripts[i].innerHTML);
                    }
                }
                
                this.setActiveNavItem();
                this.initializeNavbar();
            }
        } catch (error) {
            console.error('Error loading navbar:', error);
            // Fallback: create basic navbar
            this.createFallbackNavbar();
        }
    }

    // Load header HTML
    async loadHeader() {
        try {
            const response = await fetch('../components/header.html');
            if (!response.ok) {
                throw new Error('Failed to load header');
            }
            
            let headerHTML = await response.text();
            
            // Replace placeholder with actual page title
            headerHTML = headerHTML.replace('{{PAGE_TITLE}}', this.pageTitle);
            
            // Insert header into placeholder
            const headerContainer = document.getElementById('header-container');
            if (headerContainer) {
                headerContainer.innerHTML = headerHTML;
                this.initializeHeader();
            }
        } catch (error) {
            console.error('Error loading header:', error);
            // Fallback: create basic header
            this.createFallbackHeader();
        }
    }

    // Set active navigation item
    setActiveNavItem() {
        // Remove active class from all items
        const navItems = document.querySelectorAll('.sidebar-menu li');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Add active class to current page
        const activeItem = document.getElementById(this.currentPage);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // Initialize navbar functionality
    initializeNavbar() {
        // Add sidebar toggle functionality if needed
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        // Add hover effects and other interactions
        this.addNavbarInteractions();
    }

    // Initialize header functionality
    initializeHeader() {
        // Add sidebar toggle functionality
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                document.body.classList.toggle('sidebar-collapsed');
            });
        }
    }

    // Fallback header if loading fails
    createFallbackHeader() {
        const headerContainer = document.getElementById('header-container');
        if (!headerContainer) return;

        const fallbackHTML = `
            <header class="header">
                <div class="header-left">
                    <button type="button" class="sidebar-toggle" aria-label="Toggle sidebar">
                        <i class="fas fa-bars"></i>
                    </button>
                    <h1>${this.pageTitle}</h1>
                </div>
                <div class="header-right">
                    <div class="user-info">
                        <i class="fas fa-user-circle"></i>
                        <span>Admin</span>
                    </div>
                </div>
            </header>
        `;
        
        headerContainer.innerHTML = fallbackHTML;
        this.initializeHeader();
    }

    // Add navbar interactions
    addNavbarInteractions() {
        const navLinks = document.querySelectorAll('.sidebar-menu a');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Add loading state or other effects if needed
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#')) {
                    // Optional: Add page transition effects
                    this.handlePageTransition(href);
                }
            });
        });
    }

    // Handle page transitions
    handlePageTransition(href) {
        // Add loading overlay or transition effects
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            
            // Navigate after short delay for smooth transition
            setTimeout(() => {
                window.location.href = href;
            }, 200);
        }
    }

    // Fallback navbar if loading fails
    createFallbackNavbar() {
        const navbarContainer = document.getElementById('navbar-container');
        if (!navbarContainer) return;

        const fallbackHTML = `
            <nav class="sidebar">
                <div class="sidebar-header">
                    <div class="logo">
                        <i class="fas fa-shopping-cart"></i>
                        <span>PMQLDH</span>
                    </div>
                </div>
                <ul class="sidebar-menu">
                    <li id="nav-home"><a href="../index.html"><i class="fas fa-home"></i> <span>Trang Chủ</span></a></li>
                    <li id="nav-products"><a href="products.html"><i class="fas fa-box"></i> <span>Sản Phẩm</span></a></li>
                    <li id="nav-orders"><a href="orders.html"><i class="fas fa-shopping-bag"></i> <span>Đơn Hàng</span></a></li>
                    <li id="nav-stores"><a href="stores.html"><i class="fas fa-store"></i> <span>Cửa Hàng</span></a></li>
                    <li id="nav-reports"><a href="reports.html"><i class="fas fa-chart-bar"></i> <span>Báo Cáo</span></a></li>
                    <li id="nav-settings"><a href="settings.html"><i class="fas fa-cog"></i> <span>Cài Đặt</span></a></li>
                </ul>
            </nav>
        `;
        
        navbarContainer.innerHTML = fallbackHTML;
        this.setActiveNavItem();
        this.initializeNavbar();
    }
}

// Initialize navbar and header when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const navbarLoader = new NavbarLoader();
    navbarLoader.loadNavbar();
    navbarLoader.loadHeader();
});

// Export for use in other files
window.NavbarLoader = NavbarLoader;
