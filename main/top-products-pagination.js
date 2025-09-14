// Top Products Pagination Functions
let allTopProducts = [];

// Update pagination info and controls
function updateTopProductsPagination(totalItems, totalPages) {
    const paginationContainer = document.getElementById('top-products-pagination');
    const paginationInfo = document.getElementById('pagination-info-text');
    const pageNumbers = document.getElementById('page-numbers');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    
    if (!paginationContainer || totalItems === 0) {
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }

    // Show pagination container
    paginationContainer.style.display = 'flex';
    
    const currentPage = window.topProductsPagination.currentPage;
    const itemsPerPage = window.topProductsPagination.itemsPerPage;
    
    // Update info text
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    paginationInfo.textContent = `Hiển thị ${startItem}-${endItem} của ${totalItems} sản phẩm`;
    
    // Update page numbers
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageSpan = document.createElement('span');
        pageSpan.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageSpan.textContent = i;
        pageSpan.onclick = () => goToTopProductsPage(i);
        pageNumbers.appendChild(pageSpan);
    }
    
    // Update button states
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// Change page by direction (-1 for previous, 1 for next)
function changeTopProductsPage(direction) {
    if (!window.topProductsPagination) return;
    
    const totalPages = Math.ceil(window.topProductsPagination.totalItems / window.topProductsPagination.itemsPerPage);
    const newPage = window.topProductsPagination.currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        window.topProductsPagination.currentPage = newPage;
        // Refresh the table with current data
        refreshTopProductsTable();
    }
}

// Go to specific page
function goToTopProductsPage(page) {
    if (!window.topProductsPagination) return;
    
    const totalPages = Math.ceil(window.topProductsPagination.totalItems / window.topProductsPagination.itemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
        window.topProductsPagination.currentPage = page;
        // Refresh the table with current data
        refreshTopProductsTable();
    }
}

// Refresh table with current pagination settings
function refreshTopProductsTable() {
    // Get the current platform filter
    const platformFilter = document.getElementById('platform-filter')?.value || 'all';
    
    // Call updateTmdtStatistics to refresh data
    if (typeof updateTmdtStatistics === 'function') {
        updateTmdtStatistics(platformFilter);
    }
}

// Expose functions to global scope for HTML onclick handlers
window.changeTopProductsPage = changeTopProductsPage;
window.goToTopProductsPage = goToTopProductsPage;
window.updateTopProductsPagination = updateTopProductsPagination;
