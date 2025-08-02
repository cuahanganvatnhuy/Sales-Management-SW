// Searchable Select Component
class SearchableSelect {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            placeholder: 'Chọn sản phẩm...',
            searchPlaceholder: 'Tìm kiếm sản phẩm...',
            noResultsText: 'Không tìm thấy sản phẩm nào',
            ...options
        };
        this.data = [];
        this.filteredData = [];
        this.selectedItem = null;
        this.isOpen = false;
        this.onSelect = null;
        
        this.init();
    }
    
    init() {
        this.createHTML();
        this.bindEvents();
    }
    
    createHTML() {
        this.container.innerHTML = `
            <div class="searchable-select">
                <input type="text" 
                       class="search-input" 
                       placeholder="${this.options.placeholder}"
                       readonly>
                <i class="fas fa-chevron-down dropdown-icon"></i>
                <div class="dropdown-list"></div>
            </div>
        `;
        
        this.selectElement = this.container.querySelector('.searchable-select');
        this.input = this.container.querySelector('.search-input');
        this.dropdownList = this.container.querySelector('.dropdown-list');
        this.icon = this.container.querySelector('.dropdown-icon');
    }
    
    bindEvents() {
        // Click to open/close
        this.input.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });
        
        // Search when typing
        this.input.addEventListener('input', () => {
            if (this.isOpen) {
                this.filterData(this.input.value);
                this.renderDropdown();
            }
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        
        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateDown();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateUp();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.selectHighlighted();
            } else if (e.key === 'Escape') {
                this.close();
            }
        });
    }
    
    setData(data) {
        this.data = data;
        this.filteredData = [...data];
    }
    
    filterData(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (!term) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData = this.data.filter(item => 
                item.name.toLowerCase().includes(term) ||
                (item.price && item.price.toString().includes(term))
            );
        }
    }
    
    renderDropdown() {
        if (this.filteredData.length === 0) {
            this.dropdownList.innerHTML = `
                <div class="dropdown-item no-results">
                    ${this.options.noResultsText}
                </div>
            `;
            return;
        }
        
        const itemsHTML = this.filteredData.map((item, index) => `
            <div class="dropdown-item" data-index="${index}" data-id="${item.id}">
                <div class="product-info">
                    <div class="product-name">${item.name}</div>
                    <div class="product-price">${this.formatPrice(item.price)}</div>
                </div>
            </div>
        `).join('');
        
        this.dropdownList.innerHTML = itemsHTML;
        
        // Bind click events to items
        this.dropdownList.querySelectorAll('.dropdown-item:not(.no-results)').forEach(item => {
            item.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const selectedData = this.filteredData.find(d => d.id === id);
                this.selectItem(selectedData);
            });
        });
    }
    
    formatPrice(price) {
        if (!price) return '0';
        return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ/kg';
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.selectElement.classList.add('open');
        this.input.removeAttribute('readonly');
        this.input.placeholder = this.options.searchPlaceholder;
        this.input.focus();
        this.filterData('');
        this.renderDropdown();
    }
    
    close() {
        this.isOpen = false;
        this.selectElement.classList.remove('open');
        this.input.setAttribute('readonly', 'true');
        
        // Reset input value to selected item or placeholder
        if (this.selectedItem) {
            this.input.value = this.selectedItem.name;
            this.input.placeholder = '';
        } else {
            this.input.value = '';
            this.input.placeholder = this.options.placeholder;
        }
    }
    
    selectItem(item) {
        this.selectedItem = item;
        this.input.value = item.name;
        this.close();
        
        if (this.onSelect) {
            this.onSelect(item);
        }
    }
    
    navigateDown() {
        // Implement keyboard navigation if needed
    }
    
    navigateUp() {
        // Implement keyboard navigation if needed
    }
    
    selectHighlighted() {
        // Implement keyboard selection if needed
    }
    
    getValue() {
        return this.selectedItem;
    }
    
    setValue(id) {
        const item = this.data.find(d => d.id === id);
        if (item) {
            this.selectItem(item);
        }
    }
    
    clear() {
        this.selectedItem = null;
        this.input.value = '';
        this.input.placeholder = this.options.placeholder;
    }
}

// Export for use in other files
window.SearchableSelect = SearchableSelect;
