// Product Categories Management JavaScript

// Global variables
let categories = [];
let editingCategoryId = null;
let categoryToDelete = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeProductCategories();
});

// Initialize the product categories system
function initializeProductCategories() {
    console.log('Initializing Product Categories...');
    
    // Load navbar and header
    loadNavbar();
    loadHeader();
    
    // Load categories from Firebase
    loadCategories();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Product Categories initialized successfully');
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilter);
    }
    
    // Color picker
    const colorPicker = document.getElementById('categoryColor');
    if (colorPicker) {
        colorPicker.addEventListener('change', updateColorPreview);
    }
    
    // Icon input
    const iconInput = document.getElementById('categoryIcon');
    if (iconInput) {
        iconInput.addEventListener('input', updateIconPreview);
    }
    
    // Icon suggestions
    const iconSuggestions = document.querySelectorAll('.icon-suggestion');
    iconSuggestions.forEach(suggestion => {
        suggestion.addEventListener('click', function() {
            selectIcon(this.dataset.icon);
        });
    });
    
    // Form submission
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCategory();
        });
    }
}

// Load categories from Firebase (Global)
async function loadCategories() {
    try {
        showLoading();
        
        // Load categories from global path (not store-specific)
        const categoriesRef = firebase.database().ref('categories');
        
        categoriesRef.on('value', (snapshot) => {
            categories = [];
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const category = {
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    };
                    categories.push(category);
                });
            }
            
            console.log('Categories loaded:', categories);
            renderCategories();
            hideLoading();
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Lỗi khi tải danh mục: ' + error.message, 'error');
        hideLoading();
    }
}

// Render categories grid
function renderCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!categoriesGrid || !emptyState) return;
    
    // Filter categories based on search and status
    const filteredCategories = getFilteredCategories();
    
    if (filteredCategories.length === 0) {
        categoriesGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    categoriesGrid.innerHTML = filteredCategories.map(category => `
        <div class="category-card" style="--category-color: ${category.color || '#4CAF50'}">
            <div class="category-header">
                <div class="category-info">
                    <i class="${category.icon || 'fas fa-tag'} category-icon"></i>
                    <h3 class="category-name">${category.name}</h3>
                    <p class="category-description">${category.description || 'Không có mô tả'}</p>
                </div>
                <div class="category-actions">
                    <button class="category-action-btn edit" onclick="editCategory('${category.id}')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="category-action-btn delete" onclick="deleteCategory('${category.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="category-footer">
                <span class="category-status ${category.status || 'active'}">
                    <i class="fas fa-circle"></i>
                    ${category.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                </span>
                <span class="category-product-count">
                    ${category.productCount || 0} sản phẩm
                </span>
            </div>
        </div>
    `).join('');
}

// Get filtered categories based on search and status
function getFilteredCategories() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    let filtered = [...categories];
    
    // Apply search filter
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(category => 
            category.name.toLowerCase().includes(searchTerm) ||
            (category.description && category.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply status filter
    if (statusFilter && statusFilter.value) {
        filtered = filtered.filter(category => category.status === statusFilter.value);
    }
    
    return filtered;
}

// Handle search input
function handleSearch() {
    renderCategories();
}

// Handle status filter
function handleFilter() {
    renderCategories();
}

// Open add category modal
function openAddCategoryModal() {
    editingCategoryId = null;
    
    // Reset form
    const form = document.getElementById('categoryForm');
    if (form) {
        form.reset();
    }
    
    // Set default values
    const colorPicker = document.getElementById('categoryColor');
    const iconInput = document.getElementById('categoryIcon');
    
    if (colorPicker) {
        colorPicker.value = '#4CAF50';
        updateColorPreview();
    }
    
    if (iconInput) {
        iconInput.value = 'fas fa-tag';
        updateIconPreview();
    }
    
    // Update modal title
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Thêm Danh Mục Mới';
    }
    
    // Show modal
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Edit category
function editCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    editingCategoryId = categoryId;
    
    // Fill form with category data
    document.getElementById('categoryName').value = category.name || '';
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryColor').value = category.color || '#4CAF50';
    document.getElementById('categoryIcon').value = category.icon || 'fas fa-tag';
    document.getElementById('categoryStatus').value = category.status || 'active';
    
    // Update previews
    updateColorPreview();
    updateIconPreview();
    
    // Update modal title
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Chỉnh Sửa Danh Mục';
    }
    
    // Show modal
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close category modal
function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    editingCategoryId = null;
}

