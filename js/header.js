// Toggle store dropdown
function toggleStoreDropdown(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const dropdown = document.getElementById('storeDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        
        // Close other dropdowns
        const otherDropdowns = document.querySelectorAll('.store-dropdown:not(#storeDropdown)');
        otherDropdowns.forEach(dropdown => {
            dropdown.classList.add('hidden');
        });
    } else {
        console.error('Store dropdown element not found!');
    }
}

// Toggle user dropdown
function toggleUserDropdown(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    } else {
        console.error('User dropdown element not found!');
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    // Close store dropdown
    const storeDropdown = document.getElementById('storeDropdown');
    const storeSelector = document.querySelector('.store-selector');
    
    if (storeDropdown && !storeSelector.contains(event.target)) {
        storeDropdown.classList.add('hidden');
    }
    
    // Close user dropdown
    const userDropdown = document.getElementById('userDropdown');
    const userMenu = document.querySelector('.user-menu');
    
    if (userDropdown && !userMenu.contains(event.target)) {
        userDropdown.classList.add('hidden');
    }
});

// Load stores for dropdown
function loadStores() {
    // This function will be implemented to load stores from your data source
    console.log('Loading stores...');
    // Add your store loading logic here
}

// Initialize header functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load stores when the page loads
    loadStores();
    
    // Set current store name if available
    const currentStore = localStorage.getItem('currentStore');
    if (currentStore) {
        const storeNameElement = document.getElementById('currentStoreName');
        if (storeNameElement) {
            storeNameElement.textContent = currentStore;
        }
    }
});
