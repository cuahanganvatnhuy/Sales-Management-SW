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
async function loadStores() {
    console.log('Loading stores...');
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('No user logged in');
            return;
        }
        
        // Get stores from Firestore
        const storesSnapshot = await firebase.firestore()
            .collection('stores')
            .where('userId', '==', user.uid)
            .get();
        
        const storeList = document.getElementById('storeList');
        if (!storeList) {
            console.error('Store list element not found');
            return;
        }
        
        // Clear existing list
        storeList.innerHTML = '';
        
        if (storesSnapshot.empty) {
            storeList.innerHTML = '<li style="padding: 10px; color: #999;">Chưa có cửa hàng nào</li>';
            return;
        }
        
        // Add stores to dropdown
        storesSnapshot.forEach(doc => {
            const store = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="#" onclick="selectStore('${doc.id}', '${store.storeName}'); return false;">
                    <i class="fas fa-store"></i> ${store.storeName}
                </a>
            `;
            storeList.appendChild(li);
        });
        
        console.log('Loaded', storesSnapshot.size, 'stores');
        
        // Set current store name if available
        const currentStore = localStorage.getItem('currentStore');
        const storeNameElement = document.getElementById('currentStoreName');
        if (currentStore && storeNameElement) {
            storeNameElement.textContent = currentStore;
        }
        
    } catch (error) {
        console.error('Error loading stores:', error);
    }
}

// Select store
function selectStore(storeId, storeName) {
    // Save to localStorage
    localStorage.setItem('currentStoreId', storeId);
    localStorage.setItem('currentStore', storeName);
    
    // Update display
    const storeNameElement = document.getElementById('currentStoreName');
    if (storeNameElement) {
        storeNameElement.textContent = storeName;
    }
    
    // Close dropdown
    const dropdown = document.getElementById('storeDropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
    
    console.log('Selected store:', storeName, 'ID:', storeId);
    
    // Show notification
    if (typeof showNotification === 'function') {
        showNotification(`Đã chọn cửa hàng: ${storeName}`, 'success');
    }
}

// Initialize header functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase auth to initialize
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User logged in, loading stores...');
            loadStores();
        } else {
            console.log('No user logged in');
        }
    });
});