// Save category (add or update) - Global storage
async function saveCategory() {
    try {
        const form = document.getElementById('categoryForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        showLoading();
        
        const categoryData = {
            name: document.getElementById('categoryName').value.trim(),
            description: document.getElementById('categoryDescription').value.trim(),
            color: document.getElementById('categoryColor').value,
            icon: document.getElementById('categoryIcon').value.trim(),
            status: document.getElementById('categoryStatus').value,
            updatedAt: new Date().toISOString()
        };
        
        if (editingCategoryId) {
            // Update existing category in global path
            categoryData.id = editingCategoryId;
            await firebase.database().ref(`categories/${editingCategoryId}`).update(categoryData);
            showNotification('Cập nhật danh mục thành công!', 'success');
        } else {
            // Add new category to global path
            categoryData.createdAt = new Date().toISOString();
            categoryData.productCount = 0;
            
            const newCategoryRef = firebase.database().ref('categories').push();
            categoryData.id = newCategoryRef.key;
            await newCategoryRef.set(categoryData);
            showNotification('Thêm danh mục thành công!', 'success');
        }
        
        closeCategoryModal();
        hideLoading();
        
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Lỗi khi lưu danh mục: ' + error.message, 'error');
        hideLoading();
    }
}

// Delete category - Global storage
function deleteCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    categoryToDelete = categoryId;
    
    // Show delete confirmation modal
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    categoryToDelete = null;
}

// Confirm delete category - Global storage
async function confirmDeleteCategory() {
    if (!categoryToDelete) return;
    
    try {
        showLoading();
        
        // Delete from global path
        await firebase.database().ref(`categories/${categoryToDelete}`).remove();
        
        showNotification('Xóa danh mục thành công!', 'success');
        closeDeleteModal();
        hideLoading();
        
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Lỗi khi xóa danh mục: ' + error.message, 'error');
        hideLoading();
    }
}

// Update color preview
function updateColorPreview() {
    const colorPicker = document.getElementById('categoryColor');
    const colorPreview = document.querySelector('.color-preview');
    
    if (colorPicker && colorPreview) {
        colorPreview.style.background = colorPicker.value;
    }
}

// Update icon preview
function updateIconPreview() {
    const iconInput = document.getElementById('categoryIcon');
    const iconPreview = document.querySelector('.icon-preview i');
    
    if (iconInput && iconPreview) {
        iconPreview.className = iconInput.value || 'fas fa-tag';
    }
}

// Select icon from suggestions
function selectIcon(iconClass) {
    const iconInput = document.getElementById('categoryIcon');
    if (iconInput) {
        iconInput.value = iconClass;
        updateIconPreview();
    }
    
    // Update visual selection
    document.querySelectorAll('.icon-suggestion').forEach(suggestion => {
        suggestion.classList.remove('selected');
    });
    
    const selectedSuggestion = document.querySelector(`[data-icon="${iconClass}"]`);
    if (selectedSuggestion) {
        selectedSuggestion.classList.add('selected');
    }
}

// Load navbar component
function loadNavbar() {
    fetch('../components/navbar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('navbar-container').innerHTML = html;
            
            // Initialize navbar functionality
            if (typeof initializeNavbar === 'function') {
                initializeNavbar();
            }
        })
        .catch(error => {
            console.error('Error loading navbar:', error);
        });
}

// Load header component
function loadHeader() {
    fetch('../components/header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('header-container').innerHTML = html;
            
            // Initialize header functionality
            if (typeof initializeHeader === 'function') {
                initializeHeader();
            }
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });
}

// Show loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

// Hide loading overlay
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.querySelector('.notification-message');
    const notificationIcon = document.querySelector('.notification-icon');
    
    if (!notification || !notificationMessage || !notificationIcon) return;
    
    // Set message
    notificationMessage.textContent = message;
    
    // Set icon based on type
    let iconClass = 'fas fa-check-circle';
    if (type === 'error') {
        iconClass = 'fas fa-exclamation-circle';
    } else if (type === 'warning') {
        iconClass = 'fas fa-exclamation-triangle';
    }
    notificationIcon.className = `notification-icon ${iconClass}`;
    
    // Set type class
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

// Get all categories from global storage
function getAllCategories() {
    return firebase.database().ref('categories').once('value').then(snapshot => {
        return snapshot.val() || {};
    });
}

// Utility function to get categories for other modules
function getCategories() {
    return categories;
}

// Utility function to get category by ID
function getCategoryById(categoryId) {
    return categories.find(c => c.id === categoryId);
}

// Export functions for global access
window.openAddCategoryModal = openAddCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.closeCategoryModal = closeCategoryModal;
window.closeDeleteModal = closeDeleteModal;
window.saveCategory = saveCategory;
window.confirmDeleteCategory = confirmDeleteCategory;
window.selectIcon = selectIcon;
window.getCategories = getCategories;
window.getCategoryById = getCategoryById;
window.getAllCategories = getAllCategories;
